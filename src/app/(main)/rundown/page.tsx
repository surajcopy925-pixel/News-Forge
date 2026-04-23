// src/app/(main)/rundown/page.tsx
'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useStories, useCreateStory, useUpdateStory } from '@/hooks/useStories';
import { useAuth } from '@/hooks/useAuth';
import { useClips, useDeleteClip } from '@/hooks/useClips';
import { useRundowns, useRundownEntries, useCreateRundown, useDeleteEntry, useReorderEntries, useAddEntryToRundown, useSeedRundown } from '@/hooks/useRundowns';
import { useSendToRundown } from '@/hooks/useStories';
import { useUsers } from '@/hooks/useUsers';
import { useCGItems, useCreateCGItem, useUpdateCGItem, useDeleteCGItem, useReorderCGItems } from '@/hooks/useCGItems';
import type { CgSaveData } from '@/components/TemplateBrowser';
import { useMosStatus, useMosConnect, useMosDisconnect, useSendRundownToViz } from '@/hooks/useMosBridge';
import { usePrompterStatus, usePrompterConnect, usePrompterDisconnect, useSendToPrompter } from '@/hooks/usePrompter';
import TemplateBrowser from '@/components/TemplateBrowser';
import { toast } from 'sonner';
import { Layers, Plus, ExternalLink, Trash2, GripVertical, CheckCircle, Clock, AlertCircle, ScrollText, Play, Film, X, Link as LinkIcon } from 'lucide-react';
import { generateAllTimeSlots, parseToSeconds, formatSeconds } from '@/utils/metadata';
import { rundownsApi } from '@/lib/api-client';
import type { Story, StoryClip, RundownEntry } from '@/types/types';

const EMPTY_ARRAY: any[] = [];

