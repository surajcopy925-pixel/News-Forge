// src/app/(main)/rundown/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStories, useCreateStory, useUpdateStory } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import { useClips } from '@/hooks/useClips';
import { useRundowns, useRundownEntries, useCreateRundown, useDeleteEntry, useReorderEntries, useAddEntryToRundown } from '@/hooks/useRundowns';
import { useSendToRundown } from '@/hooks/useStories';
import { useUsers } from '@/hooks/useUsers';
import { useCGItems, useCreateCGItem, useUpdateCGItem, useDeleteCGItem, useReorderCGItems } from '@/hooks/useCGItems';
import type { CgSaveData } from '@/components/TemplateBrowser';
import { useMosStatus, useMosConnect, useMosDisconnect, useSendRundownToViz } from '@/hooks/useMosBridge';
import TemplateBrowser from '@/components/TemplateBrowser';
import { Layers, Plus, ExternalLink, Trash2, GripVertical, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { generateAllTimeSlots, parseToSeconds, formatSeconds } from '@/utils/metadata';
import type { Story, StoryClip, RundownEntry } from '@/types/types';

const EMPTY_ARRAY: any[] = [];

/* ── types ── */

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

/* ── constants ── */
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
  /* ── API data hooks ── */
  const { data: stories = EMPTY_ARRAY, isLoading: storiesLoading } = useStories();
  const { data: allClips = EMPTY_ARRAY, isLoading: clipsLoading } = useClips();
  const { data: users = EMPTY_ARRAY } = useUsers();
  const { userId } = useAuth();


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
  const [showTemplateBrowser, setShowTemplateBrowser] = useState(false);
  const [editingCgItemId, setEditingCgItemId] = useState<string | null>(null);

  /* ── CHANGE 1: Resizable left panel ── */
  const [sidebarWidth, setSidebarWidth] = useState(185);
  const sidebarRef = useRef(false);

  /* ── CHANGE 4: Sidebar collapsed state ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  /* ── API: rundowns for selected date ── */
  const { data: dbRundowns = EMPTY_ARRAY, isLoading: rundownsLoading } = useRundowns(selectedDate);


  /* ── Determine if selected rundown is in DB ── */
  const dbRundownId = useMemo(() => {
    if (!selectedRundownId) return null;
    const found = dbRundowns.find((r: any) => r.rundownId === selectedRundownId);
    return found ? found.rundownId : null;
  }, [selectedRundownId, dbRundowns]);

  /* ── API: entries for selected rundown (only if in DB) ── */
  const { data: dbEntries = EMPTY_ARRAY, isLoading: entriesLoading } = useRundownEntries(dbRundownId);


  /* ── mutations ── */
  const createStoryMutation = useCreateStory();
  const updateStoryMutation = useUpdateStory();
  const sendToRundownMutation = useSendToRundown();
  const createRundownMutation = useCreateRundown();
  const deleteEntryMutation = useDeleteEntry();
  const reorderEntriesMutation = useReorderEntries();
  const addEntryMutation = useAddEntryToRundown();

  /* ═══════ 1. ALL RUNDOWNS (merge auto + DB) ═══════ */
  const allRundowns = useMemo(() => {
    const auto = generateAllTimeSlots(selectedDate);
    const merged = auto.map((slot) => {
      const dbMatch = dbRundowns.find(
        (r: any) => r.broadcastTime === slot.broadcastTime || r.rundownId === slot.rundownId
      );
      if (dbMatch) return { ...slot, ...dbMatch, rundownId: dbMatch.rundownId };
      return slot;
    });
    dbRundowns.forEach((sr: any) => {
      if (!merged.find((m) => m.rundownId === sr.rundownId)) merged.push(sr as any);
    });
    return merged;
  }, [selectedDate, dbRundowns]);

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

  /* ═══════ 4. ENTRIES — CHANGE 3: all rows movable ═══════ */
  const entriesForRundown: MergedEntry[] = useMemo(() => {
    if (!selectedRundownId) return [];
    const sys = buildSystemRows(selectedRundownId);

    const storyE: MergedEntry[] = dbEntries.map((entry: any) => {
      const story = stories.find((s) => s.storyId === entry.storyId);
      const clips = allClips.filter((c) => c.storyId === entry.storyId);
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

    // All entries in one flat list — system + stories interleaved
    const all: MergedEntry[] = [sys[0], sys[1], ...storyE, sys[2], sys[3], sys[4]];
    return all.map((e, i) => ({ ...e, orderIndex: i }));
  }, [selectedRundownId, dbEntries, stories, allClips]);

  /* ═══════ 5. TIMING ═══════ */
  const storySec = useMemo(() => entriesForRundown.filter((e) => e.format !== 'BREAK').reduce((s, e) => s + parseToSeconds(e.plannedDuration), 0), [entriesForRundown]);
  const breakSec = useMemo(() => entriesForRundown.filter((e) => e.format === 'BREAK').reduce((s, e) => s + parseToSeconds(e.plannedDuration), 0), [entriesForRundown]);
  const totalSec = storySec + breakSec;
  const plannedSec = parseToSeconds(selectedRundown?.plannedDuration || '00:30:00');
  const overUnder = totalSec - plannedSec;

  /* ═══════ 6. SELECTED ENTRY ═══════ */
  const selectedEntry = useMemo(() => selectedEntryId ? entriesForRundown.find((e) => e.entryId === selectedEntryId) || null : null, [entriesForRundown, selectedEntryId]);

  /* ═══════ CG ITEMS (needs selectedEntry) ═══════ */
  const { data: cgItems = EMPTY_ARRAY, isLoading: cgLoading } = useCGItems(selectedEntry?.storyId ?? null);
  const createCgItemMutation = useCreateCGItem();
  const updateCgItemMutation = useUpdateCGItem();
  const deleteCgItemMutation = useDeleteCGItem();
  const reorderCgItemsMutation = useReorderCGItems();

  /* ── CG handlers ── */
  const handleSaveCG = useCallback(async (cgData: CgSaveData) => {
    if (!selectedEntry?.storyId) return;
    await createCgItemMutation.mutateAsync({
      storyId: selectedEntry.storyId,
      entryId: selectedEntry.entryId,
      templateName: cgData.templateName || cgData.dataElementName || 'Untitled CG',
      concept: cgData.concept || 'Default',
      variant: cgData.variant || 'Default',
      dataElementName: cgData.dataElementName || cgData.templateName || '',
      fieldData: cgData.fieldData || {},
      mosObjId: cgData.mosObjId || '',
      mosObjXml: cgData.mosObjXml || '',
      channel: 'GFX1',
      layer: 'FULL',
      status: 'DRAFT' as any,
      orderIndex: cgItems.length,
    });
  }, [selectedEntry, createCgItemMutation, cgItems.length]);

  const handleDeleteCG = useCallback(async (cgItemId: string) => {
    await deleteCgItemMutation.mutateAsync(cgItemId);
  }, [deleteCgItemMutation]);

  const handleReorderCGs = useCallback(async (cgItemIds: string[]) => {
    if (!selectedEntry?.storyId) return;
    await reorderCgItemsMutation.mutateAsync({ storyId: selectedEntry.storyId, cgItemIds });
  }, [selectedEntry, reorderCgItemsMutation]);

  /* ── MOS Bridge ── */
  const { data: mosStatus } = useMosStatus();
  const mosConnect = useMosConnect();
  const mosDisconnect = useMosDisconnect();
  const sendToViz = useSendRundownToViz();

  const handleMosConnect = () => {
    if (mosStatus?.running) {
      mosDisconnect.mutate();
    } else {
      mosConnect.mutate();
    }
  };

  const handleGoLive = () => {
    if (!selectedRundown || !mosStatus?.connected) return;
    sendToViz.mutate({ rundownId: selectedRundown.rundownId, action: 'create' });
  };

  const handleUpdateViz = () => {
    if (!selectedRundown || !mosStatus?.connected) return;
    sendToViz.mutate({ rundownId: selectedRundown.rundownId, action: 'replace' });
  };

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

  /* ═══════ ENSURE RUNDOWN EXISTS ═══════ */
  const ensureRundownExists = useCallback(async (rundownId: string): Promise<string> => {
    const existing = dbRundowns.find((r: any) => r.rundownId === rundownId);
    if (existing) return existing.rundownId;
    const slot = allRundowns.find((r) => r.rundownId === rundownId);
    if (!slot) throw new Error('Rundown slot not found');
    const created = await createRundownMutation.mutateAsync({
      title: slot.title,
      date: selectedDate,
      broadcastTime: slot.broadcastTime,
      plannedDuration: slot.plannedDuration,
    });
    setSelectedRundownId(created.rundownId);
    return created.rundownId;
  }, [dbRundowns, allRundowns, selectedDate, createRundownMutation]);

  /* ═══════ HANDLERS ═══════ */
  const chgDate = (d: number) => {
    const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d);
    setSelectedDate(dt.toISOString().split('T')[0]);
    setSelectedRundownId(null); setSelectedEntryId(null); setDetailOpen(false);
  };

  const selectRd = (id: string) => { setSelectedRundownId(id); setSelectedEntryId(null); setDetailOpen(false); };

  const clickRow = (e: MergedEntry) => { setSelectedEntryId(e.entryId); setDetailOpen(true); setDetailTab('SCRIPT'); };

  const saveChanges = async () => {
    if (!selectedEntry || selectedEntry.isSystem || !selectedEntry.story) return;
    const sid = selectedEntry.story.storyId;
    try {
      await updateStoryMutation.mutateAsync({
        storyId: sid,
        data: { anchorScript: eAnchor, voiceoverScript: eVO, editorialNotes: eNotes },
      });
    } catch (error: any) {
      console.error('Save failed:', error.message);
      alert('Save failed: ' + error.message);
    }
  };

  const removeEntry = async (id: string, sys: boolean) => {
    if (sys || !selectedRundownId) return;
    const realId = dbRundowns.find((r: any) => r.rundownId === selectedRundownId)?.rundownId;
    if (!realId) return;
    try {
      await deleteEntryMutation.mutateAsync({ rundownId: realId, entryId: id });
      if (selectedEntryId === id) { setSelectedEntryId(null); setDetailOpen(false); }
    } catch (error: any) {
      console.error('Delete failed:', error.message);
    }
  };

  const scrollEntry = (dir: 'up' | 'down') => {
    if (!selectedEntryId) return;
    const i = entriesForRundown.findIndex((e) => e.entryId === selectedEntryId);
    const n = dir === 'up' ? i - 1 : i + 1;
    if (n >= 0 && n < entriesForRundown.length) setSelectedEntryId(entriesForRundown[n].entryId);
  };

  /* ── CHANGE 3: drag — ALL rows movable (system + story) ── */
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const onDragEnd = async () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx && selectedRundownId) {
      const reordered = [...entriesForRundown];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dragOverIdx, 0, moved);

      // Extract non-system entry IDs for API reorder
      const nonSystemIds = reordered.filter((e) => !e.isSystem).map((e) => e.entryId);
      const realId = dbRundowns.find((r: any) => r.rundownId === selectedRundownId)?.rundownId;
      if (realId && nonSystemIds.length > 0) {
        try {
          await reorderEntriesMutation.mutateAsync({ rundownId: realId, entryIds: nonSystemIds });
        } catch (error: any) {
          console.error('Reorder failed:', error.message);
        }
      }
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  /* ── CHANGE 1: sidebar resize handler ── */
  useEffect(() => {
    const mv = (e: MouseEvent) => {
      if (sidebarRef.current) {
        setSidebarWidth(Math.min(400, Math.max(120, e.clientX)));
      }
      if (splitRef.current) {
        const c = document.getElementById('rd-main');
        if (!c) return;
        const r = c.getBoundingClientRect();
        setSplitPct(Math.min(80, Math.max(25, ((e.clientY - r.top) / r.height) * 100)));
      }
    };
    const up = () => { splitRef.current = false; sidebarRef.current = false; };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
  }, []);

  /* ── create empty ── */
  const createEmpty = async () => {
    if (!selectedRundownId || !nTitle.trim()) return;
    try {
      const quickStory = await createStoryMutation.mutateAsync({
        title: nTitle,
        slug: nSlug || nTitle.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
        category: 'General', location: 'Newsroom', source: 'Internal',
        format: nFormat || undefined, status: 'DRAFT', content: nContent,
        priority: 'NORMAL', createdBy: userId, plannedDuration: nDur,
        language: 'EN'
      } as any);
      const realRundownId = await ensureRundownExists(selectedRundownId);
      await addEntryMutation.mutateAsync({
        rundownId: realRundownId,
        storyId: quickStory.storyId,
      });
      setNTitle(''); setNSlug(''); setNFormat(''); setNDur('00:00:00'); setNContent('');
      setShowCreateModal(false);
    } catch (error: any) {
      console.error('Create failed:', error.message);
      alert('Failed to create story: ' + error.message);
    }
  };

  /* ── add existing ── */
  const existingStories = useMemo(() => {
    const inRd = new Set(entriesForRundown.filter((e) => !e.isSystem).map((e) => e.storyId));
    return stories.filter((s) => !s.storyId.startsWith('SYS-') && !inRd.has(s.storyId));
  }, [stories, entriesForRundown]);

  const filteredExisting = useMemo(() => {
    if (!addSearch.trim()) return existingStories;
    const q = addSearch.toLowerCase();
    return existingStories.filter((s) => s.title.toLowerCase().includes(q) || s.slug?.toLowerCase().includes(q));
  }, [existingStories, addSearch]);

  const addExisting = async (sid: string) => {
    if (!selectedRundownId) return;
    try {
      const realRundownId = await ensureRundownExists(selectedRundownId);
      await sendToRundownMutation.mutateAsync({
        storyId: sid,
        data: { rundownId: realRundownId },
      });
      setShowAddModal(false); setAddSearch('');
    } catch (error: any) {
      console.error('Add failed:', error.message);
      alert('Failed to add story: ' + error.message);
    }
  };

  /* ── helpers ── */
  const storyCount = (rdId: string) => {
    if (rdId === selectedRundownId && dbRundownId) {
      return dbEntries.filter((e: any) => !e.storyId?.startsWith('SYS-')).length;
    }
    return 0;
  };

  /* ── CHANGE 2: Display label for clips, use label in slug column ── */
  const getClipDisplayName = (c: StoryClip) => {
    return c.displayLabel && c.displayLabel.trim() ? c.displayLabel : c.fileName;
  };

  const clipCell = (e: MergedEntry) => {
    if (e.isSystem) return <span className="text-gray-600">—</span>;
    const c = e.clips || [];
    if (c.length === 0) return <span className="text-gray-600">—</span>;
    const done = c.filter((x) => x.status === 'DONE' || x.status === 'COMPLETED' || x.status === 'APPROVED').length;
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
    const u = users.find((x: any) => x.userId === uid);
    return u ? u.fullName.split(' ').map((w: string) => w[0]).join('') : uid.slice(0, 6);
  };

  /* ═══════ LOADING ═══════ */
  if (storiesLoading || clipsLoading || rundownsLoading) {
    return (
      <div className="flex h-[calc(100vh-56px)] bg-[#0a0e17] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-xs">Loading rundowns...</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-56px)] bg-[#0a0e17] text-gray-200 text-xs">

      {/* ══════ SIDEBAR — CHANGE 1: resizable + CHANGE 4: collapsible ══════ */}
      {!sidebarCollapsed && (
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="border-r border-gray-800/60 flex flex-col bg-[#0d1117]">
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
      )}

      {/* ── CHANGE 1: Sidebar resize handle ── */}
      {!sidebarCollapsed && (
        <div
          onMouseDown={() => { sidebarRef.current = true; }}
          className="w-1 cursor-col-resize hover:bg-blue-600 bg-gray-800/60 flex-shrink-0"
        />
      )}

      {/* ══════ MAIN ══════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* action bar */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-800/60 bg-[#0d1117]">
          {/* CHANGE 4: sidebar collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-500 hover:text-white text-sm px-1 mr-1"
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>

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
          {/* MOS connection status */}
          <div className="flex items-center gap-2 text-[10px]">
            <button
              onClick={handleMosConnect}
              disabled={mosConnect.isPending || mosDisconnect.isPending}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-bold transition-colors ${
                mosStatus?.connected
                  ? 'bg-green-900/50 text-green-400 hover:bg-green-900'
                  : mosStatus?.running
                  ? 'bg-yellow-900/50 text-yellow-400 hover:bg-yellow-900'
                  : 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                mosStatus?.connected
                  ? 'bg-green-400 animate-pulse'
                  : mosStatus?.running
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-red-500'
              }`} />
              {mosConnect.isPending
                ? 'Starting...'
                : mosDisconnect.isPending
                ? 'Stopping...'
                : mosStatus?.connected
                ? 'MOS ONLINE'
                : mosStatus?.running
                ? 'LISTENING'
                : 'MOS OFFLINE'}
            </button>
            {mosStatus?.connected && mosStatus.lastHeartbeat && (
              <span className="text-gray-500 text-[9px]">HB {new Date(mosStatus.lastHeartbeat).toLocaleTimeString()}</span>
            )}
            {mosStatus?.running && !mosStatus?.connected && mosStatus?.gatewayIp === null && (
              <span className="text-yellow-500 text-[9px]">Waiting for Gateway...</span>
            )}
            {mosStatus?.lastError && !mosStatus.running && (
              <span className="text-red-400 text-[9px] truncate max-w-32" title={mosStatus.lastError}>⚠ {mosStatus.lastError.slice(0, 20)}</span>
            )}
          </div>
          {/* RUN LIVE */}
          {sendToViz.isSuccess && mosStatus?.connected && (
            <button onClick={handleUpdateViz} className="text-orange-400 border border-orange-400/40 hover:bg-orange-900/20 text-[10px] font-bold px-2 py-1 rounded">
              UPDATE VIZ
            </button>
          )}
          <button
            onClick={handleGoLive}
            disabled={!selectedRundown || !mosStatus?.connected || sendToViz.isPending}
            className={`text-[10px] font-bold px-3 py-1 rounded transition-colors ${
              mosStatus?.connected && selectedRundown
                ? sendToViz.isSuccess
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {sendToViz.isPending ? '⏳ SENDING...' : sendToViz.isSuccess ? '✓ SENT' : 'RUN LIVE'}
          </button>
        </div>

        {/* ── CHANGE 4: Rundown info bar with dropdown ── */}
        {selectedRundown && (
          <div className="flex items-center gap-5 px-3 py-1.5 border-b border-gray-800/60 text-[10px]">
            <div className="relative">
              <span className="text-gray-500 block text-[9px]">RUNDOWN</span>
              <select
                value={selectedRundownId || ''}
                onChange={(e) => selectRd(e.target.value)}
                className="bg-transparent text-white font-bold text-[11px] border border-gray-700/50 rounded px-2 py-0.5 appearance-none cursor-pointer pr-6 max-w-[200px]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
              >
                {allRundowns.map((rd) => (
                  <option key={rd.rundownId} value={rd.rundownId} className="bg-[#0d1117] text-white">
                    {rd.title}
                  </option>
                ))}
              </select>
            </div>
            <div><span className="text-gray-500 block text-[9px]">STATUS</span><span className={`font-bold px-1.5 py-0.5 rounded text-[9px] ${selectedRundown.status === 'READY' ? 'bg-green-600' : selectedRundown.status === 'LIVE' ? 'bg-red-600' : 'bg-yellow-600'}`}>{selectedRundown.status}</span></div>
            <div><span className="text-gray-500 block text-[9px]">DURATION</span><span className="font-mono font-bold text-[11px]">{formatSeconds(totalSec)}</span></div>
            <div><span className="text-gray-500 block text-[9px]">PLANNED</span><span className="font-mono bg-red-600/20 text-red-400 px-1.5 py-0.5 rounded text-[9px]">{selectedRundown.plannedDuration}</span></div>
            <div className="flex-1" />
            <div className="text-right">
              <span className="text-gray-500 block text-[9px]">MOS CONNECTION</span>
              <span className={`text-[9px] font-bold ${
                mosStatus?.connected ? 'text-green-400' : mosStatus?.running ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {mosStatus?.connected ? '● ONLINE' : mosStatus?.running ? '● LISTENING' : '● OFFLINE'}
                {sendToViz.isSuccess && mosStatus?.connected && sendToViz.data && (
                  <span className="text-gray-400 font-normal ml-1">{sendToViz.data.totalCgItems} CGs sent</span>
                )}
              </span>
            </div>
          </div>
        )}

        {/* table + detail */}
        <div id="rd-main" className="flex-1 flex flex-col min-h-0">
          {/* TABLE */}
          <div style={{ height: detailOpen ? `${splitPct}%` : '100%' }} className="overflow-auto">
            {entriesLoading && dbRundownId ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-gray-500 text-[10px]">Loading entries...</span>
              </div>
            ) : (
              <>
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
                          key={e.entryId}
                          draggable  /* CHANGE 3: ALL rows draggable */
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
                          <td className="py-[5px] px-1 text-center text-gray-400 text-[10px]">
                            {!e.isSystem && stories.find(s => s.storyId === e.storyId)?._count?.cgItems > 0 ? (
                              <span className="text-blue-400">{stories.find(s => s.storyId === e.storyId)?._count?.cgItems}</span>
                            ) : '—'}
                          </td>
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
              </>
            )}
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
                <button onClick={saveChanges} disabled={updateStoryMutation.isPending} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold px-3 py-[3px] rounded disabled:opacity-50">
                  {updateStoryMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
                <button onClick={() => { setDetailOpen(false); setSelectedEntryId(null); }} className="ml-1.5 text-gray-500 hover:text-white text-sm">✕</button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-auto p-2.5">
                {detailTab === 'SCRIPT' && (
                  <div className="flex gap-3 h-full">
                    <div className="w-[38%] flex flex-col">
                      <div className="text-[9px] font-bold text-gray-500 tracking-wider mb-1">EDITORIAL NOTES</div>
                      <textarea
                        value={eNotes} onChange={(e) => setENotes(e.target.value)}
                        placeholder="Add production notes here..."
                        className="flex-1 bg-gray-800/40 border border-gray-700/40 rounded px-2 py-1.5 text-[11px] text-gray-300 resize-none"
                        style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
                      />
                    </div>
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

                {/* ── CHANGE 2: CLIPS tab — show displayLabel, search by label ── */}
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
                            <th className="py-1 px-2 text-left">CLIP NAME</th>
                            <th className="py-1 px-2 text-left">ORIGINAL</th>
                            <th className="py-1 px-2 text-center">DURATION</th>
                            <th className="py-1 px-2 text-center">STATUS</th>
                            <th className="py-1 px-2 text-left">DISPLAY LABEL</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedEntry.clips || []).map((c) => (
                            <tr key={c.clipId} className="border-b border-gray-800/30">
                              <td className="py-1 px-2 font-mono text-green-400">{getClipDisplayName(c)}</td>
                              <td className="py-1 px-2 text-gray-500">{c.originalFileName}</td>
                              <td className="py-1 px-2 text-center font-mono">{c.duration || '--:--'}</td>
                              <td className="py-1 px-2 text-center">
                                <span className={`text-[8px] font-bold px-1.5 py-[1px] rounded ${c.status === 'DONE' || c.status === 'COMPLETED' || c.status === 'APPROVED' ? 'bg-green-600/20 text-green-400' : c.status === 'EDITING' || c.status === 'AVAILABLE' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-gray-600/20 text-gray-400'}`}>{c.status}</span>
                              </td>
                              <td className="py-1 px-2">{c.displayLabel || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {detailTab === 'CG' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold text-gray-500 tracking-wider">GRAPHICS ({cgItems.length})</div>
                      <button 
                        onClick={() => setShowTemplateBrowser(true)}
                        className="flex items-center gap-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-[9px] font-bold px-2 py-1 rounded border border-blue-500/30 transition-colors"
                      >
                        <Plus size={12} />
                        ADD GRAPHIC
                      </button>
                    </div>

                    {cgLoading ? (
                      <div className="flex flex-1 items-center justify-center">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : cgItems.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-800/40 rounded-lg bg-gray-900/10 py-10">
                        <Layers className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-gray-500 text-[10px]">No graphics for this story.</p>
                        <p className="text-gray-700 text-[9px] mt-1">Add lower thirds, locators, or full screens.</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto space-y-2 pr-1">
                        {cgItems.map((cg: any) => (
                          <div key={cg.cgItemId} className="group flex items-center gap-3 p-2 bg-gray-800/20 border border-gray-700/30 rounded-lg hover:border-gray-600/50 transition-all">
                            <div className="cursor-grab text-gray-700 hover:text-gray-500">
                              <GripVertical size={14} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="bg-blue-600/10 text-blue-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">
                                  {cg.templateName}
                                </span>
                                <span className="text-[11px] font-bold text-white truncate">
                                  {cg.fieldData?.Name || cg.fieldData?.Headline || cg.fieldData?.Quote || 'Untitled Graphic'}
                                </span>
                              </div>
                              <div className="text-[9px] text-gray-500 truncate italic">
                                {cg.concept} / {cg.variant} 
                                {cg.fieldData?.Title ? ` • ${cg.fieldData.Title}` : ''}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1.5 bg-gray-900/50 rounded-md p-0.5 border border-gray-700/50">
                                {['DRAFT', 'READY', 'ON_AIR'].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateCgItemMutation.mutate({ cgItemId: cg.cgItemId, data: { status: s as any } })}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-colors ${
                                      cg.status === s 
                                        ? s === 'ON_AIR' ? 'bg-red-600 text-white' : s === 'READY' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'
                                        : 'text-gray-500 hover:text-gray-300'
                                    }`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                              <button 
                                onClick={() => deleteCgItemMutation.mutate(cg.cgItemId)}
                                className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
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
              <button onClick={createEmpty} disabled={!nTitle.trim() || createStoryMutation.isPending || sendToRundownMutation.isPending} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded disabled:opacity-40">
                {createStoryMutation.isPending || sendToRundownMutation.isPending ? 'Creating...' : 'Create & Add'}
              </button>
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
                  <button onClick={() => addExisting(s.storyId)} disabled={sendToRundownMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold px-2 py-[2px] rounded disabled:opacity-40">
                    {sendToRundownMutation.isPending ? '...' : 'Add'}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button onClick={() => setShowAddModal(false)} className="px-3 py-1 text-[10px] text-gray-400 hover:text-white">Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      {/* ══════ TEMPLATE BROWSER MODAL ══════ */}
      <TemplateBrowser
        isOpen={showTemplateBrowser}
        onClose={() => setShowTemplateBrowser(false)}
        onSave={handleSaveCG}
        onDelete={handleDeleteCG}
        onReorder={handleReorderCGs}
        existingCgs={cgItems}
        storyId={selectedEntry?.storyId || ''}
        entryId={selectedEntry?.entryId}
        storySlug={selectedEntry?.story?.slug || selectedEntry?.slug}
      />
    </div>
  );
}
