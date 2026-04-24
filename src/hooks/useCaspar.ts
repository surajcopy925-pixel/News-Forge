'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ─── Connection Status ───────────────────────────────────
export function useCasparStatus() {
  return useQuery({
    queryKey: ['caspar-status'],
    queryFn: async () => {
      const res = await fetch('/api/caspar/connect');
      if (!res.ok) throw new Error('Failed to get status');
      return res.json() as Promise<{ connected: boolean; host: string; port: number }>;
    },
    refetchInterval: 3000,
  });
}

// ─── Connect ─────────────────────────────────────────────
export function useCasparConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/caspar/connect', { method: 'POST' });
      if (!res.ok) throw new Error('Connection failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caspar-status'] }),
  });
}

// ─── Disconnect ──────────────────────────────────────────
export function useCasparDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/caspar/connect', { method: 'DELETE' });
      if (!res.ok) throw new Error('Disconnect failed');
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caspar-status'] }),
  });
}

// ─── Play ────────────────────────────────────────────────
export function useCasparPlay() {
  return useMutation({
    mutationFn: async (params: { clip: string; channel?: number; layer?: number; loop?: boolean }) => {
      const res = await fetch('/api/caspar/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Play failed');
      return res.json();
    },
  });
}

// ─── Load (Background) ──────────────────────────────────
export function useCasparLoad() {
  return useMutation({
    mutationFn: async (params: { clip: string; channel?: number; layer?: number; auto?: boolean }) => {
      const res = await fetch('/api/caspar/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error('Load failed');
      return res.json();
    },
  });
}

// ─── Stop ────────────────────────────────────────────────
export function useCasparStop() {
  return useMutation({
    mutationFn: async (params?: { channel?: number; layer?: number }) => {
      const res = await fetch('/api/caspar/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });
      if (!res.ok) throw new Error('Stop failed');
      return res.json();
    },
  });
}

// ─── Pause ───────────────────────────────────────────────
export function useCasparPause() {
  return useMutation({
    mutationFn: async (params?: { channel?: number; layer?: number }) => {
      const res = await fetch('/api/caspar/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, action: 'pause' }),
      });
      if (!res.ok) throw new Error('Pause failed');
      return res.json();
    },
  });
}

// ─── Resume ──────────────────────────────────────────────
export function useCasparResume() {
  return useMutation({
    mutationFn: async (params?: { channel?: number; layer?: number }) => {
      const res = await fetch('/api/caspar/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, action: 'resume' }),
      });
      if (!res.ok) throw new Error('Resume failed');
      return res.json();
    },
  });
}

// ─── Clear ───────────────────────────────────────────────
export function useCasparClear() {
  return useMutation({
    mutationFn: async (params?: { channel?: number; layer?: number }) => {
      const res = await fetch('/api/caspar/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });
      if (!res.ok) throw new Error('Clear failed');
      return res.json();
    },
  });
}

// ─── Next ────────────────────────────────────────────────
export function useCasparNext() {
  return useMutation({
    mutationFn: async (params?: { channel?: number; layer?: number }) => {
      const res = await fetch('/api/caspar/next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });
      if (!res.ok) throw new Error('Next failed');
      return res.json();
    },
  });
}

// ─── Channel Info (Playback State) ───────────────────────
export function useCasparInfo(channel = 1, layer = 10, enabled = true) {
  return useQuery({
    queryKey: ['caspar-info', channel, layer],
    queryFn: async () => {
      const res = await fetch(`/api/caspar/info?channel=${channel}&layer=${layer}`);
      if (!res.ok) throw new Error('Info failed');
      return res.json() as Promise<{
        success: boolean;
        playing: boolean;
        paused: boolean;
        file: string;
        elapsed: string;
        remaining: string;
        duration: string;
        progress: number;
        currentFrame: number;
        totalFrames: number;
      }>;
    },
    refetchInterval: enabled ? 500 : false,
    enabled,
  });
}

// ─── Media List ──────────────────────────────────────────
export function useCasparMedia(enabled = false) {
  return useQuery({
    queryKey: ['caspar-media'],
    queryFn: async () => {
      const res = await fetch('/api/caspar/media');
      if (!res.ok) throw new Error('Media list failed');
      return res.json() as Promise<{ files: string[]; total: number }>;
    },
    enabled,
  });
}

// ─── Playlists ───────────────────────────────────────────
export function useCasparPlaylists() {
  return useQuery({
    queryKey: ['caspar-playlists'],
    queryFn: async () => {
      const res = await fetch('/api/caspar/playlists');
      if (!res.ok) throw new Error('Playlists failed');
      return res.json();
    },
  });
}

// ─── Prepare (Copy Files) ────────────────────────────────
export function useCasparPrepare() {
  return useMutation({
    mutationFn: async (params?: { rundownId?: string; storyId?: string }) => {
      const res = await fetch('/api/caspar/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {}),
      });
      if (!res.ok) throw new Error('Prepare failed');
      return res.json();
    },
  });
}
