import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const VIZ_PDS_URL = process.env.VIZ_PDS_URL || 'http://vizpds:8177';

function createParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    isArray: (tagName: string) =>
      ['entry', 'link', 'fielddef', 'field'].includes(tagName),
  });
}

function getTextContent(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object' && val !== null && '#text' in val) {
    return String((val as Record<string, unknown>)['#text']);
  }
  return '';
}

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('search') || '';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${VIZ_PDS_URL}/templates`, {
      signal: controller.signal,
      headers: { Accept: 'application/atom+xml, application/xml, */*' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`PDS returned ${response.status}: ${response.statusText}`);
      return NextResponse.json([]);
    }

    const xml = await response.text();
    const parser = createParser();
    const result = parser.parse(xml);

    const feed = result.feed;
    if (!feed) {
      console.error('Invalid Atom feed: no feed element found');
      return NextResponse.json([]);
    }

    const rawEntries = feed.entry ?? [];
    const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

    let templates = entries
      .map((entry: Record<string, unknown>) => {
        const idStr = getTextContent(entry.id);
        const idMatch = idStr.match(/(\d+)$/);
        const numericId = idMatch ? parseInt(idMatch[1], 10) : null;
        if (!numericId) return null;

        const title = getTextContent(entry.title);
        const updated = getTextContent(entry.updated);

        const pilotdbid = entry.pilotdbid
          ? parseInt(String(entry.pilotdbid), 10)
          : null;

        let thumbnailUrl: string | null = null;
        const thumb = entry.thumbnail as Record<string, unknown> | undefined;
        if (thumb && typeof thumb === 'object') {
          thumbnailUrl = String(thumb['@_url'] || '') || null;
        }

        return {
          id: pilotdbid || numericId,
          name: title,
          updated,
          thumbnailUrl,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    if (search) {
      const q = search.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(q));
    }

    return NextResponse.json(templates);
  } catch (error: unknown) {
    const err = error as Error;
    console.error(
      err.name === 'AbortError'
        ? 'PDS request timed out'
        : `PDS request failed: ${err.message}`
    );
    return NextResponse.json([]);
  }
}
