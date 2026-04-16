import ffmpeg from 'fluent-ffmpeg';
import path from 'path';

export interface VideoMetadata {
  duration: string;       // "00:01:30" format
  durationSeconds: number;
  codec: string | null;
  resolution: string | null;
  fps: string | null;
  fileType: string | null;
  width: number | null;
  height: number | null;
  bitrate: number | null;
  audioCodec: string | null;
}

/**
 * Extract video metadata using ffprobe.
 * Returns null if ffprobe fails (file not a valid video, ffprobe not installed, etc.)
 */
export function extractMetadata(filePath: string): Promise<VideoMetadata | null> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) {
        console.error('[metadata-extractor] ffprobe error:', err.message);
        resolve(null);
        return;
      }

      try {
        const videoStream = data.streams.find((s) => s.codec_type === 'video');
        const audioStream = data.streams.find((s) => s.codec_type === 'audio');
        const format = data.format;

        const totalSeconds = format.duration ? parseFloat(String(format.duration)) : 0;
        const duration = formatDuration(totalSeconds);

        const width = videoStream?.width ?? null;
        const height = videoStream?.height ?? null;

        let fps: string | null = null;
        if (videoStream?.r_frame_rate) {
          const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
          if (den && den > 0) {
            fps = (num / den).toFixed(2);
          }
        }

        resolve({
          duration,
          durationSeconds: totalSeconds,
          codec: videoStream?.codec_name ?? null,
          resolution: width && height ? `${width}x${height}` : null,
          fps,
          fileType: format.format_long_name ?? path.extname(filePath).replace('.', '').toUpperCase(),
          width,
          height,
          bitrate: format.bit_rate ? parseInt(String(format.bit_rate)) : null,
          audioCodec: audioStream?.codec_name ?? null,
        });
      } catch (parseErr) {
        console.error('[metadata-extractor] Parse error:', parseErr);
        resolve(null);
      }
    });
  });
}

function formatDuration(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
