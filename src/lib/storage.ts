// src/lib/storage.ts
import fs from 'fs';
import path from 'path';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

export const UPLOAD_DIRS = {
  raw: path.join(UPLOAD_ROOT, 'raw'),
  proxy: path.join(UPLOAD_ROOT, 'proxy'),
  thumbnails: path.join(UPLOAD_ROOT, 'thumbnails'),
} as const;

export type UploadCategory = keyof typeof UPLOAD_DIRS;

/** Create upload directories if they don't exist */
export function ensureUploadDirs(): void {
  Object.values(UPLOAD_DIRS).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/** Save a file buffer to disk, return metadata */
export async function saveFile(
  buffer: Buffer,
  category: UploadCategory,
  fileName: string
): Promise<{ filePath: string; fileUrl: string; fileSize: number }> {
  ensureUploadDirs();
  const filePath = path.join(UPLOAD_DIRS[category], fileName);
  fs.writeFileSync(filePath, buffer);
  return {
    filePath,
    fileUrl: `/api/files/${category}/${fileName}`,
    fileSize: buffer.length,
  };
}

/** Delete a file from disk */
export function deleteFile(category: UploadCategory, fileName: string): boolean {
  const filePath = path.join(UPLOAD_DIRS[category], fileName);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
}

/** Get absolute file path (with path traversal protection) */
export function getFilePath(category: string, fileName: string): string | null {
  const filePath = path.join(UPLOAD_ROOT, category, fileName);
  // Security: prevent path traversal attacks
  if (!filePath.startsWith(UPLOAD_ROOT)) return null;
  if (!fs.existsSync(filePath)) return null;
  return filePath;
}

/** Get file stats */
export function getFileStats(category: string, fileName: string): fs.Stats | null {
  const filePath = getFilePath(category, fileName);
  if (!filePath) return null;
  return fs.statSync(filePath);
}
