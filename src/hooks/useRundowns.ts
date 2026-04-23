// src/hooks/useRundowns.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rundownsApi } from '@/lib/api-client';
import type { Rundown, RundownEntry } from '@/types/types';

export function useRundowns(date?: string) {
  return useQuery({
    queryKey: ['rundowns', { date }],
    queryFn: () => (date ? rundownsApi.list({ date }) : rundownsApi.list()),
  });
}

export function useRundown(rundownId: string | null) {
  return useQuery({
    queryKey: ['rundowns', rundownId],
    queryFn: () => (rundownId ? rundownsApi.get(rundownId) : null),
    enabled: !!rundownId,
  });
}

export function useRundownEntries(rundownId: string | null) {
  return useQuery({
    queryKey: ['rundown-entries', rundownId],
    queryFn: () => (rundownId ? rundownsApi.getEntries(rundownId) : []),
    enabled: !!rundownId,
  });
}

export function useCreateRundown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Rundown>) => rundownsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rundowns'] });
    },
  });
}

export function useUpdateRundown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rundownId, updates }: { rundownId: string; updates: Partial<Rundown> }) =>
      rundownsApi.update(rundownId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rundowns'] });
      queryClient.invalidateQueries({ queryKey: ['rundowns', variables.rundownId] });
    },
  });
}

// ✅ FIX: Was passing storyId as string, API expects { storyId, userId? }
export function useAddEntryToRundown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rundownId, storyId }: { rundownId: string; storyId: string }) =>
      rundownsApi.addEntry(rundownId, { storyId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', variables.rundownId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

// ✅ FIX: Was passing entryIds array directly, API expects { entryIds: string[] }
export function useReorderEntries() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rundownId, entryIds }: { rundownId: string; entryIds: string[] }) =>
      rundownsApi.reorderEntries(rundownId, { entryIds }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', variables.rundownId] });
    },
  });
}

export function useUpdateEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rundownId, entryId, updates }: { rundownId: string; entryId: string; updates: Partial<RundownEntry> }) =>
      rundownsApi.updateEntry(rundownId, entryId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', variables.rundownId] });
    },
  });
}

export function useDeleteEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ rundownId, entryId }: { rundownId: string; entryId: string }) =>
      rundownsApi.deleteEntry(rundownId, entryId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', variables.rundownId] });
    },
  });
}

export function useSeedRundown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rundownId: string) => rundownsApi.seed(rundownId),
    onSuccess: (_, rundownId) => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', rundownId] });
    },
  });
}
