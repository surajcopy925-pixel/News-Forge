import { NextRequest, NextResponse } from 'next/server';
import { saveFile, ensureUploadDirs } from '@/lib/storage';
import { extractMetadata } from '@/lib/metadata-extractor';
import { generateProxy } from '@/lib/proxy-generator';
import path from 'path';

// Allow large video uploads (up to 4GB)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('[upload] Starting upload process...');
    await ensureUploadDirs();
    console.log('[upload] Dirs ensured.');

    const formData = await request.formData();
    console.log('[upload] FormData parsed.');
    const file = formData.get('file');
    const storyId = formData.get('storyId') as string | null;

    if (!file || !(file instanceof File)) {
      console.log('[upload] Missing or invalid file object');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!storyId) {
      console.log('[upload] Missing storyId');
      return NextResponse.json({ error: 'No storyId provided' }, { status: 400 });
    }

    console.log(`[upload] File: ${file.name}, Size: ${file.size}, StoryId: ${storyId}`);

    // Read file into buffer efficiently
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[upload] Buffer created: ${buffer.length} bytes`);

    // Generate filename: {storyId}_{timestamp}.{ext}
    const ext = path.extname(file.name) || '.mp4';
    const timestamp = Date.now();
    const fileName = `${storyId}_${timestamp}${ext}`;

    // Save to uploads/raw/
    console.log(`[upload] Saving to raw/${fileName}...`);
    const savedResult = await saveFile(buffer, 'raw', fileName);
    const savedPath = savedResult.filePath;
    console.log(`[upload] Saved to: ${savedPath}`);
    const fileUrl = `/api/files/raw/${fileName}`;

    // --- Phase 3.5: Extract metadata ---
    let metadata = null;
    try {
      console.log('[upload] Extracting metadata...');
      metadata = await extractMetadata(savedPath);
      console.log('[upload] Metadata extracted.');
    } catch (metaErr) {
      console.warn('[upload] Metadata extraction failed:', metaErr);
    }

    // --- Phase 3.6: Generate proxy (async, non-blocking) ---
    let proxyUrl: string | null = null;
    let thumbnailUrl: string | null = null;
    try {
      console.log('[upload] Generating proxy...');
      const proxyResult = await generateProxy(savedPath, fileName);
      if (proxyResult) {
        proxyUrl = `/api/files/proxy/${proxyResult.proxyFileName}`;
        thumbnailUrl = `/api/files/thumbnails/${proxyResult.thumbnailFileName}`;
        console.log('[upload] Proxy generated.');
      }
    } catch (proxyErr) {
      console.warn('[upload] Proxy generation failed:', proxyErr);
    }

    console.log('[upload] Upload successful.');
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
  } catch (error: any) {
    console.error('[upload] FATAL ERROR during upload process:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

