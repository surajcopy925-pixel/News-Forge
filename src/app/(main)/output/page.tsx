// src/app/(main)/output/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  ArrowRightFromLine,
  Search,
  Film,
  Send,
  CheckCircle,
  Clock,
  Eye,
  X,
  FileText,
} from 'lucide-react';
import { useStories, useUpdateStory } from '@/hooks/useStories';
import { useClips, useSendToEditorHub } from '@/hooks/useClips';
import type { Story, StoryClip } from '@/types/types';
import VideoPreview from '@/components/VideoPreview';
import { formatDuration } from '@/utils/metadata';
import { toast } from 'sonner';

const EMPTY_ARRAY: any[] = [];


/* ── SUB-COMPONENTS ── */
const StatusBadge = ({ status }: { status: string }) => {
  const getColors = () => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'EDITING': case 'IN_REVIEW': return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
      case 'READY': case 'APPROVED': return 'bg-green-900/30 text-green-400 border-green-800/50';
      case 'DRAFT': return 'bg-gray-800 text-gray-400 border-gray-700';
      case 'NOT READY': return 'bg-red-900/30 text-red-400 border-red-800/50';
      default: return 'bg-nf-panel text-gray-500 border-nf-border/30';
    }
  };
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getColors()}`}>
      {status}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string | undefined }) => {
  const p = priority || 'NORMAL';
  const getStyle = () => {
    switch (p) {
      case 'URGENT': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };
  return (
    <span className={`text-[8px] font-extrabold px-1 py-0.5 rounded border uppercase tracking-tighter ${getStyle()}`}>
      {p}
    </span>
  );
};

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function OutputPage() {
  /* ── API data via TanStack Query ── */
  const { data: stories = EMPTY_ARRAY, isLoading: storiesLoading } = useStories();
  const { data: allClips = EMPTY_ARRAY, isLoading: clipsLoading } = useClips();

  const sendToEditorHubMutation = useSendToEditorHub();
  const updateStoryMutation = useUpdateStory();

  /* ── local state ── */
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [previewClip, setPreviewClip] = useState<StoryClip | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [clipEdits, setClipEdits] = useState<Record<string, { instructions: string; notes: string }>>({});
  const [sendingClipId, setSendingClipId] = useState<string | null>(null);
  const [sentClipIds, setSentClipIds] = useState<Set<string>>(new Set());
  const [localStoryNotes, setLocalStoryNotes] = useState<string>('');

  /* ── derived data ── */
  const filteredStories = useMemo(() => {
    // Show stories that have clips (VIDEO ONLY page) or are submitted
    let filtered = stories.filter(
      (s: any) => s.status === 'SUBMITTED' || s.status === 'EDITING' || s.status === 'DRAFT' || s.status === 'READY'
    );
    // Only show stories that have clips attached
    filtered = filtered.filter((s: any) => allClips.some((c: any) => c.storyId === s.storyId));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s: any) => s.title.toLowerCase().includes(q) || s.storyId.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [stories, allClips, searchQuery]);

  const selectedStory = useMemo(() => {
    return stories.find((s: any) => s.storyId === selectedStoryId) || null;
  }, [selectedStoryId, stories]);

  const selectedStoryClips = useMemo(() => {
    if (!selectedStoryId) return [];
    return allClips.filter((c: any) => c.storyId === selectedStoryId);
  }, [selectedStoryId, allClips]);

  /* ── auto-select first story ── */
  useEffect(() => {
    if (filteredStories.length > 0 && !selectedStoryId) {
      setSelectedStoryId(filteredStories[0].storyId);
    }
    if (selectedStory) {
      setLocalStoryNotes(selectedStory.editorialNotes || '');
    }
  }, [filteredStories, selectedStoryId, selectedStory]);

  /* ── handlers ── */
  const handleSendToHub = async (clipId: string) => {
    const edits = clipEdits[clipId] || { instructions: '', notes: '' };
    setSendingClipId(clipId);

    try {
      await sendToEditorHubMutation.mutateAsync({
        clipId,
        data: {
          editingInstructions: edits.instructions,
          editorialNotes: edits.notes,
        },
      });

      // Track this clip as sent
      setSentClipIds((prev) => new Set([...prev, clipId]));

      // Move story to EDITING if it was SUBMITTED
      if (selectedStory && (selectedStory.status === 'SUBMITTED' || selectedStory.status === 'DRAFT')) {
        await updateStoryMutation.mutateAsync({
          storyId: selectedStory.storyId,
          data: { status: 'EDITING' },
        });
      }
    } catch (error: any) {
      console.error('Failed to send to editor hub:', error.message);
      toast.error('Failed to send to editor hub: ' + error.message);
    } finally {
      setSendingClipId(null);
    }
  };

  const handleSaveStoryNotes = async () => {
    if (!selectedStory) return;
    try {
      await updateStoryMutation.mutateAsync({
        storyId: selectedStory.storyId,
        data: { editorialNotes: localStoryNotes },
      });
      toast.success('Notes saved!');
    } catch (error: any) {
      toast.error('Failed to save notes: ' + error.message);
    }
  };

  const updateClipLocalState = (clipId: string, field: 'instructions' | 'notes', value: string) => {
    setClipEdits((prev) => ({
      ...prev,
      [clipId]: {
        ...(prev[clipId] || { instructions: '', notes: '' }),
        [field]: value,
      },
    }));
  };

  /* ── Loading state ── */
  if (storiesLoading || clipsLoading) {
    return (
      <div className="flex h-full bg-nf-bg items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading production data...</p>
        </div>
      </div>
    );
  }

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="flex h-full bg-nf-bg overflow-hidden">
      {/* ══════ LEFT SIDEBAR ══════ */}
      <aside className="w-64 shrink-0 bg-nf-surface border-r border-nf-border flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-nf-border shrink-0">
          <div className="flex items-center gap-2 text-gray-200 mb-3">
            <ArrowRightFromLine size={16} className="text-blue-400" />
            <span className="text-sm font-bold">Output / Production</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Filter stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-nf-panel/50 border border-nf-border rounded-md text-[11px] text-gray-300 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredStories.length === 0 ? (
            <div className="p-6 text-center">
              <div className="bg-nf-panel/30 p-4 rounded-lg border border-nf-border border-dashed">
                <FileText size={24} className="mx-auto text-gray-700 mb-2 opacity-20" />
                <p className="text-[11px] text-gray-500 leading-normal">
                  No stories with video clips found.<br />Stories with clips from Input will appear here.
                </p>
              </div>
            </div>
          ) : (
            filteredStories.map((story: any) => {
              const isSelected = selectedStoryId === story.storyId;
              const clipCount = allClips.filter((c: any) => c.storyId === story.storyId).length;
              return (
                <button
                  key={story.storyId}
                  onClick={() => setSelectedStoryId(story.storyId)}
                  className={`w-full text-left px-4 py-4 border-b border-nf-border/30 transition-all group ${isSelected ? 'bg-blue-500/5 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent hover:bg-nf-panel/20'}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[9px] text-gray-600">{story.storyId}</span>
                    <PriorityBadge priority={story.priority} />
                  </div>
                  <div
                    className="text-xs font-semibold text-gray-200 group-hover:text-white transition-colors line-clamp-2"
                    style={story.title.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                  >
                    {story.title}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      {story.category || story.format || '—'}
                    </span>
                    <span className="text-[9px] text-gray-500">{clipCount} clip{clipCount !== 1 ? 's' : ''}</span>
                    <StatusBadge status={story.status} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ══════ MAIN CONTENT ══════ */}
      <main className="flex-1 flex flex-col overflow-hidden bg-nf-bg">
        {selectedStory ? (
          <>
            {/* Header */}
            <div className="h-14 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 justify-between">
              <div className="flex items-center gap-4">
                <h2
                  className="text-base font-bold text-gray-100"
                  style={selectedStory.title.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                >
                  {selectedStory.title}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-tighter">{selectedStory.storyId}</span>
                  <StatusBadge status={selectedStory.status} />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">By {selectedStory.createdBy || '—'}</span>
              </div>
            </div>

            {/* Content Split */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Story Script (READ ONLY) */}
              <div className="w-[38%] border-r border-nf-border p-6 overflow-y-auto bg-nf-surface/20">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Story Script</label>
                  <div className="text-[10px] text-gray-600 bg-nf-bg px-2 py-0.5 rounded border border-nf-border">READ-ONLY</div>
                </div>
                <div
                  className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap select-text p-4 bg-nf-bg/50 border border-nf-border/30 rounded-lg shadow-inner"
                  style={{
                    overflowWrap: 'anywhere',
                    wordBreak: 'break-word',
                    ...(selectedStory.content?.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}),
                  }}
                >
                  {selectedStory.content || 'No content provided.'}
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  <div className="p-3 bg-nf-panel/30 border border-nf-border rounded-md">
                    <span className="text-[10px] font-bold text-gray-500 block mb-1 uppercase tracking-wider">Production Notes</span>
                    <textarea 
                      data-testid="editorial-notes"
                      value={localStoryNotes}
                      onChange={(e) => setLocalStoryNotes(e.target.value)}
                      placeholder="Add production notes for editor..."
                      className="w-full h-20 bg-nf-bg border border-nf-border rounded p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-blue-500/50"
                    />
                    <button 
                      data-testid="save-notes-btn"
                      onClick={handleSaveStoryNotes}
                      className="mt-2 w-full py-1.5 bg-nf-panel hover:bg-nf-border-highlight border border-nf-border rounded text-[10px] font-bold text-gray-400 transition-colors"
                    >
                      SAVE NOTES
                    </button>
                  </div>
                </div>
              </div>

              {/* Right: Clip Management (VIDEO ONLY) */}
              <div className="flex-1 p-6 overflow-y-auto bg-nf-bg/50">
                <div className="flex items-center justify-between mb-6">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Media Management</label>
                  <span className="text-[10px] text-gray-500 bg-nf-panel px-2 py-0.5 rounded">{selectedStoryClips.length} Clips</span>
                </div>

                {selectedStoryClips.length === 0 ? (
                  <div className="h-64 border border-dashed border-nf-border rounded-xl flex flex-col items-center justify-center text-gray-600 bg-nf-panel/10">
                    <Film size={32} className="mb-3 opacity-20" />
                    <p className="text-xs">No media assets found for this story.</p>
                    <p className="text-[10px] text-gray-700 mt-1">Check with journalists in Input Hub.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {selectedStoryClips.map((clip: any) => {
                      const isSent = sentClipIds.has(clip.clipId) || 
                        (clip.editingInstructions && clip.editingInstructions.trim() !== '') || 
                        (clip.editorialNotes && clip.editorialNotes.trim() !== '') || 
                        clip.status === 'EDITING' || 
                        clip.status === 'DONE';
                      const isSending = sendingClipId === clip.clipId;
                      return (
                        <div
                          key={clip.clipId}
                          className={`rounded-xl border transition-all duration-300 overflow-hidden shadow-lg ${isSent ? 'bg-nf-panel/30 border-blue-500/20 opacity-90' : 'bg-nf-surface border-nf-border hover:border-nf-border-highlight'}`}
                        >
                          {/* Clip Header */}
                          <div className={`px-4 py-3 border-b border-nf-border flex items-center justify-between ${isSent ? 'bg-blue-500/5' : 'bg-nf-panel/20'}`}>
                            <div className="flex items-center gap-3">
                              <Film size={14} className={isSent ? 'text-blue-400' : 'text-gray-500'} />
                              <div className="flex flex-col">
                                <span className="font-mono text-xs text-blue-400 font-bold">{clip.fileName}</span>
                                {clip.originalFileName && clip.originalFileName !== clip.fileName && (
                                  <span className="text-[9px] text-gray-600 font-mono truncate">← {clip.originalFileName}</span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-500 bg-nf-bg px-2 py-0.5 rounded ml-2">
                                {formatDuration(clip.duration)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isSent ? (
                                <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 uppercase tracking-wider">
                                  <CheckCircle size={12} /> SENT TO HUB
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1 uppercase tracking-wider">
                                  <Clock size={12} /> PENDING
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Clip Body */}
                          <div className="p-4 space-y-4">
                            <button
                              onClick={() => setPreviewClip(clip)}
                              className="w-full py-2 bg-nf-bg hover:bg-nf-panel border border-nf-border rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold text-gray-400 hover:text-white transition-all mb-4"
                            >
                              <Eye size={14} /> PREVIEW CLIP
                            </button>

                            <div>
                              <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase">Editing Instructions</label>
                              {isSent ? (
                                <div className="p-3 bg-nf-bg/50 border border-dashed border-nf-border rounded-md text-xs text-gray-400 italic">
                                  &quot;{clip.editingInstructions || 'No instructions provided.'}&quot;
                                </div>
                              ) : (
                                <textarea
                                  value={clipEdits[clip.clipId]?.instructions || ''}
                                  onChange={(e) => updateClipLocalState(clip.clipId, 'instructions', e.target.value)}
                                  placeholder="Specify in/out points, lower thirds, or voiceover sync directions..."
                                  className="w-full h-24 bg-nf-bg border border-nf-border rounded-lg p-3 text-xs text-gray-200 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                />
                              )}
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-gray-500 mb-2 block uppercase">Editorial Notes</label>
                              {isSent ? (
                                <div className="p-3 bg-nf-bg/50 border border-dashed border-nf-border rounded-md text-xs text-gray-400 italic">
                                  &quot;{clip.editorialNotes || 'No notes provided.'}&quot;
                                </div>
                              ) : (
                                <textarea
                                  value={clipEdits[clip.clipId]?.notes || ''}
                                  onChange={(e) => updateClipLocalState(clip.clipId, 'notes', e.target.value)}
                                  placeholder="Priority level, angle details, or archival references..."
                                  className="w-full h-16 bg-nf-bg border border-nf-border rounded-lg p-3 text-xs text-gray-200 resize-none focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                                />
                              )}
                            </div>
                          </div>

                          {/* Send Button */}
                          {!isSent && (
                            <div className="px-4 pb-4">
                              <button
                                data-testid="mark-available-btn"
                                onClick={() => handleSendToHub(clip.clipId)}
                                disabled={isSending}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95 disabled:opacity-50"
                              >
                                <Send size={15} />
                                {isSending ? 'SENDING...' : 'SEND TO EDITOR HUB'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
            <div className="relative mb-6">
              <div className="absolute -inset-4 bg-blue-500/10 rounded-full animate-pulse" />
              <FileText size={64} className="text-gray-400" />
            </div>
            <h3 className="text-gray-500 text-lg font-medium">No Story Selected</h3>
            <p className="text-gray-600 text-xs mt-2">Pick a story from the left to manage production assets.</p>
          </div>
        )}
      </main>

      {/* ══════ PREVIEW MODAL ══════ */}
      {previewClip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-nf-surface border border-nf-border rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border-t-blue-500/50">
            <div className="flex items-center justify-between px-6 py-4 border-b border-nf-border bg-nf-panel/30">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2 rounded-lg">
                  <Film size={18} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                    Preview: <span className="font-mono text-blue-400">{previewClip.fileName}</span>
                  </h3>
                  <div className="text-[10px] text-gray-500 font-medium">Original: {previewClip.originalFileName || 'Unknown'}</div>
                </div>
              </div>
              <button onClick={() => setPreviewClip(null)} className="p-2 hover:bg-nf-panel rounded-full transition-all text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="aspect-video bg-black relative group flex flex-col items-center justify-center">
              <VideoPreview
                fileUrl={previewClip.fileUrl}
                proxyUrl={previewClip.proxyUrl}
                thumbnailUrl={previewClip.thumbnailUrl}
                className="h-full w-full"
              />
            </div>
            <div className="px-6 py-4 bg-nf-panel/20 border-t border-nf-border flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-medium tracking-tight">NEWS FORGE — Proxy Preview</span>
              <button onClick={() => setPreviewClip(null)} className="bg-nf-panel hover:bg-nf-border text-gray-300 text-xs font-bold px-8 py-2.5 rounded-lg transition-all border border-nf-border active:scale-95 shadow-lg">
                CLOSE PREVIEW
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}