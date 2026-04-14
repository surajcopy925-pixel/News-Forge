'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    Pen, Film, Eye, Clock, CheckCircle, AlertCircle,
    Play, FileText, Send, X, Layers, Search
} from 'lucide-react';
import { useNewsForgeStore } from '@/store/useNewsForgeStore';
import VideoPreview from '@/components/VideoPreview';
import { formatDuration, generateAllTimeSlots } from '@/utils/metadata';

export default function EditorHubPage() {
    const store = useNewsForgeStore();
    const [editorMode, setEditorMode] = useState<'video' | 'copy'>('video');
    const [activeFilter, setActiveFilter] = useState<string>('ALL');
    const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const [isRundownModalOpen, setIsRundownModalOpen] = useState(false);
    const [displayLabel, setDisplayLabel] = useState('');
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const sendToRundown = useNewsForgeStore((state) => state.addStoryToRundown);
    const updateStoryStatus = useNewsForgeStore((state) => state.sendToRundownFromCopyEditor);

    // ═══ DATA SELECTORS ═══
    const stories = useNewsForgeStore(state => state.stories);
    const clips = useNewsForgeStore(state => state.clips);
    const rundowns = useNewsForgeStore(state => state.rundowns);

    // Generate all 48 time slots for today
    const today = new Date().toISOString().split('T')[0];

    const allBulletins = useMemo(() => {
        const slots = generateAllTimeSlots(today);
        const existing = rundowns.filter((r) => r.airDate === today);

        // Merge
        const merged = slots.map((slot) => {
            const match = existing.find((r) => r.airTime === slot.airTime);
            return (match || slot);
        });

        existing.forEach((ex) => {
            if (!merged.find((m) => m.id === ex.id)) {
                merged.push(ex);
            }
        });

        merged.sort((a, b: any) => a.airTime.localeCompare(b.airTime));
        return merged;
    }, [today, rundowns]);

    const filteredBulletins = useMemo(() => {
        if (!searchQuery.trim()) return allBulletins;
        const q = searchQuery.toLowerCase().trim();
        return allBulletins.filter((b) =>
            b.title.toLowerCase().includes(q) ||
            b.airTime.includes(q)
        );
    }, [allBulletins, searchQuery]);

    // ═══ FILTER LOGIC ═══
    const filterTabs = [
        { label: 'All',       filter: 'ALL' },
        { label: 'Available', filter: 'PENDING' },
        { label: 'In Process', filter: 'EDITING' },
        { label: 'Completed', filter: 'DONE' },
    ];

    const filteredClips = useMemo(() => {
        return clips.filter(c => {
            if (activeFilter === 'ALL') return true;
            
            // Map UI filters to Store Statuses
            if (activeFilter === 'PENDING') return c.status === 'AVAILABLE';
            if (activeFilter === 'EDITING') return c.status === 'IN_PROCESS';
            if (activeFilter === 'DONE') return c.status === 'COMPLETED' || c.status === 'APPROVED';
            
            return c.status === activeFilter;
        });
    }, [clips, activeFilter]);

    const filteredCopyStories = useMemo(() => {
        return stories.filter(s => {
            if (s.category === 'System') return false;
            if (activeFilter === 'ALL') return true;
            if (activeFilter === 'PENDING') return s.status === 'SUBMITTED';
            if (activeFilter === 'EDITING') return s.status === 'EDITING';
            if (activeFilter === 'DONE') return s.status === 'READY';
            return true;
        });
    }, [stories, activeFilter]);

    // ═══ SELECTION LOGIC ═══
    const selectedClip = useMemo(() => 
        editorMode === 'video' ? clips.find(c => c.id === selectedClipId) : null,
    [clips, selectedClipId, editorMode]);

    const selectedStory = useMemo(() => 
        editorMode === 'copy' ? stories.find(s => s.id === selectedStoryId) : null,
    [stories, selectedStoryId, editorMode]);

    useEffect(() => {
        if (editorMode === 'video' && (!selectedClipId || !clips.find(c => c.id === selectedClipId)) && filteredClips.length > 0) {
            setSelectedClipId(filteredClips[0].id);
        }
        if (editorMode === 'copy' && (!selectedStoryId || !stories.find(s => s.id === selectedStoryId)) && filteredCopyStories.length > 0) {
            setSelectedStoryId(filteredCopyStories[0].id);
        }
    }, [editorMode, filteredClips, filteredCopyStories, selectedClipId, selectedStoryId, clips, stories]);

    // ═══ HELPERS ═══
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-blue-500/10 text-blue-400';
            case 'IN_PROCESS': return 'bg-amber-500/10 text-amber-400';
            case 'COMPLETED': 
            case 'APPROVED':
            case 'READY': return 'bg-emerald-500/10 text-emerald-400';
            case 'PENDING':
            case 'SUBMITTED': return 'bg-blue-900/20 text-blue-400/80';
            default: return 'bg-gray-500/10 text-gray-400';
        }
    };

    const isKannada = (text: string) => /[\u0C80-\u0CFF]/.test(text || '');
    const kannadaFont = { fontFamily: "'Noto Sans Kannada', sans-serif" };

    const getStoryTitle = (storyId: string) => {
        const story = stories.find(s => s.id === storyId);
        return story?.title || 'Unknown Story';
    };


    // ═══ ACTIONS ═══
    const handleClaim = () => {
        if (selectedClip) {
            store.claimClip(selectedClip.id, 'Priya Sharma');
            // Force status to mirror the filter expectation if needed, though store should handle it
        }
    };

    return (
        <div className="flex h-full bg-nf-bg overflow-hidden">
            {/* ═══ SIDEBAR ═══ */}
            <div className="w-72 shrink-0 bg-nf-surface border-r border-nf-border flex flex-col h-full overflow-hidden">
                <div className="p-3 border-b border-nf-border shrink-0">
                    <div className="flex items-center gap-2 text-gray-200 mb-3">
                        <Pen size={16} />
                        <span className="text-sm font-bold uppercase tracking-tighter">Editor Hub</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={() => { setEditorMode('video'); setActiveFilter('ALL'); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'video' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-nf-panel text-gray-500 hover:text-gray-300'}`}
                        >
                            Video Editor
                        </button>
                        <button
                            onClick={() => { setEditorMode('copy'); setActiveFilter('ALL'); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-colors ${editorMode === 'copy' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-nf-panel text-gray-500 hover:text-gray-300'}`}
                        >
                            Copy Editor
                        </button>
                    </div>
                </div>

                <div className="px-3 py-2 border-b border-nf-border flex gap-1 shrink-0 overflow-x-auto no-scrollbar">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.filter}
                            onClick={() => setActiveFilter(tab.filter)}
                            className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded transition-colors whitespace-nowrap ${activeFilter === tab.filter ? 'bg-blue-500/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {editorMode === 'video' ? (
                        filteredClips.map(clip => (
                            <button
                                key={clip.id}
                                onClick={() => setSelectedClipId(clip.id)}
                                className={`w-full text-left px-3 py-3 border-b border-nf-border/20 transition-all ${selectedClipId === clip.id ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent hover:bg-nf-panel/10'}`}
                            >
                                 <div className="font-mono text-[9px] text-blue-400/70 truncate mb-0.5">{clip.fileName}</div>
                                 {clip.originalFileName && clip.originalFileName !== clip.fileName && (
                                     <div className="text-[9px] text-gray-600 font-mono truncate mb-1">
                                         ← {clip.originalFileName}
                                     </div>
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
                    ) : (
                        filteredCopyStories.map(story => (
                            <button
                                key={story.id}
                                onClick={() => setSelectedStoryId(story.id)}
                                className={`w-full text-left px-3 py-3 border-b border-nf-border/20 transition-all ${selectedStoryId === story.id ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent hover:bg-nf-panel/10'}`}
                            >
                                <div className="font-mono text-[9px] text-gray-600 mb-1">{story.id}</div>
                                <div className="text-[12px] font-medium text-gray-200 line-clamp-2" style={isKannada(story.title) ? kannadaFont : undefined}>{story.title}</div>
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-[9px] text-gray-500 bg-nf-panel px-1.5 py-0.5 rounded border border-nf-border uppercase tracking-tight">{story.format}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${getStatusStyle(story.status)}`}>{story.status}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* ═══ DETAIL PANEL ═══ */}
            <div className="flex-1 flex flex-col overflow-hidden bg-nf-bg">
                {editorMode === 'video' && selectedClip ? (
                    (() => {
                        const story = stories.find(s => s.id === selectedClip.storyId);
                        return (
                            <>
                                <div className="h-14 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 gap-3">
                                    <span className="font-mono text-[10px] text-gray-500">{selectedClip.storyId}</span>
                                    <div className="h-4 w-px bg-nf-border mx-1" />
                                    <span className="text-sm font-semibold text-gray-200 truncate" style={isKannada(story?.title || '') ? kannadaFont : undefined}>{story?.title || 'Unknown Story'}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ml-auto ${getStatusStyle(selectedClip.status)}`}>{selectedClip.status}</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                                    <div className="max-w-5xl mx-auto space-y-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                                                                <div className="text-[9px] text-gray-500 font-mono mt-1 opacity-60">
                                                                    Src: {selectedClip.originalFileName}
                                                                </div>
                                                            )}
                                                         </div>
                                                         <div><span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Duration</span><span className="text-gray-100 font-mono text-sm tracking-wide">{formatDuration(selectedClip.duration)}</span></div>
                                                         <div><span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Resolution</span><span className="text-gray-300 uppercase">{selectedClip.resolution || "1080p"}</span></div>
                                                         <div><span className="text-gray-500 block mb-1 uppercase font-bold text-[9px] tracking-tight">Claimed By</span><span className="text-blue-400 font-bold">{selectedClip.claimedBy || "Unclaimed"}</span></div>
                                                     </div>
                                                </div>
                                                <div className="bg-nf-surface rounded-xl p-5 border border-nf-border shadow-2xl">
                                                    <div className="text-[10px] uppercase font-bold text-blue-400 mb-3 tracking-widest flex items-center gap-2">
                                                        <Pen size={14} /> Instructions
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto bg-nf-panel/30 p-4 border border-nf-border/30 rounded-lg shadow-inner">
                                                        <p className="text-sm text-gray-300 italic leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                                             {selectedClip.editingInstructions || "Standard polish and handover required."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                 <VideoPreview
                                                     fileUrl={selectedClip.fileUrl}
                                                     fileName={selectedClip.fileName}
                                                     duration={selectedClip.duration}
                                                     className="h-full w-full"
                                                 />
                                                 {selectedClip.status === 'IN_PROCESS' && (
                                                    <div className="bg-nf-surface rounded-xl p-6 border border-emerald-500/20 shadow-2xl animate-in slide-in-from-bottom duration-500">
                                                        <div className="text-[10px] uppercase font-bold text-emerald-400 mb-4 tracking-widest">Complete Task</div>
                                                        <div className="space-y-4">
                                                            <div>
                                                                <label className="block text-[9px] text-gray-500 uppercase font-black mb-2 tracking-widest">Output Label (Air Name)</label>
                                                                <input 
                                                                    id="clipDisplayLabel" 
                                                                    placeholder="e.g. MANDYA_PKG_1" 
                                                                    className="w-full bg-nf-panel border border-nf-border rounded-lg px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner" 
                                                                />
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    const el = document.getElementById('clipDisplayLabel') as HTMLInputElement;
                                                                    if (el && el.value.trim()) store.completeClip(selectedClip.id, el.value.trim());
                                                                    else alert('Please enter a display label.');
                                                                }} 
                                                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-lg text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                                            >
                                                                Finalize & Handover
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-16 shrink-0 bg-nf-surface border-t border-nf-border flex items-center justify-end px-8">
                                    {selectedClip.status === 'AVAILABLE' && (
                                        <button 
                                            onClick={handleClaim} 
                                            className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black px-10 py-3 rounded-lg shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all"
                                        >
                                            Claim Processing Task
                                        </button>
                                    )}
                                </div>
                            </>
                        );
                    })()
                ) : editorMode === 'copy' && selectedStory ? (
                    <>
                        <div className="h-14 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 gap-3">
                            <span className="font-mono text-[10px] text-gray-500">{selectedStory.id}</span>
                            <div className="h-4 w-px bg-nf-border mx-1" />
                            <span className="text-sm font-semibold text-gray-200 truncate" style={isKannada(selectedStory.title) ? kannadaFont : undefined}>{selectedStory.title}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ml-auto ${getStatusStyle(selectedStory.status)}`}>{selectedStory.status}</span>
                        </div>
                        <div className="flex-1 flex overflow-hidden">
                            <div className="w-[400px] border-r border-nf-border p-5 overflow-y-auto space-y-6 bg-nf-panel/10 custom-scrollbar">
                                <section className="bg-nf-surface rounded-lg p-4 border border-nf-border">
                                    <div className="flex items-center gap-2 mb-3 text-amber-500 uppercase tracking-widest font-black text-[9px]"><AlertCircle size={14} /> Production Notes</div>
                                    <div className="max-h-36 overflow-y-auto">
                                        <p className="text-sm text-amber-100/70 leading-relaxed whitespace-pre-wrap break-words" style={{ overflowWrap: 'anywhere' }}>
                                            {selectedStory.notes || "No specific instructions provided from output desk."}
                                        </p>
                                    </div>
                                </section>
                                <section className="bg-nf-surface rounded-lg p-4 border border-nf-border">
                                    <div className="flex items-center gap-2 mb-3 text-blue-500 uppercase tracking-widest font-black text-[9px]"><FileText size={14} /> Reference Copy</div>
                                    <div className="max-h-64 overflow-y-auto bg-nf-bg/50 p-4 rounded-lg border border-nf-border/30">
                                        <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-wrap break-words font-mono" style={{ overflowWrap: 'anywhere' }}>
                                            {selectedStory.content}
                                        </p>
                                    </div>
                                </section>
                            </div>
                            <div className="flex-1 flex flex-col bg-nf-panel/5 overflow-hidden">
                                <div className="flex-1 flex flex-col p-6 space-y-4">
                                    <div className="text-[10px] uppercase font-bold text-blue-500 tracking-widest px-2">Anchor Script Editor</div>
                                    <div className="flex-1 bg-nf-panel border border-nf-border rounded-2xl p-6 shadow-2xl">
                                        <textarea 
                                            value={selectedStory.isScriptEdited ? selectedStory.editedScript : selectedStory.anchorScript}
                                            onChange={(e) => {
                                                if (selectedStory.status === 'DONE') return;
                                                store.updateEditedScript(selectedStory.id, e.target.value);
                                            }}
                                            className="w-full h-full bg-transparent text-[22px] font-medium text-gray-100 placeholder-gray-800 outline-none resize-none leading-snug"
                                            placeholder="Write script here..."
                                            style={kannadaFont}
                                            readOnly={selectedStory.status === 'DONE'}
                                        />
                                    </div>
                                </div>
                                <div className="h-16 shrink-0 bg-nf-surface border-t border-nf-border flex items-center justify-end px-10">
                                    {selectedStory.status !== 'DONE' && (
                                        <button 
                                            onClick={() => {
                                                if(selectedStory.status === 'PENDING' || selectedStory.status === 'SUBMITTED') {
                                                    store.updateStory(selectedStory.id, { status: 'EDITING', assignedTo: 'Priya Sharma' });
                                                } else {
                                                    setIsRundownModalOpen(true);
                                                }
                                            }} 
                                            className={`text-[11px] font-black px-10 py-3 rounded-lg shadow-xl shadow-blue-500/20 uppercase tracking-widest transition-all ${selectedStory.status === 'PENDING' || selectedStory.status === 'SUBMITTED' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                        >
                                            <Send size={14} className="inline mr-2" /> {selectedStory.status === 'PENDING' || selectedStory.status === 'SUBMITTED' ? "Unlock for Editing" : "Send to Rundown"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-800 opacity-20">
                        <Pen size={120} />
                        <h2 className="text-3xl font-black uppercase tracking-tighter mt-4">Select a Task</h2>
                    </div>
                )}
            </div>

            {/* ═══ RUNDOWN PICKER — Full 24hr + Search ═══ */}
            {isRundownModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-sm">
                    <div className="bg-nf-surface border border-nf-border rounded-3xl w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col max-h-[80vh]">
                         <div className="flex items-center justify-between p-6 border-b border-nf-border">
                             <div>
                                 <h3 className="text-sm font-black uppercase tracking-widest text-white">Select Bulletin</h3>
                                 {selectedStory && (
                                     <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tight">
                                         Sending: "{selectedStory.title}"
                                     </p>
                                 )}
                             </div>
                             <button onClick={() => setIsRundownModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                 <X size={24} />
                             </button>
                         </div>

                         {/* Search Box */}
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
                                     <button
                                         onClick={() => setSearchQuery('')}
                                         className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                                     >
                                         <X size={14} />
                                     </button>
                                 )}
                             </div>
                         </div>

                         <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {filteredBulletins.map(rd => (
                                <button 
                                    key={rd.id} 
                                    onClick={() => {
                                        if (selectedStory) {
                                            console.log('=== SEND TO RUNDOWN DEBUG ===');
                                            console.log('Story ID:', selectedStory.id);
                                            console.log('Rundown ID:', rd.id);
                                            
                                            store.sendToRundown(selectedStory.id, rd.id);
                                            
                                            // Check if it worked
                                            const entries = useNewsForgeStore.getState().rundownEntries;
                                            console.log('All entries after send:', entries);
                                            console.log('Entries for this rundown:', entries.filter(e => e.rundownId === rd.id));
                                            
                                            setIsRundownModalOpen(false);
                                            setSearchQuery('');
                                        }
                                    }} 
                                    className="w-full text-left p-4 bg-nf-panel/30 hover:bg-blue-600/10 border border-nf-border/50 hover:border-blue-500/50 rounded-2xl transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-gray-200 uppercase tracking-tight group-hover:text-blue-400 transition-colors">
                                            {rd.title}
                                        </div>
                                        <div className={`text-[9px] font-bold px-2 py-0.5 rounded tracking-widest ${
                                            rd.status === 'READY' ? 'text-green-400 bg-green-400/10' :
                                            rd.status === 'LIVE' ? 'text-red-400 bg-red-400/10' :
                                            rd.status === 'PLANNING' ? 'text-gray-500 bg-gray-500/10' :
                                            'text-gray-500 bg-gray-500/10'
                                        }`}>
                                            {rd.status}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-gray-500">
                                        <span>{rd.airTime}</span>
                                        <span>•</span>
                                        <span>{rd.plannedDuration}</span>
                                    </div>
                                </button>
                            ))}
                            {filteredBulletins.length === 0 && (
                                <div className="p-12 text-center text-gray-600 italic text-sm">
                                    No bulletins match "{searchQuery}"
                                </div>
                            )}
                         </div>

                         <div className="p-4 border-t border-nf-border bg-nf-panel/10 flex justify-between items-center px-6">
                             <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">
                                 48 Bulletins Available • {today}
                             </span>
                             <button
                                 onClick={() => setIsRundownModalOpen(false)}
                                 className="text-xs text-gray-500 hover:text-white font-bold uppercase tracking-widest"
                             >
                                 Cancel
                             </button>
                         </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.1); border-radius: 20px; }
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
            `}</style>
        </div>
    );
}
