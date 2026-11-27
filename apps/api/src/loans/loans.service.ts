import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  BANKING_FIELDS, EMPLOYMENT_FIELDS, LOAN_DOC_MAX_BYTES, LOAN_DOC_MIME, LOAN_FINAL, LOAN_MAX_DOCS, LOAN_PRODUCTS,
  LOAN_STATUSES, PAYOUT_WALLET, PERSONAL_FIELDS, formatAnyMoney, loanDocuments, loanMissing, loanMonthlyPayment,
  loanProduct, loanStatus, parseAmount, requirementFields,
  type LoanData, type LoanField, type LoanOffer, type LoanStatus,
} from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { looksLike, type UploadedDoc } from '../common/uploads';
import { AutoMailService } from '../common/auto-mail.service';

type Actor = { sub: string };
const FINAL = LOAN_FINAL as string[];
const BANK = 'Sterling Crest Bank';
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const money = (minor: number, cur: string) => formatAnyMoney(minor, cur);

const SUMMARY = {
  id: true, reference: true, product: true, status: true, amountMinor: true, currency: true, termMonths: true,
  latestUpdate: true, offer: true, submittedAt: true, createdAt: true, updatedAt: true, closedAt: true,
} as const;
const DOC_META = {
  id: true, kind: true, requestId: true, name: true, mime: true, size: true, review: true, reviewNote: true, uploadedBy: true, createdAt: true,
} as const;

export interface DraftInput {
  requirements?: Record<string, string>;
  answers?: Record<string, string>;
  personal?: Record<string, string>;
  employment?: Record<string, string>;
  banking?: Record<string, string>;
}

/** Keeps only known keys of a group, as trimmed strings. */
function cleanGroup(fields: LoanField[], input: unknown) {
  const out: Record<string, string> = {};
  if (!input || typeof input !== 'object') return out;
  const allowed = new Map(fields.map(f => [f.key, f]));
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const f = allowed.get(k);
    if (!f || typeof v !== 'string' || !v.trim()) continue;
    out[k] = v.trim().slice(0, f.type === 'textarea' ? 3000 : 200);
  }
  return out;
}

