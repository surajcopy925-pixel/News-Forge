import { NextRequest, NextResponse } from 'next/server';
import { saveFile, ensureUploadDirs } from '@/lib/storage';
import { extractMetadata } from '@/lib/metadata-extractor';
import { generateProxy } from '@/lib/proxy-generator';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    await ensureUploadDirs();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const storyId = formData.get('storyId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!storyId) {
      return NextResponse.json({ error: 'No storyId provided' }, { status: 400 });
    }

    // Read file into buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate filename: {storyId}_{timestamp}.{ext}
    const ext = path.extname(file.name) || '.mp4';
    const timestamp = Date.now();
    const fileName = `${storyId}_${timestamp}${ext}`;

    // Save to uploads/raw/
    const savedPath = (await saveFile(buffer, 'raw', fileName)).filePath;
    const fileUrl = `/api/files/raw/${fileName}`;

    // --- Phase 3.5: Extract metadata ---
    let metadata = null;
    try {
      metadata = await extractMetadata(savedPath);
    } catch (metaErr) {
      console.warn('[upload] Metadata extraction failed (ffprobe may not be installed):', metaErr);
    }

    // --- Phase 3.6: Generate proxy (async, non-blocking) ---
    let proxyUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    try {
      const proxyResult = await generateProxy(savedPath, fileName);
      if (proxyResult) {
        proxyUrl = `/api/files/proxy/${proxyResult.proxyFileName}`;
        thumbnailUrl = `/api/files/thumbnails/${proxyResult.thumbnailFileName}`;
      }
    } catch (proxyErr) {
      console.warn('[upload] Proxy generation failed (ffmpeg may not be installed):', proxyErr);
    }

    return NextResponse.json({
      fileUrl,
      fileName,
      originalFileName: file.name,
      fileSize: buffer.length,
      fileType: file.type || null,
      // Phase 3.5 metadata
      duration: metadata?.duration ?? null,
      codec: metadata?.codec ?? null,
      resolution: metadata?.resolution ?? null,
      fps: metadata?.fps ?? null,
      // Phase 3.6 proxy
      proxyUrl,
      thumbnailUrl,
    });
  } catch (error) {
    console.error('[upload] Error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}

