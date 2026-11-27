/**
 * Seed: bank settings + the admin account.
 * Phase 7 extends this with 5 sample customers, cards and 30 days of history.
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { DEFAULT_SETTINGS } from '@kestrel/shared';

const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { key: 'bank' },
    create: { key: 'bank', value: DEFAULT_SETTINGS as any },
    update: {},
  });

  // Remove old admin account if it exists
  await prisma.user.deleteMany({ where: { email: 'admin@demo.test' } });

  await prisma.user.upsert({
    where: { email: 'admin@skype.com' },
    create: {
      role: 'ADMIN',
      name: 'Admin',
      email: 'admin@skype.com',
      passwordHash: await argon2.hash('Skype123@'),
      pinHash: await argon2.hash('9224'),
      pinLength: 4,
      kycStatus: 'APPROVED',
    },
    update: {
      passwordHash: await argon2.hash('Skype123@'),
      pinHash: await argon2.hash('9224'),
      pinLength: 4,
    },
  });

  console.log('Seed complete: settings + admin account ready');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
