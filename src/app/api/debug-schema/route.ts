// src/app/api/debug-schema/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const results: Record<string, any> = {};

  try {
    const r = await prisma.rundown.findFirst();
    results.rundown_fields = r ? Object.keys(r) : 'empty';
    results.rundown_sample = r;
  } catch (e: any) {
    results.rundown = { error: e.message?.substring(0, 300) };
  }

  try {
    const s = await prisma.story.findFirst();
    results.story_fields = s ? Object.keys(s) : 'empty';
    results.story_sample = s;
  } catch (e: any) {
    results.story = { error: e.message?.substring(0, 300) };
  }

  try {
    // In schema.prisma it is StoryClip, so we use storyClip
    const c = await (prisma as any).storyClip.findFirst();
    results.clip_fields = c ? Object.keys(c) : 'empty';
    results.clip_sample = c;
  } catch (e: any) {
    results.clip = { error: e.message?.substring(0, 300) };
  }

  // Check if Story has rundownId
  try {
    const storyWithClip = await prisma.story.findFirst({
      where: { clips: { some: {} } },
    });
    results.story_with_clip = storyWithClip;
    results.story_has_rundownId = storyWithClip ? 'rundownId' in storyWithClip : 'no story found';
  } catch (e: any) {
    results.story_with_clip_error = e.message?.substring(0, 300);
  }

  // Try to find RundownEntry or RundownStory junction table
  try {
    results.rundownEntry_exists = true;
    const re = await prisma.rundownEntry.findFirst();
    results.rundownEntry_fields = re ? Object.keys(re) : 'empty';
    results.rundownEntry_sample = re;
  } catch (e: any) {
    results.rundownEntry_exists = false;
    results.rundownEntry_error = e.message?.substring(0, 200);
  }

  try {
    results.counts = {
      rundowns: await prisma.rundown.count(),
      stories: await prisma.story.count(),
      clips: await (prisma as any).storyClip.count(),
    };
  } catch (e: any) {
    results.counts = { error: e.message?.substring(0, 300) };
  }

  return NextResponse.json(results);
}
