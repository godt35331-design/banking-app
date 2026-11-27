import type { Response } from 'express';

/** The parts of a multer in-memory file we use. */
export interface UploadedDoc {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** Checks the file really is a PDF / JPEG / PNG by its first bytes, not just its declared type. */
export function looksLike(mime: string, buf: Buffer) {
  if (mime === 'application/pdf') return buf.subarray(0, 4).toString('latin1') === '%PDF';
  if (mime === 'image/jpeg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (mime === 'image/png') return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

/** Sends a document stored in the database to display inline (PDF / image). */
export function sendDoc(res: Response, doc: { name: string; mime: string; data: Buffer }) {
  res.setHeader('Content-Type', doc.mime);
  res.setHeader('Content-Length', String(doc.data.length));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Disposition', `inline; filename="${doc.name.replace(/[^\w.\- ]/g, '_')}"`);
  res.end(doc.data);
}
