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

/** Extract key→value field pairs from a payload or model block */
function extractFieldValues(
  container: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};

  const rawFields = container.field;
  if (!rawFields) return result;

  const fieldArr = Array.isArray(rawFields) ? rawFields : [rawFields];
  for (const f of fieldArr) {
    const fd = f as Record<string, unknown>;
    const name = String(fd['@_name'] || '');
    if (!name || name.startsWith('-')) continue;

    // value can be direct text or nested value element
    const val = fd.value !== undefined ? getText(fd.value) : getText(fd);
    if (name) result[name] = val;
  }

  return result;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ elementId: string }> }
) {
  const { elementId } = await params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${VIZ_PDS_URL}/dataelements/${elementId}`, {
      signal: controller.signal,
      headers: { Accept: 'application/atom+xml, application/xml, */*' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Data element not found' }, { status: 404 });
      }
      return NextResponse.json({ error: `PDS returned ${response.status}` }, { status: 502 });
    }

    const xml = await response.text();
    const parser = createParser();
    const parsed = parser.parse(xml);

    const feedEntry = (parsed.feed as Record<string, unknown>)?.entry;
    const entry: Record<string, unknown> =
      (parsed.entry as Record<string, unknown>) ||
      (Array.isArray(feedEntry) ? feedEntry[0] as Record<string, unknown> : undefined) ||
      (parsed as Record<string, unknown>);

    const name = getText(entry.title);
    const updated = getText(entry.updated);

    // Extract content block early — PDS puts vizrt metadata inside <content>
    const content = entry.content as Record<string, unknown> | undefined;
    const contentAny = content || {};

    // templateName: try entry top-level first, then content block, then links, then concept+variant
    const rawTemplateName =
      getText(entry.templatename) ||
      getText(entry['template-name']) ||
      getText(contentAny.templatename) ||
      getText(contentAny['template-name']) ||
      getText(contentAny.templateName) ||
      // Viz PDS often stores this in a link with rel="template"
      getText(
        (Array.isArray(entry.link) ? entry.link : [entry.link]).find(
          (l: unknown) => l && (l as Record<string, unknown>)['@_rel'] === 'template'
        )?.['@_title']
      );

    // Strategy: concept + variant combination (e.g. "LOWER_THIRD / L2")
    const rawConcept =
      getText(entry.concept) ||
      getText(contentAny.concept) ||
      '';
    const rawVariant =
      getText(entry.variant) ||
      getText(contentAny.variant) ||
      '';
    const conceptVariant = rawConcept
      ? rawVariant ? `${rawConcept} / ${rawVariant}` : rawConcept
      : '';

    const templateName = rawTemplateName || conceptVariant || '';

    // elementName is ALWAYS the PDS title — this is what the operator saved in Viz Pilot
    const elementName = name || `Element ${elementId}`;

    const templateId =
      getText(entry.templateid) ||
      getText(entry['template-id']) ||
      getText(contentAny.templateid) ||
      getText(contentAny['template-id']) ||
      getText(
        (Array.isArray(entry.link) ? entry.link : [entry.link]).find(
          (l: unknown) => l && (l as Record<string, unknown>)['@_rel'] === 'template'
        )?.['@_href']
      )?.split('/').pop() ||
      '';

    const concept = rawConcept;
    const variant = rawVariant;
    const mosObjId =
      getText(entry.mosobjid) ||
      getText(entry['mos-obj-id']) ||
      getText(contentAny.mosobjid) ||
      elementId;

    // Extract field values from content/payload/model
    let fields: Record<string, string> = {};

    if (content) {
      // Try content.payload.field first
      const payload = content.payload as Record<string, unknown> | undefined;
      if (payload) {
        fields = extractFieldValues(payload);
      }

      // Try content.model.payload.field
      if (Object.keys(fields).length === 0) {
        const model = content.model as Record<string, unknown> | undefined;
        const modelPayload = model?.payload as Record<string, unknown> | undefined;
        if (modelPayload) {
          fields = extractFieldValues(modelPayload);
        }
      }

      // Try content directly
      if (Object.keys(fields).length === 0) {
        fields = extractFieldValues(content);
      }
    }

    // Build a MOS XML stub for the object (used later for MOS send)
    // objSlug uses the element name (always populated), objGroup uses templateName (may be empty)
    const mosObjXml = `<mosObj>
  <objID>${elementId}</objID>
  <objSlug>${elementName}</objSlug>
  <objGroup>${templateName || elementName}</objGroup>
  <objType>GRAPHIC</objType>
  <objTB>0</objTB>
  <objRev>1</objRev>
  <objAir>0</objAir>
  <defaultAirMethod>TAKE</defaultAirMethod>
</mosObj>`;

    return NextResponse.json({
      id: elementId,
      name,           // raw title from PDS (same as elementName)
      elementName,    // always populated — use this as the dataElementName
      templateId,
      templateName,   // may be empty — caller should fall back to elementName
      concept,
      variant,
      updated,
      fields,
      mosObjId,
      mosObjXml,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'PDS request timed out' }, { status: 502 });
    }
    console.error('PDS /dataelements/[id] failed:', err.message);
    return NextResponse.json({ error: 'PDS unreachable' }, { status: 502 });
  }
}
