// src/app/api/files/[...path]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getFilePath, getFileStats } from '@/lib/storage';
import fs from 'fs';
import path from 'path';

const MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mxf': 'application/mxf',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.ts': 'video/mp2t',
  '.m4v': 'video/x-m4v',
  '.wmv': 'video/x-ms-wmv',
  '.flv': 'video/x-flv',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const category = pathSegments[0];       // 'raw', 'proxy', 'thumbnails'
    const fileName = pathSegments.slice(1).join('/');

    // Validate category
    if (!['raw', 'proxy', 'thumbnails'].includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    const filePath = getFilePath(category, fileName);
    if (!filePath) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // ── Handle Range requests (video seeking) ──
    const range = request.headers.get('range');

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : Math.min(start + 1024 * 1024 - 1, fileSize - 1);
      // Default chunk: 1MB

      if (start >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const stream = fs.createReadStream(filePath, { start, end });
      
      // Use ReadableStream for better performance in Next.js
      const iterable = (async function* () {
        for await (const chunk of stream) {
          yield chunk;
        }
      })();

      return new NextResponse(iterable as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // ── Full file response ──
    const stream = fs.createReadStream(filePath);
    const iterable = (async function* () {
      for await (const chunk of stream) {
        yield chunk;
      }
    })();

    return new NextResponse(iterable as any, {
      status: 200,
      headers: {
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('[FILE SERVE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
