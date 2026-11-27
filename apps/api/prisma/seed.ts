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

  await prisma.user.upsert({
    where: { email: 'admin@demo.test' },
    create: {
      role: 'ADMIN',
      name: 'Demo Admin',
      email: 'admin@demo.test',
      passwordHash: await argon2.hash('admin1234'),
      pinHash: await argon2.hash('1234'),
      pinLength: 4,
      kycStatus: 'APPROVED',
    },
    update: {},
  });

  console.log('Seed complete: settings + admin@demo.test / admin1234 / PIN: 1234');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
