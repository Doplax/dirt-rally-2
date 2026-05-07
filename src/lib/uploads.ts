import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
// Aligned with `serverActions.bodySizeLimit` in next.config.ts. Update both
// together if you change either.
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const EXTS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export type UploadCategory = 'locations' | 'cars' | 'users';

export class UploadError extends Error {}

/**
 * Saves an uploaded image into public/uploads/<category>/ and returns the
 * public URL ("/uploads/<category>/<file>") to persist on the model.
 *
 * Production deploys should swap this for @vercel/blob (see Fase 11).
 */
export async function saveUpload(file: File, category: UploadCategory): Promise<string> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new UploadError('Formato no soportado (usa PNG, JPG, WEBP o GIF)');
  }
  if (file.size > MAX_SIZE) {
    throw new UploadError('La imagen no puede superar 50 MB');
  }

  const ext = EXTS[file.type];
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads', category);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${category}/${filename}`;
}
