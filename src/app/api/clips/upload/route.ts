import { NextRequest, NextResponse } from 'next/server';
import { saveFile, ensureUploadDirs } from '@/lib/storage';
import { extractMetadata } from '@/lib/metadata-extractor';
import { generateProxy } from '@/lib/proxy-generator';
import { prisma } from '@/lib/prisma';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[clips/upload] Starting upload process...');
    await ensureUploadDirs();

    const formData = await request.formData();
    const file = formData.get('file');
    const storyId = formData.get('storyId') as string | null;

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!storyId) {
      return NextResponse.json({ error: 'No storyId provided' }, { status: 400 });
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate filename: {storyId}_{timestamp}.{ext}
    const ext = path.extname(file.name) || '.mp4';
    const timestamp = Date.now();
    const fileName = `${storyId}_${timestamp}${ext}`;

    // Save to uploads/raw/
    const savedResult = await saveFile(buffer, 'raw', fileName);
    
    // Also save to playout for immediate availability
    try {
      await saveFile(buffer, 'playout', fileName);
    } catch (playoutErr) {
      console.warn('[clips/upload] Failed to save to playout folder:', playoutErr);
    }

    const savedPath = savedResult.filePath;
    const fileUrl = `/api/files/raw/${fileName}`;

    // Extract metadata
    let metadata = null;
    try {
      metadata = await extractMetadata(savedPath);
    } catch (metaErr) {
      console.warn('[clips/upload] Metadata extraction failed:', metaErr);
    }

    // Generate proxy
    let proxyUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    try {
      const proxyResult = await generateProxy(savedPath, fileName);
      if (proxyResult) {
        proxyUrl = `/api/files/proxy/${proxyResult.proxyFileName}`;
        thumbnailUrl = `/api/files/thumbnails/${proxyResult.thumbnailFileName}`;
      }
    } catch (proxyErr) {
      console.warn('[clips/upload] Proxy generation failed:', proxyErr);
    }

    // Create DB record
    const clip = await prisma.storyClip.create({
      data: {
        clipId: `CLP-${timestamp}`,
        storyId,
        fileName,
        originalFileName: file.name,
        fileUrl,
        fileSize: buffer.length,
        fileType: file.type || 'video/mp4',
        duration: metadata?.duration ?? null,
        codec: metadata?.codec ?? null,
        resolution: metadata?.resolution ?? null,
        fps: metadata?.fps ?? null,
        proxyUrl,
        thumbnailUrl,
        status: 'DONE',
      },
    });

    console.log(`[clips/upload] Created clip: ${clip.clipId}`);

    return NextResponse.json({ success: true, clip });
  } catch (error: unknown) {
    console.error('[clips/upload] FATAL ERROR:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
