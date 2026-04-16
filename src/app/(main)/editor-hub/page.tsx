// src/app/(main)/editor-hub/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
    Pen, Film, Eye, Clock, CheckCircle, AlertCircle,
    Play, FileText, Send, X, Layers, Search
} from 'lucide-react';
import { useStories, useUpdateStory, useSendToRundown } from '@/hooks/useStories';
import { useClips, useClaimClip, useCompleteClip } from '@/hooks/useClips';
import { useRundowns, useCreateRundown } from '@/hooks/useRundowns';
import type { Story, StoryClip } from '@/types/types';
import VideoPreview from '@/components/VideoPreview';
import { formatDuration, generateAllTimeSlots } from '@/utils/metadata';

const EMPTY_ARRAY: any[] = [];


export default function EditorHubPage() {
    /* ── API data via TanStack Query ── */
    const { data: stories = EMPTY_ARRAY, isLoading: storiesLoading } = useStories();
    const { data: allClips = EMPTY_ARRAY, isLoading: clipsLoading } = useClips();
    const { data: dbRundowns = EMPTY_ARRAY } = useRundowns();

    const updateStoryMutation = useUpdateStory();
    const claimClipMutation = useClaimClip();
    const completeClipMutation = useCompleteClip();
    const sendToRundownMutation = useSendToRundown();
    const createRundownMutation = useCreateRundown();

    /* ── local state ── */
    const [editorMode, setEditorMode] = useState<'video' | 'copy'>('video');
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const [isRundownModalOpen, setIsRundownModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isClaiming, setIsClaiming] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isSendingToRundown, setIsSendingToRundown] = useState(false);

    /* ── rundown modal: 48 bulletins ── */
    const today = new Date().toISOString().split('T')[0];

    const allBulletins = useMemo(() => {
        const slots = generateAllTimeSlots(today);
        const existing = dbRundowns.filter((r: any) => r.date === today);
        const merged = slots.map((slot: any) => {
            const match = existing.find((r: any) => r.rundownId === slot.rundownId);
            return match ? { ...slot, ...match } : slot;
        });
        existing.forEach((ex: any) => {
            if (!merged.find((m: any) => m.rundownId === ex.rundownId)) {
                merged.push(ex as any);
            }
        });
        merged.sort((a: any, b: any) => a.broadcastTime.localeCompare(b.broadcastTime));
        return merged;
    }, [today, dbRundowns]);

    const filteredBulletins = useMemo(() => {
        if (!searchQuery.trim()) return allBulletins;
        const q = searchQuery.toLowerCase().trim();
        return allBulletins.filter((b: any) =>
            b.title.toLowerCase().includes(q) || b.broadcastTime.includes(q)
        );
    }, [allBulletins, searchQuery]);

    /* ── filter tabs ── */
    const filterTabs = [
        { label: 'All', filter: 'ALL' },
        { label: 'Available', filter: 'PENDING' },
        { label: 'In Process', filter: 'EDITING' },
        { label: 'Completed', filter: 'DONE' },
    ];

    /* ── filtered clips (VIDEO tab) ── */
    const filteredClips = useMemo(() => {
        return allClips.filter((c: any) => {
            if (activeFilter === 'ALL') return true;
            return c.status === activeFilter;
        });
    }, [allClips, activeFilter]);

    /* ── filtered stories (COPY tab) ── */
    const filteredCopyStories = useMemo(() => {
        return stories.filter((s: any) => {
            if (s.storyId.startsWith('SYS-')) return false;
            if (activeFilter === 'ALL') return true;
            if (activeFilter === 'PENDING') return s.status === 'SUBMITTED' || s.status === 'DRAFT';
            if (activeFilter === 'EDITING') return s.status === 'EDITING';
            if (activeFilter === 'DONE') return s.status === 'READY' || s.status === 'APPROVED';
            return true;
        });
    }, [stories, activeFilter]);

    /* ── selected items ── */
    const selectedClip = useMemo(() => {
        if (editorMode !== 'video' || !selectedClipId) return null;
        return allClips.find((c: any) => c.clipId === selectedClipId) || null;
    }, [allClips, selectedClipId, editorMode]);

    const selectedStory = useMemo(() => {
        if (editorMode !== 'copy' || !selectedStoryId) return null;
        return stories.find((s: any) => s.storyId === selectedStoryId) || null;
    }, [stories, selectedStoryId, editorMode]);

    /* ── auto-select first item ── */
    useEffect(() => {
        if (editorMode === 'video' && filteredClips.length > 0) {
            if (!selectedClipId || !allClips.find((c: any) => c.clipId === selectedClipId)) {
                setSelectedClipId(filteredClips[0].clipId);
            }
        }
        if (editorMode === 'copy' && filteredCopyStories.length > 0) {
            if (!selectedStoryId || !stories.find((s: any) => s.storyId === selectedStoryId)) {
                setSelectedStoryId(filteredCopyStories[0].storyId);
            }
        }
    }, [editorMode, filteredClips, filteredCopyStories, selectedClipId, selectedStoryId, allClips, stories]);

    /* ── helpers ── */
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-blue-500/10 text-blue-400';
            case 'EDITING': return 'bg-amber-500/10 text-amber-400';
            case 'DONE': case 'READY': case 'APPROVED': return 'bg-emerald-500/10 text-emerald-400';
            case 'SUBMITTED': case 'DRAFT': return 'bg-blue-900/20 text-blue-400/80';
            case 'NOT READY': return 'bg-red-500/10 text-red-400';
            default: return 'bg-gray-500/10 text-gray-400';
        }
    };

    const isKannada = (text: string) => /[\u0C80-\u0CFF]/.test(text || '');
    const kannadaFont = { fontFamily: "'Noto Sans Kannada', sans-serif" };

    const getStoryTitle = (storyId: string) => {
        const story = stories.find((s: any) => s.storyId === storyId);
        return story?.title || 'Unknown Story';
    };
    
    const { userId } = useAuth();

    /* ── actions ── */
    const handleClaim = async () => {
        if (!selectedClip) return;
        setIsClaiming(true);
        try {
            await claimClipMutation.mutateAsync({
                clipId: selectedClip.clipId,
                userId: userId!,
            });
        } catch (error: any) {
            console.error('Failed to claim clip:', error.message);
            alert('Failed to claim clip: ' + error.message);
        } finally {
            setIsClaiming(false);
        }
    };

    const handleComplete = async (label: string) => {
        if (!selectedClip || !label.trim()) {
            alert('Please enter a display label.');
            return;
        }
        setIsCompleting(true);
        try {
            await completeClipMutation.mutateAsync({
                clipId: selectedClip.clipId,
                displayLabel: label.trim(),
                userId: userId!,
            });
        } catch (error: any) {
            console.error('Failed to complete clip:', error.message);
            alert('Failed to complete clip: ' + error.message);
        } finally {
            setIsCompleting(false);
        }
    };

    const handleSavePolishedScript = async (script: string) => {
        if (!selectedStory) return;
        try {
            await updateStoryMutation.mutateAsync({
                storyId: selectedStory.storyId,
                data: {
                    anchorScript: script,
                    polishedScript: script,
                    isPolished: true,
                },
            });
        } catch (error: any) {
            console.error('Failed to save script:', error.message);
        }
    };

    const handleSendToRundown = async (id: string) => {
        if (!selectedStory) return;
        setIsSendingToRundown(true);
        console.log('=== SEND TO RUNDOWN ===');
        console.log('Story:', selectedStory.storyId, '→ Rundown:', id);

        let finalRundownId = id;

        try {
            // Check if rundown exists in DB
            const existsInDb = dbRundowns.find((r: any) => r.rundownId === id);

            if (!existsInDb) {
                // Auto-generated slot — create rundown in DB first
                const bulletinData = allBulletins.find((b: any) => b.rundownId === id);
                if (bulletinData) {
                    const created = await createRundownMutation.mutateAsync({
                        title: bulletinData.title,
                        date: bulletinData.date || today,
                        broadcastTime: bulletinData.broadcastTime,
                        plannedDuration: bulletinData.plannedDuration || '00:30:00',
                    });
                    finalRundownId = created.rundownId;
                }
            }

            // Now send story to rundown
            await sendToRundownMutation.mutateAsync({
                storyId: selectedStory.storyId,
                data: {
                    rundownId: finalRundownId,
                },
            });

            setIsRundownModalOpen(false);
            setSearchQuery('');
        } catch (error: any) {
            console.error('Failed to send to rundown:', error.message);
            alert('Failed to send to rundown: ' + error.message);
        } finally {
            setIsSendingToRundown(false);
        }
    };

    /* ── Loading state ── */
    if (storiesLoading || clipsLoading) {
        return (
            <div className="flex h-full bg-nf-bg items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Loading editor hub...</p>
                </div>
            </div>
        );
    }

    /* ═══════════════════════ RENDER ═══════════════════════ */
    return (
        <div className="flex h-full bg-nf-bg overflow-hidden">
            {/* ══════ SIDEBAR ══════ */}
            <div className="w-72 shrink-0 bg-nf-surface border-r border-nf-border flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-nf-border shrink-0">
                    <div className="flex items-center gap-2 text-gray-200 mb-3">
                        <Pen size={16} />
                        <span className="text-sm font-bold uppercase tracking-tighter">Editor Hub</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            data-testid="video-editor-tab"
                            onClick={() => { setEditorMode('video'); setActiveFilter('ALL'); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'video' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-nf-panel text-gray-500 hover:text-gray-300'}`}
                        >
                            Video Editor
                        </button>
                        <button
                            data-testid="copy-editor-tab"
                            onClick={() => { setEditorMode('copy'); setActiveFilter('ALL'); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'copy' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-nf-panel text-gray-500 hover:text-gray-300'}`}
                        >
                            Copy Editor
                        </button>
                    </div>
                </div>

                {/* filter tabs */}
                <div className="px-3 py-2 border-b border-nf-border flex gap-1 shrink-0 overflow-x-auto">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.filter}
                            onClick={() => setActiveFilter(tab.filter)}
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded transition-colors whitespace-nowrap ${activeFilter === tab.filter ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* list */}
                <div className="flex-1 overflow-y-auto">
                    {editorMode === 'video' ? (
                        filteredClips.length === 0 ? (
                            <div className="p-6 text-center text-gray-600 text-xs">No clips found</div>
                        ) : (
                            filteredClips.map((clip: any) => (
                                <button
                                    key={clip.clipId}
                                    onClick={() => setSelectedClipId(clip.clipId)}
                                    className={`w-full text-left px-3 py-3 border-b border-nf-border/20 transition-all ${selectedClipId === clip.clipId ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent hover:bg-nf-panel/10'}`}
                                >
                                    {/* Show DISPLAY LABEL as primary name if completed */}
                                    {clip.status === 'DONE' && clip.displayLabel ? (
                                        <>
                                            <div className="font-mono text-[11px] text-emerald-400 font-bold truncate mb-0.5">
                                                {clip.displayLabel}
                                            </div>
                                            <div className="text-[9px] text-gray-600 font-mono truncate mb-1">
                                                sys: {clip.fileName}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="font-mono text-[9px] text-blue-400/70 truncate mb-0.5">{clip.fileName}</div>
                                            {clip.originalFileName && clip.originalFileName !== clip.fileName && (
                                                <div className="text-[9px] text-gray-600 font-mono truncate mb-1">← {clip.originalFileName}</div>
                                            )}
                                        </>
                                    )}
                                    <div className="text-[12px] text-gray-200 font-medium line-clamp-2" style={isKannada(getStoryTitle(clip.storyId)) ? kannadaFont : undefined}>
                                        {getStoryTitle(clip.storyId)}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="font-mono text-[10px] text-gray-500">{formatDuration(clip.duration)}</span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusStyle(clip.status)}`}>{clip.status}</span>
                                    </div>
                                </button>
                            ))
                        )
                    ) : (
                        filteredCopyStories.length === 0 ? (
                            <div className="p-6 text-center text-gray-600 text-xs">No stories found</div>
                        ) : (
                            filteredCopyStories.map((story: any) => (
                                <button
                                    key={story.storyId}
                                    onClick={() => setSelectedStoryId(story.storyId)}
                                    className={`w-full text-left px-3 py-3 border-b border-nf-border/20 transition-all ${selectedStoryId === story.storyId ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent hover:bg-nf-panel/10'}`}
                                >
                                    <div className="font-mono text-[9px] text-gray-600 mb-1">{story.storyId}</div>
                                    <div className="text-[12px] font-medium text-gray-200 line-clamp-2" style={isKannada(story.title) ? kannadaFont : undefined}>
                                        {story.title}
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-[9px] text-gray-500 bg-nf-panel px-1.5 py-0.5 rounded border border-nf-border uppercase tracking-tight">
                                            {story.format || '—'}
                                        </span>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusStyle(story.status)}`}>
                                            {story.status}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )
                    )}
                </div>
            </div>

            {/* ══════ DETAIL PANEL ══════ */}
            <div className="flex-1 flex flex-col overflow-hidden bg-nf-bg">
                {/* ── VIDEO EDITOR ── */}
                {editorMode === 'video' && selectedClip ? (() => {
                    const story = stories.find((s: any) => s.storyId === selectedClip.storyId);
                    return (
                        <>
                            {/* header */}
                            <div className="h-14 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 gap-3">
                                <span className="font-mono text-[10px] text-gray-500">{selectedClip.storyId}</span>
                                <div className="h-4 w-px bg-nf-border mx-1" />
                                <span className="text-sm font-semibold text-gray-200 truncate" style={isKannada(story?.title || '') ? kannadaFont : undefined}>
                                    {story?.title || 'Unknown Story'}
                                </span>
                                {selectedClip.status === 'DONE' && selectedClip.displayLabel && (
                                    <>
                                        <div className="h-4 w-px bg-nf-border mx-1" />
                                        <span className="font-mono text-xs text-emerald-400 font-bold">
                                            {selectedClip.displayLabel}
                                        </span>
                                    </>
                                )}
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ml-auto ${getStatusStyle(selectedClip.status)}`}>
                                    {selectedClip.status}
                                </span>
                            </div>

                            {/* content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-5xl mx-auto space-y-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {/* left: metadata + instructions */}
                                        <div className="space-y-6">
                                            <div className="bg-nf-surface rounded-xl p-5 border border-nf-border shadow-2xl">
                                                <div className="text-[10px] uppercase font-bold text-amber-400 mb-4 tracking-widest flex items-center gap-2">
                                                    <Layers size={14} /> Metadata
                                                </div>
                                                <div className="grid grid-cols-2 gap-y-5 gap-x-6 text-xs">
                                                    <div>
                                                        <span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight text-amber-500/80">System Filename</span>
                                                        <span className="text-blue-400 font-mono break-all leading-tight">{selectedClip.fileName}</span>
                                                        {selectedClip.originalFileName && selectedClip.originalFileName !== selectedClip.fileName && (
                                                            <div className="text-[9px] text-gray-500 font-mono mt-1 opacity-60">Src: {selectedClip.originalFileName}</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Duration</span>
                                                        <span className="text-gray-100 font-mono text-sm tracking-wide">{formatDuration(selectedClip.duration)}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">File Type</span>
                                                        <span className="text-gray-300 uppercase">{selectedClip.fileType || 'video/mp4'}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Claimed By</span>
                                                        <span className="text-blue-400 font-bold">{selectedClip.claimedBy || 'Unclaimed'}</span>
                                                    </div>
                                                    {selectedClip.displayLabel && (
                                                        <div className="col-span-2">
                                                            <span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Display Label</span>
                                                            <span className="text-green-400 font-bold font-mono">{selectedClip.displayLabel}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="bg-nf-surface rounded-xl p-5 border border-nf-border shadow-2xl">
                                                <div className="text-[10px] uppercase font-bold text-blue-400 mb-3 tracking-widest flex items-center gap-2">
                                                    <Pen size={14} /> Editing Instructions
                                                </div>
                                                <div className="max-h-48 overflow-y-auto bg-nf-panel/30 p-4 border border-nf-border/30 rounded-lg shadow-inner">
                                                    <p className="text-sm text-gray-300 italic leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                                        {selectedClip.editingInstructions || 'No editing instructions provided.'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-nf-surface rounded-xl p-5 border border-nf-border shadow-2xl">
                                                <div className="text-[10px] uppercase font-bold text-amber-400 mb-3 tracking-widest flex items-center gap-2">
                                                    <AlertCircle size={14} /> Editorial Notes
                                                </div>
                                                <div className="max-h-48 overflow-y-auto bg-nf-panel/30 p-4 border border-nf-border/30 rounded-lg shadow-inner">
                                                    <p className="text-sm text-gray-300 italic leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                                        {selectedClip.editorialNotes || story?.editorialNotes || 'No editorial notes provided.'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* right: video preview + complete */}
                                        <div className="space-y-6">
                                            <VideoPreview
                                                fileUrl={selectedClip.fileUrl}
                                                proxyUrl={selectedClip.proxyUrl}
                                                thumbnailUrl={selectedClip.thumbnailUrl}
                                                className="h-full w-full"
                                            />

                                            {selectedClip.status === 'EDITING' && (
                                                <div className="bg-nf-surface rounded-xl p-6 border border-emerald-500/20 shadow-2xl">
                                                    <div className="text-[10px] uppercase font-bold text-emerald-400 mb-4 tracking-widest flex items-center gap-2">
                                                        <CheckCircle size={14} /> Complete Task
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[9px] text-gray-500 uppercase font-black mb-2 tracking-widest">
                                                                Display Label (Air Name)
                                                            </label>
                                                            <input
                                                                id="clipDisplayLabel"
                                                                placeholder="e.g. CM_PRESSER_PKG, MANDYA_VO_1, BUDGET_BITE_2"
                                                                className="w-full bg-nf-panel border border-nf-border rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner font-mono"
                                                            />
                                                            <p className="text-[9px] text-gray-600 mt-2 leading-relaxed">
                                                                This label becomes the clip&apos;s identity everywhere — rundown table, playout system, and archive.
                                                                It replaces the system filename as the display name.
                                                            </p>
                                                        </div>
                                                        <button
                                                            data-testid="complete-btn"
                                                            onClick={() => {
                                                                const el = document.getElementById('clipDisplayLabel') as HTMLInputElement;
                                                                handleComplete(el?.value || '');
                                                            }}
                                                            disabled={isCompleting}
                                                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-lg text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                                                        >
                                                            <CheckCircle size={14} /> {isCompleting ? 'Completing...' : 'Finalize & Handover'}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedClip.status === 'DONE' && (
                                                <div className="bg-nf-surface rounded-xl p-6 border border-emerald-500/30 shadow-2xl">
                                                    <div className="text-[10px] uppercase font-bold text-emerald-400 mb-4 tracking-widest flex items-center gap-2">
                                                        <CheckCircle size={14} /> Completed
                                                    </div>
                                                    {selectedClip.displayLabel ? (
                                                        <div className="space-y-3">
                                                            <div>
                                                                <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Display Label</span>
                                                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-4 py-3">
                                                                    <span className="text-xl font-black text-emerald-400 font-mono tracking-wide">
                                                                        {selectedClip.displayLabel}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                                                                <div>
                                                                    <span className="text-gray-600 block">System File</span>
                                                                    <span className="text-gray-400 font-mono">{selectedClip.fileName}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600 block">Completed At</span>
                                                                    <span className="text-gray-400">
                                                                        {selectedClip.completedAt
                                                                            ? new Date(selectedClip.completedAt).toLocaleString()
                                                                            : '—'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600 block">Duration</span>
                                                                    <span className="text-gray-400 font-mono">{formatDuration(selectedClip.duration)}</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-600 block">Claimed By</span>
                                                                    <span className="text-gray-400">{selectedClip.claimedBy || '—'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-500 text-sm italic">Completed without a display label.</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* footer */}
                            <div className="h-16 shrink-0 bg-nf-surface border-t border-nf-border flex items-center justify-end px-8">
                                {selectedClip.status === 'PENDING' && (
                                    <button
                                        data-testid="claim-btn"
                                        onClick={handleClaim}
                                        disabled={isClaiming}
                                        className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black px-10 py-3 rounded-lg shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        {isClaiming ? 'Claiming...' : 'Claim Processing Task'}
                                    </button>
                                )}
                            </div>
                        </>
                    );
                })() : editorMode === 'copy' && selectedStory ? (
                    <>
                        {/* ── COPY EDITOR ── */}
                        {/* header */}
                        <div className="h-14 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 gap-3">
                            <span className="font-mono text-[10px] text-gray-500">{selectedStory.storyId}</span>
                            <div className="h-4 w-px bg-nf-border mx-1" />
                            <span className="text-sm font-semibold text-gray-200 truncate" style={isKannada(selectedStory.title) ? kannadaFont : undefined}>
                                {selectedStory.title}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ml-auto ${getStatusStyle(selectedStory.status)}`}>
                                {selectedStory.status}
                            </span>
                        </div>

                        {/* content split */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* left: notes + reference */}
                            <div className="w-[400px] border-r border-nf-border p-5 overflow-y-auto space-y-6 bg-nf-panel/10">
                                <section className="bg-nf-surface rounded-lg p-4 border border-nf-border">
                                    <div className="flex items-center gap-2 mb-3 text-amber-500 uppercase tracking-widest font-black text-[9px]">
                                        <AlertCircle size={14} /> Production Notes
                                    </div>
                                    <div className="max-h-36 overflow-y-auto">
                                        <p className="text-sm text-amber-100/70 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                            {selectedStory.editorialNotes || 'No specific instructions provided from output desk.'}
                                        </p>
                                    </div>
                                </section>
                                <section className="bg-nf-surface rounded-lg p-4 border border-nf-border">
                                    <div className="flex items-center gap-2 mb-3 text-blue-500 uppercase tracking-widest font-black text-[9px]">
                                        <FileText size={14} /> Reference Copy (Raw Script)
                                    </div>
                                    <div className="max-h-64 overflow-y-auto bg-nf-bg/50 p-4 rounded-lg border border-nf-border/30">
                                        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap break-words font-mono" style={{ overflowWrap: 'anywhere' }}>
                                            {selectedStory.rawScript || selectedStory.content || 'No content available.'}
                                        </p>
                                    </div>
                                </section>
                            </div>

                            {/* right: anchor script editor */}
                            <div className="flex-1 flex flex-col bg-nf-panel/5 overflow-hidden">
                                <div className="flex-1 flex flex-col p-6 space-y-4">
                                    <div className="text-[10px] uppercase font-bold text-blue-500 tracking-widest px-2">
                                        Anchor Script Editor
                                        {selectedStory.polishedScript && (
                                            <span className="ml-2 text-green-400 normal-case tracking-normal">(Polished)</span>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-nf-panel border border-nf-border rounded-2xl p-6 shadow-2xl">
                                        <textarea
                                            data-testid="polished-script-editor"
                                            value={selectedStory.anchorScript || selectedStory.polishedScript || ''}
                                            onChange={(e) => {
                                                if (selectedStory.status === 'READY' || selectedStory.status === 'APPROVED') return;
                                                handleSavePolishedScript(e.target.value);
                                            }}
                                            className="w-full h-full bg-transparent text-[22px] font-medium text-gray-100 placeholder-gray-800 outline-none resize-none leading-snug"
                                            placeholder="Write anchor script here... (polished script area — always starts empty)"
                                            style={kannadaFont}
                                            readOnly={selectedStory.status === 'READY' || selectedStory.status === 'APPROVED'}
                                        />
                                    </div>
                                </div>

                                {/* bottom action */}
                                <div className="h-16 shrink-0 bg-nf-surface border-t border-nf-border flex items-center justify-end px-10">
                                    {selectedStory.status !== 'READY' && selectedStory.status !== 'APPROVED' && (
                                        <button
                                            onClick={async () => {
                                                if (selectedStory.status === 'SUBMITTED' || selectedStory.status === 'DRAFT') {
                                                    try {
                                                        await updateStoryMutation.mutateAsync({
                                                            storyId: selectedStory.storyId,
                                                            data: { status: 'EDITING' },
                                                        });
                                                    } catch (error: any) {
                                                        console.error('Failed to unlock story:', error.message);
                                                    }
                                                } else {
                                                    setIsRundownModalOpen(true);
                                                }
                                            }}
                                            disabled={updateStoryMutation.isPending}
                                            className={`text-[11px] font-black px-10 py-3 rounded-lg shadow-xl uppercase tracking-widest transition-all flex items-center gap-2 disabled:opacity-50 ${selectedStory.status === 'SUBMITTED' || selectedStory.status === 'DRAFT' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'} text-white`}
                                        >
                                            <Send size={14} />
                                            {selectedStory.status === 'SUBMITTED' || selectedStory.status === 'DRAFT' ? 'Unlock for Editing' : 'Send to Rundown'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* ── empty state ── */
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-800 opacity-20">
                        <Pen size={120} />
                        <h2 className="text-3xl font-black uppercase tracking-tighter mt-4">Select a Task</h2>
                    </div>
                )}
            </div>

            {/* ══════ RUNDOWN PICKER MODAL ══════ */}
            {isRundownModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm">
                    <div className="bg-nf-surface border border-nf-border rounded-3xl w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between p-6 border-b border-nf-border">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Select Bulletin</h3>
                                {selectedStory && (
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tight">
                                        Sending: &quot;{selectedStory.title}&quot;
                                    </p>
                                )}
                            </div>
                            <button onClick={() => setIsRundownModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* search */}
                        <div className="px-6 py-4 border-b border-nf-border bg-nf-panel/20">
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search bulletins... (e.g. '9:00 PM' or '21:00')"
                                    className="w-full bg-nf-bg border border-nf-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all"
                                    autoFocus
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* bulletin list */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {filteredBulletins.map((rd: any) => (
                                <button
                                    key={rd.rundownId}
                                    onClick={() => handleSendToRundown(rd.rundownId)}
                                    disabled={isSendingToRundown}
                                    className="w-full text-left p-4 bg-nf-panel/30 hover:bg-blue-600/10 border border-nf-border/50 hover:border-blue-500/50 rounded-2xl transition-all group disabled:opacity-50"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-gray-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                                            {rd.title}
                                        </div>
                                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-widest ${rd.status === 'READY' ? 'text-green-400 bg-green-400/10' : rd.status === 'LIVE' ? 'text-red-400 bg-red-400/10' : 'text-gray-500 bg-gray-500/10'}`}>
                                            {rd.status}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-gray-500">
                                        <span>{rd.broadcastTime}</span>
                                        <span>•</span>
                                        <span>{rd.plannedDuration}</span>
                                    </div>
                                </button>
                            ))}
                            {filteredBulletins.length === 0 && (
                                <div className="p-12 text-center text-gray-600 italic text-sm">
                                    No bulletins match &quot;{searchQuery}&quot;
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-nf-border bg-nf-panel/10 flex justify-between items-center px-6">
                            <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                                48 Bulletins Available • {today}
                            </span>
                            <button onClick={() => setIsRundownModalOpen(false)} className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-widest">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
        </div>
    );
}