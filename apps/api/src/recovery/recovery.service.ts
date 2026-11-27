import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  RECOVERY_COUNTRIES, RECOVERY_CURRENCIES, RECOVERY_DOC_MAX_BYTES, RECOVERY_DOC_MIME, RECOVERY_FINAL, RECOVERY_MAX_DOCS,
  RECOVERY_PAYMENT_METHODS, RECOVERY_STATUSES, activeQuestions, formatMoney, recoveryCategory, recoveryStatus,
  type Currency, type RecoveryStatus,
} from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AutoMailService } from '../common/auto-mail.service';
import { withTxRetry } from '../common/tx-retry';
import { looksLike, type UploadedDoc } from '../common/uploads';

type Actor = { sub: string };
const FINAL = RECOVERY_FINAL as string[];
const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

/** Fields shown in lists (no file bytes, no internal notes). */
const SUMMARY = {
  id: true, reference: true, category: true, status: true, amountMinor: true, currency: true, latestUpdate: true,
  institution: true, submittedAt: true, createdAt: true, updatedAt: true, closedAt: true,
} as const;
const DOC_META = { id: true, kind: true, requestId: true, name: true, mime: true, size: true, uploadedBy: true, createdAt: true } as const;

export interface DraftInput {
  fullName?: string;
  country?: string;
  incidentDate?: string;
  amount?: number | string;
  currency?: string;
  paymentMethod?: string;
  institution?: string;
  description?: string;
  contactedProvider?: boolean | string | null;
  previousAction?: string;
  answers?: Record<string, string>;
}

@Injectable()
export class RecoveryService {
  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  // ───────────────────────── helpers ─────────────────────────

  private notify(userId: string, body: string) {
    return this.prisma.notification.create({ data: { userId, body } }).catch(() => undefined);
  }

  private audit(actor: Actor, action: string, target: string, detail?: Record<string, unknown>) {
    return this.prisma.auditLog.create({ data: { actorId: actor.sub, action, target, detail: detail as any } }).catch(() => undefined);
  }

  private async own(userId: string, id: string) {
    const c = await this.prisma.recoveryCase.findFirst({ where: { id, userId } });
    if (!c) throw new NotFoundException('Application not found');
    return c;
  }

