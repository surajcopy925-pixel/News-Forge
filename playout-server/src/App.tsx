import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCasparConnection, useChannelInfo, useMediaList, useCasparTransport } from './hooks/useCaspar';
import ChannelPanel from './components/ChannelPanel';
import RundownList from './components/RundownList';
import ConnectionBar from './components/ConnectionBar';
import PlaylistTable from './components/PlaylistTable';
import type { PlaylistClip, RundownDetailResponse, RundownEntryFromAPI } from './types';

// ── Channel Configuration ─────────────────────────────────
const CHANNEL_1 = { channel: 1, layer: 10 };
const CHANNEL_2 = { channel: 2, layer: 10 };

// ── Helper: Convert API response to flat playlist clips ────
function buildPlaylistFromEntries(entries: RundownEntryFromAPI[]): PlaylistClip[] {
  const result: PlaylistClip[] = [];

  entries.forEach((entry, entryIdx) => {
    if (entryIdx > 0) {
      result.push({
        id: `break-${entry.entryId}`,
        playoutName: '',
        fileName: '',
        storyTitle: entry.storyTitle,
        storyId: entry.storyId,
        category: '',
        duration: '',
        status: 'READY',
        isStoryBreak: true,
        orderIndex: entry.orderIndex,
      });
    }

    if (entry.clips.length === 0) {
      result.push({
        id: `empty-${entry.entryId}`,
        playoutName: `(no clips) — ${entry.storyTitle}`,
        fileName: '',
        storyTitle: entry.storyTitle,
        storyId: entry.storyId,
        category: entry.storyFormat,
        duration: '00:00:00',
        status: 'READY',
        isStoryBreak: false,
        orderIndex: entry.orderIndex,
      });
    } else {
      entry.clips.forEach((clip) => {
        result.push({
          id: clip.clipId,
          playoutName: clip.playoutName || clip.fileName,
          fileName: clip.fileName,
          storyTitle: entry.storyTitle,
          storyId: entry.storyId,
          category: entry.storyFormat,
          duration: clip.duration || '00:00:00',
          status: 'READY',
          isStoryBreak: false,
          orderIndex: entry.orderIndex,
        });
      });
    }
  });

  return result;
}

