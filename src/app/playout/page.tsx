// src/app/playout/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────
// Types
// ─────────────────────────────────────
interface PlaylistClip {
  id: string;
  storyId: string;
  storyTitle: string;
  fileName: string;
  playoutName: string;
  orderIndex: number;
}

interface PlaybackInfo {
  playing: boolean;
  paused: boolean;
  file: string;
  elapsed: string;
  remaining: string;
  duration: string;
  progress: number;
  currentFrame: number;
  totalFrames: number;
}

interface RundownData {
  id: string;
  title: string;
  status: string;
  clipCount: number;
  storyCount?: number;
  updatedAt: string;
  clips: PlaylistClip[];
  stories?: PlaylistClip[];
  loaded?: boolean;
}

const EMPTY_PLAYBACK: PlaybackInfo = {
  playing: false,
  paused: false,
  file: '',
  elapsed: '00:00:00.00',
  remaining: '00:00:00.00',
  duration: '00:00:00.00',
  progress: 0,
  currentFrame: 0,
  totalFrames: 0,
};

// ─────────────────────────────────────
// Transport Controls (inline component)
// ─────────────────────────────────────
function TransportBar({
  label,
  channel,
  isPlaying,
  isPaused,
  isConnected,
  hasClip,
  hasNext,
  hasPrev,
  onPlay,
  onStop,
  onPause,
  onNext,
  onPrev,
  onCue,
}: {
  label: string;
  channel: number;
  isPlaying: boolean;
  isPaused: boolean;
  isConnected: boolean;
  hasClip: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCue: () => void;
}) {
  const btn =
    'w-10 h-8 flex items-center justify-center rounded text-sm transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-mono text-zinc-500 w-16">
        {label} CH:{channel}
      </span>
      <button onClick={onCue} disabled={!isConnected || !hasClip} title="Cue"
        className={`${btn} bg-blue-900/60 hover:bg-blue-800/80 text-blue-300 border border-blue-700/50`}>
        ⏏
      </button>
      <button onClick={onPrev} disabled={!isConnected || !hasPrev} title="Prev"
        className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/50`}>
        ⏮
      </button>
      <button onClick={onStop} disabled={!isConnected || (!isPlaying && !isPaused)} title="Stop"
        className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/50`}>
        ⏹
      </button>
      <button onClick={onPause} disabled={!isConnected || !isPlaying} title={isPaused ? 'Resume' : 'Pause'}
        className={`${btn} ${isPaused ? 'bg-yellow-900/60 text-yellow-300 border-yellow-700/50' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-600/50'} border`}>
        ⏸
      </button>
      <button onClick={onPlay} disabled={!isConnected || !hasClip} title="Play"
        className={`${btn} ${isPlaying && !isPaused ? 'bg-green-700 text-white border-green-500' : 'bg-green-900/60 hover:bg-green-800/80 text-green-300 border-green-700/50'} border w-12`}>
        ▶
      </button>
      <button onClick={onNext} disabled={!isConnected || !hasNext} title="Next"
        className={`${btn} bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-600/50`}>
        ⏭
      </button>
    </div>
  );
}