  private async nextReference() {
    const year = new Date().getFullYear();
    const counter = await this.prisma.counter.upsert({
      where: { id: `FR-${year}` },
      create: { id: `FR-${year}`, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    return `FR-${year}-${String(counter.seq).padStart(6, '0')}`;
  }

  /** Cleans draft input; unknown answer keys for the category are dropped. */
  private clean(category: string, d: DraftInput) {
    const cat = recoveryCategory(category)!;
    const data: any = {};
    if (d.fullName !== undefined) data.fullName = clip(d.fullName, 120) || null;
    if (d.country !== undefined) data.country = RECOVERY_COUNTRIES.includes(d.country) ? d.country : null;
    if (d.incidentDate !== undefined) {
      const dt = d.incidentDate ? new Date(d.incidentDate) : null;
      data.incidentDate = dt && !Number.isNaN(dt.getTime()) ? dt : null;
    }
    if (d.amount !== undefined) {
      const n = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount).replace(/,/g, ''));
      data.amountMinor = Number.isFinite(n) && n > 0 && n < 1e12 ? Math.round(n * 100) : null;
    }
    if (d.currency !== undefined) data.currency = RECOVERY_CURRENCIES.includes(d.currency) ? d.currency : null;
    if (d.paymentMethod !== undefined) data.paymentMethod = RECOVERY_PAYMENT_METHODS.includes(d.paymentMethod) ? d.paymentMethod : null;
    if (d.institution !== undefined) data.institution = clip(d.institution, 160) || null;
    if (d.description !== undefined) data.description = clip(d.description, 5000) || null;
    if (d.contactedProvider !== undefined) {
      data.contactedProvider = d.contactedProvider === null || d.contactedProvider === '' ? null : d.contactedProvider === true || d.contactedProvider === 'Yes' || d.contactedProvider === 'true';
    }
    if (d.previousAction !== undefined) data.previousAction = clip(d.previousAction, 2000) || null;
    if (d.answers !== undefined && typeof d.answers === 'object' && d.answers) {
      const allowed = new Set(cat.questions.map(q => q.key));
      const answers: Record<string, string> = {};
      for (const [k, v] of Object.entries(d.answers)) {
        if (allowed.has(k) && typeof v === 'string' && v.trim()) answers[k] = v.trim().slice(0, 2000);
      }
      data.answers = answers;
    }
    return data;
  }

  /** Everything required before submission; returns a list of what's missing. */
  private missing(c: any, docCount: number) {
    const cat = recoveryCategory(c.category);
    const out: string[] = [];
    if (!cat) return ['category'];
    if (!c.fullName) out.push('Full name');
    if (!c.country) out.push('Country');
    if (!c.incidentDate) out.push('Incident date');
    if (!c.amountMinor) out.push('Amount involved');
    if (!c.currency) out.push('Currency');
    if (!c.paymentMethod) out.push('Payment method');
    if (!c.institution) out.push('Institution or provider');
    if (!c.description || c.description.length < 20) out.push('Description (at least 20 characters)');
    if (c.contactedProvider === null || c.contactedProvider === undefined) out.push('Whether you contacted the provider');
    if (c.contactedProvider && !c.previousAction) out.push('What happened when you contacted the provider');
    const answers = (c.answers ?? {}) as Record<string, string>;
    for (const q of activeQuestions(cat, answers)) if (q.required && !answers[q.key]) out.push(q.label);
    if (!docCount) out.push('At least one supporting document');
    return out;
  }

  // ───────────────────────── customer ─────────────────────────

  async list(userId: string) {
    const cases = await this.prisma.recoveryCase.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { ...SUMMARY, _count: { select: { documents: true } } },
    });
    const ids = cases.map(c => c.id);
    const [openRequests, unread] = await Promise.all([
      this.prisma.recoveryDocRequest.groupBy({ by: ['caseId'], where: { caseId: { in: ids }, fulfilledAt: null }, _count: true }),
      this.prisma.recoveryMessage.groupBy({ by: ['caseId'], where: { caseId: { in: ids }, sender: 'STAFF', readAt: null }, _count: true }),
    ]);
    return cases.map(c => ({
      ...c,
      openRequests: openRequests.find(r => r.caseId === c.id)?._count ?? 0,
      unreadMessages: unread.find(r => r.caseId === c.id)?._count ?? 0,
    }));
  }

  async create(userId: string, category: string, input: DraftInput = {}) {
    if (!recoveryCategory(category)) throw new BadRequestException('Choose a recovery category');
    const drafts = await this.prisma.recoveryCase.count({ where: { userId, status: 'DRAFT' } });
    if (drafts >= 5) throw new BadRequestException('You have 5 unfinished drafts. Finish or delete one first.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    return this.prisma.recoveryCase.create({
      data: { userId, category, fullName: user.name, ...this.clean(category, input) },
    });
  }

  async get(userId: string, id: string) {
    const c = await this.prisma.recoveryCase.findFirst({
      where: { id, userId },
      include: {
        documents: { select: DOC_META, orderBy: { createdAt: 'asc' } },
        requests: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        events: { where: { internal: false }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Application not found');
    return c;
  }

  async updateDraft(userId: string, id: string, input: DraftInput) {
    const c = await this.own(userId, id);
    if (c.status !== 'DRAFT') throw new BadRequestException('This application has already been submitted');
    return this.prisma.recoveryCase.update({ where: { id }, data: this.clean(c.category, input) });
  }

  async deleteDraft(userId: string, id: string) {
    const c = await this.own(userId, id);
    if (c.status !== 'DRAFT') throw new BadRequestException('Only drafts can be deleted');
    await this.prisma.recoveryCase.delete({ where: { id } });
    return { ok: true };
  }

  async upload(userId: string, id: string, file: UploadedDoc | undefined, kind: string, requestId?: string) {
    const c = await this.own(userId, id);
    if (FINAL.includes(c.status)) throw new BadRequestException('This case is finished, so no more documents can be added');
    if (!file) throw new BadRequestException('Choose a file');
    if (!RECOVERY_DOC_MIME.includes(file.mimetype) || !looksLike(file.mimetype, file.buffer)) {
      throw new BadRequestException('Upload a PDF, JPG or PNG file');
    }
    if (file.size > RECOVERY_DOC_MAX_BYTES) throw new BadRequestException('The file is larger than 10 MB');
    const count = await this.prisma.recoveryDocument.count({ where: { caseId: id } });
    if (count >= RECOVERY_MAX_DOCS) throw new BadRequestException(`You can upload up to ${RECOVERY_MAX_DOCS} documents per application`);

    const cat = recoveryCategory(c.category)!;
    const okKind = kind === 'OTHER' || kind === 'REQUESTED' || cat.evidence.some(e => e.key === kind) ? kind : 'OTHER';

    let request: { id: string; label: string } | null = null;
    if (requestId) {
      request = await this.prisma.recoveryDocRequest.findFirst({ where: { id: requestId, caseId: id, fulfilledAt: null } });
      if (!request) throw new BadRequestException('That document request is no longer open');
    }

    const doc = await this.prisma.recoveryDocument.create({
      data: {
        caseId: id, userId, kind: request ? 'REQUESTED' : okKind, requestId: request?.id,
        name: file.originalname.slice(0, 120), mime: file.mimetype, size: file.size, data: new Uint8Array(file.buffer),
      },
      select: DOC_META,
    });

    if (c.status !== 'DRAFT') {
      if (request) await this.prisma.recoveryDocRequest.update({ where: { id: request.id }, data: { fulfilledAt: new Date() } });
      await this.prisma.recoveryEvent.create({
        data: { caseId: id, note: request ? `Document provided: ${request.label}` : `Document uploaded: ${doc.name}` },
      });
      // All requested documents in → back to review.
      if (c.status === 'DOCUMENTS_REQUIRED') {
        const open = await this.prisma.recoveryDocRequest.count({ where: { caseId: id, fulfilledAt: null } });
        if (!open) {
          const latestUpdate = 'Thank you. We have received the requested documents and are reviewing them.';
          await this.prisma.recoveryCase.update({ where: { id }, data: { status: 'UNDER_REVIEW', latestUpdate } });
          await this.prisma.recoveryEvent.create({ data: { caseId: id, status: 'UNDER_REVIEW', note: latestUpdate } });
        }
      }
      await this.prisma.recoveryCase.update({ where: { id }, data: { updatedAt: new Date() } });
    }
    return doc;
  }

  async deleteDocument(userId: string, id: string, docId: string) {
    const c = await this.own(userId, id);
    if (c.status !== 'DRAFT') throw new BadRequestException('Documents can only be removed before you submit');
    const del = await this.prisma.recoveryDocument.deleteMany({ where: { id: docId, caseId: id } });
    if (!del.count) throw new NotFoundException('Document not found');
    return { ok: true };
  }

  /** One document's file, for its owner or (ownerId undefined) staff. */
  async document(id: string, docId: string, ownerId?: string) {
    const doc = await this.prisma.recoveryDocument.findFirst({
      where: { id: docId, caseId: id, ...(ownerId ? { userId: ownerId } : {}) },
      select: { name: true, mime: true, data: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { name: doc.name, mime: doc.mime, data: Buffer.from(doc.data) };
  }

  async submit(userId: string, id: string, accept: { accurate?: boolean; terms?: boolean; noGuarantee?: boolean }) {
    const c = await this.own(userId, id);
    if (c.status !== 'DRAFT') throw new BadRequestException('This application has already been submitted');
    if (!accept?.accurate || !accept?.terms || !accept?.noGuarantee) throw new BadRequestException('Please tick all three confirmations');
    const docs = await this.prisma.recoveryDocument.count({ where: { caseId: id } });
    const missing = this.missing(c, docs);
    if (missing.length) throw new BadRequestException(`Still needed: ${missing.join(', ')}`);

    const reference = await this.nextReference();
    const now = new Date();
    const latestUpdate = 'Application received. A case officer will review your information and documents.';
    const updated = await this.prisma.recoveryCase.updateMany({
      where: { id, status: 'DRAFT' },
      data: { reference, status: 'SUBMITTED', submittedAt: now, termsAcceptedAt: now, latestUpdate },
    });
    if (updated.count !== 1) throw new ConflictException('This application has already been submitted');
    await this.prisma.recoveryEvent.create({ data: { caseId: id, status: 'SUBMITTED', note: latestUpdate } });
    const cat = recoveryCategory(c.category)!;
    await this.notify(
      userId,
      `Your ${cat.name} application ${reference} has been received. We'll update you here as your case progresses.`,
    );
    this.autoMail.queue('recovery_received', userId, { category: cat.name, reference }, { refId: id, once: true });
    return this.get(userId, id);
  }

  async message(userId: string, id: string, body: string) {
    const c = await this.own(userId, id);
    if (c.status === 'DRAFT') throw new BadRequestException('Submit the application first');
    if (c.status === 'CLOSED') throw new BadRequestException('This case is closed. Please contact support.');
    if (!body?.trim()) throw new BadRequestException('Write a message');
    const msg = await this.prisma.recoveryMessage.create({ data: { caseId: id, sender: 'CUSTOMER', authorId: userId, body: body.trim().slice(0, 4000) } });
    await this.prisma.recoveryCase.update({ where: { id }, data: { updatedAt: new Date() } });
    return msg;
  }

  async markRead(userId: string, id: string) {
    await this.own(userId, id);
    await this.prisma.recoveryMessage.updateMany({ where: { caseId: id, sender: 'STAFF', readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async decideProposal(userId: string, id: string, approve: boolean, comment?: string) {
    const c = await this.own(userId, id);
    if (c.status !== 'AWAITING_CUSTOMER_APPROVAL') throw new BadRequestException('There is nothing to approve right now');
    const next: RecoveryStatus = approve ? 'RECOVERY_ACTIVE' : 'ASSESSMENT_COMPLETE';
    const latestUpdate = approve
      ? 'You approved the proposed assistance. The recovery process is now active.'
      : 'You declined the proposed assistance. Your case officer will contact you about other options.';
    await this.prisma.recoveryCase.update({
      where: { id },
      data: { status: next, proposalDecision: approve ? 'APPROVED' : 'DECLINED', proposalDecidedAt: new Date(), latestUpdate },
    });
    await this.prisma.recoveryEvent.create({
      data: { caseId: id, status: next, note: latestUpdate + (comment?.trim() ? ` Your comment: "${comment.trim().slice(0, 500)}"` : '') },
    });
    return this.get(userId, id);
  }

  /** Document Centre: every document and every open request across the customer's cases. */
  async centre(userId: string) {
    const [documents, requests] = await Promise.all([
      this.prisma.recoveryDocument.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { ...DOC_META, caseId: true, case: { select: { reference: true, category: true } } },
      }),
      this.prisma.recoveryDocRequest.findMany({
        where: { fulfilledAt: null, case: { is: { userId } } },
        orderBy: { createdAt: 'asc' },
        include: { case: { select: { id: true, reference: true, category: true, status: true } } },
      }),
    ]);
    return { documents, requests };
  }

  // ───────────────────────── staff ─────────────────────────

  async adminList(q: { status?: string; category?: string; search?: string }) {
    const where: any = { status: { not: 'DRAFT' } };
    if (q.status === 'OPEN') where.status = { notIn: ['DRAFT', ...FINAL] };
    else if (q.status === 'WAITING_STAFF') where.status = { in: ['SUBMITTED', 'UNDER_REVIEW'] };
    else if (q.status && RECOVERY_STATUSES.some(s => s.key === q.status) && q.status !== 'DRAFT') where.status = q.status;
    if (q.category && recoveryCategory(q.category)) where.category = q.category;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { reference: { contains: s, mode: 'insensitive' } },
        { fullName: { contains: s, mode: 'insensitive' } },
        { institution: { contains: s, mode: 'insensitive' } },
        { user: { is: { OR: [{ name: { contains: s, mode: 'insensitive' } }, { email: { contains: s, mode: 'insensitive' } }] } } },
      ];
    }
    const cases = await this.prisma.recoveryCase.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      select: { ...SUMMARY, fullName: true, country: true, user: { select: { id: true, name: true, email: true } } },
    });
    const ids = cases.map(c => c.id);
    const unread = await this.prisma.recoveryMessage.groupBy({
      by: ['caseId'], where: { caseId: { in: ids }, sender: 'CUSTOMER', readAt: null }, _count: true,
    });
    return cases.map(c => ({ ...c, unreadMessages: unread.find(u => u.caseId === c.id)?._count ?? 0 }));
  }

  async adminCounts() {
    const rows = await this.prisma.recoveryCase.groupBy({ by: ['status'], where: { status: { not: 'DRAFT' } }, _count: true });
    return Object.fromEntries(rows.map(r => [r.status, r._count]));
  }

  async adminGet(id: string) {
    const c = await this.prisma.recoveryCase.findFirst({
      where: { id, status: { not: 'DRAFT' } },
      include: {
        user: {
          select: {
            id: true, name: true, email: true, phone: true, status: true, kycStatus: true,
            wallets: { select: { id: true, currency: true, accountNumber: true, balanceMinor: true } },
          },
        },
        documents: { select: DOC_META, orderBy: { createdAt: 'asc' } },
        requests: { orderBy: { createdAt: 'asc' } },
        messages: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!c) throw new NotFoundException('Case not found');
    const actorIds = [...new Set(c.events.map(e => e.actorId).filter(Boolean) as string[])];
    const actors = actorIds.length ? await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } }) : [];
    return { ...c, events: c.events.map(e => ({ ...e, actorName: actors.find(a => a.id === e.actorId)?.name ?? null })) };
  }

  /**
   * Moves a case to a new status with a customer-facing update.
   * DOCUMENTS_REQUIRED needs at least one request; AWAITING_CUSTOMER_APPROVAL needs a proposal;
   * RESOLVED / UNSUCCESSFUL need an outcome. RESOLVED can also credit recovered funds to a wallet.
   */
  async setStatus(
    actor: Actor,
    id: string,
    b: {
      status: RecoveryStatus;
      note?: string;
      requests?: { label: string; note?: string }[];
      proposal?: string;
      outcome?: string;
      credit?: { walletId: string; amountMinor: number } | null;
    },
  ) {
    const c = await this.prisma.recoveryCase.findUnique({ where: { id } });
    if (!c || c.status === 'DRAFT') throw new NotFoundException('Case not found');
    if (c.status === 'CLOSED') throw new BadRequestException('This case is closed');
    const status = b?.status;
    if (!status || status === 'DRAFT' || !recoveryStatus(status)) throw new BadRequestException('Choose a status');
    if (status === 'SUBMITTED') throw new BadRequestException('A case cannot be moved back to Submitted');

    const note = clip(b.note, 1000);
    const data: any = { status };
    const requests = (b.requests ?? []).map(r => ({ label: clip(r.label, 160), note: clip(r.note, 500) })).filter(r => r.label);

    if (status === 'DOCUMENTS_REQUIRED') {
      const open = await this.prisma.recoveryDocRequest.count({ where: { caseId: id, fulfilledAt: null } });
      if (!requests.length && !open) throw new BadRequestException('Say which documents you need');
    }
    if (status === 'AWAITING_CUSTOMER_APPROVAL') {
      const proposal = clip(b.proposal, 4000);
      if (!proposal) throw new BadRequestException('Describe the assistance you propose, so the customer can approve it');
      data.proposal = proposal;
      data.proposalDecision = null;
      data.proposalDecidedAt = null;
    }
    if (status === 'RESOLVED' || status === 'UNSUCCESSFUL') {
      const outcome = clip(b.outcome, 2000);
      if (!outcome) throw new BadRequestException('Record the outcome for the customer');
      data.outcome = outcome;
    }
    if (status === 'CLOSED' || status === 'RESOLVED' || status === 'UNSUCCESSFUL') data.closedAt = status === 'CLOSED' ? new Date() : c.closedAt;

    const meaning = recoveryStatus(status)!.meaning;
    data.latestUpdate = note || (status === 'DOCUMENTS_REQUIRED' ? 'Please upload the documents we have requested.' : `${meaning}.`);

    let creditText = '';
    await withTxRetry(this.prisma, async db => {
      if (requests.length) {
        await db.recoveryDocRequest.createMany({ data: requests.map(r => ({ caseId: id, label: r.label!, note: r.note || null })) });
      }
      if (status === 'RESOLVED' && b.credit && b.credit.amountMinor > 0) {
        if (c.creditTxId) throw new ConflictException('Recovered funds were already credited for this case');
        const wallet = await db.wallet.findFirst({ where: { id: b.credit.walletId, userId: c.userId } });
        if (!wallet) throw new BadRequestException("Choose one of the customer's wallets");
        const amount = Math.round(b.credit.amountMinor);
        if (!Number.isInteger(amount) || amount < 1 || amount > 100_000_000_00) throw new BadRequestException('Enter a valid amount');
        const tx = await db.transaction.create({
          data: {
            reference: `FRC-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
            userId: c.userId, walletId: wallet.id, kind: 'REFUND', direction: 'IN', amountMinor: amount,
            currency: wallet.currency, status: 'COMPLETED', description: `Recovered funds · ${c.reference}`,
            completedAt: new Date(), meta: { recoveryCaseId: id },
          },
        });
        await db.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: amount } } });
        data.creditMinor = amount;
        data.creditCurrency = wallet.currency;
        data.creditTxId = tx.id;
        creditText = ` ${formatMoney(amount, wallet.currency as Currency)} has been credited to your ${wallet.currency} wallet.`;
      }
      await db.recoveryCase.update({ where: { id }, data });
      await db.recoveryEvent.create({
        data: { caseId: id, status, note: data.latestUpdate + creditText, actorId: actor.sub },
      });
    });

    await this.audit(actor, `recovery.${status.toLowerCase()}`, c.userId, { caseId: id, reference: c.reference, note, requests: requests.length || undefined });
    const label = recoveryStatus(status)!.label;
    await this.notify(c.userId, `Application ${c.reference}: ${label}. ${data.latestUpdate}${creditText}`);
    this.autoMail.queue('recovery_update', c.userId, {
      reference: c.reference, status: label, update: data.latestUpdate, details: creditText.trim() || null,
    });
    return this.adminGet(id);
  }

  async addNote(actor: Actor, id: string, note: string) {
    const c = await this.prisma.recoveryCase.findUnique({ where: { id } });
    if (!c || c.status === 'DRAFT') throw new NotFoundException('Case not found');
    if (!note?.trim()) throw new BadRequestException('Write a note');
    await this.prisma.recoveryEvent.create({ data: { caseId: id, note: note.trim().slice(0, 2000), internal: true, actorId: actor.sub } });
    return this.adminGet(id);
  }

  async staffMessage(actor: Actor, id: string, body: string) {
    const c = await this.prisma.recoveryCase.findUnique({ where: { id } });
    if (!c || c.status === 'DRAFT') throw new NotFoundException('Case not found');
    if (!body?.trim()) throw new BadRequestException('Write a message');
    const msg = await this.prisma.recoveryMessage.create({ data: { caseId: id, sender: 'STAFF', authorId: actor.sub, body: body.trim().slice(0, 4000) } });
    await this.prisma.recoveryCase.update({ where: { id }, data: { updatedAt: new Date() } });
    await this.audit(actor, 'recovery.message', c.userId, { caseId: id, reference: c.reference });
    await this.notify(c.userId, `New message from your case officer about ${c.reference}.`);
    this.autoMail.queue('recovery_message', c.userId, { reference: c.reference }, { minGapMinutes: 30 });
    return msg;
  }

  async staffMarkRead(id: string) {
    await this.prisma.recoveryMessage.updateMany({ where: { caseId: id, sender: 'CUSTOMER', readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  async cancelRequest(actor: Actor, id: string, requestId: string) {
    const r = await this.prisma.recoveryDocRequest.findFirst({ where: { id: requestId, caseId: id, fulfilledAt: null } });
    if (!r) throw new NotFoundException('Open request not found');
    await this.prisma.recoveryDocRequest.delete({ where: { id: requestId } });
    await this.prisma.recoveryEvent.create({ data: { caseId: id, note: `Document request withdrawn: ${r.label}`, actorId: actor.sub } });
    return this.adminGet(id);
  }

  /** Guards customer routes that must not be used by staff accounts. */
  assertCustomer(role?: string) {
    if (role === 'ADMIN') throw new ForbiddenException('Staff accounts cannot open recovery applications');
  }
}