/* ── types ── */


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
  const router = useRouter();
  const pathname = usePathname();

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
  const [linkingEntryId, setLinkingEntryId] = useState<string | null>(null);
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
  const [nFormat, setNFormat] = useState<Story['format']>('');

  /* ── refs ── */

  /* ── detail editing ── */
  const [eAnchor, setEAnchor] = useState('');
  const [eVO, setEVO] = useState('');
  const [eNotes, setENotes] = useState('');

  /* ── auto-resize textarea fix ── */
  const resizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const anchorRef = useRef<HTMLTextAreaElement>(null);
  const voRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    resizeTextarea(anchorRef.current);
  }, [eAnchor]);

  useEffect(() => {
    resizeTextarea(voRef.current);
  }, [eVO]);

  useEffect(() => {
    resizeTextarea(notesRef.current);
  }, [eNotes]);

  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  /* ── UI enhancements ── */
  const [isSplitView, setIsSplitView] = useState(false);
  const [isSavingScript, setIsSavingScript] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');

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
  const seedRundownMutation = useSeedRundown();
  const deleteClipMutation = useDeleteClip();
  const queryClient = useQueryClient();
  const clipInputRef = useRef<HTMLInputElement>(null);

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

  /* ═══════ 4. ENTRIES — Treated uniformly (all from DB) ═══════ */
  const entriesForRundown: MergedEntry[] = useMemo(() => {
    if (!selectedRundownId) return [];

    console.log("[DEBUG] dbEntries from API:", dbEntries);

    const mapped = dbEntries.map((entry: any) => {
      const story = entry.story; // Use nested story from API directly
      const clips = allClips.filter((c) => c.storyId === entry.storyId);
      const isSystem = entry.storyId?.startsWith('SYS-') ?? true;
      
      return {
        ...entry,
        isSystem,
        slug: story?.slug || story?.title || entry.slug || 'Untitled',
        format: story?.format || entry.format || '',
        plannedDuration: story?.plannedDuration || entry.plannedDuration || '00:00:00',
        story,
        clips,
      };
    });
    
    console.log("[DEBUG] mapped entriesForRundown:", mapped);
    return mapped;
  }, [selectedRundownId, dbEntries, allClips]);

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
  const createCGItemMutation = useCreateCGItem();
  const updateCGItemMutation = useUpdateCGItem();
  const deleteCGItemMutation = useDeleteCGItem();
  const reorderCGItemsMutation = useReorderCGItems();

  /* ── CG handlers ── */
  const handleSaveCG = useCallback(async (cgData: CgSaveData) => {
    if (!selectedEntry?.storyId) return;
    await createCGItemMutation.mutateAsync({
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
  }, [selectedEntry, createCGItemMutation, cgItems.length]);

  const handleDeleteCG = useCallback(async (cgItemId: string) => {
    await deleteCGItemMutation.mutateAsync(cgItemId);
  }, [deleteCGItemMutation]);

  const handleReorderCGs = useCallback(async (cgItemIds: string[]) => {
    if (!selectedEntry?.storyId) return;
    await reorderCGItemsMutation.mutateAsync({ storyId: selectedEntry.storyId, cgItemIds });
  }, [selectedEntry, reorderCGItemsMutation]);

  /* ── MOS Bridge ── */
  const { data: mosStatus } = useMosStatus();
  const mosConnect = useMosConnect();
  const mosDisconnect = useMosDisconnect();
  const sendToViz = useSendRundownToViz();

  /* ── Prompter ── */
  const { data: prompterStatus } = usePrompterStatus();
  const prompterConnect = usePrompterConnect();
  const prompterDisconnect = usePrompterDisconnect();
  const sendToPrompterMutation = useSendToPrompter();

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

  const handlePrompterConnect = () => {
    if (prompterStatus?.listening) {
      prompterDisconnect.mutate();
    } else {
      prompterConnect.mutate();
    }
  };

  const handleSendToPrompter = () => {
    if (!selectedRundown || !prompterStatus?.connected) return;
    sendToPrompterMutation.mutate(selectedRundown.rundownId);
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

  /* ── Task: Rotate List Utility ── */
  const rotateToCurrentTime = useCallback(<T extends { broadcastTime?: string }>(slots: T[]): T[] => {
    if (!slots || slots.length === 0) return slots;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let bestIndex = 0;
    let bestDiff = Infinity;

    slots.forEach((slot, index) => {
      const timeStr = slot.broadcastTime || '';
      if (!timeStr) return;

      const parts = timeStr.split(':').map(Number);
      const slotMinutes = parts[0] * 60 + (parts[1] || 0);

      const diff = currentMinutes - slotMinutes;
      if (diff >= 0 && diff < bestDiff) {
        bestDiff = diff;
        bestIndex = index;
      }
    });

    return [...slots.slice(bestIndex), ...slots.slice(0, bestIndex)];
  }, []);

  useEffect(() => {
    if (!selectedRundownId) return;
    const params = new URLSearchParams(window.location.search);
    const currentRundownId = params.get('rundownId');
    if (currentRundownId === selectedRundownId) return;

    params.set('rundownId', selectedRundownId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, selectedRundownId]);


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

  /* ═══════ ENSURE RUNDOWN EXISTS & SEED SYSTEM ROWS ═══════ */
  const ensureRundownExists = useCallback(async (rundownId: string): Promise<string> => {
    const existing = dbRundowns.find((r: any) => r.rundownId === rundownId);
    if (existing) return existing.rundownId;
    
    const slot = allRundowns.find((r) => r.rundownId === rundownId);
    if (!slot) {
      console.warn("Rundown slot missing, skipping creation");
      return rundownId;
    }
    
    // Determine defaults if slot not in UI list
    const title = slot?.title || 'New Rundown';
    const broadcastTime = slot?.broadcastTime || '00:00';
    const plannedDuration = slot?.plannedDuration || '00:30:00';

    console.log('[DEBUG] Creating new rundown in DB with ID:', rundownId);
    try {
      const created = await createRundownMutation.mutateAsync({
        rundownId: rundownId, // Pass the frontend-generated ID to sync
        title,
        date: selectedDate,
        broadcastTime,
        plannedDuration,
      });

      // Seed via API instead of manual loop
      console.log('[DEBUG] Triggering seed for new rundown:', created.rundownId);
      await seedRundownMutation.mutateAsync(created.rundownId);

      setSelectedRundownId(created.rundownId);
      return created.rundownId;
    } catch (err: any) {
      console.error('[ERROR] Failed to ensure rundown exists:', err);
      // If it failed because it exists, just return the ID
      if (err.message?.includes('Unique constraint')) {
        return rundownId;
      }
      throw err;
    }
  }, [dbRundowns, allRundowns, selectedDate, createRundownMutation, seedRundownMutation]);

  /* ═══════ AUTO-ENSURE & SEED SELECTED RUNDOWN ═══════ */
  const isEnsuringRef = useRef(false);

  useEffect(() => {
    if (!selectedRundownId || isEnsuringRef.current) return;

    const runAutoFlow = async () => {
      const exists = dbRundowns.some((r: any) => r.rundownId === selectedRundownId);
      
      if (!exists) {
        console.log('[DEBUG] Selected rundown missing from DB, ensuring exists:', selectedRundownId);
        isEnsuringRef.current = true;
        try {
          await ensureRundownExists(selectedRundownId);
        } catch (e) {
          console.error("Auto-ensure failed:", e);
        } finally {
          isEnsuringRef.current = false;
        }
      } else if (dbRundownId && !entriesLoading && entriesForRundown.length === 0 && !seedRundownMutation.isPending) {
        console.log("[FIX] Seeding rundown:", dbRundownId);
        seedRundownMutation.mutate(dbRundownId);
      }
    };

    runAutoFlow();
  }, [selectedRundownId, dbRundownId, entriesLoading, entriesForRundown.length, dbRundowns.length, ensureRundownExists, seedRundownMutation]);

  /* ═══════ MUTATIONS ═══════ */
  const updateEntryMutation = useMutation({
    mutationFn: ({ entryId, data }: { entryId: string, data: any }) => 
      rundownsApi.updateEntry(selectedRundownId!, entryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', selectedRundownId] });
      queryClient.invalidateQueries({ queryKey: ['stories'] });
    }
  });

  /* ═══════ HANDLERS ═══════ */
  const chgDate = (d: number) => {
    const dt = new Date(selectedDate); dt.setDate(dt.getDate() + d);
    setSelectedDate(dt.toISOString().split('T')[0]);
    setSelectedRundownId(null); setSelectedEntryId(null); setDetailOpen(false);
  };

  const selectRd = (id: string) => { setSelectedRundownId(id); setSelectedEntryId(null); setDetailOpen(false); };

  const clickRow = (e: MergedEntry) => { 
    if (editingTitleId) return; // Don't open detail if editing title
    setSelectedEntryId(e.entryId); 
    setDetailOpen(true); 
    setDetailTab('SCRIPT'); 
  };

  const handleTitleClick = (e: React.MouseEvent, entry: MergedEntry) => {
    if (entry.isSystem) return;
    e.stopPropagation();
    setEditingTitleId(entry.storyId);
    setTempTitle(entry.story?.title || entry.slug);
  };

  const saveTitle = async () => {
    if (!editingTitleId) return;
    const newTitle = tempTitle.trim();
    const sid = editingTitleId;
    setEditingTitleId(null);

    if (!newTitle) return;

    try {
      await updateStoryMutation.mutateAsync({
        storyId: sid,
        data: { title: newTitle },
      });
      toast.success('Title updated');
    } catch (error: any) {
      toast.error('Failed to update title');
    }
  };



  const saveChanges = async () => {
    if (!selectedEntry) return;
    setIsSavingScript(true);
    try {
      // 1. Update Story (if linked and not system)
      if (!selectedEntry.isSystem && selectedEntry.storyId) {
        await updateStoryMutation.mutateAsync({
          storyId: selectedEntry.storyId,
          data: { 
            anchorScript: eAnchor, 
            voiceoverScript: eVO, 
            editorialNotes: eNotes,
            rawScript: eAnchor // Sync rawScript too
          },
        });
      }

      // 2. Update Rundown Entry (Always save to entry too)
      await updateEntryMutation.mutateAsync({
        entryId: selectedEntry.entryId,
        data: { 
          scriptContent: eAnchor, // Main script content for entry
          scriptSource: 'POLISHED' 
        }
      });

      toast.success('Script saved successfully');
      queryClient.invalidateQueries({ queryKey: ['rundown-entries', selectedRundownId] });
    } catch (error: any) {
      console.error('Save failed:', error);
      toast.error('Save failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSavingScript(false);
    }
  };

  const removeEntry = async (id: string, sys: boolean) => {
    if (sys || !selectedRundownId) return;
    const realId = dbRundowns.find((r: any) => r.rundownId === selectedRundownId)?.rundownId;
    if (!realId) return;
    try {
      await deleteEntryMutation.mutateAsync({ rundownId: realId, entryId: id });
      if (selectedEntryId === id) { setSelectedEntryId(null); setDetailOpen(false); }
      toast.success('Entry removed from rundown');
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error('Failed to remove entry: ' + (error.message || 'Unknown error'));
    }
  };

  const scrollEntry = (dir: 'up' | 'down') => {
    if (!selectedEntryId) return;
    const i = entriesForRundown.findIndex((e) => e.entryId === selectedEntryId);
    const n = dir === 'up' ? i - 1 : i + 1;
    if (n >= 0 && n < entriesForRundown.length) setSelectedEntryId(entriesForRundown[n].entryId);
  };

  /* ── clip management ── */
  const [isUploadingClip, setIsUploadingClip] = useState(false);
  const handleClipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntry?.storyId) return;

    setIsUploadingClip(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('storyId', selectedEntry.storyId);

    try {
      const res = await fetch('/api/clips/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      
      toast.success('Clip attached successfully');
      queryClient.invalidateQueries({ queryKey: ['rundown-entries'] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
      if (e.target) e.target.value = '';
    } catch (err) {
      toast.error('Failed to upload clip');
    } finally {
      setIsUploadingClip(false);
    }
  };

  const openLibrary = () => toast.info('Clip Library coming soon');
  const [previewClip, setPreviewClip] = useState<StoryClip | null>(null);
  const playClip = (clip: StoryClip) => {
    setPreviewClip(previewClip?.clipId === clip.clipId ? null : clip);
  };

  /* ── CHANGE 3: drag — ALL rows movable (system + story) ── */
  const onDragStart = (i: number) => setDragIdx(i);
  const onDragOver = (e: React.DragEvent, i: number) => { e.preventDefault(); setDragOverIdx(i); };
  const onDragEnd = async () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx && selectedRundownId) {
      const reordered = [...entriesForRundown];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(dragOverIdx, 0, moved);

      // All entries are now real DB entries (system or story)
      const entryIds = reordered.map((e) => e.entryId);
      const realId = dbRundowns.find((r: any) => r.rundownId === selectedRundownId)?.rundownId;
      
      if (realId && entryIds.length > 0) {
        try {
          await reorderEntriesMutation.mutateAsync({ rundownId: realId, entryIds });
          toast.success('Rundown reordered');
        } catch (error: any) {
          console.error('Reorder failed:', error);
          toast.error('Failed to reorder: ' + (error.message || 'Unknown error'));
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
        slug: nTitle.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
        category: 'General', location: 'Newsroom', source: 'Internal',
        format: nFormat || undefined, status: 'DRAFT', content: '',
        priority: 'NORMAL', createdBy: userId, plannedDuration: '00:00:00',
        date: selectedDate,
        language: 'en'
      } as any);
      const realRundownId = await ensureRundownExists(selectedRundownId);
      await addEntryMutation.mutateAsync({
        rundownId: realRundownId,
        storyId: quickStory.storyId,
      });
      setNTitle(''); setNFormat('');
      setShowCreateModal(false);
      toast.success('Story created and added to rundown');
    } catch (error: any) {
      console.error('Create failed:', error);
      toast.error('Failed to create story: ' + (error.message || 'Unknown error'));
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
      
      if (linkingEntryId) {
        // LINKING to existing entry
        await updateEntryMutation.mutateAsync({
          entryId: linkingEntryId,
          data: { storyId: sid }
        });
        setLinkingEntryId(null);
      } else {
        // ADDING as new entry
        await sendToRundownMutation.mutateAsync({
          storyId: sid,
          data: { rundownId: realRundownId },
        });
      }
      
      setShowAddModal(false); setAddSearch('');
      toast.success(linkingEntryId ? 'Story linked to entry' : 'Story added to rundown');
    } catch (error: any) {
      console.error('Add failed:', error);
      toast.error('Failed to add story: ' + (error.message || 'Unknown error'));
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
      <div className="flex h-[calc(100vh-56px)] bg-white items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-xs">Loading rundowns...</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════ RENDER ═══════════════════════════ */
  return (
    <div className={`flex h-[calc(100vh-56px)] bg-white text-gray-900 text-xs ${isSplitView ? 'pl-0' : ''}`}>

      {/* ══════ SIDEBAR — CHANGE 1: resizable + CHANGE 4: collapsible ══════ */}
      {!sidebarCollapsed && !isSplitView && (
        <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="px-2 pt-2 pb-1.5 border-b border-gray-200">
            <div className="text-[10px] font-bold text-gray-400 tracking-wider mb-1">RUNDOWNS</div>
            <div className="flex items-center justify-between mb-1.5">
              <button onClick={() => chgDate(-1)} className="text-gray-400 hover:text-gray-900 text-sm px-0.5">&lt;</button>
              <span className="text-[11px] font-bold tracking-wide">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
              </span>
              <button onClick={() => chgDate(1)} className="text-gray-400 hover:text-gray-900 text-sm px-0.5">&gt;</button>
            </div>
            <button onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])} className="w-full bg-green-600 hover:bg-green-700 text-[10px] font-bold py-0.5 rounded mb-1.5 text-white">TODAY</button>
            <input
              type="text" placeholder="Search bulletins..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded px-1.5 py-[3px] text-[10px] text-gray-900 placeholder-gray-400"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {(selectedDate === new Date().toISOString().split('T')[0] ? rotateToCurrentTime(filteredRundowns) : filteredRundowns).map((rd) => {
              const sel = rd.rundownId === selectedRundownId;
              const sc = storyCount(rd.rundownId);
              return (
                <div
                  key={rd.rundownId} 
                  onClick={() => selectRd(rd.rundownId)}
                  className={`px-2 py-1.5 cursor-pointer border-b border-gray-100 transition-colors ${sel ? 'bg-blue-50 border-l-[3px] border-l-blue-500' : 'hover:bg-gray-100 border-l-[3px] border-l-transparent'}`}
                >
                  <div className="font-semibold text-[11px] truncate leading-tight text-gray-900">{rd.title}</div>
                  <div className="flex items-center gap-1.5 text-[9px] text-gray-500 mt-0.5">
                    <span className="text-blue-600 font-bold">RD</span>
                    <span>{rd.broadcastTime.slice(0, 5)}</span>
                    <span className="text-gray-300">●</span>
                    <span>{rd.plannedDuration}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5 text-[9px]">
                    <span className="text-gray-500">{5 + sc} STORIES</span>
                    <span className="text-gray-400">MOS OK</span>
                  </div>
                  <span className={`text-[9px] ${rd.status === 'READY' ? 'text-green-600' : rd.status === 'LIVE' ? 'text-red-600' : 'text-yellow-600'}`}>● {rd.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CHANGE 1: Sidebar resize handle ── */}
      {!sidebarCollapsed && !isSplitView && (
        <div
          onMouseDown={() => { sidebarRef.current = true; }}
          className="w-1 cursor-col-resize hover:bg-blue-600 bg-gray-200 flex-shrink-0"
        />
      )}

      {/* ══════ MAIN ══════ */}
      <div className={`flex-1 flex flex-col min-w-0 ${isSplitView ? 'w-full' : ''}`} style={{ marginLeft: showTemplateBrowser ? '420px' : '0px', transition: 'margin-left 0.2s ease' }}>
        {/* action bar */}
        <div className="flex items-center gap-1 px-3 py-1 border-b border-gray-200 bg-gray-50">
          {/* CHANGE 4: sidebar collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-gray-400 hover:text-gray-900 text-sm px-1 mr-1"
            title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>

          <div className="relative">
            <button onClick={() => setShowNewMenu(!showNewMenu)} className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold px-2.5 py-1 rounded">+ NEW</button>
            {showNewMenu && (
              <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded shadow-xl z-50 w-40">
                <button onClick={() => { setShowCreateModal(true); setShowNewMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-gray-50 text-gray-700">Create Empty Story</button>
                <button onClick={() => { setShowAddModal(true); setShowNewMenu(false); }} className="w-full text-left px-2.5 py-1.5 text-[10px] hover:bg-gray-50 text-gray-700">Add Existing Story</button>
              </div>
            )}
          </div>
          {['✏ EDIT', '⊘ DELETE', '⎘ COPY', '↕ MOVE', '🖨 PRINT', '🔍 SEARCH', '📤 EXPORT'].map((l) => (
            <button key={l} className="text-gray-400 hover:text-gray-900 text-[10px] px-1.5 py-1 font-semibold">{l}</button>
          ))}
          
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
              title="Viz MOS Bridge Status"
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
          </div>

          <div className="h-4 w-[1px] bg-gray-200 mx-1" />

          {/* Prompter Status */}
          <div className="flex items-center gap-2 text-[10px]">
             <button
              onClick={handlePrompterConnect}
              disabled={prompterConnect.isPending || prompterDisconnect.isPending}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-bold transition-colors ${
                prompterStatus?.connected
                  ? 'bg-purple-900/50 text-purple-300 hover:bg-purple-900'
                  : prompterStatus?.listening
                  ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50'
                  : 'bg-gray-800/50 text-gray-500 hover:bg-gray-800'
              }`}
              title="Teleprompter MOS Server"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${
                prompterStatus?.connected
                  ? 'bg-purple-400 animate-pulse'
                  : prompterStatus?.listening
                  ? 'bg-blue-400 animate-pulse'
                  : 'bg-gray-600'
              }`} />
              {prompterConnect.isPending
                ? 'Starting...'
                : prompterDisconnect.isPending
                ? 'Stopping...'
                : prompterStatus?.connected
                ? 'PROMPTER OK'
                : prompterStatus?.listening
                ? 'PDS READY'
                : 'PDS OFF'}
            </button>

            {prompterStatus?.connected && (
              <button
                onClick={handleSendToPrompter}
                disabled={sendToPrompterMutation.isPending}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-colors disabled:opacity-50"
              >
                {sendToPrompterMutation.isPending ? '⏳ SENDING...' : <><ScrollText size={12} /> PUSH SCRIPT</>}
              </button>
            )}
          </div>

          <div className="flex-1" />
          
          {/* RUN LIVE */}
          <div className="flex items-center gap-2">
            {sendToViz.isSuccess && mosStatus?.connected && (
              <button 
                onClick={handleUpdateViz} 
                className="text-orange-400 border border-orange-400/40 hover:bg-orange-900/20 text-[10px] font-bold px-2 py-1 rounded transition-colors"
              >
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
        </div>

        {/* ── CHANGE 4: Rundown info bar with dropdown ── */}
        {selectedRundown && (
          <div className="flex items-center gap-5 px-3 py-1.5 border-b border-gray-200 text-[10px] bg-white">
            <div className="relative">
              <span className="text-gray-400 block text-[9px]">RUNDOWN</span>
              <select
                value={selectedRundownId || ''}
                onChange={(e) => selectRd(e.target.value)}
                className="bg-transparent text-gray-900 font-bold text-[11px] border border-gray-200 rounded px-2 py-0.5 appearance-none cursor-pointer pr-6 max-w-[200px]"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center' }}
              >
                {allRundowns.map((rd) => (
                  <option key={rd.rundownId} value={rd.rundownId} className="bg-white text-gray-900">
                    {rd.title}
                  </option>
                ))}
              </select>
            </div>
            <div><span className="text-gray-400 block text-[9px]">STATUS</span><span className={`font-bold px-1.5 py-0.5 rounded text-[9px] text-white ${selectedRundown.status === 'READY' ? 'bg-green-600' : selectedRundown.status === 'LIVE' ? 'bg-red-600' : 'bg-yellow-600'}`}>{selectedRundown.status}</span></div>
            <div><span className="text-gray-400 block text-[9px]">DURATION</span><span className="font-mono font-bold text-[11px] text-gray-900">{formatSeconds(totalSec)}</span></div>
            <div><span className="text-gray-400 block text-[9px]">PLANNED</span><span className="font-mono bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded text-[9px]">{selectedRundown.plannedDuration}</span></div>
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

        {/* table + detail — 🔥 STEP 1 & 5 */}
        <div id="rd-main" className={`flex-1 flex ${isSplitView ? 'flex-row' : 'flex-col'} h-full min-h-0 overflow-hidden`}>
          {/* TABLE CONTAINER — 🔥 STEP 2 & 3 */}
          <div 
            style={{ 
              ...(isSplitView 
                ? { width: detailOpen ? '40%' : '100%', height: '100%' } 
                : { height: detailOpen ? `${splitPct}%` : '100%', width: '100%' })
            }} 
            className="flex-1 min-h-0 overflow-y-auto border-r border-gray-200 bg-white"
          >
            {entriesLoading && dbRundownId ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-gray-500 text-[10px]">Loading entries...</span>
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="text-gray-400 text-[9px] tracking-wider border-b border-gray-200">
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
                      const hasClips = (e.clips || []).length > 0;
                      
                      return (
                        <tr
                          key={e.entryId}
                          draggable  /* CHANGE 3: ALL rows draggable */
                          onDragStart={() => onDragStart(idx)}
                          onDragOver={(ev) => onDragOver(ev, idx)}
                          onDragEnd={onDragEnd}
                          onClick={() => clickRow(e)}
                          className={`
                            border-b border-gray-100 cursor-pointer transition-colors 
                            ${isSel ? 'bg-blue-50' : hasClips ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-gray-50'} 
                            ${isDO ? 'border-t-2 border-t-blue-500' : ''}
                            ${hasClips ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}
                          `}
                        >
                          <td className="py-[5px] px-1.5 text-center text-gray-400 text-[10px]">{idx}</td>
                          <td className="py-[5px] px-0.5 text-center text-gray-300 cursor-grab text-[10px]">⠿</td>
                          <td className="py-[5px] px-0.5 text-center">
                            <span className={`inline-block w-2 h-2 rounded-full ${e.isSystem ? 'bg-red-500' : e.story?.status === 'READY' ? 'bg-green-500' : e.story?.status === 'EDITING' ? 'bg-yellow-500' : 'bg-orange-500'}`} />
                          </td>
                          <td className="py-[5px] px-2 font-semibold text-[11px] truncate max-w-[280px]">
                            <div className="flex items-center gap-2 group">
                              {e.isSystem ? (
                                <span className="text-gray-400 uppercase tracking-wider">[{e.slug}]</span>
                              ) : editingTitleId === e.storyId ? (
                                <input
                                  autoFocus
                                  value={tempTitle}
                                  onChange={(ev) => setTempTitle(ev.target.value)}
                                  onBlur={saveTitle}
                                  onKeyDown={(ev) => {
                                    if (ev.key === 'Enter') saveTitle();
                                    if (ev.key === 'Escape') setEditingTitleId(null);
                                  }}
                                  onClick={(ev) => ev.stopPropagation()}
                                  className="bg-[#1a2233] border border-blue-500 rounded px-1 w-full text-white outline-none"
                                />
                              ) : (
                                <span onClick={(ev) => handleTitleClick(ev, e)} className="hover:text-blue-400 transition-colors cursor-text">
                                  {e.story?.title || e.slug}
                                  {hasClips && <span className="ml-2 text-emerald-600" title="Media Attached">🎬</span>}
                                </span>
                              )}

                              {e.isSystem && (
                                <button
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setLinkingEntryId(e.entryId);
                                    setShowAddModal(true);
                                  }}
                                  className="p-1 hover:bg-gray-100 rounded text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Link story to this slot"
                                >
                                  <LinkIcon size={12} />
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-[5px] px-1 text-center">
                            <span className={`text-[9px] font-bold px-1.5 py-[1px] rounded ${fmtBadge(e.format || e.story?.format || '')}`}>
                              {e.format || e.story?.format || '—'}
                            </span>
                          </td>
                          <td className="py-[5px] px-1 text-center text-[10px]">{clipCell(e)}</td>
                          <td className="py-[5px] px-1 text-center text-gray-400 text-[10px]">
                            {!e.isSystem && e.story?._count?.cgItems && e.story._count.cgItems > 0 ? (
                              <span className="text-blue-400">{e.story._count.cgItems}</span>
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
                <div className="flex items-center gap-4 px-3 py-1.5 border-t border-gray-200 bg-gray-50 text-[10px] font-mono">
                  <span>STORIES: <strong className="text-gray-900">{formatSeconds(storySec)}</strong></span>
                  <span>BREAKS: <strong className="text-red-600">{formatSeconds(breakSec)}</strong></span>
                  <span className="text-gray-300">|</span>
                  <span>TOTAL: <strong className="text-gray-900">{formatSeconds(totalSec)}</strong></span>
                  <div className="flex-1" />
                  <span>PLANNED: <span className="bg-red-50 text-red-600 border border-red-100 px-1.5 py-0.5 rounded">{selectedRundown?.plannedDuration || '00:30:00'}</span></span>
                  <span>OVER/UNDER: <strong className={overUnder > 0 ? 'text-red-600' : 'text-green-600'}>{overUnder > 0 ? '+' : ''}{formatSeconds(overUnder)}</strong> {overUnder <= 0 ? '✅' : '❌'}</span>
                </div>

                {entriesForRundown.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 opacity-50">
                    <AlertCircle size={32} className="mb-2 text-gray-600" />
                    <p>No entries found for this rundown.</p>
                    <p className="text-[10px]">Try creating a story or check if the rundown is seeded.</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* resize handle */}
          {detailOpen && !isSplitView && (
            <div onMouseDown={() => { splitRef.current = true; }} className="h-1.5 bg-gray-200 hover:bg-blue-600 cursor-row-resize flex items-center justify-center">
              <div className="w-10 h-[2px] bg-gray-400 rounded" />
            </div>
          )}

          {/* ══════ DETAIL PANEL — 🔥 STEP 4 ══════ */}
          {detailOpen && selectedEntry && (
            <div 
              style={isSplitView ? { width: '60%' } : { height: `${100 - splitPct}%` }} 
              className={`${isSplitView ? 'border-l w-1/2' : 'border-t'} border-gray-200 bg-gray-50 flex flex-col h-full min-h-0 overflow-hidden`}
            >
              {/* header */}
              <div className="flex items-center px-3 py-1 border-b border-gray-200 bg-white shrink-0">
                <div className="flex gap-3">
                  {(['SCRIPT', 'CLIPS', 'CG GRAPHICS'] as const).map((tab) => {
                    const k = tab === 'CG GRAPHICS' ? 'CG' : tab;
                    return (
                      <button key={tab} onClick={() => setDetailTab(k as any)}
                        className={`text-[10px] font-bold pb-0.5 ${detailTab === k ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-900'}`}>
                        {tab}
                      </button>
                    );
                  })}
                </div>
                <div className="flex-1" />
                <span className="text-[10px] text-gray-400">EDITING: <strong className="text-gray-900 font-bold">&quot;{selectedEntry.isSystem ? selectedEntry.slug : (selectedEntry.story?.title || selectedEntry.slug)}&quot;</strong></span>
                <button onClick={() => scrollEntry('up')} className="ml-3 text-gray-400 hover:text-gray-900 text-[10px] px-0.5">▲</button>
                <button onClick={() => scrollEntry('down')} className="text-gray-400 hover:text-gray-900 text-[10px] px-0.5">▼</button>
                
                <button 
                  onClick={() => setIsSplitView(!isSplitView)} 
                  className={`ml-3 px-2 py-[3px] rounded text-[9px] font-bold transition-colors ${isSplitView ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-400 hover:text-gray-900'}`}
                >
                  SPLIT VIEW {isSplitView ? 'ON' : 'OFF'}
                </button>

                <button onClick={saveChanges} disabled={updateStoryMutation.isPending} className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold px-3 py-[3px] rounded disabled:opacity-50">
                  {updateStoryMutation.isPending ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
                <button onClick={() => { setDetailOpen(false); setSelectedEntryId(null); }} className="ml-1.5 text-gray-400 hover:text-gray-900 text-sm">✕</button>
              </div>

              {/* body */}
              <div className="flex-1 overflow-y-auto p-4 pr-2 custom-scrollbar h-full">
                {detailTab === 'SCRIPT' && (
                  <div className={`flex ${isSplitView ? 'flex-col gap-4' : 'flex-row gap-4'} h-full min-h-0`}>
                    {/* EDITORIAL NOTES */}
                    <div className={`${isSplitView ? 'w-full h-fit' : 'w-[38%]'} flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm`}>
                      <h3 className="text-xs font-semibold text-gray-400 mb-2 tracking-wide uppercase">
                        EDITORIAL NOTES
                      </h3>
                      <textarea
                        ref={notesRef}
                        value={eNotes} 
                        onChange={(e) => {
                          setENotes(e.target.value);
                          resizeTextarea(e.target);
                        }}
                        placeholder="Add production notes here..."
                        className="w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 leading-relaxed resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className={`${isSplitView ? 'w-full' : 'w-[62%]'} flex flex-col gap-4`}>
                      {/* ANCHOR SCRIPT */}
                      <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-xs font-semibold text-gray-400 tracking-wide uppercase">
                            ANCHOR SCRIPT
                          </h3>
                        </div>
                        <textarea
                          ref={anchorRef}
                          value={eAnchor} 
                          onChange={(e) => {
                            setEAnchor(e.target.value);
                            resizeTextarea(e.target);
                          }}
                          placeholder="Type anchor script here..."
                          className="w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 leading-relaxed resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* VOICEOVER SCRIPT */}
                      <div className="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-xs font-semibold text-gray-400 mb-2 tracking-wide uppercase">
                          VOICEOVER / PKG SCRIPT
                        </h3>
                        <textarea
                          ref={voRef}
                          value={eVO} 
                          onChange={(e) => {
                            setEVO(e.target.value);
                            resizeTextarea(e.target);
                          }}
                          placeholder="Type voiceover script here..."
                          className="w-full min-h-[80px] rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 leading-relaxed resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'CLIPS' && (
                  <div className="flex flex-col h-full">
                    {selectedEntry.isSystem ? (
                      <div className="text-gray-600 text-[10px]">System rows have no clips.</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 mb-4">
                          <input
                            type="file"
                            ref={clipInputRef}
                            onChange={handleClipUpload}
                            accept="video/*"
                            className="hidden"
                          />
                          <button
                            onClick={() => clipInputRef.current?.click()}
                            disabled={isUploadingClip}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                          >
                            <Plus size={12} />
                            {isUploadingClip ? 'ATTACHING...' : 'ATTACH CLIP'}
                          </button>
                          <button
                            onClick={openLibrary}
                            className="text-[10px] font-bold px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded transition-colors"
                          >
                            BROWSE LIBRARY
                          </button>
                        </div>

                        {(selectedEntry.clips || []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                            <Film size={24} className="text-gray-300 mb-2" />
                            <p className="text-gray-400 text-[10px]">No clips attached yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(selectedEntry.clips || []).map((c) => (
                              <div key={c.clipId} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded-lg group hover:border-blue-300 transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                                    <Film size={14} />
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-mono text-[10px] text-green-600 font-bold truncate">
                                      {getClipDisplayName(c)}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[9px] text-gray-400 font-mono">{c.duration || '--:--'}</span>
                                      <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${c.status === 'DONE' || c.status === 'COMPLETED' || c.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {c.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => playClip(c)}
                                    className={`p-1.5 rounded transition-all ${previewClip?.clipId === c.clipId ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                    title="Preview Clip"
                                  >
                                    <Play size={14} fill={previewClip?.clipId === c.clipId ? "currentColor" : "none"} />
                                  </button>
                                  <button
                                    onClick={() => deleteClipMutation.mutate(c.clipId)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    title="Remove Clip"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {detailTab === 'CG' && (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[10px] font-bold text-gray-500 tracking-wider">GRAPHICS ({cgItems.length})</div>
                      <button 
                        onClick={() => {
                          setShowTemplateBrowser(true);
                          setDetailTab('SCRIPT');
                        }}
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
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 py-10">
                        <Layers className="w-8 h-8 text-gray-300 mb-2" />
                        <p className="text-gray-400 text-[10px]">No graphics for this story.</p>
                        <p className="text-gray-400 text-[9px] mt-1">Add lower thirds, locators, or full screens.</p>
                      </div>
                    ) : (
                      <div className="flex-1 overflow-auto space-y-2 pr-1">
                        {cgItems.map((cg: any) => (
                          <div key={cg.cgItemId} className="group flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-200 transition-all shadow-sm">
                            <div className="cursor-grab text-gray-300 hover:text-gray-500">
                              <GripVertical size={14} />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="bg-blue-50 text-blue-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-blue-100">
                                  {cg.templateName}
                                </span>
                                <span className="text-[11px] font-bold text-gray-900 truncate">
                                  {cg.fieldData?.Name || cg.fieldData?.Headline || cg.fieldData?.Quote || 'Untitled Graphic'}
                                </span>
                              </div>
                              <div className="text-[9px] text-gray-500 truncate italic">
                                {cg.concept} / {cg.variant} 
                                {cg.fieldData?.Title ? ` • ${cg.fieldData.Title}` : ''}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center gap-1.5 bg-gray-50 rounded-md p-0.5 border border-gray-200">
                                {['DRAFT', 'READY', 'ON_AIR'].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => updateCGItemMutation.mutate({ cgItemId: cg.cgItemId, data: { status: s as any } })}
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
                                onClick={() => deleteCGItemMutation.mutate(cg.cgItemId)}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Create Empty Story</h2>
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Title *</label>
                <input value={nTitle} onChange={(e) => setNTitle(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900" placeholder="Story title..." />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Format</label>
                  <select value={nFormat} onChange={(e) => setNFormat(e.target.value as Story['format'])} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900">
                    <option value="">Select...</option>
                    <option value="ANCHOR">ANCHOR</option><option value="PKG">PKG</option><option value="VO">VO</option>
                    <option value="VO+BITE">VO+BITE</option><option value="LIVE">LIVE</option><option value="GFX">GFX</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Planned Date</label>
                  <input
                    type="text"
                    readOnly
                    value={new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                    className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                    title="Auto-detected from selected rundown date"
                  />
                </div>
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-[420px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4 text-gray-900">Add Existing Story</h2>
            <input value={addSearch} onChange={(e) => setAddSearch(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 mb-4" placeholder="Search stories..." />
            <div className="space-y-2 max-h-[350px] overflow-auto pr-1">
              {filteredExisting.length === 0 ? (
                <div className="text-gray-400 text-sm py-8 text-center">No available stories</div>
              ) : filteredExisting.map((s) => (
                <div key={s.storyId} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 hover:border-blue-200 transition-colors">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.title}</div>
                    <div className="text-[10px] text-gray-400 font-mono uppercase">{s.storyId} • {s.format || '—'} • {s.status}</div>
                  </div>
                  <button onClick={() => addExisting(s.storyId)} disabled={sendToRundownMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg disabled:opacity-40">
                    {sendToRundownMutation.isPending ? '...' : 'ADD'}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-900 font-bold">CLOSE</button>
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW MODAL ── */}
      {previewClip && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999]"
          onClick={() => setPreviewClip(null)}
        >
          <div 
            className="bg-[#111827] border border-gray-700 rounded-xl w-[90%] max-w-4xl overflow-hidden relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
              <div className="flex items-center gap-3">
                <Film size={18} className="text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-100 truncate max-w-[400px]">
                    Preview: {previewClip.originalFileName}
                  </h3>
                  <div className="text-[10px] text-gray-500 font-mono">{previewClip.clipId}</div>
                </div>
              </div>
              <button 
                onClick={() => setPreviewClip(null)}
                className="p-1.5 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-black aspect-video flex items-center justify-center">
              <video 
                src={previewClip.fileUrl || ''} 
                controls 
                autoPlay 
                className="max-h-full max-w-full"
              />
            </div>

            <div className="p-4 bg-gray-900/30 flex justify-between items-center text-[10px] text-gray-500">
              <span>{previewClip.duration || '00:00:00'} • {previewClip.fileType}</span>
              <button 
                onClick={() => setPreviewClip(null)}
                className="bg-white text-black font-bold px-4 py-1.5 rounded hover:bg-gray-200 transition-colors"
              >
                CLOSE
              </button>
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