// ─────────────────────────────────────
// Single Player Panel
// ─────────────────────────────────────
function PlayerPanel({
  label,
  labelColor,
  badgeColor,
  channel,
  clipName,
  playback,
  isConnected,
  hasClip,
  hasNext,
  hasPrev,
  onPlay,
  onStop,
  onPause,
  onNext,
  onPrev,
  onCue,
}: {
  label: string;
  labelColor: string;
  badgeColor: string;
  channel: number;
  clipName: string | null;
  playback: PlaybackInfo;
  isConnected: boolean;
  hasClip: boolean;
  hasNext: boolean;
  hasPrev: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onCue: () => void;
}) {
  return (
    <div className="flex flex-col h-full border border-zinc-700 rounded-sm overflow-hidden">
      {/* Video preview area */}
      <div className="flex-1 bg-black relative flex items-center justify-center min-h-[120px]">
        {clipName ? (
          <div className="text-center px-2">
            <div className="text-3xl mb-1">🎬</div>
            <div className="text-[10px] font-mono text-zinc-400">
              CasparCG CH:{channel} Output
            </div>
            <div className="text-[9px] font-mono text-zinc-500 mt-0.5 max-w-[220px] truncate">
              {clipName}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl mb-1 opacity-20">⬛</div>
            <div className="text-[10px] font-mono text-zinc-600">No clip</div>
          </div>
        )}
        {/* Channel label */}
        <div className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded ${labelColor}`}>
          {label}
        </div>
        {/* Status badge */}
        {clipName && playback.playing && !playback.paused && (
          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold font-mono rounded animate-pulse ${badgeColor}`}>
            {label === 'PGM' ? 'ON AIR' : 'PREVIEW'}
          </div>
        )}
        {clipName && playback.paused && (
          <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-yellow-600 text-black text-[9px] font-bold font-mono rounded">
            PAUSED
          </div>
        )}
      </div>

      {/* Timecodes + progress + transport */}
      <div className="bg-zinc-900 px-2 py-1.5 border-t border-zinc-700">
        {/* Timecodes row */}
        <div className="flex justify-between mb-1">
          <div>
            <div className="text-[8px] font-mono text-zinc-500">Elapsed</div>
            <div className="text-sm font-mono text-green-400 tabular-nums">{playback.elapsed}</div>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-mono text-zinc-500">Remaining</div>
            <div className="text-sm font-mono text-yellow-400 tabular-nums">{playback.remaining}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-mono text-zinc-500">Duration</div>
            <div className="text-sm font-mono text-blue-400 tabular-nums">{playback.duration}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 bg-zinc-700 rounded-full overflow-hidden mb-1.5">
          <div
            className={`h-full transition-all duration-300 ${label === 'PGM' ? 'bg-red-500' : 'bg-green-500'}`}
            style={{ width: `${playback.progress}%` }}
          />
        </div>
        {/* Transport controls */}
        <div className="flex justify-center">
          <TransportBar
            label={label}
            channel={channel}
            isPlaying={!!clipName && (playback.playing || playback.paused)}
            isPaused={playback.paused}
            isConnected={isConnected}
            hasClip={hasClip}
            hasNext={hasNext}
            hasPrev={hasPrev}
            onPlay={onPlay}
            onStop={onStop}
            onPause={onPause}
            onNext={onNext}
            onPrev={onPrev}
            onCue={onCue}
          />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────
