import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cgItemsApi } from '@/lib/api-client';
import type { CgItem } from '@/types/types';

export function useCGItems(storyId: string | null, entryId?: string | null) {
  return useQuery({
    queryKey: ['cgItems', storyId, entryId],
    queryFn: () => cgItemsApi.list(storyId!, entryId),
    enabled: !!storyId,
  });
}

export function useCreateCGItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CgItem>) => cgItemsApi.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cgItems', variables.storyId] });
    },
  });
}

export function useUpdateCGItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cgItemId, data }: { cgItemId: string; data: Partial<CgItem> }) =>
      cgItemsApi.update(cgItemId, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['cgItems', updated.storyId] });
      queryClient.invalidateQueries({ queryKey: ['cgItem', updated.cgItemId] });
    },
  });
}

export function useDeleteCGItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cgItemId: string) => cgItemsApi.delete(cgItemId),
    onSuccess: (_, cgItemId) => {
      // We don't have storyId here easily, so invalidate all cgItems
      queryClient.invalidateQueries({ queryKey: ['cgItems'] });
    },
  });
}

export function useReorderCGItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, cgItemIds }: { storyId: string; cgItemIds: string[] }) =>
      cgItemsApi.reorder(storyId, cgItemIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cgItems', variables.storyId] });
    },
  });
}
