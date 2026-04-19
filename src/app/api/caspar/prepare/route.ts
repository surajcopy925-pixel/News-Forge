import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const CASPAR_MEDIA_PATH = process.env.CASPAR_MEDIA_PATH || 'D:\\casparcg-server-v2.5.0-stable-windows\\media';
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'raw');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { rundownId, storyId } = body;

    console.log('[prepare] Request:', JSON.stringify(body));

    let clipsToCopy: Array<{ fileName: string; filePath: string | null }> = [];

    if (rundownId && rundownId !== 'UNASSIGNED') {
      // Get clips from rundown's stories
      try {
        const rundown = await prisma.rundown.findUnique({
          where: { rundownId },
          include: {
            entries: {
              include: {
                story: {
                  include: { clips: true },
                },
              },
            },
          },
        });

        if (rundown) {
          const stories = (rundown as any).entries?.map((e: any) => e.story).filter(Boolean) || [];
          for (const story of stories) {
            for (const clip of story.clips || []) {
              if (clip.fileName) {
                clipsToCopy.push({ fileName: clip.fileName, filePath: clip.filePath || null });
              }
            }
          }
        }
      } catch (e) {
        console.log('[prepare] Rundown include failed, trying story query');
        // Fallback: get stories with this rundownId
        const stories = await prisma.story.findMany({
          where: { rundownId } as any,
          include: { clips: true },
        });
        for (const story of stories) {
          for (const clip of story.clips || []) {
            if ((clip as any).fileName) {
              clipsToCopy.push({ fileName: (clip as any).fileName, filePath: (clip as any).filePath || null });
            }
          }
        }
      }
    } else if (rundownId === 'UNASSIGNED' || (!rundownId && !storyId)) {
      // Get ALL clips
      const allClips = await prisma.clip.findMany({
        where: { fileName: { not: '' } },
      });
      for (const clip of allClips) {
        clipsToCopy.push({ fileName: (clip as any).fileName, filePath: (clip as any).filePath || null });
      }
    } else if (storyId) {
      const story = await prisma.story.findFirst({
        where: { storyId } as any,
        include: { clips: true },
      });
      if (story) {
        for (const clip of story.clips || []) {
          if ((clip as any).fileName) {
            clipsToCopy.push({ fileName: (clip as any).fileName, filePath: (clip as any).filePath || null });
          }
        }
      }
    }

    console.log(`[prepare] ${clipsToCopy.length} clips to copy`);

    if (clipsToCopy.length === 0) {
      return NextResponse.json({ success: true, message: 'No clips to copy', copied: 0, errors: [] });
    }

    // Ensure media dir exists
    try {
      if (!fs.existsSync(CASPAR_MEDIA_PATH)) {
        fs.mkdirSync(CASPAR_MEDIA_PATH, { recursive: true });
      }
    } catch (mkErr) {
      console.error('[prepare] Cannot create media dir:', mkErr);
    }

    let copied = 0;
    const errors: string[] = [];

    for (const clip of clipsToCopy) {
      try {
        const destPath = path.join(CASPAR_MEDIA_PATH, clip.fileName);

        // Already exists?
        if (fs.existsSync(destPath)) {
          copied++;
          continue;
        }

        // Try to find source
        const possibleSources = [
          clip.filePath,
          path.join(UPLOAD_DIR, clip.fileName),
          path.join(process.cwd(), 'uploads', clip.fileName),
          path.join(process.cwd(), 'uploads', 'raw', clip.fileName),
          path.join(process.cwd(), 'public', 'uploads', clip.fileName),
        ].filter(Boolean) as string[];

        let found = false;
        for (const src of possibleSources) {
          if (fs.existsSync(src)) {
            fs.copyFileSync(src, destPath);
            copied++;
            found = true;
            console.log(`[prepare] Copied: ${clip.fileName}`);
            break;
          }
        }

        if (!found) {
          errors.push(`Source not found: ${clip.fileName}`);
        }
      } catch (copyErr) {
        errors.push(`Copy failed: ${clip.fileName} - ${copyErr}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Copied ${copied}/${clipsToCopy.length}`,
      copied,
      total: clipsToCopy.length,
      errors,
    });
  } catch (error) {
    console.error('[prepare] ERROR:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
