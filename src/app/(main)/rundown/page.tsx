// src/app/(main)/rundown/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNewsForgeStore } from '@/store/useNewsForgeStore';
import { generateAllTimeSlots, parseToSeconds, formatSeconds } from '@/utils/metadata';
import type { Story, StoryClip, RundownEntry } from '@/types/types';

/* ── constants ── */
interface SystemRow {
  entryId: string;
  rundownId: string;
  storyId: string;
  orderIndex: number;
  scriptContent: string | null;
  scriptSource: 'POLISHED' | 'RAW' | null;
  isSystem: true;
  slug: string;
  format: string;
  plannedDuration: string;
}

interface MergedEntry {
  entryId: string;
  rundownId: string;
  storyId: string;
  orderIndex: number;
  scriptContent: string | null;
  scriptSource: 'POLISHED' | 'RAW' | null;
  isSystem: boolean;
  slug: string;
  format: string;
  plannedDuration: string;
  story?: Story;
  clips?: StoryClip[];
}

function buildSystemRows(rundownId: string): SystemRow[] {
  return [
    { entryId: `SYS-${rundownId}-HEADLINES`, rundownId, storyId: 'SYS-HEADLINES', orderIndex: 0, scriptContent: null, scriptSource: null, isSystem: true, slug: 'HEADLINES', format: 'ANCHOR', plannedDuration: '00:00:15' },
    { entryId: `SYS-${rundownId}-START`, rundownId, storyId: 'SYS-START', orderIndex: 1, scriptContent: null, scriptSource: null, isSystem: true, slug: 'START', format: 'ANCHOR', plannedDuration: '00:00:15' },
    { entryId: `SYS-${rundownId}-BREAK1`, rundownId, storyId: 'SYS-BREAK1', orderIndex: 100, scriptContent: null, scriptSource: null, isSystem: true, slug: 'BREAK 1', format: 'BREAK', plannedDuration: '00:05:00' },
    { entryId: `SYS-${rundownId}-BREAK2`, rundownId, storyId: 'SYS-BREAK2', orderIndex: 200, scriptContent: null, scriptSource: null, isSystem: true, slug: 'BREAK 2', format: 'BREAK', plannedDuration: '00:05:00' },
    { entryId: `SYS-${rundownId}-END`, rundownId, storyId: 'SYS-END', orderIndex: 999, scriptContent: null, scriptSource: null, isSystem: true, slug: 'END', format: 'ANCHOR', plannedDuration: '00:00:15' },
  ];
}

function fmtBadge(f: string) {
  switch (f) {
    case 'ANCHOR': return 'bg-blue-600';
    case 'PKG': return 'bg-purple-600';
    case 'VO': return 'bg-teal-600';
    case 'VO+BITE': return 'bg-cyan-600';
    case 'LIVE': return 'bg-green-600';
    case 'GFX': return 'bg-yellow-600';
    case 'BREAK': return 'bg-red-600';
    default: return 'bg-gray-600';
  }
}

function statusColor(s: string) {
  switch (s) {
    case 'READY': case 'APPROVED': return 'text-green-400';
    case 'EDITING': case 'DRAFT': return 'text-yellow-400';
    case 'NOT READY': return 'text-red-400';
    case 'SUBMITTED': return 'text-blue-400';
    default: return 'text-gray-500';
  }
}

function fmtDur(d: string | null): string {
  if (!d || d === '00:00:00') return '--:--';
  const p = d.split(':');
  if (p.length === 3 && p[0] === '00') return `${p[1]}:${p[2]}`;
  return d;
}

