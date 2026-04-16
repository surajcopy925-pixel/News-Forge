import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MosBridgeStatus } from '@/lib/mos-bridge';

// ─── MOS Status (polls every 5s) ────────────────────────
export function useMosStatus() {
  return useQuery<MosBridgeStatus>({
    queryKey: ['mos', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/mos');
      if (!res.ok) throw new Error('Failed to get MOS status');
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 3000,
  });
}

// ─── Start MOS Server ────────────────────────────────────
export function useMosConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mos', 'status'] }),
  });
}

// ─── Stop MOS Server ─────────────────────────────────────
export function useMosDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/mos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop' }),
      });
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mos', 'status'] }),
  });
}

// ─── Send Rundown to Viz ─────────────────────────────────
export function useSendRundownToViz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rundownId,
      action,
    }: {
      rundownId: string;
      action: 'create' | 'replace' | 'delete';
    }) => {
      const res = await fetch(`/api/mos/rundown/${rundownId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mos', 'status'] });
      qc.invalidateQueries({ queryKey: ['cgItems'] });
      qc.invalidateQueries({ queryKey: ['rundowns'] });
    },
  });
}

// ─── Send CG Command (cue/take/clear) ───────────────────
export function useMosSendCommand() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      type: 'cue' | 'take' | 'clear';
      roId: string;
      storyId: string;
      itemId: string;
    }) => {
      const res = await fetch('/api/mos/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Command failed');
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mos', 'status'] }),
  });
}
