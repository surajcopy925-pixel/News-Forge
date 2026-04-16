'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storiesApi, clipsApi } from '@/lib/api-client';
import type { Story } from '@/types/types';

export function useStories() {
  return useQuery({
    queryKey: ['stories'],
    queryFn: () => storiesApi.list(),
  });
}

export function useStoryClips(storyId: string | null) {
  return useQuery({
    queryKey: ['clips', 'story', storyId],
    queryFn: () => (storyId ? clipsApi.list({ storyId }) : []),
    enabled: !!storyId,
  });
}

export function useStory(storyId: string | null) {
  return useQuery({
    queryKey: ['stories', storyId],
    queryFn: () => (storyId ? storiesApi.get(storyId) : null),
    enabled: !!storyId,
  });
}

export function useCreateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (story: Partial<Story>) => storiesApi.create(story as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useUpdateStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: Partial<Story> }) =>
      storiesApi.update(storyId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories', variables.storyId] });
    },
  });
}

export function useDeleteStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => storiesApi.delete(storyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    },
  });
}

export function useSubmitStory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) => storiesApi.update(storyId, { status: 'SUBMITTED' }),
    onSuccess: (_, storyId) => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['stories', storyId] });
    },
  });
}

export function useSendToRundown() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, data }: { storyId: string; data: { rundownId: string; userId?: string } }) =>
      storiesApi.sendToRundown(storyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stories'] });
      queryClient.invalidateQueries({ queryKey: ['rundowns'] });
      queryClient.invalidateQueries({ queryKey: ['rundown-entries'] });
    },
  });
}
