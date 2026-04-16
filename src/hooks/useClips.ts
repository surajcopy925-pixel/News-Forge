'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clipsApi } from '@/lib/api-client';
import type { StoryClip } from '@/types/types';

export function useClips() {
  return useQuery({
    queryKey: ['clips'],
    queryFn: () => clipsApi.list(),
  });
}

export function useClip(clipId: string | null) {
  return useQuery({
    queryKey: ['clips', clipId],
    queryFn: () => (clipId ? clipsApi.get(clipId) : null),
    enabled: !!clipId,
  });
}

export function useClaimClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clipId, userId }: { clipId: string; userId: string }) =>
      clipsApi.claim(clipId, { userId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clips', variables.clipId] });
      queryClient.invalidateQueries({ queryKey: ['clips', 'story'] });
    },
  });
}

export function useCompleteClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clipId, displayLabel, userId }: { clipId: string; displayLabel: string; userId?: string }) =>
      clipsApi.complete(clipId, { displayLabel, userId }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clips', variables.clipId] });
      queryClient.invalidateQueries({ queryKey: ['clips', 'story'] });
    },
  });
}

export function useSendToEditorHub() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clipId, data }: { clipId: string; data: { editingInstructions?: string; editorialNotes?: string } }) =>
      clipsApi.sendToEditorHub(clipId, data),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clips', variables.clipId] });
      queryClient.invalidateQueries({ queryKey: ['clips', 'story'] });
    },
  });
}

export function useCreateClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clip: Partial<StoryClip>) => clipsApi.create(clip as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clips', 'story'] });
    },
  });
}

export function useDeleteClip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clipId: string) => clipsApi.delete(clipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      queryClient.invalidateQueries({ queryKey: ['clips', 'story'] });
    },
  });
}
