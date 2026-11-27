import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

/** Runs an interactive transaction, retrying when MongoDB reports a write conflict from a parallel request. */
export async function withTxRetry<T>(prisma: PrismaService, fn: (db: Tx) => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 1; ; i++) {
    try {
      return await prisma.$transaction(fn);
    } catch (err) {
      const conflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';
      if (!conflict || i >= attempts) throw err;
      await new Promise(r => setTimeout(r, 20 * i + Math.random() * 30));
    }
  }
}