export default function App() {
  const { connected, host, connect, disconnect } = useCasparConnection();
  const ch1Info = useChannelInfo(CHANNEL_1.channel, CHANNEL_1.layer, connected);
  const ch2Info = useChannelInfo(CHANNEL_2.channel, CHANNEL_2.layer, connected);
  const { files: mediaFiles, loading: mediaLoading, refresh: refreshMedia } = useMediaList(connected);
  const transport = useCasparTransport();

  const [activeChannel, setActiveChannel] = useState<1 | 2>(1);
  const [ch1Loop, setCh1Loop] = useState(false);
  const [ch1Auto, setCh1Auto] = useState(false);
  const [ch2Loop, setCh2Loop] = useState(false);
  const [ch2Auto, setCh2Auto] = useState(false);

  const [clips, setClips] = useState<PlaylistClip[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [activeRundownId, setActiveRundownId] = useState<string | null>(null);
  const [activeRundownTitle, setActiveRundownTitle] = useState<string | null>(null);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  // Track the current live rundown ID for auto-detection
  const lastLiveRundownId = useRef<string | null>(null);

  const getActiveConfig = useCallback(() => {
    return activeChannel === 1 ? CHANNEL_1 : CHANNEL_2;
  }, [activeChannel]);

  const getActiveLoop = useCallback(() => {
    return activeChannel === 1 ? ch1Loop : ch2Loop;
  }, [activeChannel, ch1Loop, ch2Loop]);

  // ── Load a specific rundown by ID ────────────────────────
  const loadRundown = useCallback(async (rundownId: string) => {
    setLoadingPlaylist(true);
    try {
      const res = await fetch(`/api/rundowns/live?rundownId=${rundownId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RundownDetailResponse = await res.json();

      const playlistClips = buildPlaylistFromEntries(data.entries);
      setClips(playlistClips);
      setActiveRundownId(rundownId);
      setActiveRundownTitle(data.rundown.title);
      setSelectedIndex(-1);
      setPlayingIndex(-1);
      lastLiveRundownId.current = rundownId;

      console.log(`[Playout] Loaded rundown "${data.rundown.title}" — ${playlistClips.filter(c => !c.isStoryBreak).length} clips`);
    } catch (err: any) {
      console.error('[Playout] Failed to load rundown:', err);
    } finally {
      setLoadingPlaylist(false);
    }
  }, []);

  // ── Auto-detect LIVE rundown and load it ─────────────────
  useEffect(() => {
    const checkForLiveRundown = async () => {
      try {
        const res = await fetch('/api/rundowns/live');
        if (!res.ok) return;
        const data = await res.json();
        const rundowns = data.rundowns || [];

        // Find the first LIVE rundown
        const liveRundown = rundowns.find((r: any) => r.status === 'LIVE');

        if (liveRundown) {
          // If it's a different rundown than what we have, load it
          if (liveRundown.rundownId !== lastLiveRundownId.current) {
            console.log(`[Playout] Detected LIVE rundown: "${liveRundown.title}" — loading...`);
            await loadRundown(liveRundown.rundownId);
          }
        } else {
          // No LIVE rundown — clear the playlist if we had one
          if (lastLiveRundownId.current !== null) {
            console.log('[Playout] No LIVE rundown detected — clearing playlist');
            setClips([]);
            setActiveRundownId(null);
            setActiveRundownTitle(null);
            setSelectedIndex(-1);
            setPlayingIndex(-1);
            lastLiveRundownId.current = null;
          }
        }
      } catch (err) {
        // Silently fail — will retry on next poll
      }
    };

    // Check immediately
    checkForLiveRundown();

    // Poll every 5 seconds
    const interval = setInterval(checkForLiveRundown, 5000);
    return () => clearInterval(interval);
  }, [loadRundown]);

  // ── Transport actions ─────────────────────────────────────
  const handleCue = useCallback(async (index: number) => {
    const clip = clips[index];
    if (!clip || clip.isStoryBreak || !clip.fileName) return;
    const config = getActiveConfig();
    try {
      await transport.load(config.channel, config.layer, clip.playoutName);
      setSelectedIndex(index);
    } catch (err) {
      console.error('[Playout] Cue failed:', err);
    }
  }, [clips, transport, getActiveConfig]);

  const handlePlayClip = useCallback(async (index: number) => {
    const clip = clips[index];
    if (!clip || clip.isStoryBreak || !clip.fileName) return;
    const config = getActiveConfig();
    const loop = getActiveLoop();
    try {
      await transport.play(config.channel, config.layer, clip.playoutName, loop);
      setClips(prev => prev.map((c, i) => {
        if (i === playingIndex && !c.isStoryBreak) return { ...c, status: 'PLAYED' as const };
        if (i === index) return { ...c, status: 'PLAYING' as const };
        return c;
      }));
      setPlayingIndex(index);
      setSelectedIndex(index);
    } catch (err) {
      console.error('[Playout] Play failed:', err);
    }
  }, [clips, transport, getActiveConfig, getActiveLoop, playingIndex]);

  const handleLoopClip = useCallback(async (index: number) => {
    const clip = clips[index];
    if (!clip || clip.isStoryBreak || !clip.fileName) return;
    const config = getActiveConfig();
    try {
      await transport.play(config.channel, config.layer, clip.playoutName, true);
      setClips(prev => prev.map((c, i) => {
        if (i === playingIndex && !c.isStoryBreak) return { ...c, status: 'PLAYED' as const };
        if (i === index) return { ...c, status: 'PLAYING' as const };
        return c;
      }));
      setPlayingIndex(index);
      setSelectedIndex(index);
    } catch (err) {
      console.error('[Playout] Loop play failed:', err);
    }
  }, [clips, transport, getActiveConfig, playingIndex]);

  const handlePlay = useCallback(async () => {
    if (selectedIndex >= 0) {
      await handlePlayClip(selectedIndex);
      return;
    }
    const firstPlayable = clips.findIndex(c => !c.isStoryBreak && c.fileName);
    if (firstPlayable >= 0) await handlePlayClip(firstPlayable);
  }, [selectedIndex, clips, handlePlayClip]);

  const handleStop = useCallback(async () => {
    const config = getActiveConfig();
    try {
      await transport.stop(config.channel, config.layer);
      if (playingIndex >= 0) {
        setClips(prev => prev.map((c, i) =>
          i === playingIndex ? { ...c, status: 'STOPPED' as const } : c
        ));
      }
      setPlayingIndex(-1);
    } catch (err) {
      console.error('[Playout] Stop failed:', err);
    }
  }, [transport, getActiveConfig, playingIndex]);

  const handlePause = useCallback(async () => {
    const config = getActiveConfig();
    try {
      if (ch1Info.paused || ch2Info.paused) {
        await transport.resume(config.channel, config.layer);
      } else {
        await transport.pause(config.channel, config.layer);
      }
    } catch (err) {
      console.error('[Playout] Pause/Resume failed:', err);
    }
  }, [transport, getActiveConfig, ch1Info.paused, ch2Info.paused]);

  const handleNext = useCallback(async () => {
    const currentIdx = playingIndex >= 0 ? playingIndex : selectedIndex;
    let nextIdx = currentIdx + 1;
    while (nextIdx < clips.length) {
      if (!clips[nextIdx].isStoryBreak && clips[nextIdx].fileName) break;
      nextIdx++;
    }
    if (nextIdx < clips.length) await handlePlayClip(nextIdx);
  }, [playingIndex, selectedIndex, clips, handlePlayClip]);

  const handleClear = useCallback(async () => {
    const config = getActiveConfig();
    try {
      await transport.clear(config.channel, config.layer);
      setPlayingIndex(-1);
    } catch (err) {
      console.error('[Playout] Clear failed:', err);
    }
  }, [transport, getActiveConfig]);

  // ── Render — OLD LAYOUT RESTORED ──────────────────────────
  return (
    <div className="playout-app">
      {/* ── Top Bar ── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="app-title">NEWS FORGE — PLAYOUT</span>
          <button
            className={`ch-toggle-btn ${activeChannel === 1 ? 'active' : ''}`}
            onClick={() => setActiveChannel(1)}
          >
            CH 1
          </button>
          <button
            className={`ch-toggle-btn ${activeChannel === 2 ? 'active' : ''}`}
            onClick={() => setActiveChannel(2)}
          >
            CH 2
          </button>
        </div>
        <div className="top-bar-right">
          <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
          <span className={`connection-label ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span className="connection-host">{host}</span>
          <button
            className={`connect-btn ${connected ? 'disconnect' : ''}`}
            onClick={connected ? disconnect : connect}
          >
            {connected ? 'DISCONNECT' : 'CONNECT'}
          </button>
        </div>
      </div>

      {/* ── Main Layout ── */}
      <div className="main-layout">
        {/* Left Sidebar — Rundowns */}
        <RundownList
          onSelectRundown={loadRundown}
          activeRundownId={activeRundownId}
        />

        {/* Right Content Area */}
        <div className="content-area">
          {/* Channel Panels — Side by Side */}
          <div className="channels-row">
            <ChannelPanel
              label="P-PCR-1"
              info={ch1Info}
              loopEnabled={ch1Loop}
              autoEnabled={ch1Auto}
              onPlay={activeChannel === 1 ? handlePlay : () => setActiveChannel(1)}
              onStop={activeChannel === 1 ? handleStop : () => setActiveChannel(1)}
              onPauseResume={activeChannel === 1 ? handlePause : () => setActiveChannel(1)}
              onNext={activeChannel === 1 ? handleNext : () => setActiveChannel(1)}
              onClear={activeChannel === 1 ? handleClear : () => setActiveChannel(1)}
              onToggleLoop={() => setCh1Loop(!ch1Loop)}
              onToggleAuto={() => setCh1Auto(!ch1Auto)}
            />
            <ChannelPanel
              label="P-PCR-2"
              info={ch2Info}
              loopEnabled={ch2Loop}
              autoEnabled={ch2Auto}
              onPlay={activeChannel === 2 ? handlePlay : () => setActiveChannel(2)}
              onStop={activeChannel === 2 ? handleStop : () => setActiveChannel(2)}
              onPauseResume={activeChannel === 2 ? handlePause : () => setActiveChannel(2)}
              onNext={activeChannel === 2 ? handleNext : () => setActiveChannel(2)}
              onClear={activeChannel === 2 ? handleClear : () => setActiveChannel(2)}
              onToggleLoop={() => setCh2Loop(!ch2Loop)}
              onToggleAuto={() => setCh2Auto(!ch2Auto)}
            />
          </div>

          {/* Playlist Table */}
          <PlaylistTable
            clips={clips}
            selectedIndex={selectedIndex}
            playingIndex={playingIndex}
            onSelect={setSelectedIndex}
            onCue={handleCue}
            onPlayClip={handlePlayClip}
            onLoopClip={handleLoopClip}
            activeRundownTitle={activeRundownTitle}
          />
        </div>
      </div>
    </div>
  );
}
