// src/lib/storage.ts
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');
const CASPAR_MEDIA_PATH = process.env.CASPAR_MEDIA_PATH || path.join(UPLOAD_ROOT, 'playout');
const MEDIA_SERVER_PATH = process.env.MEDIA_SERVER_PATH || '';

export const UPLOAD_DIRS = {
  raw: path.join(UPLOAD_ROOT, 'raw'),
  proxy: path.join(UPLOAD_ROOT, 'proxy'),
  thumbnails: path.join(UPLOAD_ROOT, 'thumbnails'),
  playout: MEDIA_SERVER_PATH || CASPAR_MEDIA_PATH,
} as const;

export type UploadCategory = keyof typeof UPLOAD_DIRS;

/** Create upload directories if they don't exist */
export async function ensureUploadDirs(): Promise<void> {
  for (const dir of Object.values(UPLOAD_DIRS)) {
    try {
      if (!fsSync.existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`[storage] Created directory: ${dir}`);
      }
    } catch (err) {
      console.error(`[storage] Failed to create directory ${dir}:`, err);
      // Don't throw here, let saveFile fail if necessary
    }
  }
}

/** Save a file buffer to disk, return metadata */
export async function saveFile(
  buffer: Buffer | Uint8Array,
  category: UploadCategory,
  fileName: string
): Promise<{ filePath: string; fileUrl: string; fileSize: number }> {
  // Defensive: check category and filename
  if (!UPLOAD_DIRS[category]) {
    throw new Error(`Invalid upload category: ${category}`);
  }

  await ensureUploadDirs();
  const filePath = path.resolve(UPLOAD_DIRS[category], fileName);
  
  // Security: prevent path traversal
  if (!isAllowedPath(filePath)) {
    throw new Error('Invalid file path');
  }

  console.log(`[storage] Writing file: ${filePath} (${buffer.length} bytes)`);
  await fs.writeFile(filePath, buffer);
  
  return {
    filePath,
    fileUrl: `/api/files/${category}/${fileName}`,
    fileSize: buffer.length,
  };
}

/** Delete a file from disk */
export async function deleteFile(category: UploadCategory, fileName: string): Promise<boolean> {
  const filePath = path.resolve(UPLOAD_DIRS[category], fileName);
  try {
    if (fsSync.existsSync(filePath)) {
      await fs.unlink(filePath);
      return true;
    }
  } catch (err) {
    console.error(`[storage] Delete failed for ${filePath}:`, err);
  }
  return false;
}

/** Get absolute file path (with path traversal protection) */
export function getFilePath(category: string, fileName: string): string | null {
  if (!(category in UPLOAD_DIRS)) return null;
  const filePath = path.resolve(UPLOAD_DIRS[category as UploadCategory], fileName);
  // Security: prevent path traversal attacks
  if (!isAllowedPath(filePath)) return null;
  if (!fsSync.existsSync(filePath)) return null;
  return filePath;
}

/** Get file stats */
export async function getFileStats(category: string, fileName: string): Promise<fsSync.Stats | null> {
  const filePath = getFilePath(category, fileName);
  if (!filePath) return null;
  return await fs.stat(filePath);
}

function isAllowedPath(filePath: string): boolean {
  const normalizedPath = path.resolve(filePath);
  return [UPLOAD_ROOT, CASPAR_MEDIA_PATH].some((root) => isWithinRoot(normalizedPath, path.resolve(root)));
}

function isWithinRoot(filePath: string, root: string): boolean {
  return filePath === root || filePath.startsWith(`${root}${path.sep}`);
}
