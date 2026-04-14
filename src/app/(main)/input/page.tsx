// src/app/(main)/input/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Upload, Plus, Folder, Film, X, FileText } from 'lucide-react';
import { useNewsForgeStore } from '@/store/useNewsForgeStore';
import type { Story, StoryClip } from '@/types/types';
import {
  generateStoryId,
  generateClipFileName,
  generateClipId,
  getVideoDuration,
  detectLanguage,
  formatDuration,
} from '@/utils/metadata';

/* ── CONSTANTS ── */
const CATEGORY_LIST = ['Crime', 'Politics', 'Sports', 'National', 'Business', 'Entertainment'];
const FORMAT_LIST = ['ANCHOR', 'PKG', 'VO', 'VO+BITE', 'LIVE', 'GFX', 'BREAK', 'PHONE-IN', 'OOV'];

/* ── HELPERS ── */
const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

/* ── SUB-COMPONENTS ── */
const FormField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-medium text-gray-400 block">{label} *</label>
    {children}
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const getColors = () => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-800 text-gray-400 border-gray-700';
      case 'SUBMITTED': case 'PENDING': return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'EDITING': return 'bg-amber-900/30 text-amber-400 border-amber-800/50';
      case 'READY': case 'DONE': case 'APPROVED': return 'bg-green-900/30 text-green-400 border-green-800/50';
      case 'NOT READY': return 'bg-red-900/30 text-red-400 border-red-800/50';
      default: return 'bg-nf-panel text-gray-500 border-nf-border/30';
    }
  };
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getColors()}`}>{status}</span>;
};

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function InputPage() {
  /* ── store selectors (individual, not whole store) ── */
  const stories = useNewsForgeStore((s) => s.stories);
  const storyClips = useNewsForgeStore((s) => s.storyClips);
  const createStory = useNewsForgeStore((s) => s.createStory);
  const updateStoryField = useNewsForgeStore((s) => s.updateStoryField);
  const deleteStory = useNewsForgeStore((s) => s.deleteStory);
  const addClip = useNewsForgeStore((s) => s.addClip);
  const deleteClip = useNewsForgeStore((s) => s.deleteClip);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── local state ── */
  const [selectedCategory, setSelectedCategory] = useState<string>('Politics');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formFormat, setFormFormat] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formSource, setFormSource] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formPriority, setFormPriority] = useState<'URGENT' | 'NORMAL' | 'LOW'>('NORMAL');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /* ── clips for selected story ── */
  const clips = useMemo(() => {
    if (!selectedStoryId) return [];
    return storyClips.filter((c) => c.storyId === selectedStoryId);
  }, [selectedStoryId, storyClips]);

  /* ── load story data when selected ── */
  useEffect(() => {
    if (selectedStoryId) {
      const story = stories.find((s) => s.storyId === selectedStoryId);
      if (story) {
        setFormTitle(story.title);
        setFormCategory(story.category || '');
        setFormFormat(story.format || '');
        setFormLocation(story.location || '');
        setFormDate(story.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
        setFormSource(story.source || '');
        setFormContent(story.content || '');
        setFormPriority(story.priority || 'NORMAL');
      }
    } else {
      resetForm();
    }
  }, [selectedStoryId, stories]);

  const resetForm = () => {
    setFormTitle('');
    setFormCategory('');
    setFormFormat('');
    setFormLocation('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormSource('');
    setFormContent('');
    setFormPriority('NORMAL');
    setSelectedStoryId(null);
    setPendingFiles([]);
  };

  /* ── file handling ── */
  const handleFileDrop = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setPendingFiles((prev) => [...prev, ...fileArray]);
    if (selectedStoryId) {
      handleUploadFiles(selectedStoryId, fileArray);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadFiles = async (storyId: string, filesToUpload: File[]) => {
    setIsUploading(true);
    const existingClips = storyClips.filter((c) => c.storyId === storyId);
    let clipIndex = existingClips.length + 1;

    for (const file of filesToUpload) {
      const autoFileName = generateClipFileName(storyId, clipIndex, file.name);
      const clipId = generateClipId(storyId, clipIndex);

      let duration = '00:00:00';
      try {
        duration = await getVideoDuration(file);
      } catch {
        duration = '00:00:00';
      }

      addClip({
        clipId,
        storyId,
        fileName: autoFileName,
        originalFileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileType: file.type || 'video/mp4',
        displayLabel: '',
        status: 'PENDING',
        claimedBy: null,
        claimedAt: null,
        completedAt: null,
        duration,
      });

      clipIndex++;
    }

    setPendingFiles((prev) => prev.filter((f) => !filesToUpload.includes(f)));
    setIsUploading(false);
  };

  /* ── create or update story ── */
  const handleCreateOrUpdateStory = (shouldSubmit: boolean) => {
    if (!formTitle) return alert('Title is required');

    const language = detectLanguage(formTitle + ' ' + formContent);
    const now = new Date().toISOString();

    if (selectedStoryId) {
      // UPDATE existing story
      updateStoryField(selectedStoryId, 'title', formTitle);
      updateStoryField(selectedStoryId, 'slug', generateSlug(formTitle));
      updateStoryField(selectedStoryId, 'category', formCategory);
      updateStoryField(selectedStoryId, 'format', formFormat);
      updateStoryField(selectedStoryId, 'location', formLocation);
      updateStoryField(selectedStoryId, 'source', formSource);
      updateStoryField(selectedStoryId, 'content', formContent);
      updateStoryField(selectedStoryId, 'priority', formPriority);
      updateStoryField(selectedStoryId, 'language', language === 'KN' ? 'kn' : 'en');

      if (shouldSubmit) {
        updateStoryField(selectedStoryId, 'status', 'SUBMITTED');
      }
    } else {
      // CREATE new story
      const storyId = generateStoryId(language);

      const newStory: Story = {
        storyId,
        title: formTitle,
        slug: generateSlug(formTitle),
        format: (formFormat as Story['format']) || '',
        status: shouldSubmit ? 'SUBMITTED' : 'DRAFT',
        content: formContent,
        rawScript: formContent,
        polishedScript: null,
        anchorScript: '',
        voiceoverScript: '',
        editorialNotes: '',
        scriptSentToRundown: null,
        sentToRundownId: null,
        sentToRundownAt: null,
        sentBy: null,
        polishedBy: null,
        polishedAt: null,
        isPolished: false,
        createdBy: 'USR-001',
        createdAt: now,
        updatedAt: now,
        plannedDuration: '00:00:00',
        rundownId: null,
        orderIndex: 0,
        category: formCategory,
        location: formLocation,
        source: formSource,
        language: language === 'KN' ? 'kn' : 'en',
        priority: formPriority,
      };

      createStory(newStory);
      setSelectedStoryId(storyId);

      // Upload pending files for the new story
      if (pendingFiles.length > 0) {
        handleUploadFiles(storyId, pendingFiles);
        setPendingFiles([]);
      }
    }

    if (shouldSubmit) {
      alert('Story submitted successfully!');
    }
  };

  const handleSaveDraft = () => handleCreateOrUpdateStory(false);
  const handleSubmit = () => handleCreateOrUpdateStory(true);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileDrop(e.target.files);
      e.target.value = '';
    }
  };

  /* ── stories grouped by category ── */
  const storiesByCategory = useMemo(() => {
    const map: Record<string, Story[]> = {};
    CATEGORY_LIST.forEach((cat) => (map[cat] = []));
    stories.forEach((story) => {
      const cat = story.category || 'National';
      if (map[cat]) {
        map[cat].push(story);
      } else {
        if (!map['National']) map['National'] = [];
        map['National'].push(story);
      }
    });
    return map;
  }, [stories]);

  const lastStory = stories.length > 0 ? stories[stories.length - 1] : null;

  /* ── helper: file size display ── */
  const clipFileSize = (clip: StoryClip) => {
    // We don't store fileSize in StoryClip type, so show type instead
    return clip.fileType || 'video';
  };

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="flex h-full bg-nf-bg overflow-hidden">
      {/* ══════ SIDEBAR ══════ */}
      <aside className="w-60 shrink-0 bg-nf-surface border-r border-nf-border flex flex-col h-full overflow-hidden">
        <div className="p-3 border-b border-nf-border shrink-0">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-200">
            <Upload size={16} />
            <span>Input</span>
          </div>
          <button
            onClick={resetForm}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md py-2 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus size={14} />
            <span>New Story</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {CATEGORY_LIST.map((catName) => {
            const isActive = selectedCategory === catName;
            const categoryStories = storiesByCategory[catName] || [];
            return (
              <div key={catName}>
                <button
                  onClick={() => setSelectedCategory(catName)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors ${isActive ? 'bg-nf-panel/50 text-blue-400' : 'text-gray-400 hover:bg-nf-panel/30'}`}
                >
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <Folder size={14} className={isActive ? 'text-blue-400' : 'text-gray-500'} />
                    {catName}
                  </div>
                  <span className="text-[10px] text-gray-600 bg-nf-bg px-1.5 py-0.5 rounded">{categoryStories.length}</span>
                </button>
                {isActive && (
                  <div className="pl-8 border-l border-nf-border/30 ml-5 py-1">
                    {categoryStories.map((story) => (
                      <div
                        key={story.storyId}
                        onClick={() => setSelectedStoryId(story.storyId)}
                        className={`py-1.5 cursor-pointer text-[11px] pr-2 transition-colors flex items-center justify-between group/story ${selectedStoryId === story.storyId ? 'text-blue-400 font-medium' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        <div className="flex flex-col min-w-0 pr-1">
                          <span
                            className="truncate"
                            style={story.title.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                          >
                            {story.title}
                          </span>
                          <div className="mt-0.5">
                            <StatusBadge status={story.status} />
                          </div>
                        </div>
                        <button
                          className="opacity-0 group-hover/story:opacity-100 p-0.5 hover:bg-nf-panel rounded transition-all text-gray-500 hover:text-red-400 shrink-0 self-start mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete story ${story.storyId}?`)) {
                              deleteStory(story.storyId);
                              if (selectedStoryId === story.storyId) resetForm();
                            }
                          }}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* ══════ MAIN ══════ */}
      <main className="flex-1 flex flex-col overflow-hidden bg-nf-bg">
        {/* top bar */}
        <div className="h-12 shrink-0 bg-nf-surface border-b border-nf-border flex items-center px-6 gap-8 select-none">
          <div className="flex items-center">
            <span className="text-xs text-gray-500">Total Stories:</span>
            <span className="text-lg font-bold text-blue-400 ml-1">{stories.length}</span>
          </div>
          <div className="h-4 w-px bg-nf-border" />
          <div className="flex items-center">
            <span className="text-xs text-gray-500">Last Story:</span>
            <span className="text-xs font-medium text-gray-200 ml-1 truncate max-w-[200px]">{lastStory?.title || 'None'}</span>
          </div>
        </div>

        {/* form */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-base font-semibold text-gray-200">{selectedStoryId ? 'Edit Story' : 'New Story'}</h1>
            <div className="font-mono text-sm text-gray-500 bg-nf-bg px-2 py-1 rounded border border-nf-border">
              {selectedStoryId || 'NEW_STORY'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <FormField label="Title">
                <input
                  type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200 font-medium"
                  style={formTitle.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Category">
                  <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200">
                    <option value="">Select...</option>
                    {CATEGORY_LIST.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormField>
                <FormField label="Format">
                  <select value={formFormat} onChange={(e) => setFormFormat(e.target.value)} className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200">
                    <option value="">Select...</option>
                    {FORMAT_LIST.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </FormField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Location">
                  <input type="text" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200" />
                </FormField>
                <FormField label="Date">
                  <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200" />
                </FormField>
              </div>

              <FormField label="Source">
                <input type="text" value={formSource} onChange={(e) => setFormSource(e.target.value)} className="w-full bg-nf-panel border border-nf-border rounded-md px-3 py-2 text-sm text-gray-200" />
              </FormField>

              {/* ── MEDIA ASSETS ── */}
              <div className="mt-6 space-y-3 select-none">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Media Assets</label>
                  <span className="text-[10px] text-gray-600 bg-nf-panel px-1.5 py-0.5 rounded border border-nf-border">{clips.length} Files</span>
                </div>

                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {/* uploaded clips */}
                  {clips.map((clip) => (
                    <div key={clip.clipId} className="bg-nf-surface/50 rounded-md p-2.5 flex items-center justify-between border border-nf-border/30 hover:border-nf-border transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-nf-panel flex items-center justify-center text-blue-400 shrink-0">
                          <Film size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[11px] text-white truncate">{clip.fileName}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-gray-500 font-medium">{clipFileSize(clip)} • {formatDuration(clip.duration)}</span>
                            <StatusBadge status={clip.status} />
                          </div>
                          {clip.originalFileName !== clip.fileName && (
                            <span className="text-[9px] text-gray-600 truncate mt-0.5">← {clip.originalFileName}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteClip(clip.clipId)}
                        className="p-1.5 hover:bg-red-500/10 rounded transition-all"
                      >
                        <X size={12} className="text-gray-600 hover:text-red-400" />
                      </button>
                    </div>
                  ))}

                  {/* pending files */}
                  {pendingFiles.map((file, idx) => (
                    <div key={`pending-${idx}`} className="bg-blue-500/5 rounded-md p-2.5 flex items-center justify-between border border-blue-500/20">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded bg-blue-500/10 flex items-center justify-center text-blue-400/50 shrink-0">
                          <Upload size={14} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-mono text-[11px] text-blue-300 truncate">{file.name}</span>
                          <span className="text-[9px] text-blue-400/60 font-medium mt-0.5 uppercase tracking-tighter">
                            Ready to upload • {(file.size / (1024 * 1024)).toFixed(1)}MB
                          </span>
                        </div>
                      </div>
                      <button onClick={() => removePendingFile(idx)} className="p-1.5 hover:bg-red-500/10 rounded">
                        <X size={12} className="text-gray-500 hover:text-red-400" />
                      </button>
                    </div>
                  ))}

                  {/* empty state */}
                  {clips.length === 0 && pendingFiles.length === 0 && (
                    <div className="py-12 border-2 border-dashed border-nf-border/30 rounded-lg flex flex-col items-center justify-center gap-3 text-gray-600 bg-nf-panel/20">
                      <Film size={24} className="opacity-10" />
                      <div className="text-center">
                        <p className="text-[11px] font-medium">No media attached yet</p>
                        <p className="text-[10px] opacity-60">Upload clips or drag and drop files</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files.length > 0) handleFileDrop(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-nf-border rounded-lg p-5 text-center hover:border-blue-500/40 hover:bg-blue-500/5 transition-all cursor-pointer overflow-hidden"
                >
                  <input type="file" ref={fileInputRef} multiple accept="video/*,.mxf,.mov,.mp4,.avi,.mkv" className="hidden" onChange={handleFileChange} />
                  <div className="flex flex-col items-center gap-1.5">
                    <Plus size={16} className="text-gray-500 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                    <span className="text-[11px] text-gray-500 group-hover:text-blue-400 transition-colors">
                      {isUploading ? 'Uploading assets...' : 'Add Video Assets'}
                    </span>
                    <span className="text-[9px] text-gray-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      MP4, MXF, MOV, AVI — MAX 4GB
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN — Story Text */}
            <div className="space-y-1 flex flex-col h-full min-h-[400px]">
              <label className="text-[11px] font-medium text-gray-400 uppercase">Story Text</label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="flex-1 w-full bg-nf-panel border border-nf-border rounded-md p-4 text-sm text-gray-200 leading-relaxed resize-none"
                style={{ fontFamily: "'Noto Sans Kannada', sans-serif" }}
              />
            </div>
          </div>
        </div>

        {/* bottom bar */}
        <div className="h-14 bg-nf-surface border-t border-nf-border flex items-center justify-end px-6 gap-3">
          <button onClick={handleSaveDraft} className="bg-nf-panel border border-nf-border text-gray-400 text-xs font-medium px-4 py-2 rounded-md transition-all active:scale-95">
            Save Draft
          </button>
          <button onClick={handleSubmit} className="bg-blue-600 text-white text-xs font-bold px-8 py-2 rounded-md shadow-lg shadow-blue-500/20 active:scale-95">
            Submit
          </button>
        </div>
      </main>
    </div>
  );
}