export default function PlayoutPage() {
  // Connection
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Playlist
  const [playlist, setPlaylist] = useState<PlaylistClip[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // PGM — Channel 1, Layer 10
  const [pgmClip, setPgmClip] = useState<string | null>(null);
  const [pgmIndex, setPgmIndex] = useState(-1);
  const [pgmPlayback, setPgmPlayback] = useState<PlaybackInfo>({ ...EMPTY_PLAYBACK });

  // PVW — Channel 2, Layer 10
  const [pvwClip, setPvwClip] = useState<string | null>(null);
  const [pvwIndex, setPvwIndex] = useState(-1);
  const [pvwPlayback, setPvwPlayback] = useState<PlaybackInfo>({ ...EMPTY_PLAYBACK });

  // Rundowns
  const [rundowns, setRundowns] = useState<RundownData[]>([]);
  const [totalRundownCount, setTotalRundownCount] = useState(0);
  const [loadingRundownId, setLoadingRundownId] = useState<string | null>(null);

  const [prompterConnected, setPrompterConnected] = useState(false);
  const [prompterConnecting, setPrompterConnecting] = useState(false);
  const [prompterSending, setPrompterSending] = useState<string | null>(null);

  // Polling
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ═══════════════════════════════════
  // API helpers
  // ═══════════════════════════════════
  const apiPlay = useCallback(async (clip: string, channel: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/caspar/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clip, channel, layer: 10 }),
      });
      const d = await res.json();
      return d.success;
    } catch { return false; }
  }, []);

  const apiStop = useCallback(async (channel: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/caspar/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, layer: 10 }),
      });
      const d = await res.json();
      return d.success;
    } catch { return false; }
  }, []);

  const apiLoad = useCallback(async (clip: string, channel: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/caspar/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clip, channel, layer: 10, auto: false }),
      });
      const d = await res.json();
      return d.success;
    } catch { return false; }
  }, []);

  const apiPause = useCallback(async (channel: number, action: 'pause' | 'resume'): Promise<boolean> => {
    try {
      const res = await fetch('/api/caspar/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, layer: 10, action }),
      });
      const d = await res.json();
      return d.success;
    } catch { return false; }
  }, []);

  // ═══════════════════════════════════
  // Connection
  // ═══════════════════════════════════
  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const res = await fetch('/api/caspar/connect', { method: 'POST' });
      const d = await res.json();
      setConnected(d.connected || false);
    } catch { setConnected(false); }
    setConnecting(false);
  }, []);

  const handleDisconnect = useCallback(async () => {
    try { await fetch('/api/caspar/connect', { method: 'DELETE' }); } catch {}
    setConnected(false);
    setPgmClip(null);
    setPvwClip(null);
    setPgmPlayback({ ...EMPTY_PLAYBACK });
    setPvwPlayback({ ...EMPTY_PLAYBACK });
  }, []);

  // ═══ Prompter ═══
  const connectPrompter = useCallback(async () => {
    setPrompterConnecting(true);
    try {
      const res = await fetch('/api/prompter/connect', { method: 'POST' });
      const d = await res.json();
      setPrompterConnected(d.connected || false);
    } catch { setPrompterConnected(false); }
    setPrompterConnecting(false);
  }, []);

  const disconnectPrompter = useCallback(async () => {
    try { await fetch('/api/prompter/connect', { method: 'DELETE' }); } catch {}
    setPrompterConnected(false);
  }, []);

  const sendToPrompter = useCallback(async (rundownId: string) => {
    setPrompterSending(rundownId);
    try {
      const res = await fetch('/api/prompter/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rundownId }),
      });
      const d = await res.json();
      if (!d.success) {
        console.error('Prompter send failed:', d.error);
      } else {
        console.log(`Prompter: sent ${d.totalStories} stories (${d.storiesWithScript} with script)`);
      }
    } catch (err) {
      console.error('Prompter send error:', err);
    }
    setPrompterSending(null);
  }, []);

  // Check connection on mount
  useEffect(() => {
    fetch('/api/caspar/connect')
      .then(r => r.json())
      .then(d => setConnected(d.connected || false))
      .catch(() => setConnected(false));
  }, []);

  useEffect(() => {
    fetch('/api/prompter/connect')
      .then(r => r.json())
      .then(d => setPrompterConnected(d.connected || false))
      .catch(() => setPrompterConnected(false));
  }, []);

  // Load rundowns on mount
  useEffect(() => {
    fetch('/api/caspar/playlists')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setRundowns(d.playlists.map((p: any) => ({
            ...p,
            storyCount: p.storyCount || p.stories?.length || 0,
          })));
          setTotalRundownCount(d.totalRundowns || d.playlists.length);
        }
      })
      .catch(() => {});
  }, []);

  // ═══ Polling ═══
  useEffect(() => {
    // Only poll when connected AND something is actually playing
    if (!connected) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    // Don't start polling if nothing is playing on either channel
    if (!pgmClip && !pvwClip) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }

    pollRef.current = setInterval(async () => {
      try {
        // Only poll PGM if something is playing
        if (pgmClip) {
          const res = await fetch('/api/caspar/info?channel=1&layer=10');
          const d = await res.json();
          if (d.success) {
            setPgmPlayback({
              playing: d.playing, paused: d.paused, file: d.file,
              elapsed: d.elapsed, remaining: d.remaining, duration: d.duration,
              progress: d.progress, currentFrame: d.currentFrame || 0, totalFrames: d.totalFrames || 0,
            });
            // Auto-advance when clip finishes
            if (d.totalFrames > 0 && d.currentFrame >= d.totalFrames - 2) {
              const nextIdx = pgmIndex + 1;
              if (nextIdx < playlist.length) {
                const nextClip = playlist[nextIdx];
                setPgmIndex(nextIdx); setCurrentIndex(nextIdx);
                const ok = await apiPlay(nextClip.playoutName, 1);
                if (ok) {
                  setPgmClip(nextClip.playoutName);
                  if (nextIdx + 1 < playlist.length) apiLoad(playlist[nextIdx + 1].playoutName, 1);
                }
              } else {
                setPgmClip(null); setPgmPlayback({ ...EMPTY_PLAYBACK });
              }
            }
          }
        }

        // Only poll PVW if something is playing
        if (pvwClip) {
          const res = await fetch('/api/caspar/info?channel=2&layer=10');
          const d = await res.json();
          if (d.success) {
            setPvwPlayback({
              playing: d.playing, paused: d.paused, file: d.file,
              elapsed: d.elapsed, remaining: d.remaining, duration: d.duration,
              progress: d.progress, currentFrame: d.currentFrame || 0, totalFrames: d.totalFrames || 0,
            });
          }
        }
      } catch {
        // Silently ignore polling errors
      }
    }, 500);

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, pgmClip, pvwClip, pgmIndex]);

  // ═══════════════════════════════════
  // PGM handlers (Channel 1)
  // ═══════════════════════════════════
  const pgmPlay = useCallback(async () => {
    let idx = pgmIndex;
    if (idx < 0) idx = currentIndex;
    if (idx < 0) idx = 0;
    if (idx >= playlist.length) return;

    const clip = playlist[idx];
    const ok = await apiPlay(clip.playoutName, 1);
    if (ok) {
      setPgmIndex(idx);
      setPgmClip(clip.playoutName);
      setCurrentIndex(idx);
      setPgmPlayback(prev => ({ ...prev, playing: true, paused: false }));
      // Preload next
      if (idx + 1 < playlist.length) {
        apiLoad(playlist[idx + 1].playoutName, 1);
      }
    }
  }, [pgmIndex, currentIndex, playlist, apiPlay, apiLoad]);

  const pgmStop = useCallback(async () => {
    await apiStop(1);
    setPgmClip(null);
    setPgmPlayback({ ...EMPTY_PLAYBACK });
  }, [apiStop]);

  const pgmPause = useCallback(async () => {
    if (pgmPlayback.paused) {
      await apiPause(1, 'resume');
      setPgmPlayback(prev => ({ ...prev, paused: false }));
    } else {
      await apiPause(1, 'pause');
      setPgmPlayback(prev => ({ ...prev, paused: true }));
    }
  }, [pgmPlayback.paused, apiPause]);

  const pgmNext = useCallback(async () => {
    const nextIdx = pgmIndex + 1;
    if (nextIdx >= playlist.length) return;
    const clip = playlist[nextIdx];
    const ok = await apiPlay(clip.playoutName, 1);
    if (ok) {
      setPgmIndex(nextIdx);
      setCurrentIndex(nextIdx);
      setPgmClip(clip.playoutName);
      setPgmPlayback(prev => ({ ...prev, playing: true, paused: false }));
      if (nextIdx + 1 < playlist.length) {
        apiLoad(playlist[nextIdx + 1].playoutName, 1);
      }
    }
  }, [pgmIndex, playlist, apiPlay, apiLoad]);

  const pgmPrev = useCallback(async () => {
    const prevIdx = pgmIndex - 1;
    if (prevIdx < 0) return;
    const clip = playlist[prevIdx];
    const ok = await apiPlay(clip.playoutName, 1);
    if (ok) {
      setPgmIndex(prevIdx);
      setCurrentIndex(prevIdx);
      setPgmClip(clip.playoutName);
      setPgmPlayback(prev => ({ ...prev, playing: true, paused: false }));
    }
  }, [pgmIndex, playlist, apiPlay]);

  const pgmCue = useCallback(async () => {
    let idx = pgmIndex;
    if (idx < 0) idx = currentIndex;
    if (idx < 0 || idx >= playlist.length) return;
    await apiLoad(playlist[idx].playoutName, 1);
  }, [pgmIndex, currentIndex, playlist, apiLoad]);

  // ═══════════════════════════════════
  // PVW handlers (Channel 2)
  // ═══════════════════════════════════
  const pvwPlay = useCallback(async () => {
    let idx = pvwIndex;
    if (idx < 0) return;
    if (idx >= playlist.length) return;

    const clip = playlist[idx];
    const ok = await apiPlay(clip.playoutName, 2);
    if (ok) {
      setPvwClip(clip.playoutName);
      setPvwPlayback(prev => ({ ...prev, playing: true, paused: false }));
    }
  }, [pvwIndex, playlist, apiPlay]);

  const pvwStop = useCallback(async () => {
    await apiStop(2);
    setPvwClip(null);
    setPvwPlayback({ ...EMPTY_PLAYBACK });
  }, [apiStop]);

  const pvwPause = useCallback(async () => {
    if (pvwPlayback.paused) {
      await apiPause(2, 'resume');
      setPvwPlayback(prev => ({ ...prev, paused: false }));
    } else {
      await apiPause(2, 'pause');
      setPvwPlayback(prev => ({ ...prev, paused: true }));
    }
  }, [pvwPlayback.paused, apiPause]);

  const pvwNext = useCallback(async () => {
    const nextIdx = pvwIndex + 1;
    if (nextIdx >= playlist.length) return;
    const clip = playlist[nextIdx];
    const ok = await apiPlay(clip.playoutName, 2);
    if (ok) {
      setPvwIndex(nextIdx);
      setPvwClip(clip.playoutName);
      setPvwPlayback(prev => ({ ...prev, playing: true, paused: false }));
    }
  }, [pvwIndex, playlist, apiPlay]);

  const pvwPrev = useCallback(async () => {
    const prevIdx = pvwIndex - 1;
    if (prevIdx < 0) return;
    const clip = playlist[prevIdx];
    const ok = await apiPlay(clip.playoutName, 2);
    if (ok) {
      setPvwIndex(prevIdx);
      setPvwClip(clip.playoutName);
      setPvwPlayback(prev => ({ ...prev, playing: true, paused: false }));
    }
  }, [pvwIndex, playlist, apiPlay]);

  const pvwCue = useCallback(async () => {
    if (pvwIndex < 0 || pvwIndex >= playlist.length) return;
    await apiLoad(playlist[pvwIndex].playoutName, 2);
  }, [pvwIndex, playlist, apiLoad]);

  // ═══════════════════════════════════
  // Playlist actions
  // ═══════════════════════════════════
  const loadRundown = useCallback(async (rundownId: string) => {
    setLoadingRundownId(rundownId);
    const rundown = rundowns.find(r => r.id === rundownId);
    if (!rundown || rundown.clips.length === 0) { setLoadingRundownId(null); return; }

    try {
      await fetch('/api/caspar/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rundownId }),
      });
    } catch {}

    setPlaylist(prev => {
      const newClips = rundown.clips.map((clip, i) => ({ ...clip, orderIndex: prev.length + i }));
      return [...prev, ...newClips];
    });
    setCurrentIndex(prev => prev < 0 ? 0 : prev);
    setRundowns(prev => prev.map(r => r.id === rundownId ? { ...r, loaded: true } : r));
    setLoadingRundownId(null);
  }, [rundowns]);

  // Double-click clip → play on PGM
  const doubleClickClip = useCallback(async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const clip = playlist[index];
    setCurrentIndex(index);
    setPgmIndex(index);

    const ok = await apiPlay(clip.playoutName, 1);
    if (ok) {
      setPgmClip(clip.playoutName);
      setPgmPlayback(prev => ({ ...prev, playing: true, paused: false }));
      if (index + 1 < playlist.length) {
        apiLoad(playlist[index + 1].playoutName, 1);
      }
    }
  }, [playlist, apiPlay, apiLoad]);

  // Send to PGM button
  const sendToPgm = useCallback(async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const clip = playlist[index];
    setCurrentIndex(index);
    setPgmIndex(index);

    const ok = await apiPlay(clip.playoutName, 1);
    if (ok) {
      setPgmClip(clip.playoutName);
      setPgmPlayback(prev => ({ ...prev, playing: true, paused: false }));
      if (index + 1 < playlist.length) {
        apiLoad(playlist[index + 1].playoutName, 1);
      }
    }
  }, [playlist, apiPlay, apiLoad]);

  // Send to PVW button
  const sendToPvw = useCallback(async (index: number) => {
    if (index < 0 || index >= playlist.length) return;
    const clip = playlist[index];
    setPvwIndex(index);

    const ok = await apiPlay(clip.playoutName, 2);
    if (ok) {
      setPvwClip(clip.playoutName);
      setPvwPlayback(prev => ({ ...prev, playing: true, paused: false }));
    }
  }, [playlist, apiPlay]);

  const removeClip = useCallback((index: number) => {
    setPlaylist(prev => prev.filter((_, i) => i !== index));
    if (index < pgmIndex) setPgmIndex(prev => prev - 1);
    else if (index === pgmIndex) { setPgmClip(null); setPgmPlayback({ ...EMPTY_PLAYBACK }); }
    if (index < pvwIndex) setPvwIndex(prev => prev - 1);
    else if (index === pvwIndex) { setPvwClip(null); setPvwPlayback({ ...EMPTY_PLAYBACK }); }
    if (index < currentIndex) setCurrentIndex(prev => prev - 1);
    else if (index === currentIndex) setCurrentIndex(-1);
  }, [pgmIndex, pvwIndex, currentIndex]);

  const clearAll = useCallback(async () => {
    await apiStop(1);
    await apiStop(2);
    setPlaylist([]);
    setCurrentIndex(-1);
    setPgmClip(null); setPgmIndex(-1); setPgmPlayback({ ...EMPTY_PLAYBACK });
    setPvwClip(null); setPvwIndex(-1); setPvwPlayback({ ...EMPTY_PLAYBACK });
    setRundowns(prev => prev.map(r => ({ ...r, loaded: false })));
  }, [apiStop]);

  // ═══════════════════════════════════
  // Status helpers for playlist
  // ═══════════════════════════════════
  const getClipStatus = (clip: PlaylistClip, index: number) => {
    if (pgmClip === clip.playoutName) return 'on-air';
    if (pvwClip === clip.playoutName) return 'preview';
    if (index === currentIndex) return 'cued';
    return 'ready';
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case 'on-air': return 'bg-red-600 text-white';
      case 'preview': return 'bg-green-600 text-white';
      case 'cued': return 'bg-yellow-600 text-black';
      default: return 'bg-zinc-700 text-zinc-300';
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case 'on-air': return 'ON AIR';
      case 'preview': return 'PVW';
      case 'cued': return 'CUED';
      default: return 'READY';
    }
  };

  const rowStyle = (s: string) => {
    switch (s) {
      case 'on-air': return 'bg-red-950/40 border-l-2 border-l-red-500';
      case 'preview': return 'bg-green-950/30 border-l-2 border-l-green-500';
      case 'cued': return 'bg-yellow-950/20 border-l-2 border-l-yellow-500';
      default: return 'border-l-2 border-l-transparent';
    }
  };

  // ═══════════════════════════════════
  // RENDER
  // ═══════════════════════════════════
  return (
    <div className="h-screen bg-zinc-950 text-zinc-200 flex flex-col overflow-hidden select-none">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold font-mono tracking-wider text-zinc-300">NEWSFORGE PLAYOUT</h1>
          {/* CasparCG status */}
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-[10px] font-mono text-zinc-500">{connected ? 'CasparCG' : 'DISCONNECTED'}</span>
          {/* Prompter status */}
          <span className={`w-2 h-2 rounded-full ${prompterConnected ? 'bg-purple-500' : 'bg-zinc-600'}`} />
          <span className="text-[10px] font-mono text-zinc-500">{prompterConnected ? 'Prompter' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Prompter connect/disconnect */}
          {prompterConnected ? (
            <button onClick={disconnectPrompter}
              className="px-2 py-1 text-[10px] font-mono bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 rounded border border-purple-700/50">
              📜 Prompter ✓
            </button>
          ) : (
            <button onClick={connectPrompter} disabled={prompterConnecting}
              className="px-2 py-1 text-[10px] font-mono bg-zinc-800 hover:bg-purple-900/50 text-zinc-400 hover:text-purple-300 rounded border border-zinc-700 disabled:opacity-50">
              {prompterConnecting ? '📜 Connecting...' : '📜 Prompter'}
            </button>
          )}
          {/* CasparCG connect/disconnect */}
          {connected ? (
            <button onClick={handleDisconnect}
              className="px-3 py-1 text-xs font-mono bg-red-900/50 hover:bg-red-800/60 text-red-400 rounded border border-red-700/50">
              Disconnect
            </button>
          ) : (
            <button onClick={handleConnect} disabled={connecting}
              className="px-3 py-1 text-xs font-mono bg-green-900/50 hover:bg-green-800/60 text-green-400 rounded border border-green-700/50 disabled:opacity-50">
              {connecting ? 'Connecting...' : 'Connect CasparCG'}
            </button>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* ═══ LEFT SIDE: Dual Players ═══ */}
        <div className="w-[55%] flex flex-col gap-1 p-1 border-r border-zinc-700 min-h-0">
          {/* PGM Player — top half */}
          <div className="flex-1 min-h-0">
            <PlayerPanel
              label="PGM"
              labelColor="bg-red-600 text-white"
              badgeColor="bg-red-600 text-white"
              channel={1}
              clipName={pgmClip}
              playback={pgmPlayback}
              isConnected={connected}
              hasClip={pgmIndex >= 0 ? pgmIndex < playlist.length : currentIndex >= 0 && currentIndex < playlist.length}
              hasNext={(pgmIndex >= 0 ? pgmIndex : currentIndex) + 1 < playlist.length}
              hasPrev={(pgmIndex >= 0 ? pgmIndex : currentIndex) > 0}
              onPlay={pgmPlay}
              onStop={pgmStop}
              onPause={pgmPause}
              onNext={pgmNext}
              onPrev={pgmPrev}
              onCue={pgmCue}
            />
          </div>
          {/* PVW Player — bottom half */}
          <div className="flex-1 min-h-0">
            <PlayerPanel
              label="PVW"
              labelColor="bg-green-600 text-white"
              badgeColor="bg-green-600 text-white"
              channel={2}
              clipName={pvwClip}
              playback={pvwPlayback}
              isConnected={connected}
              hasClip={pvwIndex >= 0 && pvwIndex < playlist.length}
              hasNext={pvwIndex + 1 < playlist.length}
              hasPrev={pvwIndex > 0}
              onPlay={pvwPlay}
              onStop={pvwStop}
              onPause={pvwPause}
              onNext={pvwNext}
              onPrev={pvwPrev}
              onCue={pvwCue}
            />
          </div>
        </div>

        {/* ═══ RIGHT SIDE: Playlist + Rundowns ═══ */}
        <div className="w-[45%] flex flex-col min-h-0">
          {/* Playlist header */}
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-zinc-300">PLAYLIST</span>
              <span className="text-[10px] font-mono text-zinc-500">
                {playlist.length} clips
              </span>
            </div>
            <button onClick={clearAll} disabled={playlist.length === 0}
              className="px-2 py-0.5 text-[10px] font-mono bg-zinc-800 hover:bg-red-900/50 text-zinc-400 hover:text-red-400 rounded disabled:opacity-30 disabled:cursor-not-allowed">
              Clear All
            </button>
          </div>

          {/* Playlist column headers */}
          <div className="flex items-center px-3 py-1 bg-zinc-800/80 border-b border-zinc-700 text-[10px] font-mono text-zinc-500 flex-shrink-0">
            <span className="w-14">Status</span>
            <span className="w-6 text-center">#</span>
            <span className="flex-1 ml-2">Name</span>
            <span className="w-10 text-center">PGM</span>
            <span className="w-10 text-center">PVW</span>
            <span className="w-5"></span>
          </div>

          {/* Playlist clips */}
          <div className="flex-[6] overflow-y-auto border-b border-zinc-700 min-h-0">
            {playlist.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">
                Double-click a rundown below to load clips
              </div>
            ) : (
              playlist.map((clip, index) => {
                const status = getClipStatus(clip, index);
                return (
                  <div
                    key={`${clip.id}-${index}`}
                    onDoubleClick={() => doubleClickClip(index)}
                    className={`flex items-center px-3 py-1.5 text-xs font-mono cursor-pointer
                      hover:bg-zinc-700/50 transition-colors
                      ${rowStyle(status)}
                      ${index < playlist.length - 1 ? 'border-b border-zinc-800' : ''}`}
                  >
                    <span className={`w-13 text-center py-0.5 rounded text-[9px] font-bold ${statusStyle(status)}`}>
                      {statusLabel(status)}
                    </span>
                    <span className="w-6 text-center text-zinc-500 text-[10px]">{index + 1}</span>
                    <span className="flex-1 ml-2 text-zinc-200 truncate text-[11px]">
                      {clip.storyTitle}
                    </span>
                    {/* PGM button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); sendToPgm(index); }}
                      title="Play on PGM (CH:1)"
                      className={`w-9 mx-0.5 py-0.5 rounded text-[8px] font-bold transition-colors ${
                        pgmClip === clip.playoutName
                          ? 'bg-red-600 text-white'
                          : 'bg-zinc-700 text-zinc-400 hover:bg-red-900/60 hover:text-red-300'
                      }`}
                    >
                      PGM
                    </button>
                    {/* PVW button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); sendToPvw(index); }}
                      title="Play on PVW (CH:2)"
                      className={`w-9 mx-0.5 py-0.5 rounded text-[8px] font-bold transition-colors ${
                        pvwClip === clip.playoutName
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-700 text-zinc-400 hover:bg-green-900/60 hover:text-green-300'
                      }`}
                    >
                      PVW
                    </button>
                    {/* Remove */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeClip(index); }}
                      className="w-5 text-zinc-600 hover:text-red-400 transition-colors text-[10px]"
                      title="Remove">
                      ✕
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Playlist footer */}
          <div className="px-3 py-1 bg-zinc-800/60 border-b border-zinc-700 text-[9px] font-mono text-zinc-500 flex-shrink-0">
            {playlist.length} clips
            {currentIndex >= 0 && <span> • Current: {currentIndex + 1}/{playlist.length}</span>}
            {pgmClip && <span className="text-red-400"> • PGM: {pgmClip.substring(0, 20)}</span>}
            {pvwClip && <span className="text-green-400"> • PVW: {pvwClip.substring(0, 20)}</span>}
          </div>

          {/* ═══ Rundown Browser ═══ */}
          <div className="flex items-center justify-between border-b border-zinc-700 flex-shrink-0">
            <span className="px-3 py-1.5 text-xs font-mono text-zinc-200 bg-zinc-800 border-b-2 border-blue-500">
              Rundowns
            </span>
            <span className="px-3 text-[10px] font-mono text-zinc-500">
              {totalRundownCount} total
            </span>
          </div>
          <div className="flex-[4] overflow-y-auto min-h-0">
            {rundowns.length === 0 ? (
              <div className="flex items-center justify-center h-full text-zinc-500 text-xs">No rundowns found</div>
            ) : (
              rundowns.map(rundown => (
                <div key={rundown.id} onDoubleClick={() => loadRundown(rundown.id)}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-700/50 transition-colors border-b border-zinc-800 ${loadingRundownId === rundown.id ? 'opacity-50' : ''} ${rundown.loaded ? 'bg-zinc-800/40' : ''}`}>
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${rundown.loaded ? 'bg-green-500' : rundown.clipCount > 0 ? 'bg-blue-500' : 'bg-zinc-600'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-zinc-200 truncate">{rundown.title || 'Untitled'}</div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {(rundown as any).storyCount || 0} stories • {rundown.clipCount} with video • {rundown.status}
                    </div>
                  </div>
                  {/* Send scripts to prompter */}
                  {prompterConnected && ((rundown as any).storyCount || 0) > 0 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); sendToPrompter(rundown.id); }}
                      disabled={prompterSending === rundown.id}
                      className={`px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors ${
                        prompterSending === rundown.id
                          ? 'bg-purple-800/60 text-purple-200 border-purple-600 animate-pulse'
                          : 'bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 border-purple-700/40'
                      }`}
                      title="Send scripts to Teleprompter"
                    >
                      {prompterSending === rundown.id ? '📜...' : '📜'}
                    </button>
                  )}
                  {rundown.clipCount === 0 && <span className="text-[9px] text-zinc-600 font-mono">no video</span>}
                  {loadingRundownId === rundown.id && <span className="text-[10px] text-yellow-400 animate-pulse">Loading...</span>}
                </div>
              ))
            )}
          </div>
          <div className="px-3 py-1 bg-zinc-800/60 border-t border-zinc-700 text-[9px] font-mono text-zinc-500 flex-shrink-0">
            Double-click rundown to load into playlist
          </div>
        </div>
      </div>
    </div>
  );
}
