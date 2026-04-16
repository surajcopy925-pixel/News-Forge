import { useQuery } from '@tanstack/react-query';

export interface VizTemplate {
  id: number;
  name: string;
  updated: string;
  thumbnailUrl: string | null;
}

export interface VizTemplateField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'image';
  xsdtype: string;
  tip: string;
  defaultValue: string;
  min?: number;
  max?: number;
}

export interface VizTemplateDetail {
  id: number;
  name: string;
  concept: string;
  variant: string;
  updated: string;
  fields: VizTemplateField[];
}

async function fetchVizTemplates(search?: string): Promise<VizTemplate[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`/api/viz/templates${params}`);
  if (!res.ok) return [];
  return res.json();
}

async function fetchVizTemplateDetail(templateId: number): Promise<VizTemplateDetail> {
  const res = await fetch(`/api/viz/templates/${templateId}`);
  if (!res.ok) throw new Error(`Failed to fetch template ${templateId}`);
  return res.json();
}

export function useVizTemplates(search?: string) {
  return useQuery({
    queryKey: ['viz-templates', search || ''],
    queryFn: () => fetchVizTemplates(search),
    staleTime: 5 * 60 * 1000,
  });
}

export function useVizTemplateDetail(templateId: number | null) {
  return useQuery({
    queryKey: ['viz-template-detail', templateId],
    queryFn: () => fetchVizTemplateDetail(templateId!),
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000,
  });
}
