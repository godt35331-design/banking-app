/**
 * Indexes Prisma can't express on MongoDB.
 *
 * Application references (LN-2026-000001, FR-2026-000001) are only given on submission, so drafts have none.
 * A plain unique index would allow just one draft in the whole bank; a partial index only enforces
 * uniqueness on records that actually have a reference (a non-empty string).
 *
 * Run after `prisma db push`:  node prisma/indexes.js   (or npm run db:indexes). Safe to run repeatedly.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const NAME = 'reference_unique_when_set';
const COLLECTIONS = ['loan_applications', 'recovery_cases'];

const dropIfPresent = async (collection, index) => {
  try {
    await prisma.$runCommandRaw({ dropIndexes: collection, index });
  } catch {
    /* not there */
  }
};

(async () => {
  for (const collection of COLLECTIONS) {
    // Old non-partial unique index (allowed only one draft) and any earlier version of ours.
    await dropIfPresent(collection, `${collection}_reference_key`);
    await dropIfPresent(collection, NAME);
    await prisma.$runCommandRaw({
      createIndexes: collection,
      indexes: [{ key: { reference: 1 }, name: NAME, unique: true, partialFilterExpression: { reference: { $gt: '' } } }],
    });
    console.log(`${collection}: ${NAME} ready`);
  }
})()
  .catch(e => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
