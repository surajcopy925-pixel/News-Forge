import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

const BAT_PATH = 'C:\\NewsForge\\open-viz-pilot.bat';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storyId, entryId, storySlug } = body;

  // Check if the bat file exists on this machine
  if (!existsSync(BAT_PATH)) {
    return NextResponse.json(
      { success: false, error: 'Viz Pilot not found' },
      { status: 404 }
    );
  }

  // Build query params to pass context into the bat / Viz Pilot
  const params = new URLSearchParams({
    ncsid: 'NEWSFORGE',
    storyid: storyId || '',
    storyslug: storySlug || storyId || '',
  });
  if (entryId) params.set('entryid', entryId);

  try {
    await execAsync(
      `start "" "${BAT_PATH}" ${params.toString()}`,
      { shell: 'cmd.exe' }
    );

    return NextResponse.json({
      success: true,
      message: 'Viz Pilot launched',
    });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json(
      { success: false, error: `Failed to launch Viz Pilot: ${e.message}` },
      { status: 500 }
    );
  }
}
