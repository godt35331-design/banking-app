import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TAX_DOC_MAX_BYTES, TAX_DOC_MIME } from '@kestrel/shared';
import { PrismaService } from '../prisma/prisma.service';
import { looksLike, type UploadedDoc } from '../common/uploads';

export const KYC_ID_TYPES = ['PASSPORT', 'DRIVING_LICENCE', 'NATIONAL_ID'] as const;
export const KYC_FILES = ['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS'] as const;
const LABEL: Record<string, string> = {
  ID_FRONT: 'Photo of your ID',
  ID_BACK: 'Back of your ID',
  PROOF_OF_ADDRESS: 'Proof of address',
};

/** Customer-side account features: notifications and identity verification. */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Notifications ──

  async notifications(userId: string) {
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async markNotificationsRead(userId: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { ok: true };
  }

  // ── Identity verification ──

  async kyc(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { kycStatus: true, kycIdType: true, kycSubmittedAt: true, kycNote: true },
    });
    const documents = await this.prisma.kycDocument.findMany({
      where: { userId },
      select: { type: true, name: true, size: true, mime: true, createdAt: true },
    });
    return { ...user, documents };
  }

  async submitKyc(userId: string, idType: string, files: Record<string, UploadedDoc[] | undefined>) {
    if (!KYC_ID_TYPES.includes(idType as any)) throw new BadRequestException('Choose the type of ID');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { kycStatus: true } });
    if (user.kycStatus === 'PENDING') throw new BadRequestException('Your documents are already being checked');
    if (user.kycStatus === 'APPROVED') throw new BadRequestException('Your identity is already verified');

    // Passports have no back side; other IDs need both sides.
    const required = idType === 'PASSPORT' ? ['ID_FRONT', 'PROOF_OF_ADDRESS'] : ['ID_FRONT', 'ID_BACK', 'PROOF_OF_ADDRESS'];
    const accepted: { type: string; f: UploadedDoc }[] = [];
    for (const type of KYC_FILES) {
      const f = files?.[type]?.[0];
      if (!f) {
        if (required.includes(type)) throw new BadRequestException(`Upload: ${LABEL[type]}`);
        continue;
      }
      if (!TAX_DOC_MIME.includes(f.mimetype) || !looksLike(f.mimetype, f.buffer)) {
        throw new BadRequestException(`${LABEL[type]}: upload a PDF, JPG or PNG file`);
      }
      if (f.size > TAX_DOC_MAX_BYTES) throw new BadRequestException(`${LABEL[type]}: file is larger than 10 MB`);
      accepted.push({ type, f });
    }

    // Replace any earlier (rejected) set.
    await this.prisma.kycDocument.deleteMany({ where: { userId } });
    for (const { type, f } of accepted) {
      await this.prisma.kycDocument.create({
        data: { userId, type, name: f.originalname.slice(0, 120), mime: f.mimetype, size: f.size, data: new Uint8Array(f.buffer) },
      });
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { kycStatus: 'PENDING', kycIdType: idType, kycSubmittedAt: new Date(), kycNote: null },
    });
    await this.prisma.notification
      .create({ data: { userId, body: "We've received your ID documents. We'll let you know once they're checked." } })
      .catch(() => undefined);
    return this.kyc(userId);
  }

  /** One identity document, for its owner or (from the admin controller) staff. */
  async kycDocument(userId: string, type: string) {
    const doc = await this.prisma.kycDocument.findUnique({
      where: { userId_type: { userId, type } },
      select: { name: true, mime: true, data: true },
    });
    if (!doc) throw new NotFoundException('Document not found');
    return { name: doc.name, mime: doc.mime, data: Buffer.from(doc.data) };
  }
}
