import { useState, useEffect, useCallback, useRef } from 'react';
import type { ChannelInfo, MediaFile } from '../types';

const API = '';

const defaultInfo: ChannelInfo = {
  playing: false, paused: false, foreground: '', background: '',
  loop: false, clipName: '', totalFrames: 0, currentFrame: 0,
  fps: 25, timecode: '00:00:00:00',
};

export function useCasparConnection() {
  const [connected, setConnected] = useState(false);
  const [host, setHost] = useState('');
  const pollRef = useRef<any>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/status`);
      const data = await res.json();
      setConnected(data.connected);
      setHost(data.host || '');
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    pollRef.current = setInterval(checkStatus, 3000);
    return () => clearInterval(pollRef.current);
  }, [checkStatus]);

  const connect = useCallback(async () => {
    const res = await fetch(`${API}/api/connect`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) setConnected(true);
    return data;
  }, []);

  const disconnect = useCallback(async () => {
    const res = await fetch(`${API}/api/disconnect`, { method: 'POST' });
    const data = await res.json();
    if (data.ok) setConnected(false);
    return data;
  }, []);

  return { connected, host, connect, disconnect, refresh: checkStatus };
}

export function useChannelInfo(channel: number, layer: number, connected: boolean) {
  const [info, setInfo] = useState<ChannelInfo>(defaultInfo);
  const pollRef = useRef<any>(null);

  useEffect(() => {
    if (!connected) {
      setInfo(defaultInfo);
      return;
    }

    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/info/${channel}/${layer}`);
        const data = await res.json();
        setInfo({
          playing: data.playing || false,
          paused: data.paused || false,
          foreground: data.foreground || '',
          background: data.background || '',
          loop: data.loop || false,
          clipName: data.clipName || '',
          totalFrames: data.totalFrames || 0,
          currentFrame: data.currentFrame || 0,
          fps: data.fps || 25,
          timecode: data.timecode || '00:00:00:00',
        });
      } catch { /* silent */ }
    };

    poll();
    pollRef.current = setInterval(poll, 500);
    return () => clearInterval(pollRef.current);
  }, [channel, layer, connected]);

  return info;
}

export function useMediaList(connected: boolean) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/media`);
      const data = await res.json();
      setFiles(data.files || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [connected]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  return { files, loading, refresh };
}

export function useCasparTransport() {
  const sendCommand = useCallback(async (endpoint: string, body: any = {}) => {
    try {
      const res = await fetch(`${API}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err: any) {
      console.error(`[Transport] ${endpoint} failed:`, err);
      return { ok: false, error: err.message };
    }
  }, []);

  return {
    play: (channel: number, layer: number, clip: string, loop = false) =>
      sendCommand('play', { channel, layer, file: clip, loop }),
    stop: (channel: number, layer: number) =>
      sendCommand('stop', { channel, layer }),
    pause: (channel: number, layer: number) =>
      sendCommand('pause', { channel, layer }),
    resume: (channel: number, layer: number) =>
      sendCommand('resume', { channel, layer }),
    clear: (channel: number, layer?: number) =>
      sendCommand('clear', { channel, layer }),
    load: (channel: number, layer: number, clip: string, auto = false) =>
      sendCommand('load', { channel, layer, file: clip, auto }),
  };
}
