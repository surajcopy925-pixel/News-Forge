import { NextRequest, NextResponse } from 'next/server';
import { XMLParser } from 'fast-xml-parser';

const VIZ_PDS_URL = process.env.VIZ_PDS_URL || 'http://vizpds:8177';

function createParser(): XMLParser {
  return new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    isArray: (tagName: string) =>
      ['entry', 'link', 'field', 'fielddef'].includes(tagName),
  });
}

function getText(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (typeof val === 'object' && val !== null && '#text' in val)
    return String((val as Record<string, unknown>)['#text']);
  return '';
}

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    // PDS stores data elements at /dataelements (Atom feed)
    const response = await fetch(`${VIZ_PDS_URL}/dataelements`, {
      signal: controller.signal,
      headers: { Accept: 'application/atom+xml, application/xml, */*' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`PDS /dataelements returned ${response.status}`);
      return NextResponse.json({ elements: [] });
    }

    const xml = await response.text();
    const parser = createParser();
    const result = parser.parse(xml);

    const feed = result.feed;
    if (!feed) return NextResponse.json({ elements: [] });

    const rawEntries = feed.entry ?? [];
    const entries = Array.isArray(rawEntries) ? rawEntries : [rawEntries];

    const sinceDate = since ? new Date(since) : null;

    const elements = entries
      .map((entry: Record<string, unknown>) => {
        const idStr = getText(entry.id);
        const idMatch = idStr.match(/(\d+)$/);
        const id = idMatch ? idMatch[1] : null;
        if (!id) return null;

        const name = getText(entry.title);
        const updated = getText(entry.updated);

        // PDS may put template info at top-level OR inside <content>
        const contentBlock = (entry.content || {}) as Record<string, unknown>;
        // Template name: check entry top-level, then content block, then link rel="template"
        // Intentionally NO 'Unknown Template' final fallback — caller uses element.name instead
        const templateName =
          getText(entry.templatename) ||
          getText(entry['template-name']) ||
          getText(contentBlock.templatename) ||
          getText(contentBlock['template-name']) ||
          getText(contentBlock.templateName) ||
          getText(
            (Array.isArray(entry.link) ? entry.link : [entry.link]).find(
              (l: unknown) => l && (l as Record<string, unknown>)['@_rel'] === 'template'
            )?.['@_title']
          ) ||
          '';

        const templateIdVal =
          getText(entry.templateid) ||
          getText(entry['template-id']) ||
          getText(contentBlock.templateid) ||
          '';

        return { id, name, templateId: templateIdVal, templateName, updated };
      })
      .filter((el): el is NonNullable<typeof el> => el !== null)
      .filter((el) => {
        if (!sinceDate) return true;
        const updatedDate = new Date(el.updated);
        return updatedDate > sinceDate;
      });

    return NextResponse.json({ elements });
  } catch (error: unknown) {
    const err = error as Error;
    console.error(
      err.name === 'AbortError'
        ? 'PDS /dataelements timed out'
        : `PDS /dataelements failed: ${err.message}`
    );
    return NextResponse.json({ elements: [] });
  }
}
