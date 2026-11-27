import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  TAX_DOCUMENTS, TAX_DOC_MAX_BYTES, TAX_DOC_MIME, formatMoney, taxCountry, taxYearLabel, validateTaxId,
  type TaxDocumentType,
} from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AutoMailService } from '../common/auto-mail.service';
import { withTxRetry } from '../common/tx-retry';
import { looksLike, type UploadedDoc } from '../common/uploads';
import { CreateTaxRecoveryDto, PayTaxRefundDto, ReviewTaxRecoveryDto } from './dto/create-tax-recovery.dto';

export type { UploadedDoc };

/** Document entry listed on the claim (the bytes are in the tax_documents collection). */
export interface StoredDoc {
  type: TaxDocumentType;
  docId: string;
  name: string; // original file name
  size: number;
  mime: string;
}

const STATUS_TEXT: Record<string, string> = {
  UNDER_REVIEW: 'is now being reviewed',
  APPROVED: 'has been approved. Your refund will be paid soon',
  REJECTED: 'was not approved',
};

@Injectable()
export class TaxRecoveryService {
  constructor(private readonly prisma: PrismaService, private readonly autoMail: AutoMailService) {}

  // ── Customer ──

  async create(userId: string, dto: CreateTaxRecoveryDto, files: Record<string, UploadedDoc[] | undefined>) {
    const country = taxCountry(dto.country);
    if (!country) throw new BadRequestException('Choose a supported country');

    const taxId = validateTaxId(dto.country, dto.taxIdNumber);
    if (!taxId) {
      throw new BadRequestException(`That isn't a valid ${country.name} ${country.idName} (${country.hint})`);
    }

    const dob = new Date(dto.dateOfBirth);
    const age = (Date.now() - dob.getTime()) / (365.25 * 86_400_000);
    if (Number.isNaN(dob.getTime()) || age < 16 || age > 120) {
      throw new BadRequestException('Enter a valid date of birth (you must be at least 16)');
    }

    const thisYear = new Date().getFullYear();
    if (dto.taxYear > thisYear || dto.taxYear < thisYear - 6) {
      throw new BadRequestException('You can claim for the last 4–6 tax years only');
    }

    const dup = await this.prisma.taxRecovery.findFirst({
      where: { userId, taxYear: dto.taxYear, country: dto.country, status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] } },
    });
    if (dup) throw new ConflictException(`You already have an open claim for ${taxYearLabel(dto.country, dto.taxYear)}`);

    // Every document is required; check them all before saving anything.
    const accepted: { type: TaxDocumentType; f: UploadedDoc }[] = [];
    for (const doc of TAX_DOCUMENTS) {
      const f = files?.[doc.type]?.[0];
      if (!f) throw new BadRequestException(`Upload your ${doc.label}`);
      if (!TAX_DOC_MIME.includes(f.mimetype) || !looksLike(f.mimetype, f.buffer)) {
        throw new BadRequestException(`${doc.label}: upload a PDF, JPG or PNG file`);
      }
      if (f.size > TAX_DOC_MAX_BYTES) throw new BadRequestException(`${doc.label}: file is larger than 10 MB`);
      accepted.push({ type: doc.type, f });
    }

    const claim = await this.prisma.taxRecovery.create({
      data: {
        userId,
        country: dto.country,
        legalName: dto.legalName.trim(),
        dateOfBirth: dob,
        address: {
          line1: dto.addressLine1.trim(),
          line2: dto.addressLine2?.trim() || null,
          city: dto.city.trim(),
          postcode: dto.postcode.trim().toUpperCase(),
        },
        taxIdNumber: taxId,
        employmentStatus: dto.employmentStatus,
        taxYear: dto.taxYear,
        documentPaths: [],
      },
    });

    // Store each file in the database (tax_documents), then list them on the claim.
    // If anything fails, remove the half-made claim so the customer can simply try again.
    let documents: StoredDoc[];
    try {
      documents = [];
      for (const { type, f } of accepted) {
        const name = f.originalname.slice(0, 120);
        const doc = await this.prisma.taxDocument.create({
          data: { claimId: claim.id, userId, type, name, mime: f.mimetype, size: f.size, data: new Uint8Array(f.buffer) },
          select: { id: true },
        });
        documents.push({ type, docId: doc.id, name, size: f.size, mime: f.mimetype });
      }
      await this.prisma.taxRecovery.update({ where: { id: claim.id }, data: { documents: documents as any } });
    } catch (e) {
      await this.prisma.taxDocument.deleteMany({ where: { claimId: claim.id } }).catch(() => undefined);
      await this.prisma.taxRecovery.delete({ where: { id: claim.id } }).catch(() => undefined);
      throw e;
    }

    await this.notify(userId, `Your tax refund claim for ${taxYearLabel(dto.country, dto.taxYear)} has been received.`);
    this.autoMail.queue('tax_received', userId, { year: taxYearLabel(dto.country, dto.taxYear) }, { refId: claim.id, once: true });
    return { ...claim, documents };
  }

  list(userId: string) {
    return this.prisma.taxRecovery.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async get(userId: string, id: string) {
    const r = await this.prisma.taxRecovery.findFirst({ where: { id, userId } });
    if (!r) throw new NotFoundException('Tax refund claim not found');
    return r;
  }

  /** Loads one document's file from the database, for the claim's owner or (ownerId undefined) an admin. */
  async document(id: string, type: string, ownerId?: string) {
    const claim = await this.prisma.taxRecovery.findFirst({ where: ownerId ? { id, userId: ownerId } : { id }, select: { id: true } });
    if (!claim) throw new NotFoundException('Tax refund claim not found');
    const doc = await this.prisma.taxDocument.findUnique({
      where: { claimId_type: { claimId: claim.id, type } },
      select: { name: true, mime: true, size: true, data: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { name: doc.name, mime: doc.mime, data: Buffer.from(doc.data) };
  }

  // ── Admin ──

  listAll() {
    return this.prisma.taxRecovery.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, wallets: { select: { id: true, currency: true, accountNumber: true, balanceMinor: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async review(id: string, dto: ReviewTaxRecoveryDto) {
    const claim = await this.prisma.taxRecovery.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Tax refund claim not found');
    const allowed: Record<string, string[]> = {
      UNDER_REVIEW: ['SUBMITTED'],
      APPROVED: ['SUBMITTED', 'UNDER_REVIEW'],
      REJECTED: ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'],
    };
    if (!allowed[dto.status].includes(claim.status)) {
      throw new BadRequestException(`A ${claim.status.toLowerCase().replace('_', ' ')} claim can't be moved to ${dto.status.toLowerCase().replace('_', ' ')}`);
    }

    const now = new Date();
    const updated = await this.prisma.taxRecovery.update({
      where: { id },
      data: {
        status: dto.status,
        reviewNote: dto.reviewNote?.trim() || claim.reviewNote,
        reviewedAt: claim.reviewedAt ?? now,
        decidedAt: dto.status === 'UNDER_REVIEW' ? claim.decidedAt : now,
      },
    });

    const year = taxYearLabel(claim.country ?? '', claim.taxYear);
    const note = dto.reviewNote?.trim() ? ` Note: ${dto.reviewNote.trim()}` : '';
    await this.notify(claim.userId, `Your tax refund claim for ${year} ${STATUS_TEXT[dto.status]}.${note}`);
    this.autoMail.queue('tax_update', claim.userId, { year, status: STATUS_TEXT[dto.status], note: dto.reviewNote?.trim() || null });
    return updated;
  }

  /** Last step: credit the refund to one of the customer's wallets and mark the claim PAID. */
  async pay(id: string, dto: PayTaxRefundDto) {
    const claim = await this.prisma.taxRecovery.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException('Tax refund claim not found');
    if (claim.status !== 'APPROVED') throw new BadRequestException('Only approved claims can be paid');

    const wallet = await this.prisma.wallet.findFirst({ where: { id: dto.walletId, userId: claim.userId } });
    if (!wallet) throw new BadRequestException("Choose one of the customer's wallets");

    const year = taxYearLabel(claim.country ?? '', claim.taxYear);
    const ref = `TAX-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`;
    const now = new Date();

    const result = await withTxRetry(this.prisma, async tx => {
      // Guard against paying twice (two admins clicking at once).
      const marked = await tx.taxRecovery.updateMany({
        where: { id, status: 'APPROVED' },
        data: { status: 'PAID', refundMinor: dto.amountMinor, currency: wallet.currency, refundWalletId: wallet.id, paidAt: now },
      });
      if (marked.count !== 1) throw new ConflictException('This claim has already been paid');

      const payment = await tx.transaction.create({
        data: {
          reference: ref,
          userId: claim.userId,
          walletId: wallet.id,
          kind: 'REFUND',
          direction: 'IN',
          amountMinor: dto.amountMinor,
          currency: wallet.currency,
          status: 'COMPLETED',
          description: `Tax refund · ${year}`,
          completedAt: now,
          meta: { taxRecoveryId: id },
        },
      });
      await tx.wallet.update({ where: { id: wallet.id }, data: { balanceMinor: { increment: dto.amountMinor } } });
      return tx.taxRecovery.update({ where: { id }, data: { refundTxId: payment.id } });
    });

    await this.notify(
      claim.userId,
      `Your tax refund of ${formatMoney(dto.amountMinor, wallet.currency)} for ${year} has been paid into your ${wallet.currency} wallet.`,
    );
    this.autoMail.queue('tax_paid', claim.userId, { amount: formatMoney(dto.amountMinor, wallet.currency), year, currency: wallet.currency }, { refId: id, once: true });
    return result;
  }

  private notify(userId: string, body: string) {
    return this.prisma.notification.create({ data: { userId, body } }).catch(() => undefined);
  }
}
