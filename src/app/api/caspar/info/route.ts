import { NextRequest, NextResponse } from 'next/server';
import casparClient from '@/lib/caspar-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ch = parseInt(searchParams.get('channel') || '1', 10);
    const ly = parseInt(searchParams.get('layer') || '10', 10);

    // Check if connected first
    if (!casparClient.isConnected()) {
      return NextResponse.json({
        success: true,
        playing: false,
        paused: false,
        file: '',
        elapsed: '00:00:00.00',
        remaining: '00:00:00.00',
        duration: '00:00:00.00',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
      });
    }

    let result;
    try {
      result = await casparClient.info(ch, ly);
    } catch (cmdErr) {
      // Command failed — channel might not exist or nothing playing
      return NextResponse.json({
        success: true,
        playing: false,
        paused: false,
        file: '',
        elapsed: '00:00:00.00',
        remaining: '00:00:00.00',
        duration: '00:00:00.00',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
      });
    }

    const data = result.data || '';
    
    // If no data or error code, return empty
    if (!data || result.code >= 400) {
      return NextResponse.json({
        success: true,
        playing: false,
        paused: false,
        file: '',
        elapsed: '00:00:00.00',
        remaining: '00:00:00.00',
        duration: '00:00:00.00',
        progress: 0,
        currentFrame: 0,
        totalFrames: 0,
      });
    }

    const info = parseInfoResponse(data);

    return NextResponse.json({
      success: true,
      ...info,
    });
  } catch (error) {
    // Don't return 500 — return empty playback state
    return NextResponse.json({
      success: true,
      playing: false,
      paused: false,
      file: '',
      elapsed: '00:00:00.00',
      remaining: '00:00:00.00',
      duration: '00:00:00.00',
      progress: 0,
      currentFrame: 0,
      totalFrames: 0,
    });
  }
}

function parseInfoResponse(data: string) {
  try {
    const fileTag = extractTag(data, 'filename');
    const frameNumber = extractTag(data, 'frame-number');
    const nbFrames = extractTag(data, 'nb-frames');
    const fileFrameRate = extractTag(data, 'file-frame-rate');
    const paused = extractTag(data, 'paused');
    const foreground = extractTag(data, 'foreground');

    const fps = parseFloat(fileFrameRate) || 25;
    const currentFrame = parseInt(frameNumber) || 0;
    const totalFrames = parseInt(nbFrames) || 0;

    const elapsed = framesToTimecode(currentFrame, fps);
    const duration = framesToTimecode(totalFrames, fps);
    const remaining = framesToTimecode(Math.max(0, totalFrames - currentFrame), fps);

    // Check if something is actually playing
    const hasFile = fileTag.length > 0 || foreground.includes('filename');
    const isPlaying = hasFile && paused !== 'true';

    return {
      playing: isPlaying,
      paused: paused === 'true',
      file: fileTag,
      currentFrame,
      totalFrames,
      fps,
      elapsed,
      remaining,
      duration,
      progress: totalFrames > 0 ? Math.round((currentFrame / totalFrames) * 100) : 0,
    };
  } catch {
    return {
      playing: false,
      paused: false,
      file: '',
      currentFrame: 0,
      totalFrames: 0,
      fps: 25,
      elapsed: '00:00:00.00',
      remaining: '00:00:00.00',
      duration: '00:00:00.00',
      progress: 0,
    };
  }
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function framesToTimecode(frames: number, fps: number): string {
  const totalSeconds = frames / fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const remainingFrames = Math.floor(frames % fps);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(remainingFrames)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

