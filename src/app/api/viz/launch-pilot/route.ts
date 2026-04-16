import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const NEWSROOM_CONNECT_PATH = 'C:\\NewsForge\\newsroom-connect.html';
const EDGE_PATH = 'msedge';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { storyId, entryId, storySlug } = body;

  // Build query params
  const params = new URLSearchParams({
    ncsid: 'NEWSFORGE',
    storyid: storyId || '',
    storyslug: storySlug || storyId || '',
  });
  if (entryId) params.set('entryid', entryId);

  const url = `file:///${NEWSROOM_CONNECT_PATH.replace(/\\/g, '/')}?${params.toString()}`;

  try {
    // Method 1: Launch Edge with --ie-mode flag
    // Edge will check its IE mode pages list and open in IE mode
    // since we already added this URL to the list
    await execAsync(
      `start "" "${EDGE_PATH}" --ie-mode "${url}"`,
      { shell: 'cmd.exe' }
    );

    return NextResponse.json({
      success: true,
      url,
      message: 'Viz Pilot launched in Edge IE mode',
    });
  } catch (err1: unknown) {
    // Method 2: Fallback — use the .bat launcher
    try {
      await execAsync(
        `start "" "C:\\NewsForge\\open-viz-pilot.bat" ${params.toString()}`,
        { shell: 'cmd.exe' }
      );

      return NextResponse.json({
        success: true,
        url,
        message: 'Viz Pilot launched via batch file',
      });
    } catch (err2: unknown) {
      // Method 3: Final fallback — just shell open the file
      // Edge should pick it up from IE mode pages list automatically
      try {
        await execAsync(
          `start "" "${url}"`,
          { shell: 'cmd.exe' }
        );

        return NextResponse.json({
          success: true,
          url,
          message: 'Viz Pilot launched via shell open',
        });
      } catch (err3: unknown) {
        const e = err3 as Error;
        return NextResponse.json(
          {
            success: false,
            error: `All launch methods failed: ${e.message}`,
          },
          { status: 500 }
        );
      }
    }
  }
}