/* ═══════════════════════ COMPONENT ═══════════════════════ */
export default function RundownPage() {
  /* ── store ── */
  const stories = useNewsForgeStore((s) => s.stories);
  const storyClips = useNewsForgeStore((s) => s.storyClips);
  const rundowns = useNewsForgeStore((s) => s.rundowns);
  const rundownEntries = useNewsForgeStore((s) => s.rundownEntries);
  const users = useNewsForgeStore((s) => s.users);
  const createStory = useNewsForgeStore((s) => s.createStory);
  const addEntryToRundown = useNewsForgeStore((s) => s.addEntryToRundown);
  const removeEntryFromRundown = useNewsForgeStore((s) => s.removeEntryFromRundown);
  const updateStoryField = useNewsForgeStore((s) => s.updateStoryField);
  const reorderRundownEntries = useNewsForgeStore((s) => s.reorderRundownEntries);

  /* ── state ── */
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedRundownId, setSelectedRundownId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<'SCRIPT' | 'CLIPS' | 'CG'>('SCRIPT');
  const [searchQuery, setSearchQuery] = useState('');
  const [splitPct, setSplitPct] = useState(55);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  /* ── create form ── */
  const [nTitle, setNTitle] = useState('');
  const [nSlug, setNSlug] = useState('');
  const [nFormat, setNFormat] = useState<Story['format']>('');
  const [nDur, setNDur] = useState('00:00:00');
  const [nContent, setNContent] = useState('');

  /* ── detail editing ── */
  const [eAnchor, setEAnchor] = useState('');
  const [eVO, setEVO] = useState('');
  const [eNotes, setENotes] = useState('');

  /* ── drag ── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* ── refs ── */
  const splitRef = useRef(false);

  /* ═══════ 1. ALL RUNDOWNS ═══════ */
  const allRundowns = useMemo(() => {
    const auto = generateAllTimeSlots(selectedDate);
    const fromStore = rundowns.filter((r) => r.date === selectedDate);
    const merged = auto.map((slot) => {
      const ex = fromStore.find((r) => r.rundownId === slot.rundownId);
      return ex ? { ...slot, ...ex } : slot;
    });
    fromStore.forEach((sr) => {
      if (!merged.find((m) => m.rundownId === sr.rundownId)) merged.push(sr as any);
    });
    return merged;
  }, [selectedDate, rundowns]);

  /* ═══════ 2. FILTERED ═══════ */
  const filteredRundowns = useMemo(() => {
    if (!searchQuery.trim()) return allRundowns;
    const q = searchQuery.toLowerCase();
    return allRundowns.filter((r) => r.title.toLowerCase().includes(q) || r.broadcastTime.includes(q));
  }, [allRundowns, searchQuery]);

  /* ═══════ 3. SELECTED RUNDOWN ═══════ */
  const selectedRundown = useMemo(() => {
    return selectedRundownId ? allRundowns.find((r) => r.rundownId === selectedRundownId) || null : null;
  }, [allRundowns, selectedRundownId]);

  /* ═══════ 4. ENTRIES ═══════ */
  const entriesForRundown: MergedEntry[] = useMemo(() => {
    if (!selectedRundownId) return [];
    const sys = buildSystemRows(selectedRundownId);
    const storeE = rundownEntries.filter((e) => e.rundownId === selectedRundownId);

    const storyE: MergedEntry[] = storeE.map((entry) => {
      const story = stories.find((s) => s.storyId === entry.storyId);
      const clips = storyClips.filter((c) => c.storyId === entry.storyId);
      return {
        ...entry,
        isSystem: false,
        slug: story?.slug || story?.title || 'Untitled',
        format: story?.format || '',
        plannedDuration: story?.plannedDuration || '00:00:00',
        story,
        clips,
      };
    });

    const all: MergedEntry[] = [sys[0], sys[1], ...storyE, sys[2], sys[3], sys[4]];
    return all.map((e, i) => ({ ...e, orderIndex: i }));
  }, [selectedRundownId, rundownEntries, stories, storyClips]);

  /* ═══════ 5. TIMING ═══════ */
  const storySec = useMemo(() => entriesForRundown.filter((e) => e.format !== 'BREAK').reduce((s, e) => s + parseToSeconds(e.plannedDuration), 0), [entriesForRundown]);
  const breakSec = useMemo(() => entriesForRundown.filter((e) => e.format === 'BREAK').reduce((s, e) => s + parseToSeconds(e.plannedDuration), 0), [entriesForRundown]);
  const totalSec = storySec + breakSec;
  const plannedSec = parseToSeconds(selectedRundown?.plannedDuration || '00:30:00');
  const overUnder = totalSec - plannedSec;

  /* ═══════ 6. SELECTED ENTRY ═══════ */
  const selectedEntry = useMemo(() => selectedEntryId ? entriesForRundown.find((e) => e.entryId === selectedEntryId) || null : null, [entriesForRundown, selectedEntryId]);

  /* ═══════ 7. AUTO-SELECT ═══════ */
  useEffect(() => {
    if (allRundowns.length === 0) return;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    let best = allRundowns[0];
    let bestD = Infinity;
    allRundowns.forEach((r) => {
      const p = r.broadcastTime.split(':').map(Number);
      const d = Math.abs(p[0] * 60 + (p[1] || 0) - mins);
      if (d < bestD) { bestD = d; best = r; }
    });
    setSelectedRundownId(best.rundownId);
  }, [allRundowns]);

  /* ═══════ 8. LOAD DETAIL DATA ═══════ */
  useEffect(() => {
    if (selectedEntry && !selectedEntry.isSystem && selectedEntry.story) {
      const st = selectedEntry.story;
      setEAnchor(st.anchorScript || selectedEntry.scriptContent || st.polishedScript || st.rawScript || st.content || '');
      setEVO(st.voiceoverScript || '');
      setENotes(st.editorialNotes || '');
    } else {
      setEAnchor(''); setEVO(''); setENotes('');
    }
  }, [selectedEntry]);

  /* ═══════ HANDLERS ═══════ */
  const chgDate = (d: number) => {
    const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d);
    setSelectedDate(dt.toISOString().split('T')[0]);
    setSelectedRundownId(null); setSelectedEntryId(null); setDetailOpen(false);
  };

  const selectRd = (id: string) => { setSelectedRundownId(id); setSelectedEntryId(null); setDetailOpen(false); };

  const clickRow = (e: MergedEntry) => { setSelectedEntryId(e.entryId); setDetailOpen(true); setDetailTab('SCRIPT'); };

  const saveChanges = () => {
    if (!selectedEntry || selectedEntry.isSystem || !selectedEntry.story) return;
    const sid = selectedEntry.story.storyId;
    updateStoryField(sid, 'anchorScript', eAnchor);
    updateStoryField(sid, 'voiceoverScript', eVO);
    updateStoryField(sid, 'editorialNotes', eNotes);
  };

  const removeEntry = (id: string, sys: boolean) => {
    if (sys) return;
    removeEntryFromRundown(id);
    if (selectedEntryId === id) { setSelectedEntryId(null); setDetailOpen(false); }
  };

  const scrollEntry = (dir: 'up' | 'down') => {
    if (!selectedEntryId) return;
    const i = entriesForRundown.findIndex((e) => e.entryId === selectedEntryId);
    const n = dir === 'up' ? i - 1 : i + 1;
    if (n >= 0 && n < entriesForRundown.length) setSelectedEntryId(entriesForRundown[n].entryId);
  };

  /* ── drag ── */
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const onDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx && selectedRundownId) {
      reorderRundownEntries(selectedRundownId, dragIdx, dragOverIdx);
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  /* ── split resize ── */
  useEffect(() => {
    const mv = (e: MouseEvent) => {
      if (!splitRef.current) return;
      const c = document.getElementById('rd-main');
      if (!c) return;
      const r = c.getBoundingClientRect();
      setSplitPct(Math.min(80, Math.max(25, ((e.clientY - r.top) / r.height) * 100)));
    };
    const up = () => { splitRef.current = false; };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, []);

  /* ── create empty ── */
  const createEmpty = () => {
    if (!selectedRundownId || !nTitle.trim()) return;
    const sid = `STY-${Date.now()}`;
    const now = new Date().toISOString();
    createStory({
      storyId: sid, id: sid, title: nTitle, slug: nSlug || nTitle.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
      category: 'General', location: 'Newsroom', date: selectedDate, source: 'Internal',
      format: nFormat || '', status: 'DRAFT', content: nContent, rawScript: nContent,
      polishedScript: null, anchorScript: '', voiceoverScript: '', editorialNotes: '', notes: '',
      priority: 'normal', scriptSentToRundown: null, sentToRundownId: selectedRundownId, sentToRundownAt: now, sentBy: 'USR-001',
      polishedBy: null, polishedAt: null, isPolished: false,
      createdBy: 'USR-001', createdAt: now, updatedAt: now,
      plannedDuration: nDur, rundownId: selectedRundownId, orderIndex: 0, assignedTo: null,
    });
    addEntryToRundown(selectedRundownId, sid);
    setNTitle(''); setNSlug(''); setNFormat(''); setNDur('00:00:00'); setNContent('');
    setShowCreateModal(false);
  };

  /* ── add existing ── */
  const existingStories = useMemo(() => {
    const inRd = new Set(entriesForRundown.filter((e) => !e.isSystem).map((e) => e.storyId));
    return stories.filter((s) => !s.storyId.startsWith('SYS-') && !inRd.has(s.storyId));
  }, [stories, entriesForRundown]);

  const filteredExisting = useMemo(() => {
    if (!addSearch.trim()) return existingStories;
    const q = addSearch.toLowerCase();
    return existingStories.filter((s) => s.title.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q));
  }, [existingStories, addSearch]);

  const addExisting = (sid: string) => {
    if (!selectedRundownId) return;
    addEntryToRundown(selectedRundownId, sid);
    setShowAddModal(false); setAddSearch('');
  };

  /* ── helpers ── */
  const storyCount = (rdId: string) => rundownEntries.filter((e) => e.rundownId === rdId && !e.storyId.startsWith('SYS-')).length;

  const clipCell = (e: MergedEntry) => {
    if (e.isSystem) return <span className="text-gray-600">—</span>;
    const c = e.clips || [];
    if (c.length === 0) return <span className="text-gray-600">—</span>;
    const done = c.filter((x) => x.status === 'COMPLETED' || x.status === 'APPROVED').length;
    if (done === c.length) return <span className="text-green-400">{c.length} ✓</span>;
    return <span className="text-amber-400">{done}/{c.length} *</span>;
  };

  const durCell = (e: MergedEntry) => {
    if (e.isSystem) return <span className="text-gray-600">—</span>;
    const c = e.clips || [];
    if (c.length > 0) {
      const t = c.reduce((s, x) => s + parseToSeconds(x.duration), 0);
      if (t > 0) return <span className="text-green-400">{formatSeconds(t)}</span>;
    }
    const p = e.story?.plannedDuration || e.plannedDuration;
    if (p && p !== '00:00:00') return <span className="text-yellow-400">{p}</span>;
    return <span className="text-gray-600">00:00:00</span>;
  };

  const tvCell = (e: MergedEntry) => {
    if (e.isSystem) return <span className="text-gray-600">—</span>;
    const tTime = e.story?.plannedDuration || '00:00:00';
    const c = e.clips || [];
    const vSec = c.reduce((s, x) => s + parseToSeconds(x.duration), 0);
    return (
      <span className="text-[10px] leading-tight">
        <span className="block">T {fmtDur(tTime)}</span>
        <span className="block">V {vSec > 0 ? fmtDur(formatSeconds(vSec)) : '--:--'}</span>
      </span>
    );
  };

  const userName = (uid: string | undefined) => {
    if (!uid) return '—';
    const u = users.find((x) => x.userId === uid);
    return u ? u.fullName.split(' ').map((w) => w[0]).join('') : uid.slice(0, 6);
  };

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#0a0e17] text-gray-200 text-xs">
      {/* ══════ SIDEBAR ══════ */}
      <div className="w-[185px] min-w-[185px] border-r border-gray-800/60 flex flex-col bg-[#0d1117]">
        <div className="px-2 pt-2 pb-1.5 border-b border-gray-800/60">
          <div className="text-[10px] font-bold text-gray-500 tracking-wider mb-1">RUNDOWNS</div>
          <div className="flex items-center justify-between mb-1.5">
            <button onClick={() => chgDate(-1)} className="text-gray-500 hover:text-white text-sm px-0.5">&lt;</button>
            <span className="text-[11px] font-bold tracking-wide">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
            </span>
            <button onClick={() => chgDate(1)} className="text-gray-500 hover:text-white text-sm px-0.5">&gt;</button>
          </div>
          <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="w-full bg-green-600 hover:bg-green-700 text-[10px] font-bold py-0.5 rounded mb-1.5">TODAY</button>
          <input
            type="text" placeholder="Search bulletins..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/60 border border-gray-700/50 rounded px-1.5 py-[3px] text-[10px] text-gray-400 placeholder-gray-600"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredRundowns.map((rd) => {
            const sel = rd.rundownId === selectedRundownId;
            const sc = storyCount(rd.rundownId);
            return (
              <div
                key={rd.rundownId} onClick={() => selectRd(rd.rundownId)}
                className={`px-2 py-1.5 cursor-pointer border-b border-gray-800/40 transition-colors ${sel ? 'bg-blue-900/30 border-l-[3px] border-l-blue-500' : 'hover:bg-gray-800/30 border-l-[3px] border-l-transparent'}`}
              >
                <div className="font-semibold text-[11px] truncate leading-tight">{rd.title}</div>
                <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mt-0.5">
                  <span className="text-blue-400 font-bold">RD</span>
                  <span>{rd.broadcastTime.slice(0, 5)}</span>
                  <span className="text-gray-700">●</span>
                  <span>{rd.plannedDuration}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5 text-[9px]">
                  <span className="text-gray-500">{5 + sc} STORIES</span>
                  <span className="text-gray-600">MOS OK</span>
                </div>
                <span className={`text-[9px] ${rd.status === 'READY' ? 'text-green-400' : rd.status === 'LIVE' ? 'text-red-400' : 'text-yellow-500'}`}>● {rd.status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════ MAIN ══════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* action bar */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800/60 bg-[#0d1117]">
          <div className="relative">
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 py-1 rounded">+ NEW</button>
            {showNewMenu && (
              <div className="absolute top-full left-0 mt-0.5 bg-gray-800 border border-gray-700 rounded shadow-xl z-50 w-40">
                <button onClick={() => { setShowCreateModal(true); setShowNewMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-gray-700">Create Empty Story</button>
                <button onClick={() => { setShowAddModal(true); setShowNewMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-gray-700">Add Existing Story</button>
              </div>
            )}
          </div>
          {['✏ EDIT', '⊘ DELETE', '⎘ COPY', '↕ MOVE', '🖨 PRINT', '🔍 SEARCH', '📤 EXPORT'].map((l) => (
            <button key={l} className="text-gray-500 hover:text-gray-300 text-[10px] px-1.5 py-1">{l}</button>
          ))}
          <div className="flex-1" />
          <button className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold px-3 py-1 rounded">RUN LIVE</button>
        </div>

        {/* info bar */}
        {selectedRundown && (
          <div className="flex items-center gap-5 px-3 py-1.5 border-b border-gray-800/60 text-[10px]">
            <div><span className="text-gray-500 block text-[9px]">RUNDOWN</span><span className="font-bold text-[11px]">{selectedRundown.title}</span></div>
            <div><span className="text-gray-500 block text-[9px]">STATUS</span><span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${selectedRundown.status === 'READY' ? 'bg-green-600' : selectedRundown.status === 'LIVE' ? 'bg-red-600' : 'bg-yellow-600'}`}>{selectedRundown.status}</span></div>
            <div><span className="text-gray-500 block text-[9px]">DURATION</span><span className="font-mono font-bold text-[11px]">{formatSeconds(totalSec)}</span></div>
            <div><span className="text-gray-500 block text-[9px]">PLANNED</span><span className="font-mono bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded text-[9px]">{selectedRundown.plannedDuration}</span></div>
            <div className="flex-1" />
            <div className="text-right"><span className="text-gray-500 block text-[9px]">MOS CONNECTION</span><span className="text-green-400 text-[9px]">● ONLINE</span></div>
          </div>
        )}

        {/* table + detail */}
        <div id="rd-main" className="flex-1 flex flex-col min-h-0">
          {/* TABLE */}
          <div style={{ height: detailOpen ? `${splitPct}%` : '100%' }} className="overflow-auto">
            <table className="w-full">
              <thead className="bg-[#0d1117] sticky top-0 z-10">
                <tr className="text-gray-500 text-[9px] tracking-wider border-b border-gray-800/60">
                  <th className="py-1 px-1.5 w-6 text-center">#</th>
                  <th className="py-1 px-0.5 w-4"></th>
                  <th className="py-1 px-0.5 w-4"></th>
                  <th className="py-1 px-2 text-left">SLUGS / HEADLINE</th>
                  <th className="py-1 px-1 text-center w-16">FORMAT</th>
                  <th className="py-1 px-1 text-center w-12">CLIPS</th>
                  <th className="py-1 px-1 text-center w-8">CG</th>
                  <th className="py-1 px-1 text-center w-[70px]">DUR</th>
                  <th className="py-1 px-1 text-center w-[60px]">TEXT/VID</th>
                  <th className="py-1 px-1 text-center w-[70px]">PLANNED</th>
                  <th className="py-1 px-1 text-center w-[65px]">AUTHOR</th>
                  <th className="py-1 px-1 text-center w-[70px]">STATUS</th>
                  <th className="py-1 px-0.5 w-5"></th>
                </tr>
              </thead>
              <tbody>
                {entriesForRundown.map((e, idx) => {
                  const isSel = e.entryId === selectedEntryId;
                  const isDO = dragOverIdx === idx;
                  return (
                    <tr
                      key={e.entryId} draggable
                      onDragStart={() => onDragStart(idx)}
                      onDragOver={(ev) => onDragOver(ev, idx)}
                      onDragEnd={onDragEnd}
                      onClick={() => clickRow(e)}
                      className={`border-b border-gray-800/30 cursor-pointer transition-colors ${isSel ? 'bg-blue-900/20' : 'hover:bg-gray-800/20'} ${isDO ? 'border-t-2 border-t-blue-500' : ''}`}
                    >
                      <td className="py-[5px] px-1.5 text-center text-gray-600 text-[10px]">{idx}</td>
                      <td className="py-[5px] px-0.5 text-center text-gray-700 cursor-grab text-[10px]">⠿</td>
                      <td className="py-[5px] px-0.5 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${e.isSystem ? 'bg-red-500' : e.story?.status === 'READY' ? 'bg-green-500' : e.story?.status === 'EDITING' ? 'bg-yellow-500' : 'bg-orange-500'}`} />
                      </td>
                      <td className="py-[5px] px-2 font-semibold text-[11px] truncate max-w-[280px]">
                        {e.isSystem ? e.slug : (e.story?.title || e.slug)}
                      </td>
                      <td className="py-[5px] px-1 text-center">
                        <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${fmtBadge(e.format || e.story?.format || '')}`}>
                          {e.format || e.story?.format || '—'}
                        </span>
                      </td>
                      <td className="py-[5px] px-1 text-center text-[10px]">{clipCell(e)}</td>
                      <td className="py-[5px] px-1 text-center text-gray-600 text-[10px]">—</td>
                      <td className="py-[5px] px-1 text-center font-mono text-[10px]">{e.isSystem ? <span className="text-gray-600">—</span> : durCell(e)}</td>
                      <td className="py-[5px] px-1 text-center">{tvCell(e)}</td>
                      <td className="py-[5px] px-1 text-center font-mono text-[10px] text-gray-400">
                        {e.isSystem ? e.plannedDuration : (e.story?.plannedDuration || e.plannedDuration || '—')}
                      </td>
                      <td className="py-[5px] px-1 text-center text-[10px] text-gray-500 truncate">
                        {e.isSystem ? 'SYSTEM' : userName(e.story?.createdBy)}
                      </td>
                      <td className="py-[5px] px-1 text-center text-[10px]">
                        {e.isSystem ? <span className="text-gray-600">SYSTEM</span> : <span className={statusColor(e.story?.status || '')}>{e.story?.status || '—'}</span>}
                      </td>
                      <td className="py-[5px] px-0.5 text-center">
                        {!e.isSystem && (
                          <button onClick={(ev) => { ev.stopPropagation(); removeEntry(e.entryId, e.isSystem); }} className="text-gray-700 hover:text-red-400 text-[10px]">✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* timing footer */}
            <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-800/60 bg-[#0d1117] text-[10px] font-mono">
              <span>STORIES: <strong className="text-white">{formatSeconds(storySec)}</strong></span>
              <span>BREAKS: <strong className="text-red-400">{formatSeconds(breakSec)}</strong></span>
              <span className="text-gray-700">|</span>
              <span>TOTAL: <strong className="text-white">{formatSeconds(totalSec)}</strong></span>
              <div className="flex-1" />
              <span>PLANNED: <span className="bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded">{selectedRundown?.plannedDuration || '00:30:00'}</span></span>
              <span>OVER/UNDER: <strong className={overUnder > 0 ? 'text-red-400' : 'text-green-400'}>{overUnder > 0 ? '+' : ''}{formatSeconds(overUnder)}</strong> {overUnder <= 0 ? '✅' : '❌'}</span>
            </div>
          </div>

          {/* resize handle */}
          {detailOpen && (
            <div onMouseDown={() => { splitRef.current = true; }} className="h-1.5 bg-gray-800/60 hover:bg-blue-600 cursor-row-resize flex items-center justify-center">
              <div className="w-10 h-[2px] bg-gray-600 rounded" />
            </div>
          )}

          {/* ══════ DETAIL PANEL ══════ */}
          {detailOpen && selectedEntry && (
            <div style={{ height: `${100 - splitPct}%` }} className="border-t border-gray-700/50 bg-[#0d1117] flex flex-col min-h-0">
              {/* header */}
              <div className="flex items-center px-3 py-1 border-b border-gray-800/60">
                <div className="flex gap-3">
                  {(['SCRIPT', 'CLIPS', 'CG GRAPHICS'] as const).map((tab) => {
                    const k = tab === 'CG GRAPHICS' ? 'CG' : tab;
                    return (
                      <button key={tab} onClick={() => setDetailTab(k as any)}
                        className={`text-[10px] font-bold pb-0.5 ${detailTab === k ? 'text-blue-400 border-b border-blue-400' : 'text-gray-500 hover:text-gray-300'}`}>
                        {tab}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-500">EDITING: <strong className="text-white">&quot;{selectedEntry.isSystem ? selectedEntry.slug : (selectedEntry.story?.title || selectedEntry.slug)}&quot;</strong></span>
                <button onClick={() => scrollEntry('up')} className="ml-3 text-gray-500 hover:text-white text-[10px] px-0.5">▲</button>
                <button onClick={() => scrollEntry('down')} className="text-gray-500 hover:text-white text-[10px] px-0.5">▼</button>
                <button onClick={saveChanges} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold px-3 py-[3px] rounded">SAVE CHANGES</button>
                <button onClick={() => { setDetailOpen(false); setSelectedEntryId(null); }} className="ml-1.5 text-gray-500 hover:text-white text-sm">✕</button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-auto p-2.5">
                {detailTab === 'SCRIPT' && (
                  <div className="flex gap-3 h-full">
                    {/* left: notes */}
                    <div className="w-[38%] flex flex-col">
                      <div className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">EDITORIAL NOTES</div>
                      <textarea
                        value={eNotes} onChange={(e) => setENotes(e.target.value)}
                        placeholder="Add production notes here..."
                        className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded px-2 py-1.5 text-[11px] text-gray-300 resize-none"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      />
                    </div>
                    {/* right: anchor + vo */}
                    <div className="w-[62%] flex flex-col gap-2.5">
                      <div className="flex-1 flex flex-col">
                        <div className="text-[9px] font-bold mb-1">
                          <span className="text-red-500">●</span>{' '}
                          <span className="text-red-400">ANCHOR SCRIPT</span>
                          {selectedEntry.scriptContent && (
                            <span className="ml-1.5 text-gray-600 font-normal">({selectedEntry.scriptSource || 'RAW'})</span>
                          )}
                        </div>
                        <textarea
                          value={eAnchor} onChange={(e) => setEAnchor(e.target.value)}
                          placeholder="Type anchor script here..."
                          className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded px-2 py-1.5 text-[11px] text-gray-300 resize-none whitespace-pre-wrap"
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', minHeight: '80px' }}
                        />
                      </div>
                      <div className="flex-1 flex flex-col">
                        <div className="text-[9px] font-bold mb-1">
                          <span className="text-yellow-500">●</span>{' '}
                          <span className="text-yellow-400">VOICEOVER / PKG SCRIPT</span>
                        </div>
                        <textarea
                          value={eVO} onChange={(e) => setEVO(e.target.value)}
                          placeholder="Type voiceover script here..."
                          className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded px-2 py-1.5 text-[11px] text-gray-300 resize-none whitespace-pre-wrap"
                          style={{ overflowWrap: 'anywhere', wordBreak: 'break-word', minHeight: '80px' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'CLIPS' && (
                  <div>
                    {selectedEntry.isSystem ? (
                      <div className="text-gray-600 text-[10px]">System rows have no clips.</div>
                    ) : (selectedEntry.clips || []).length === 0 ? (
                      <div className="text-gray-600 text-[10px]">No clips attached to this story.</div>
                    ) : (
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="text-gray-500 text-[9px] border-b border-gray-800/60">
                            <th className="py-1 px-2 text-left">FILE NAME</th>
                            <th className="py-1 px-2 text-left">ORIGINAL</th>
                            <th className="py-1 px-2 text-center">DURATION</th>
                            <th className="py-1 px-2 text-center">STATUS</th>
                            <th className="py-1 px-2 text-left">DISPLAY LABEL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedEntry.clips || []).map((c) => (
                            <tr key={c.clipId} className="border-b border-gray-800/30">
                              <td className="py-1 px-2 font-mono text-green-400">{c.fileName}</td>
                              <td className="py-1 px-2 text-gray-500">{c.originalFileName}</td>
                              <td className="py-1 px-2 text-center font-mono">{c.duration || '--:--'}</td>
                              <td className="py-1 px-2 text-center">
                                <span className={`text-[8px] font-bold px-1.5 py-[1px] rounded ${c.status === 'COMPLETED' || c.status === 'APPROVED' ? 'bg-green-600/20 text-green-400' : c.status === 'EDITING' || c.status === 'AVAILABLE' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-gray-600/20 text-gray-400'}`}>{c.status}</span>
                              </td>
                              <td className="py-1 px-2">{c.displayLabel || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === 'CG' && <div className="text-gray-600 text-[10px]">CG Graphics — Coming soon.</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════ CREATE MODAL ══════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#131820] border border-gray-700/60 rounded-lg p-4 w-[420px] max-h-[75vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold mb-3">Create Empty Story</h2>
            <div className="space-y-2">
              <div>
                <label className="text-[9px] text-gray-500">Title *</label>
                <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px]" placeholder="Story title..." />
              </div>
              <div>
                <label className="text-[9px] text-gray-500">Slug</label>
                <input value={nSlug} onChange={(e) => setNSlug(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px]" placeholder="SLUG_NAME" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] text-gray-500">Format</label>
                  <select value={nFormat} onChange={(e) => setNFormat(e.target.value as Story['format'])} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px]">
                    <option value="">Select...</option>
                    <option value="ANCHOR">ANCHOR</option><option value="PKG">PKG</option><option value="VO">VO</option>
                    <option value="VO+BITE">VO+BITE</option><option value="LIVE">LIVE</option><option value="GFX">GFX</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[9px] text-gray-500">Planned Duration</label>
                  <input value={nDur} onChange={(e) => setNDur(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px] font-mono" />
                </div>
              </div>
              <div>
                <label className="text-[9px] text-gray-500">Content</label>
                <textarea value={nContent} onChange={(e) => setNContent(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px] h-16 resize-none" placeholder="Script content..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowCreateModal(false)} className="px-3 py-1 text-[10px] text-gray-400 hover:text-white">Cancel</button>
              <button onClick={createEmpty} disabled={!nTitle.trim()} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded disabled:opacity-40">Create & Add</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ ADD EXISTING MODAL ══════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-[#131820] border border-gray-700/60 rounded-lg p-4 w-[420px] max-h-[75vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold mb-3">Add Existing Story</h2>
            <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-gray-800/50 border border-gray-700/50 rounded px-2 py-1.5 text-[11px] mb-2" placeholder="Search stories..." />
            <div className="space-y-1 max-h-[350px] overflow-auto">
              {filteredExisting.length === 0 ? (
                <div className="text-gray-600 text-[10px] py-3 text-center">No available stories</div>
              ) : filteredExisting.map((s) => (
                <div key={s.storyId} className="flex items-center justify-between bg-gray-800/40 rounded px-2 py-1.5">
                  <div>
                    <div className="text-[11px] font-semibold">{s.title}</div>
                    <div className="text-[9px] text-gray-500">{s.storyId} · {s.format || '—'} · {s.status}</div>
                  </div>
                  <button onClick={() => addExisting(s.storyId)} className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold px-2 py-[2px] rounded">Add</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1 text-[10px] text-gray-400 hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
