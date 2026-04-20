import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface PrompterStatus {
  listening: boolean;
  connected: boolean;
  port: number;
  activeRundownId: string | null;
  ncsId: string;
  prompterId: string;
  healthLog: Array<{ timestamp: string; event: string; details?: string }>;
}

/**
 * Hook for managing teleprompter connection and status
 */
export function usePrompterStatus() {
  return useQuery<PrompterStatus>({
    queryKey: ['prompter', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/prompter/connect');
      if (!res.ok) throw new Error('Failed to get prompter status');
      return res.json();
    },
    refetchInterval: 3000,
  });
}

/**
 * Hook for starting the prompter MOS server
 */
export function usePrompterConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/prompter/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start prompter server');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompter', 'status'] }),
  });
}

/**
 * Hook for stopping the prompter server
 */
export function usePrompterDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/prompter/connect', { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompter', 'status'] }),
  });
}

/**
 * Hook for sending a rundown's scripts to the prompter
 */
export function useSendToPrompter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rundownId: string) => {
      const res = await fetch('/api/prompter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rundownId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send to prompter');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prompter', 'status'] }),
  });
}
