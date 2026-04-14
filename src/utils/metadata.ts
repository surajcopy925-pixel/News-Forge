// src/utils/metadata.ts

/**
 * Generates a unique story ID following the News Forge convention:
 * STY-YYYY-NNNNN-LANG
 * 
 * Example: STY-2025-00041-EN
 */
export const generateStoryId = (language: 'EN' | 'KN' = 'EN'): string => {
  const year = new Date().getFullYear();
  const sequence = String(Math.floor(Math.random() * 99999) + 1).padStart(5, '0');
  return `STY-${year}-${sequence}-${language}`;
};

/**
 * Detects language from text content.
 * Returns 'KN' if Kannada characters detected, 'EN' otherwise.
 */
export const detectLanguage = (text: string): 'EN' | 'KN' => {
  // Kannada Unicode range: \u0C80-\u0CFF
  const kannadaRegex = /[\u0C80-\u0CFF]/;
  return kannadaRegex.test(text) ? 'KN' : 'EN';
};

/**
 * Generates auto-named clip filename following convention:
 * {storyId}_C{clipIndex}_RAW.{extension}
 * 
 * Example: STY-2025-00041-EN_C01_RAW.mp4
 * 
 * @param storyId - Parent story ID
 * @param clipIndex - 1-based clip number for this story
 * @param originalFileName - Original uploaded filename (to extract extension)
 */
export const generateClipFileName = (
  storyId: string,
  clipIndex: number,
  originalFileName: string
): string => {
  const extension = originalFileName.split('.').pop()?.toLowerCase() || 'mp4';
  const paddedIndex = String(clipIndex).padStart(2, '0');
  return `${storyId}_C${paddedIndex}_RAW.${extension}`;
};

/**
 * Generates a clip ID from the auto-named filename (without extension).
 * Example: STY-2025-00041-EN_C01_RAW
 */
export const generateClipId = (
  storyId: string,
  clipIndex: number
): string => {
  const paddedIndex = String(clipIndex).padStart(2, '0');
  return `${storyId}_C${paddedIndex}_RAW`;
};

/**
 * Extracts video duration from a File object using HTMLVideoElement.
 * Returns "HH:MM:SS" format.
 * Falls back to "00:00:00" if detection fails.
 */
export const getVideoDuration = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    // Only attempt for video files
    if (!file.type.startsWith('video/') && 
        !file.name.match(/\.(mp4|mxf|mov|avi|mkv|webm|mpg|mpeg|wmv|flv)$/i)) {
      resolve('00:00:00');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      window.URL.revokeObjectURL(video.src);
      resolve('00:00:00');
    }, 5000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      window.URL.revokeObjectURL(video.src);
      
      const totalSeconds = Math.floor(video.duration);
      if (isNaN(totalSeconds) || totalSeconds === 0) {
        resolve('00:00:00');
        return;
      }
      
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      resolve(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    video.onerror = () => {
      clearTimeout(timeout);
      window.URL.revokeObjectURL(video.src);
      resolve('00:00:00');
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Generates a thumbnail URL from a video file at the 1-second mark.
 * Returns a data URL (base64 image) or null if fails.
 */
export const generateThumbnail = (file: File): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve(null);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const timeout = setTimeout(() => {
      window.URL.revokeObjectURL(video.src);
      resolve(null);
    }, 8000);

    video.onloadeddata = () => {
      video.currentTime = 1; // Seek to 1 second
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          window.URL.revokeObjectURL(video.src);
          resolve(dataUrl);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };

    video.onerror = () => {
      clearTimeout(timeout);
      window.URL.revokeObjectURL(video.src);
      resolve(null);
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Formats a duration string for display.
 * "00:02:34" → "02:34"
 * "01:02:34" → "01:02:34"
 * null → "--:--"
 */
export const formatDuration = (dur: string | null): string => {
  if (!dur || dur === '00:00:00') return '--:--';
  const parts = dur.split(':');
  if (parts.length === 3) {
    if (parts[0] === '00') return `${parts[1]}:${parts[2]}`;
    return dur;
  }
  return dur;
};

/**
 * Parses "HH:MM:SS" to total seconds.
 */
export const parseToSeconds = (timeStr: string | null): number => {
  if (!timeStr || timeStr === '—' || timeStr === '--:--') return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

/**
 * Formats total seconds to "HH:MM:SS".
 */
export const formatSeconds = (totalSec: number): string => {
  const h = Math.floor(Math.abs(totalSec) / 3600);
  const m = Math.floor((Math.abs(totalSec) % 3600) / 60);
  const s = Math.abs(totalSec) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/**
 * Gets file extension from filename.
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * Determines resolution label from video element.
 */
export const getResolutionLabel = (width: number, height: number): string => {
  if (height >= 2160) return '4K UHD';
  if (height >= 1080) return '1080P';
  if (height >= 720) return '720P';
  if (height >= 480) return '480P';
  return `${width}x${height}`;
};

/**
 * Generates all 48 bulletin time slots for a full 24-hour day.
 * 12:00 AM, 12:30 AM, 1:00 AM, ... 11:00 PM, 11:30 PM
 */
export const generateAllTimeSlots = (dateStr: string) => {
  const slots = [];

  for (let i = 0; i < 48; i++) {
    const hour24 = Math.floor(i / 2);
    const minute = (i % 2) * 30;

    // Format display time (12-hour)
    const isPM = hour24 >= 12;
    const displayHour = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = isPM ? 'PM' : 'AM';
    const timeLabel = `${displayHour}:${String(minute).padStart(2, '0')} ${ampm}`;

    // Format 24-hour time for sorting
    const broadcastTime = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

    slots.push({
      id: `RD-AUTO-${dateStr}-${String(hour24).padStart(2, '0')}${String(minute).padStart(2, '0')}`,
      title: `${timeLabel} Bulletin`,
      airDate: dateStr,
      airTime: broadcastTime,
      plannedDuration: '00:30:00',
      status: 'PLANNING' as const,
      entries: [],
    });
  }

  return slots;
};