const group = (v: unknown) => ((v && typeof v === 'object' ? v : {}) as Record<string, string>);
const toData = (a: { requirements: unknown; answers: unknown; personal: unknown; employment: unknown; banking: unknown }): LoanData => ({
  requirements: group(a.requirements), answers: group(a.answers), personal: group(a.personal),
  employment: group(a.employment), banking: group(a.banking),
});

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  // ───────────────────────── helpers ─────────────────────────

  private notify(userId: string, body: string) {
    return this.prisma.notification.create({ data: { userId, body } }).catch(() => undefined);
  }

  private audit(actor: Actor, action: string, target: string, detail?: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { actorId: actor.sub, action, target, detail: detail as any } }).catch(() => undefined);
  }

  private event(applicationId: string, note: string, extra: { status?: LoanStatus; internal?: boolean; actorId?: string } = {}) {
    return this.prisma.loanEvent.create({ data: { applicationId, note, ...extra } });
  }

  private async own(userId: string, id: string) {
    const a = await this.prisma.loanApplication.findFirst({ where: { id, userId } });
    if (!a) throw new NotFoundException('Application not found');
    return a;
  }

  private async staffGet(id: string) {
    const a = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!a || a.status === 'DRAFT') throw new NotFoundException('Application not found');
    return a;
  }

  private async nextReference() {
    const year = new Date().getFullYear();
    const counter = await this.prisma.counter.upsert({
      where: { id: `LN-${year}` },
      create: { id: `LN-${year}`, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `LN-${year}-${String(counter.seq).padStart(6, '0')}`;
  }

  private productName(key: string) {
    return loanProduct(key)?.name ?? 'Loan';
  }

  // ───────────────────────── products ─────────────────────────

  async products() {
    const settings = await this.prisma.loanProductSetting.findMany();
    return LOAN_PRODUCTS.map(p => {
      const s = settings.find(x => x.id === p.key);
      return { key: p.key, available: s?.available ?? true, amountInfo: s?.amountInfo ?? null, rateInfo: s?.rateInfo ?? null, termInfo: s?.termInfo ?? null };
    });
  }

  async updateProduct(actor: Actor, key: string, b: { available?: boolean; amountInfo?: string; rateInfo?: string; termInfo?: string }) {
    if (!loanProduct(key)) throw new NotFoundException('Unknown loan product');
    const data = {
      available: b.available !== false,
      amountInfo: clip(b.amountInfo, 300) || null,
      rateInfo: clip(b.rateInfo, 300) || null,
      termInfo: clip(b.termInfo, 300) || null,
    };
    await this.prisma.loanProductSetting.upsert({ where: { id: key }, create: { id: key, ...data }, update: data });
    await this.audit(actor, 'loan.product', key, data);
    return this.products();
  }

  // ───────────────────────── customer ─────────────────────────

  assertCustomer(role?: string) {
    if (role === 'ADMIN') throw new ForbiddenException('Staff accounts cannot apply for loans');
  }

  async list(userId: string) {
    const apps = await this.prisma.loanApplication.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { ...SUMMARY, _count: { select: { documents: true } } },
    });
    const ids = apps.map(a => a.id);
    const [openRequests, unread] = await Promise.all([
      this.prisma.loanDocRequest.groupBy({ by: ['applicationId'], where: { applicationId: { in: ids }, fulfilledAt: null }, _count: true }),
      this.prisma.loanMessage.groupBy({ by: ['applicationId'], where: { applicationId: { in: ids }, sender: 'STAFF', readAt: null }, _count: true }),
    ]);
    return apps.map(a => ({
      ...a,
      openRequests: openRequests.find(r => r.applicationId === a.id)?._count ?? 0,
      unreadMessages: unread.find(r => r.applicationId === a.id)?._count ?? 0,
    }));
  }

  async create(userId: string, product: string) {
    const p = loanProduct(product);
    if (!p) throw new BadRequestException('Choose a loan');
    const setting = await this.prisma.loanProductSetting.findUnique({ where: { id: p.key } });
    if (setting && !setting.available) throw new BadRequestException(`${p.name}s are not available at the moment`);
    const drafts = await this.prisma.loanApplication.count({ where: { userId, status: 'DRAFT' } });
    if (drafts >= 5) throw new BadRequestException('You have 5 unfinished drafts. Finish or delete one first.');
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true, email: true, phone: true, mainCurrency: true, wallets: { select: { id: true, currency: true } } },
    });
    const wallet = user.wallets.find(w => w.currency === user.mainCurrency) ?? user.wallets[0];
    return this.prisma.loanApplication.create({
      data: {
        userId,
        product: p.key,
        requirements: { currency: user.mainCurrency },
        personal: { fullName: user.name, email: user.email, ...(user.phone ? { phone: user.phone } : {}) },
        banking: wallet ? { payout: PAYOUT_WALLET, walletId: wallet.id } : {},
      },
    });
  }

  async get(userId: string, id: string) {
    const a = await this.prisma.loanApplication.findFirst({
      where: { id, userId },
      include: {
        documents: { select: DOC_META, orderBy: { createdAt: 'asc' } },
        requests: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        events: { where: { internal: false }, orderBy: { createdAt: 'asc' } },
        repayments: { orderBy: { number: 'asc' } },
      },
    });
    if (!a) throw new NotFoundException('Application not found');
    const { assessment, assignedToId, ...rest } = a;
    return rest;
  }

  async updateDraft(userId: string, id: string, input: DraftInput) {
    const a = await this.own(userId, id);
    if (a.status !== 'DRAFT') throw new BadRequestException('This application has already been submitted');
    const p = loanProduct(a.product)!;
    const data: any = {};
    if (input.requirements !== undefined) {
      const r = cleanGroup(requirementFields(p), input.requirements);
      data.requirements = r;
      const n = parseAmount(r.amount);
      data.amountMinor = Number.isFinite(n) && n > 0 && n < 1e11 ? Math.round(n * 100) : null;
      data.currency = r.currency ?? null;
      data.termMonths = r.termMonths ? parseInt(r.termMonths, 10) || null : null;
    }
    if (input.answers !== undefined) data.answers = cleanGroup(p.questions, input.answers);
    if (input.personal !== undefined) data.personal = cleanGroup(PERSONAL_FIELDS, input.personal);
    if (input.employment !== undefined) data.employment = cleanGroup(EMPLOYMENT_FIELDS, input.employment);
    if (input.banking !== undefined) {
      const b = cleanGroup(BANKING_FIELDS, input.banking);
      if (b.walletId) {
        const w = await this.prisma.wallet.findFirst({ where: { id: b.walletId, userId } });
        if (!w) delete b.walletId;
      }
      data.banking = b;
    }
    return this.prisma.loanApplication.update({ where: { id }, data });
  }

  async deleteDraft(userId: string, id: string) {
    const a = await this.own(userId, id);
    if (a.status !== 'DRAFT') throw new BadRequestException('Only drafts can be deleted');
    await this.prisma.loanApplication.delete({ where: { id } });
    return { ok: true };
  }

  async upload(userId: string, id: string, file: UploadedDoc | undefined, kind: string, requestId?: string) {
    const a = await this.own(userId, id);
    if (FINAL.includes(a.status)) throw new BadRequestException('This application is finished, so no more documents can be added');
    if (!file) throw new BadRequestException('Choose a file');
    if (!LOAN_DOC_MIME.includes(file.mimetype) || !looksLike(file.mimetype, file.buffer)) {
      throw new BadRequestException('Upload a PDF, JPG or PNG file');
    }
    if (file.size > LOAN_DOC_MAX_BYTES) throw new BadRequestException('The file is larger than 10 MB');
    const count = await this.prisma.loanDocument.count({ where: { applicationId: id } });
    if (count >= LOAN_MAX_DOCS) throw new BadRequestException(`You can upload up to ${LOAN_MAX_DOCS} documents per application`);

    const p = loanProduct(a.product)!;
    const okKind = loanDocuments(p).some(d => d.key === kind) ? kind : 'ADDITIONAL';

    let request: { id: string; label: string } | null = null;
    if (requestId) {
      request = await this.prisma.loanDocRequest.findFirst({ where: { id: requestId, applicationId: id, fulfilledAt: null } });
      if (!request) throw new BadRequestException('That document request is no longer open');
    }

    const doc = await this.prisma.loanDocument.create({
      data: {
        applicationId: id, userId, kind: request ? 'REQUESTED' : okKind, requestId: request?.id,
        name: file.originalname.slice(0, 120), mime: file.mimetype, size: file.size, data: new Uint8Array(file.buffer),
      },
      select: DOC_META,
    });

    if (a.status !== 'DRAFT') {
      if (request) await this.prisma.loanDocRequest.update({ where: { id: request.id }, data: { fulfilledAt: new Date() } });
      await this.event(id, request ? `Document provided: ${request.label}` : `Document uploaded: ${doc.name}`);
      if (a.status === 'DOCUMENTS_REQUIRED') {
        const open = await this.prisma.loanDocRequest.count({ where: { applicationId: id, fulfilledAt: null } });
        if (!open) {
          const latestUpdate = 'Thank you. We have received the requested documents and are reviewing them.';
          await this.prisma.loanApplication.update({ where: { id }, data: { status: 'UNDER_REVIEW', latestUpdate } });
          await this.event(id, latestUpdate, { status: 'UNDER_REVIEW' });
        }
      }
      await this.prisma.loanApplication.update({ where: { id }, data: { updatedAt: new Date() } });
    }
    return doc;
  }

  async deleteDocument(userId: string, id: string, docId: string) {
    const a = await this.own(userId, id);
    if (a.status !== 'DRAFT') throw new BadRequestException('Documents can only be removed before you submit');
    const del = await this.prisma.loanDocument.deleteMany({ where: { id: docId, applicationId: id } });
    if (!del.count) throw new NotFoundException('Document not found');
    return { ok: true };
  }

  async document(id: string, docId: string, ownerId?: string) {
    const doc = await this.prisma.loanDocument.findFirst({
      where: { id: docId, applicationId: id, ...(ownerId ? { userId: ownerId } : {}) },
      select: { name: true, mime: true, data: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { name: doc.name, mime: doc.mime, data: Buffer.from(doc.data) };
  }

  async submit(userId: string, id: string, accept: { accurate?: boolean; checks?: boolean; terms?: boolean }) {
    const a = await this.own(userId, id);
    if (a.status !== 'DRAFT') throw new BadRequestException('This application has already been submitted');
    if (!accept?.accurate || !accept?.checks || !accept?.terms) throw new BadRequestException('Please tick all three declarations');
    const kinds = (await this.prisma.loanDocument.findMany({ where: { applicationId: id }, select: { kind: true } })).map(d => d.kind);
    const missing = loanMissing(a.product, toData(a), kinds);
    if (missing.length) throw new BadRequestException(`Still needed: ${missing.join(', ')}`);
    const banking = group(a.banking);
    if (banking.payout === PAYOUT_WALLET) {
      const w = await this.prisma.wallet.findFirst({ where: { id: banking.walletId, userId } });
      if (!w) throw new BadRequestException('Choose one of your Sterling Crest Bank wallets for the payout');
    }

    const reference = await this.nextReference();
    const now = new Date();
    const latestUpdate = 'Application received. A loan officer will review your information and documents.';
    const updated = await this.prisma.loanApplication.updateMany({
      where: { id, status: 'DRAFT' },
      data: { reference, status: 'SUBMITTED', submittedAt: now, consentAt: now, latestUpdate },
    });
    if (updated.count !== 1) throw new ConflictException('This application has already been submitted');
    await this.event(id, latestUpdate, { status: 'SUBMITTED' });
    await this.notify(userId, `Your ${this.productName(a.product)} application ${reference} has been received. We'll update you here at every step.`);
    this.autoMail.queue('loan_received', userId, { product: this.productName(a.product), reference }, { refId: id, once: true });
    return this.get(userId, id);
  }

  async message(userId: string, id: string, body: string) {
    const a = await this.own(userId, id);
    if (a.status === 'DRAFT') throw new BadRequestException('Submit the application first');
    if (a.status === 'CLOSED') throw new BadRequestException('This application is closed. Please contact support.');
    if (!body?.trim()) throw new BadRequestException('Write a message');
    const msg = await this.prisma.loanMessage.create({ data: { applicationId: id, sender: 'CUSTOMER', authorId: userId, body: body.trim().slice(0, 4000) } });
    await this.prisma.loanApplication.update({ where: { id }, data: { updatedAt: new Date() } });
    return msg;
  }

  async markRead(userId: string, id: string) {
    await this.own(userId, id);
    await this.prisma.loanMessage.updateMany({ where: { applicationId: id, sender: 'STAFF', readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  /** Customer accepts (→ Awaiting Signature) or declines (→ Closed) the lender's offer. */
  async decideOffer(userId: string, id: string, accept: boolean, comment?: string) {
    const a = await this.own(userId, id);
    if (a.status !== 'OFFER_ISSUED' || !a.offer) throw new BadRequestException('There is no offer to respond to');
    const offer = a.offer as unknown as LoanOffer;
    if (accept && offer.expiresAt && new Date(offer.expiresAt) < new Date()) {
      throw new BadRequestException('This offer has expired. Please message your loan officer.');
    }
    const c = clip(comment, 500);
    const status: LoanStatus = accept ? 'AWAITING_SIGNATURE' : 'CLOSED';
    const latestUpdate = accept
      ? 'You accepted the loan offer. Please read and sign the loan agreement.'
      : 'You declined the loan offer. The application is now closed.';
    await this.prisma.loanApplication.update({
      where: { id },
      data: { status, latestUpdate, ...(accept ? { offerAcceptedAt: new Date() } : { closedAt: new Date() }) },
    });
    await this.event(id, latestUpdate + (c ? ` Your comment: "${c}"` : ''), { status });
    return this.get(userId, id);
  }

  /** Customer signs the agreement electronically by typing their full name. */
  async sign(userId: string, id: string, name: string, agree: boolean) {
    const a = await this.own(userId, id);
    if (a.status !== 'AWAITING_SIGNATURE' || !a.offer) throw new BadRequestException('There is no agreement waiting for your signature');
    if (!agree) throw new BadRequestException('Confirm that you have read and agree to the agreement');
    const expected = (group(a.personal).fullName ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    const typed = (name ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!typed || typed !== expected) throw new BadRequestException('Type your full legal name exactly as in your application');
    const latestUpdate = 'Agreement signed. The lender will now arrange payment of your loan.';
    await this.prisma.loanApplication.update({
      where: { id },
      data: { status: 'AGREEMENT_COMPLETED', signedName: name.trim().slice(0, 120), signedAt: new Date(), latestUpdate },
    });
    await this.event(id, latestUpdate, { status: 'AGREEMENT_COMPLETED' });
    await this.notify(userId, `You signed the loan agreement for ${a.reference}. We'll let you know when the funds are sent.`);
    return this.get(userId, id);
  }

  async centre(userId: string) {
    const [documents, requests] = await Promise.all([
      this.prisma.loanDocument.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { ...DOC_META, applicationId: true, application: { select: { reference: true, product: true } } },
      }),
      this.prisma.loanDocRequest.findMany({
        where: { fulfilledAt: null, application: { is: { userId } } },
        orderBy: { createdAt: 'asc' },
        include: { application: { select: { id: true, reference: true, product: true, status: true } } },
      }),
    ]);
    return { documents, requests };
  }

  /** Customer-visible updates across all applications (the loan "Notifications" feed). */
  async updates(userId: string) {
    return this.prisma.loanEvent.findMany({
      where: { internal: false, application: { is: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: 60,
      include: { application: { select: { id: true, reference: true, product: true } } },
    });
  }

  // ───────────────────────── staff ─────────────────────────

  async adminList(q: { status?: string; product?: string; search?: string; assigned?: string }, actor: Actor) {
    const where: any = { status: { not: 'DRAFT' } };
    if (q.status === 'OPEN') where.status = { notIn: ['DRAFT', 'REJECTED', 'DISBURSED', 'CLOSED'] };
    else if (q.status === 'NEW') where.status = 'SUBMITTED';
    else if (q.status === 'REVIEW') where.status = { in: ['UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'VERIFICATION', 'ASSESSMENT'] };
    else if (q.status && LOAN_STATUSES.some(s => s.key === q.status) && q.status !== 'DRAFT') where.status = q.status;
    if (q.product && loanProduct(q.product)) where.product = q.product;
    if (q.assigned === 'ME') where.assignedToId = actor.sub;
    else if (q.assigned === 'NONE') where.assignedToId = null;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { reference: { contains: s, mode: 'insensitive' } },
        { user: { is: { OR: [{ name: { contains: s, mode: 'insensitive' } }, { email: { contains: s, mode: 'insensitive' } }] } } },
      ];
    }
    const apps = await this.prisma.loanApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 300,
      select: { ...SUMMARY, assignedToId: true, user: { select: { id: true, name: true, email: true, kycStatus: true } } },
    });
    const ids = apps.map(a => a.id);
    const [unread, staff] = await Promise.all([
      this.prisma.loanMessage.groupBy({ by: ['applicationId'], where: { applicationId: { in: ids }, sender: 'CUSTOMER', readAt: null }, _count: true }),
      this.staff(),
    ]);
    return apps.map(a => ({
      ...a,
      unreadMessages: unread.find(u => u.applicationId === a.id)?._count ?? 0,
      assignedTo: staff.find(s => s.id === a.assignedToId)?.name ?? null,
    }));
  }

  /** Dashboard numbers and simple reports. */
  async adminStats() {
    const [byStatus, byProduct, disbursed, overdue, repaying] = await Promise.all([
      this.prisma.loanApplication.groupBy({ by: ['status'], where: { status: { not: 'DRAFT' } }, _count: true }),
      this.prisma.loanApplication.groupBy({ by: ['product'], where: { status: { not: 'DRAFT' } }, _count: true }),
      this.prisma.loanApplication.findMany({ where: { status: { in: ['DISBURSED', 'CLOSED'] } }, select: { disbursement: true } }),
      this.prisma.loanRepayment.findMany({ where: { paidAt: null, dueDate: { lt: new Date() } }, select: { applicationId: true } }),
      this.prisma.loanRepayment.groupBy({ by: ['applicationId'], where: { paidAt: null } }),
    ]);
    const status = Object.fromEntries(byStatus.map(r => [r.status, r._count])) as Record<string, number>;
    const sum = (keys: string[]) => keys.reduce((s, k) => s + (status[k] ?? 0), 0);
    const disbursedByCurrency: Record<string, number> = {};
    for (const d of disbursed) {
      const x = d.disbursement as any;
      if (x?.amountMinor && x?.currency) disbursedByCurrency[x.currency] = (disbursedByCurrency[x.currency] ?? 0) + x.amountMinor;
    }
    return {
      total: Object.values(status).reduce((s, n) => s + n, 0),
      new: status.SUBMITTED ?? 0,
      review: sum(['UNDER_REVIEW', 'DOCUMENTS_REQUIRED', 'VERIFICATION', 'ASSESSMENT']),
      approved: sum(['APPROVED', 'CONDITIONALLY_APPROVED', 'OFFER_ISSUED', 'AWAITING_SIGNATURE', 'AGREEMENT_COMPLETED', 'DISBURSEMENT_PROCESSING', 'DISBURSED']),
      rejected: status.REJECTED ?? 0,
      byStatus: status,
      byProduct: Object.fromEntries(byProduct.map(r => [r.product, r._count])),
      disbursedByCurrency,
      /** Loans being repaid, and loans with at least one missed instalment. */
      repaying: repaying.length,
      overdueLoans: new Set(overdue.map(o => o.applicationId)).size,
    };
  }

  // ───────────────────────── repayments ─────────────────────────

  /** Monthly instalments from the offer; the last one absorbs rounding so the total matches. Returns how many were created. */
  private async createSchedule(db: any, a: { id: string; userId: string; offer: LoanOffer | null }, start: Date) {
    const o = a.offer;
    if (!o?.termMonths || !o.monthlyMinor) return 0;
    if (await db.loanRepayment.count({ where: { applicationId: a.id } })) return 0;
    const rows = Array.from({ length: o.termMonths }, (_, i) => {
      const due = new Date(start);
      due.setMonth(due.getMonth() + i + 1);
      const amount = i === o.termMonths - 1 ? o.totalMinor - o.monthlyMinor * (o.termMonths - 1) : o.monthlyMinor;
      return { applicationId: a.id, userId: a.userId, number: i + 1, dueDate: due, amountMinor: amount, currency: o.currency };
    });
    await db.loanRepayment.createMany({ data: rows });
    return rows.length;
  }

  /** For loans paid out before repayments existed. */
  async createScheduleNow(actor: Actor, id: string) {
    const a = await this.staffGet(id);
    if (!a.disbursement) throw new BadRequestException('The loan has not been paid out yet');
    const at = (a.disbursement as any)?.at ? new Date((a.disbursement as any).at) : new Date();
    const n = await this.createSchedule(this.prisma, { id, userId: a.userId, offer: a.offer as unknown as LoanOffer }, at);
    if (!n) throw new BadRequestException('A repayment schedule already exists, or the offer has no term');
    await this.event(id, `Repayment schedule created: ${n} monthly instalments.`, { actorId: actor.sub });
    return this.adminGet(id);
  }

  /** After a payment: if every instalment is paid, the loan is fully repaid and the application closes. */
  private async afterPayment(id: string, userId: string, reference: string | null) {
    const left = await this.prisma.loanRepayment.count({ where: { applicationId: id, paidAt: null } });
    if (left) return;
    const latestUpdate = 'Your loan is fully repaid. Thank you!';
    await this.prisma.loanApplication.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date(), latestUpdate } });
    await this.event(id, latestUpdate, { status: 'CLOSED' });
    await this.notify(userId, `Loan ${reference}: fully repaid. The loan is now closed.`);
    this.autoMail.queue('loan_repaid', userId, { reference }, { refId: id, once: true });
  }

  /** Customer pays the next unpaid instalment(s) from one of their wallets. `count` = how many instalments. */
  async payRepayment(userId: string, id: string, walletId: string, count = 1) {
    const a = await this.own(userId, id);
    if (a.status !== 'DISBURSED') throw new BadRequestException('There is nothing to repay on this application');
    const n = Math.min(Math.max(1, Math.floor(Number(count) || 1)), 480);
    const due = await this.prisma.loanRepayment.findMany({ where: { applicationId: id, paidAt: null }, orderBy: { number: 'asc' }, take: n });
    if (!due.length) throw new BadRequestException('Everything is already paid');
    const total = due.reduce((s, r) => s + r.amountMinor, 0);
    const currency = due[0].currency;

    await this.prisma.$transaction(async db => {
      const wallet = await db.wallet.findFirst({ where: { id: walletId, userId } });
      if (!wallet) throw new BadRequestException('Choose one of your wallets');
      if (wallet.currency !== currency) throw new BadRequestException(`Repayments are in ${currency}; choose your ${currency} wallet`);
      // Only debit if the balance covers it (atomic check).
      const debited = await db.wallet.updateMany({ where: { id: wallet.id, balanceMinor: { gte: total } }, data: { balanceMinor: { decrement: total } } });
      if (debited.count !== 1) throw new BadRequestException(`Not enough money in your ${currency} wallet (${money(total, currency)} needed)`);
      const tx = await db.transaction.create({
        data: {
          reference: `LREP-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
          userId, walletId: wallet.id, kind: 'LOAN_REPAYMENT', direction: 'OUT', amountMinor: total, currency,
          status: 'COMPLETED', description: `Loan repayment · ${a.reference} · instalment ${due.map(r => r.number).join(', ')}`,
          completedAt: new Date(), meta: { loanApplicationId: id },
        },
      });
      const marked = await db.loanRepayment.updateMany({
        where: { id: { in: due.map(r => r.id) }, paidAt: null },
        data: { paidAt: new Date(), method: 'WALLET', txId: tx.id },
      });
      if (marked.count !== due.length) throw new ConflictException('These instalments were just paid. Reload the page.');
    });
    await this.event(id, `Repayment received: ${money(total, currency)} (instalment ${due.map(r => r.number).join(', ')}).`);
    await this.afterPayment(id, userId, a.reference);
    return this.get(userId, id);
  }

  /** Staff record a payment made at a branch or by bank transfer. */
  async recordRepayment(actor: Actor, id: string, repaymentId: string, reference?: string) {
    const a = await this.staffGet(id);
    const r = await this.prisma.loanRepayment.findFirst({ where: { id: repaymentId, applicationId: id } });
    if (!r) throw new NotFoundException('Instalment not found');
    if (r.paidAt) throw new BadRequestException('This instalment is already paid');
    const ref = clip(reference, 120) || null;
    await this.prisma.loanRepayment.update({ where: { id: r.id }, data: { paidAt: new Date(), method: 'RECORDED', reference: ref } });
    await this.event(id, `Repayment recorded by staff: instalment ${r.number}, ${money(r.amountMinor, r.currency)}${ref ? ` (ref ${ref})` : ''}.`, { actorId: actor.sub });
    await this.audit(actor, 'loan.repayment', a.userId, { applicationId: id, reference: a.reference, instalment: r.number, amountMinor: r.amountMinor });
    await this.notify(a.userId, `Loan ${a.reference}: we received your repayment of ${money(r.amountMinor, r.currency)} (instalment ${r.number}).`);
    this.autoMail.queue('loan_repayment_received', a.userId, {
      amount: money(r.amountMinor, r.currency), instalment: String(r.number), reference: a.reference,
    }, { refId: r.id, once: true });
    await this.afterPayment(id, a.userId, a.reference);
    return this.adminGet(id);
  }

  staff() {
    return this.prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });
  }

  async adminGet(id: string) {
    const a = await this.prisma.loanApplication.findFirst({
      where: { id, status: { not: 'DRAFT' } },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true, status: true, kycStatus: true, createdAt: true,
            wallets: { select: { id: true, currency: true, accountNumber: true, balanceMinor: true } },
          },
        },
        documents: { select: DOC_META, orderBy: { createdAt: 'asc' } },
        requests: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
        repayments: { orderBy: { number: 'asc' } },
      },
    });
    if (!a) throw new NotFoundException('Application not found');
    const others = await this.prisma.loanApplication.findMany({
      where: { userId: a.userId, id: { not: id }, status: { not: 'DRAFT' } },
      select: { id: true, reference: true, product: true, status: true, amountMinor: true, currency: true, submittedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    const actorIds = [...new Set([...a.events.map(e => e.actorId), a.assignedToId].filter(Boolean) as string[])];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
    return {
      ...a,
      otherApplications: others,
      assignedTo: actors.find(x => x.id === a.assignedToId)?.name ?? null,
      events: a.events.map(e => ({ ...e, actorName: actors.find(x => x.id === e.actorId)?.name ?? null })),
    };
  }

  async assign(actor: Actor, id: string, staffId: string | null) {
    const a = await this.staffGet(id);
    let name = 'nobody';
    if (staffId) {
      const s = await this.prisma.user.findFirst({ where: { id: staffId, role: 'ADMIN' }, select: { name: true } });
      if (!s) throw new BadRequestException('Choose a staff member');
      name = s.name;
    }
    await this.prisma.loanApplication.update({ where: { id }, data: { assignedToId: staffId || null } });
    await this.event(id, `Assigned to ${name}`, { internal: true, actorId: actor.sub });
    await this.audit(actor, 'loan.assign', a.userId, { applicationId: id, reference: a.reference, to: name });
    return this.adminGet(id);
  }

  async saveAssessment(actor: Actor, id: string, b: { checks?: Record<string, boolean>; findings?: string; recommendation?: string }) {
    const a = await this.staffGet(id);
    const CHECKS = ['complete', 'identity', 'address', 'income', 'bankStatements', 'affordability', 'creditCheck'];
    const checks: Record<string, boolean> = {};
    for (const k of CHECKS) checks[k] = b?.checks?.[k] === true;
    const recommendation = ['APPROVE', 'APPROVE_WITH_CONDITIONS', 'DECLINE', 'MORE_INFO', ''].includes(b?.recommendation ?? '') ? b.recommendation : '';
    const findings = clip(b?.findings, 4000) ?? '';
    const assessment = { checks, findings, recommendation, by: actor.sub, at: new Date().toISOString() };
    await this.prisma.loanApplication.update({ where: { id }, data: { assessment } });
    await this.event(id, `Assessment updated${recommendation ? ` · recommendation: ${recommendation.replace(/_/g, ' ').toLowerCase()}` : ''}`, { internal: true, actorId: actor.sub });
    await this.audit(actor, 'loan.assessment', a.userId, { applicationId: id, reference: a.reference, recommendation });
    return this.adminGet(id);
  }

  async forward(actor: Actor, id: string, lender: string, note?: string) {
    const a = await this.staffGet(id);
    const name = clip(lender, 120);
    if (!name) throw new BadRequestException('Name the lending institution');
    await this.prisma.loanApplication.update({ where: { id }, data: { lender: name, forwardedAt: new Date() } });
    await this.event(id, `Forwarded to ${name} for a credit decision${clip(note, 500) ? `: ${clip(note, 500)}` : ''}`, { internal: true, actorId: actor.sub });
    await this.audit(actor, 'loan.forward', a.userId, { applicationId: id, reference: a.reference, lender: name });
    return this.adminGet(id);
  }

  async reviewDocument(actor: Actor, id: string, docId: string, review: string, note?: string) {
    await this.staffGet(id);
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(review)) throw new BadRequestException('Choose verified or rejected');
    const r = clip(note, 300) || null;
    if (review === 'REJECTED' && !r) throw new BadRequestException('Say why the document was rejected');
    const doc = await this.prisma.loanDocument.findFirst({ where: { id: docId, applicationId: id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.prisma.loanDocument.update({ where: { id: docId }, data: { review, reviewNote: r } });
    await this.event(id, `Document ${review.toLowerCase()}: ${doc.name}${r ? ` (${r})` : ''}`, { internal: true, actorId: actor.sub });
    return this.adminGet(id);
  }

  /**
   * Moves an application to a new status with a customer-facing update. Rules:
   * Documents Required needs a request · Conditionally Approved needs conditions · Rejected needs a reason ·
   * Offer Issued needs an approval and the offer terms · Agreement Completed only by the customer signing ·
   * Disbursement needs a signed agreement · Disbursed records the payment (wallet credit or external reference).
   */
  async setStatus(
    actor: Actor,
    id: string,
    b: {
      status: LoanStatus;
      note?: string;
      requests?: { label: string; note?: string }[];
      decisionNote?: string;
      conditions?: string;
      lender?: string;
      offer?: { amount: number | string; currency?: string; ratePct: number | string; termMonths: number | string; fees?: string; conditions?: string; expiresAt?: string };
      disbursement?: { method: 'WALLET' | 'EXTERNAL'; walletId?: string; reference?: string };
    },
  ) {
    const a = await this.prisma.loanApplication.findUnique({ where: { id } });
    if (!a || a.status === 'DRAFT') throw new NotFoundException('Application not found');
    if (a.status === 'CLOSED') throw new BadRequestException('This application is closed');
    const status = b?.status;
    if (!status || status === 'DRAFT' || !loanStatus(status)) throw new BadRequestException('Choose a status');
    if (status === 'SUBMITTED') throw new BadRequestException('An application cannot be moved back to Submitted');

    const note = clip(b.note, 1000);
    const data: any = { status };
    const requests = (b.requests ?? []).map(r => ({ label: clip(r.label, 160), note: clip(r.note, 500) })).filter(r => r.label);
    const lender = clip(b.lender, 120) || a.lender || BANK;
    let extra = '';

    if (status === 'DOCUMENTS_REQUIRED') {
      const open = await this.prisma.loanDocRequest.count({ where: { applicationId: id, fulfilledAt: null } });
      if (!requests.length && !open) throw new BadRequestException('Say which documents or information you need');
    }
    if (status === 'APPROVED' || status === 'CONDITIONALLY_APPROVED' || status === 'REJECTED') {
      const decisionNote = clip(b.decisionNote, 2000) || null;
      if (status === 'REJECTED' && !decisionNote) throw new BadRequestException('Record the reason the lender gave');
      const conditions = status === 'CONDITIONALLY_APPROVED' ? clip(b.conditions, 2000) : null;
      if (status === 'CONDITIONALLY_APPROVED' && !conditions) throw new BadRequestException('List the conditions of approval');
      Object.assign(data, { decision: status, decisionNote, conditions, decidedAt: new Date(), lender });
      if (status === 'REJECTED') data.closedAt = new Date();
      if (conditions) extra = ` Conditions: ${conditions}`;
    }
    if (status === 'OFFER_ISSUED') {
      if (a.decision !== 'APPROVED' && a.decision !== 'CONDITIONALLY_APPROVED') {
        throw new BadRequestException('Record the lender’s approval before issuing an offer');
      }
      const o = b.offer;
      const amount = parseAmount(String(o?.amount ?? ''));
      const ratePct = parseFloat(String(o?.ratePct ?? ''));
      const termMonths = parseInt(String(o?.termMonths ?? ''), 10);
      if (!(amount > 0) || amount > 1e11) throw new BadRequestException('Enter the offered loan amount');
      if (!Number.isFinite(ratePct) || ratePct < 0 || ratePct > 100) throw new BadRequestException('Enter the interest rate (APR) between 0 and 100');
      if (!(termMonths >= 1 && termMonths <= 480)) throw new BadRequestException('Enter the term in months (1–480)');
      const currency = o?.currency && /^[A-Z]{3}$/.test(o.currency) ? o.currency : a.currency ?? 'USD';
      const amountMinor = Math.round(amount * 100);
      const monthlyMinor = loanMonthlyPayment(amountMinor, ratePct, termMonths);
      let expiresAt: string | null = null;
      if (o?.expiresAt) {
        const d = new Date(o.expiresAt);
        if (Number.isNaN(d.getTime()) || d < new Date()) throw new BadRequestException('The offer expiry date must be in the future');
        d.setHours(23, 59, 59, 0);
        expiresAt = d.toISOString();
      }
      const offer: LoanOffer = {
        amountMinor, currency, ratePct, termMonths, monthlyMinor, totalMinor: monthlyMinor * termMonths,
        fees: clip(o?.fees, 1000) || null, conditions: clip(o?.conditions, 2000) || a.conditions || null,
        expiresAt, issuedAt: new Date().toISOString(), lender,
      };
      Object.assign(data, { offer, offerAcceptedAt: null, signedAt: null, signedName: null, lender });
      extra = ` ${money(amountMinor, currency)} at ${ratePct}% APR over ${termMonths} months.`;
    }
    if (status === 'AWAITING_SIGNATURE' && !a.offer) throw new BadRequestException('Issue an offer first');
    if (status === 'AGREEMENT_COMPLETED' && !a.signedAt) throw new BadRequestException('Only the customer can sign the agreement, from their dashboard');
    if ((status === 'DISBURSEMENT_PROCESSING' || status === 'DISBURSED') && !a.signedAt) {
      throw new BadRequestException('The customer must sign the agreement before the loan is paid');
    }
    if (status === 'CLOSED') data.closedAt = new Date();

    const meaning = loanStatus(status)!.meaning;
    data.latestUpdate = note || (status === 'DOCUMENTS_REQUIRED' ? 'Please upload the documents we have requested.' : `${meaning}.`);

    await this.prisma.$transaction(async db => {
      if (requests.length) {
        await db.loanDocRequest.createMany({ data: requests.map(r => ({ applicationId: id, label: r.label!, note: r.note || null })) });
      }
      if (status === 'DISBURSED' && !(a.disbursement as any)?.at) {
        const offer = a.offer as unknown as LoanOffer;
        const d = b.disbursement;
        if (!d || (d.method !== 'WALLET' && d.method !== 'EXTERNAL')) throw new BadRequestException('Record how the funds were paid');
        if (d.method === 'WALLET') {
          const wallet = await db.wallet.findFirst({ where: { id: d.walletId, userId: a.userId } });
          if (!wallet) throw new BadRequestException("Choose one of the customer's wallets");
          if (wallet.currency !== offer.currency) throw new BadRequestException(`The offer is in ${offer.currency}; choose a ${offer.currency} wallet or record an external payment`);
          const tx = await db.transaction.create({
            data: {
              reference: `LOAN-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
              userId: a.userId, walletId: wallet.id, kind: 'LOAN_PAYOUT', direction: 'IN', amountMinor: offer.amountMinor,
              currency: wallet.currency, status: 'COMPLETED', description: `${this.productName(a.product)} · ${a.reference}`,
              completedAt: new Date(), meta: { loanApplicationId: id },
            },
          });
          await db.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: offer.amountMinor } } });
          data.disbursement = { method: 'WALLET', walletId: wallet.id, txId: tx.id, amountMinor: offer.amountMinor, currency: offer.currency, at: new Date().toISOString() };
          extra = ` ${money(offer.amountMinor, offer.currency)} has been paid into your ${wallet.currency} wallet.`;
        } else {
          const reference = clip(d.reference, 120);
          if (!reference) throw new BadRequestException('Enter the payment reference from the lender');
          data.disbursement = { method: 'EXTERNAL', reference, amountMinor: offer.amountMinor, currency: offer.currency, at: new Date().toISOString() };
          extra = ` ${money(offer.amountMinor, offer.currency)} was sent to your bank account (reference ${reference}).`;
        }
      }
      // Guard against double payment when two staff act at once.
      const done = await db.loanApplication.updateMany({ where: { id, status: a.status, updatedAt: a.updatedAt }, data });
      if (done.count !== 1) throw new ConflictException('Someone else just updated this application. Reload and try again.');
      // Paid out → build the monthly repayment schedule.
      if (status === 'DISBURSED' && data.disbursement) {
        const n = await this.createSchedule(db, { id, userId: a.userId, offer: a.offer as unknown as LoanOffer }, new Date());
        if (n) extra += ` Your first repayment is due in one month; see your repayment schedule in the app.`;
      }
      await db.loanEvent.create({ data: { applicationId: id, status, note: data.latestUpdate + extra, actorId: actor.sub } });
    });

    await this.audit(actor, `loan.${status.toLowerCase()}`, a.userId, { applicationId: id, reference: a.reference, note, requests: requests.length || undefined });
    await this.notify(a.userId, `Loan application ${a.reference}: ${loanStatus(status)!.label}. ${data.latestUpdate}${extra}`);
    this.autoMail.queue('loan_update', a.userId, {
      product: this.productName(a.product), reference: a.reference, status: loanStatus(status)!.label,
      update: data.latestUpdate, details: extra.trim() || null,
    });
    return this.adminGet(id);
  }

  async addNote(actor: Actor, id: string, note: string) {
    await this.staffGet(id);
    if (!note?.trim()) throw new BadRequestException('Write a note');
    await this.event(id, note.trim().slice(0, 2000), { internal: true, actorId: actor.sub });
    return this.adminGet(id);
  }

  async staffMessage(actor: Actor, id: string, body: string) {
    const a = await this.staffGet(id);
    if (!body?.trim()) throw new BadRequestException('Write a message');
    const msg = await this.prisma.loanMessage.create({ data: { applicationId: id, sender: 'STAFF', authorId: actor.sub, body: body.trim().slice(0, 4000) } });
    await this.prisma.loanApplication.update({ where: { id }, data: { updatedAt: new Date() } });
    await this.audit(actor, 'loan.message', a.userId, { applicationId: id, reference: a.reference });
    await this.notify(a.userId, `New message from your loan officer about ${a.reference}.`);
    this.autoMail.queue('loan_message', a.userId, { reference: a.reference }, { minGapMinutes: 30 });
    return msg;
  }

  async staffMarkRead(id: string) {
    await this.prisma.loanMessage.updateMany({ where: { applicationId: id, sender: 'CUSTOMER', readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async cancelRequest(actor: Actor, id: string, requestId: string) {
    const r = await this.prisma.loanDocRequest.findFirst({ where: { id: requestId, applicationId: id, fulfilledAt: null } });
    if (!r) throw new NotFoundException('Open request not found');
    await this.prisma.loanDocRequest.delete({ where: { id: requestId } });
    await this.event(id, `Request withdrawn: ${r.label}`, { actorId: actor.sub });
    return this.adminGet(id);
  }
}
