import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
const PROXY_DIR = path.join(UPLOADS_DIR, 'proxy');
const THUMB_DIR = path.join(UPLOADS_DIR, 'thumbnails');

export interface ProxyResult {
  proxyFileName: string;
  proxyPath: string;
  thumbnailFileName: string;
  thumbnailPath: string;
}

/**
 * Generate a low-res proxy (540p H.264) and a thumbnail JPEG.
 * Returns null if ffmpeg is not available or fails.
 */
export async function generateProxy(
  inputPath: string,
  originalFileName: string
): Promise<ProxyResult | null> {
  // Ensure output directories exist
  await fs.mkdir(PROXY_DIR, { recursive: true });
  await fs.mkdir(THUMB_DIR, { recursive: true });

  const baseName = path.parse(originalFileName).name;
  const proxyFileName = `${baseName}_proxy.mp4`;
  const thumbnailFileName = `${baseName}_thumb.jpg`;
  const proxyPath = path.join(PROXY_DIR, proxyFileName);
  const thumbnailPath = path.join(THUMB_DIR, thumbnailFileName);

  // Generate proxy (540p, H.264, reasonable quality)
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', 'scale=-2:540',       // 540p, maintain aspect ratio
        '-c:v', 'libx264',           // H.264 codec
        '-preset', 'fast',           // Fast encoding
        '-crf', '28',                // Quality (lower = better, 28 = reasonable for proxy)
        '-c:a', 'aac',              // AAC audio
        '-b:a', '128k',             // 128kbps audio
        '-movflags', '+faststart',   // Web-optimized MP4
      ])
      .output(proxyPath)
      .on('end', () => {
        console.log(`[proxy-generator] Proxy created: ${proxyFileName}`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[proxy-generator] Proxy failed: ${err.message}`);
        reject(err);
      })
      .run();
  });

  // Generate thumbnail (single frame at 2 seconds or first frame)
  await new Promise<void>((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vframes', '1',             // Single frame
        '-ss', '2',                  // At 2 seconds (or start if shorter)
        '-vf', 'scale=320:-2',      // 320px wide thumbnail
        '-q:v', '5',                // JPEG quality
      ])
      .output(thumbnailPath)
      .on('end', () => {
        console.log(`[proxy-generator] Thumbnail created: ${thumbnailFileName}`);
        resolve();
      })
      .on('error', (err) => {
        // If video is shorter than 2s, retry at 0s
        ffmpeg(inputPath)
          .outputOptions(['-vframes', '1', '-ss', '0', '-vf', 'scale=320:-2', '-q:v', '5'])
          .output(thumbnailPath)
          .on('end', () => resolve())
          .on('error', (retryErr) => {
            console.error(`[proxy-generator] Thumbnail failed: ${retryErr.message}`);
            reject(retryErr);
          })
          .run();
      })
      .run();
  });

  return {
    proxyFileName,
    proxyPath,
    thumbnailFileName,
    thumbnailPath,
  };
}

/**
 * Delete proxy + thumbnail for a given original filename.
 */
export async function deleteProxy(originalFileName: string): Promise<void> {
  const baseName = path.parse(originalFileName).name;
  const proxyPath = path.join(PROXY_DIR, `${baseName}_proxy.mp4`);
  const thumbPath = path.join(THUMB_DIR, `${baseName}_thumb.jpg`);

  await fs.unlink(proxyPath).catch(() => {});
  await fs.unlink(thumbPath).catch(() => {});
}
