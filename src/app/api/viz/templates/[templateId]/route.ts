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

interface TemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'image';
  xsdtype: string;
  tip: string;
  defaultValue: string;
  min?: number;
  max?: number;
}

function extractFields(
  container: Record<string, unknown>,
  fields: TemplateField[]
): void {
  const rawFielddefs = container.fielddef;
  if (!rawFielddefs) return;

  const arr = Array.isArray(rawFielddefs) ? rawFielddefs : [rawFielddefs];

  for (const fdef of arr) {
    const fd = fdef as Record<string, unknown>;
    const name = String(fd['@_name'] || '');
    if (!name) continue;

    if (name.startsWith('-') || name === 'auto-generated-title') {
      if (fd.fielddef) extractFields(fd, fields);
      continue;
    }

    const label = String(fd['@_label'] || name);
    const mediatype = String(fd['@_mediatype'] || 'text/plain');

    let xsdtype = '';
    const typeEl = fd.type as Record<string, unknown> | undefined;
    if (typeEl && typeof typeEl === 'object') {
      xsdtype = String(typeEl['@_xsdtype'] || '');
    }

    let type: 'text' | 'number' | 'image' = 'text';
    if (mediatype === 'text/plain' && (xsdtype === 'integer' || xsdtype === 'decimal')) {
      type = 'number';
    } else if (mediatype.startsWith('image/')) {
      type = 'image';
    }

    const defaultValue = fd.value ? getTextContent(fd.value) : '';

    let min: number | undefined;
    let max: number | undefined;
    if (type === 'number') {
      const minVal = fd.minimum ?? (typeEl && typeEl.minimum);
      const maxVal = fd.maximum ?? (typeEl && typeEl.maximum);
      if (minVal !== undefined) min = Number(minVal);
      if (maxVal !== undefined) max = Number(maxVal);
    }

    fields.push({ name, label, type, xsdtype, tip: '', defaultValue, min, max });
  }
}

function extractConcept(parsed: Record<string, unknown>): string {
  try {
    const entry = (parsed.entry as Record<string, unknown>) || parsed;
    const content = entry.content as Record<string, unknown> | undefined;
    if (!content) return '';

    const payload =
      (content.payload as Record<string, unknown>) ||
      ((content.model as Record<string, unknown>)?.payload as Record<string, unknown>);
    if (payload) {
      const rawFields = payload.field;
      if (rawFields) {
        const fieldArr = Array.isArray(rawFields) ? rawFields : [rawFields];
        const conceptField = fieldArr.find(
          (f: Record<string, unknown>) => f['@_name'] === 'concept'
        );
        if (conceptField) {
          return getTextContent((conceptField as Record<string, unknown>).value);
        }
      }
    }
  } catch { /* best-effort */ }
  return '';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const { templateId } = await params;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${VIZ_PDS_URL}/templates/${templateId}`, {
      signal: controller.signal,
      headers: { Accept: 'application/atom+xml, application/xml, */*' },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json({ error: `PDS returned ${response.status}` }, { status: 502 });
    }

    const xml = await response.text();
    const parser = createParser();
    const parsed = parser.parse(xml);

    const feedEntry = (parsed.feed as Record<string, unknown>)?.entry;
    const entry =
      (parsed.entry as Record<string, unknown>) ||
      (Array.isArray(feedEntry) ? feedEntry[0] as Record<string, unknown> : undefined) ||
      (parsed as Record<string, unknown>);

    const title = getTextContent(entry.title);
    const updated = getTextContent(entry.updated);

    const fields: TemplateField[] = [];
    const content = entry.content as Record<string, unknown> | undefined;

    if (content) {
      const model = content.model as Record<string, unknown> | undefined;
      if (model?.schema) {
        extractFields(model.schema as Record<string, unknown>, fields);
      }

      if (fields.length === 0) {
        const payload = content.payload as Record<string, unknown> | undefined;
        const pModel = payload?.model as Record<string, unknown> | undefined;
        if (pModel?.schema) {
          extractFields(pModel.schema as Record<string, unknown>, fields);
        }
      }

      if (fields.length === 0 && content.schema) {
        extractFields(content.schema as Record<string, unknown>, fields);
      }
    }

    if (fields.length === 0) {
      try {
        const modelResp = await fetch(`${VIZ_PDS_URL}/templates/${templateId}/bgfx_master`, {
          headers: { Accept: 'application/xml, */*' },
        });
        if (modelResp.ok) {
          const modelXml = await modelResp.text();
          const modelParsed = parser.parse(modelXml);
          const model = (modelParsed.model as Record<string, unknown>) || modelParsed;
          if (model.schema) {
            extractFields(model.schema as Record<string, unknown>, fields);
          }
        }
      } catch {
        console.error(`Failed to fetch bgfx_master for template ${templateId}`);
      }
    }

    if (fields.length === 0) {
      console.warn(`No fields for template ${templateId}. Keys:`, Object.keys(parsed));
    }

    const concept = extractConcept(parsed);

    return NextResponse.json({
      id: parseInt(templateId, 10),
      name: title,
      concept,
      variant: title,
      updated,
      fields,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'PDS request timed out' }, { status: 502 });
    }
    console.error('PDS request failed:', err.message);
    return NextResponse.json({ error: 'PDS unreachable' }, { status: 502 });
  }
}
