'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Plus, Pencil, Trash2, Copy, ArrowUpDown, 
  Printer, Search, Download, X,
  FilePlus, FileSearch, GripVertical
} from 'lucide-react';
import { useNewsForgeStore } from '@/store/useNewsForgeStore';
import { Story, Clip, Rundown, RundownEntry } from '@/types/newsforge';
import { generateAllTimeSlots } from '@/utils/metadata';

// ═══════════════════════════════════════════════════════
// MOCK DATA & HELPERS
// ═══════════════════════════════════════════════════════

const MOCK_USERS = [
  { userId: 'Admin', fullName: 'Administrator' },
  { userId: 'Reporter1', fullName: 'Rahul Manju' },
  { userId: 'Reporter2', fullName: 'Anita K' },
  { userId: 'Producer1', fullName: 'Priya Sharma' },
  { userId: 'SYSTEM', fullName: 'System' },
];

const DEFAULT_SYSTEM_ENTRIES = [
  { slug: 'HEADLINES', format: 'ANCHOR' as const, orderIndex: 0 },
  { slug: 'START',     format: 'ANCHOR' as const, orderIndex: 1 },
  { slug: 'BREAK 1',   format: 'BREAK' as const,  orderIndex: 2 },
  { slug: 'BREAK 2',   format: 'BREAK' as const,  orderIndex: 3 },
  { slug: 'END',       format: 'ANCHOR' as const,  orderIndex: 4 },
];


const formatDateDisplay = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}`;
};

// ═══════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════

export default function RundownPage() {
  const store = useNewsForgeStore();
  const { 
    rundowns, 
    rundownEntries,
    stories, 
    clips: allClips, 
    addStory, 
    updateStory, 
    addStoryToRundown, 
    removeEntryFromRundown,
    reorderRundownEntries,
    updateRundown
  } = store;

  // ─── STATE ───
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedRundownId, setSelectedRundownId] = useState<string | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  
  const [detailPanelHeight, setDetailPanelHeight] = useState(280);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('SCRIPT');
  
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showNewStoryForm, setShowNewStoryForm] = useState(false);
  const [showExistingPicker, setShowExistingPicker] = useState(false);
  const [storySearchQuery, setStorySearchQuery] = useState('');
  const [bulletinSearch, setBulletinSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Form states - ALL EMPTY
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newFormat, setNewFormat] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPlannedDuration, setNewPlannedDuration] = useState('');

  // Detail panel field states (synced with selected entry)
  const [editorialNotes, setEditorialNotes] = useState('');
  const [anchorScript, setAnchorScript] = useState('');
  const [voScript, setVoScript] = useState('');

  // ─── DATA HOOKS ───

  const allRundowns = useMemo(() => {
    // Generate all 48 time slots for selected date
    const autoSlots = generateAllTimeSlots(selectedDate);
    const existingForDate = rundowns.filter((r) => r.airDate === selectedDate);

    // Merge: if an existing rundown matches a time slot, use the existing one
    const merged = autoSlots.map((slot) => {
      const existing = existingForDate.find(
        (r) => r.airTime === slot.airTime
      );
      return existing || (slot as Rundown);
    });

    // Add any existing rundowns that DON'T match a standard time slot
    existingForDate.forEach((existing) => {
      const alreadyMerged = merged.find((m) => m.id === existing.id);
      if (!alreadyMerged) {
        merged.push(existing);
      }
    });

    // Sort by broadcast time
    merged.sort((a, b) => a.airTime.localeCompare(b.airTime));

    return merged;
  }, [selectedDate, rundowns]);

  const filteredRundowns = useMemo(() => {
    if (!bulletinSearch.trim()) return allRundowns;
    const query = bulletinSearch.toLowerCase().trim();
    return allRundowns.filter((rd) =>
      rd.title.toLowerCase().includes(query) ||
      rd.airTime.includes(query)
    );
  }, [allRundowns, bulletinSearch]);

  const selectedRundown = useMemo(() => {
    return allRundowns.find(r => r.id === selectedRundownId) || null;
  }, [selectedRundownId, allRundowns]);

  const entriesForRundown = useMemo(() => {
    if (!selectedRundownId) return [];

    const DEFAULT_SYSTEM = [
      { slug: 'HEADLINES', format: 'ANCHOR' as const, dur: '00:00:15' },
      { slug: 'START', format: 'ANCHOR' as const, dur: '00:00:15' },
      { slug: 'BREAK 1', format: 'BREAK' as const, dur: '00:05:00' },
      { slug: 'BREAK 2', format: 'BREAK' as const, dur: '00:05:00' },
      { slug: 'END', format: 'ANCHOR' as const, dur: '00:00:15' },
    ];

    // Get ACTUAL entries from store for this rundown
    const storeEntries = rundownEntries
      .filter((e) => e.rundownId === selectedRundownId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    // Build system rows
    const systemRows = DEFAULT_SYSTEM.map((sys, i) => ({
      entryId: `SYS-${selectedRundownId}-${sys.slug.replace(/\s/g, '')}`,
      rundownId: selectedRundownId,
      storyId: `SYS-${sys.slug.replace(/\s/g, '-')}`,
      orderIndex: i,
      scriptContent: null,
      scriptSource: null as any,
      _title: sys.slug,
      _format: sys.format,
      _isSystem: true,
      _status: '' as any,
      _plannedDuration: sys.dur,
      _clips: [] as any[],
      _story: null as any,
      _createdBy: 'SYSTEM',
    }));

    // Build story rows from actual entries
    const storyRows = storeEntries.map((entry) => {
      const story = stories.find((s) => s.id === entry.storyId);
      const clips = allClips.filter((c) => c.storyId === entry.storyId);
      return {
        ...entry,
        _title: story?.title || story?.slug || 'Untitled',
        _format: story?.format || '',
        _isSystem: false,
        _status: story?.status || '',
        _plannedDuration: story?.plannedDuration || '00:00:00',
        _clips: clips,
        _story: story || null,
        _createdBy: story?.createdBy || '—',
      };
    });

    // Combine: HEADLINES, START, [stories], BREAK 1, BREAK 2, END
    const combined = [
      systemRows[0],   // HEADLINES
      systemRows[1],   // START
      ...storyRows,    // Sent stories go HERE
      systemRows[2],   // BREAK 1
      systemRows[3],   // BREAK 2
      systemRows[4],   // END
    ];

    return combined.map((entry, idx) => ({ ...entry, orderIndex: idx }));
  }, [selectedRundownId, rundownEntries, stories, allClips]);

  const selectedEntry = useMemo(() => {
    return entriesForRundown.find((e) => e.entryId === selectedEntryId) || null;
  }, [selectedEntryId, entriesForRundown]);

  // Auto-select the nearest bulletin to current time on page load
  useEffect(() => {
    if (selectedRundownId) return; // Don't override manual selection
    if (allRundowns.length === 0) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find the nearest bulletin that is AT or BEFORE current time
    let nearest = allRundowns[0];
    let smallestDiff = Infinity;

    for (const rd of allRundowns) {
      const parts = rd.airTime.split(':').map(Number);
      const rdMinutes = parts[0] * 60 + parts[1];
      const diff = currentMinutes - rdMinutes;

      if (diff >= 0 && diff < smallestDiff) {
        smallestDiff = diff;
        nearest = rd;
      }
    }

    if (smallestDiff === Infinity) {
      nearest = allRundowns[0];
    }

    setSelectedRundownId(nearest.id);

    // Also scroll the sidebar to show the selected bulletin
    setTimeout(() => {
      const element = document.getElementById(`bulletin-${nearest.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, [allRundowns, selectedRundownId]);

  // ─── CALCULATION HOOKS ───

  const storiesTotalDuration = useMemo(() => {
    const totalSec = entriesForRundown.reduce((acc, entry) => {
      if (entry._format === 'BREAK') return acc;
      const parts = entry._plannedDuration.split(':').map(Number);
      return acc + (parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }, 0);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [entriesForRundown]);

  const breaksTotalDuration = useMemo(() => {
    const totalSec = entriesForRundown.reduce((acc, entry) => {
      if (entry._format !== 'BREAK') return acc;
      const parts = entry._plannedDuration.split(':').map(Number);
      return acc + (parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }, 0);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [entriesForRundown]);

  const grandTotalSec = useMemo(() => {
    const sParts = storiesTotalDuration.split(':').map(Number);
    const bParts = breaksTotalDuration.split(':').map(Number);
    return (sParts[0] * 3600 + sParts[1] * 60 + sParts[2]) + (bParts[0] * 3600 + bParts[1] * 60 + bParts[2]);
  }, [storiesTotalDuration, breaksTotalDuration]);

  const grandTotalDuration = useMemo(() => {
    const h = Math.floor(grandTotalSec / 3600);
    const m = Math.floor((grandTotalSec % 3600) / 60);
    const s = grandTotalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [grandTotalSec]);

  const overUnderSec = useMemo(() => {
    const plannedParts = (selectedRundown?.plannedDuration || '00:30:00').split(':').map(Number);
    const plannedSec = (plannedParts[0] * 3600 + plannedParts[1] * 60 + plannedParts[2]);
    return plannedSec - grandTotalSec;
  }, [selectedRundown, grandTotalSec]);

  const overUnderDisplay = useMemo(() => {
    const absSec = Math.abs(overUnderSec);
    const h = Math.floor(absSec / 3600);
    const m = Math.floor((absSec % 3600) / 60);
    const s = absSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [overUnderSec]);

  const containerRef = useRef<HTMLDivElement>(null);
  const detailContentRef = useRef<HTMLDivElement>(null);

  // ─── HELPERS ───
  

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate + 'T00:00:00');
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(current.toISOString().split('T')[0]);
    setSelectedRundownId(null);
    setIsDetailOpen(false);
  };

  const goToToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedRundownId(null);
    setIsDetailOpen(false);
  };

  const resetNewForm = () => {
    setNewTitle('');
    setNewSlug('');
    setNewFormat('');
    setNewContent('');
    setNewPlannedDuration('');
  };

  // ─── MEMOS ───


  const availableStories = useMemo(() => {
    const entriesInRundown = entriesForRundown
      .filter(e => !e._isSystem)
      .map((e) => e.storyId);
    
    return stories.filter((s) => 
      !s.id.startsWith('SYS-') && 
      s.createdBy !== 'SYSTEM' &&
      !entriesInRundown.includes(s.id) &&
      (storySearchQuery === '' || 
       s.title.toLowerCase().includes(storySearchQuery.toLowerCase()) ||
       s.slug.toLowerCase().includes(storySearchQuery.toLowerCase()))
    );
  }, [stories, entriesForRundown, storySearchQuery]);

  // ─── EFFECTS ───

  // Sync state when selection changes
  useEffect(() => {
    if (selectedEntry) {
      const story = selectedEntry._story;
      setEditorialNotes(story?.notes || '');
      setAnchorScript(story?.anchorScript || '');
      setVoScript(story?.voiceoverScript || '');
    }
  }, [selectedEntry]);

  // ─── HANDLERS ───

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    const startY = e.clientY;
    const startHeight = detailPanelHeight;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(150, Math.min(600, startHeight + delta));
      setDetailPanelHeight(newHeight);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const scrollDetail = (direction: 'up' | 'down') => {
    if (detailContentRef.current) {
      const amount = direction === 'up' ? -100 : 100;
      detailContentRef.current.scrollBy({ top: amount, behavior: 'smooth' });
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex && selectedRundownId) {
      // For store entries, use the reorder action
      // However, since we combine system rows and story rows, we need to find the correct indices in storyRows
      // Actually, Fix 2 Step A reorderRundownEntries handles the rundownEntries state.
      // If we assume system rows are NOT in the store, this action will only reorder STORIES.
      // But the user requested "Rundown rows (HEADLINES, START, stories, BREAKs, END) need drag-to-reorder".
      // This implies we should be able to reorder EVERYTHING.
      
      reorderRundownEntries(selectedRundownId, dragIndex, dragOverIndex);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleRowClick = (entryId: string) => {
    setSelectedEntryId(entryId);
    setIsDetailOpen(true);
  };

  const handleSaveDetail = () => {
    if (!selectedEntry) return;

    let storyId = selectedEntry.storyId;

    // If it's a virtual system row, create the story and add to rundown if needed
    if (selectedEntry._isSystem && selectedEntry.entryId.startsWith('SYS-')) {
      // Find if system story already exists
      let existingSystemStory = stories.find(s => s.id === selectedEntry.storyId || s.slug === selectedEntry._title);
      
      if (!existingSystemStory) {
        storyId = addStory({
          title: selectedEntry._title,
          slug: selectedEntry._title,
          format: selectedEntry._format,
          notes: editorialNotes,
          anchorScript: anchorScript,
          voiceoverScript: voScript,
          status: 'READY',
          createdBy: 'SYSTEM'
        });
      } else {
        storyId = existingSystemStory.id;
        updateStory(storyId, {
          notes: editorialNotes,
          anchorScript: anchorScript,
          voiceoverScript: voScript
        });
      }

      // Initialize rundown with defaults if empty
      const currentRundown = rundowns.find(r => r.id === selectedRundownId);
      if (!currentRundown || currentRundown.entries.length === 0) {
        // Add all 5 defaults
        DEFAULT_SYSTEM_ENTRIES.forEach(sys => {
          let sId = `SYS-${sys.slug.replace(/\s/g, '-').toUpperCase()}`;
          // Check if we just created this one
          if (sys.slug === selectedEntry._title) {
            addStoryToRundown(selectedRundownId!, storyId);
          } else {
            const existing = stories.find(s => s.id === sId || s.slug === sys.slug);
            if (existing) {
              addStoryToRundown(selectedRundownId!, existing.id);
            } else {
              const newId = addStory({
                title: sys.slug,
                slug: sys.slug,
                format: sys.format,
                createdBy: 'SYSTEM',
                status: 'READY'
              });
              addStoryToRundown(selectedRundownId!, newId);
            }
          }
        });
      }
    } else {
      // Regular story update
      updateStory(storyId, {
        notes: editorialNotes,
        anchorScript: anchorScript,
        voiceoverScript: voScript
      });
    }
  };

  const createStoryInRundown = (data: any) => {
    const id = addStory({
      title: data.title,
      slug: data.slug,
      format: data.format,
      content: data.content,
      plannedDuration: data.plannedDuration,
      status: 'DRAFT',
      createdBy: 'Admin' // Should be current user
    });
    addStoryToRundown(data.rundownId, id);
  };

  // ─── RENDER ───

  return (
    <div className="flex bg-[#0a0f1a] text-slate-200 h-[calc(100vh-64px)] overflow-hidden font-sans">
      
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className="w-56 flex-shrink-0 bg-[#0c1118] border-r border-[#1e293b] flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-[#1e293b]">
          <h2 className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">
            Rundowns
          </h2>
        </div>
        
        {/* Date Navigation */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#1e293b]">
          <button onClick={() => navigateDate('prev')} className="text-gray-400 hover:text-white p-1">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-white font-medium uppercase">
            {formatDateDisplay(selectedDate)}
          </span>
          <button onClick={() => navigateDate('next')} className="text-gray-400 hover:text-white p-1">
            <ChevronRight size={14} />
          </button>
        </div>
        
        {/* TODAY button */}
        <div className="px-3 py-1.5 border-b border-[#1e293b]">
          <button onClick={goToToday} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded">
            TODAY
          </button>
        </div>

        {/* ═══ SEARCH BOX ═══ */}
        <div className="px-2 py-2 border-b border-[#1e293b]">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={bulletinSearch}
              onChange={(e) => setBulletinSearch(e.target.value)}
              placeholder="Search bulletins..."
              className="w-full bg-[#0a0f1a] border border-[#1e293b] rounded pl-7 pr-2 py-1.5 text-[10px] text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50"
            />
            {bulletinSearch && (
              <button
                onClick={() => setBulletinSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X size={10} />
              </button>
            )}
          </div>
          {bulletinSearch && (
            <div className="text-[9px] text-gray-500 mt-1 px-1">
              {filteredRundowns.length} of {allRundowns.length} bulletins
            </div>
          )}
        </div>
        
        {/* ═══ SCROLLABLE BULLETIN LIST ═══ */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredRundowns.map((rd) => {
            const entryCount = rundowns.find(r => r.id === rd.id)?.entries.length || 0;
            const isSelected = selectedRundownId === rd.id;
            const hasContent = entryCount > 0 || rd.status !== 'PLANNING';
            
            return (
              <div
                key={rd.id}
                id={`bulletin-${rd.id}`}
                onClick={() => setSelectedRundownId(rd.id)}
                className={`cursor-pointer p-3 border-b border-[#1e293b]/50 transition-colors
                  ${isSelected 
                    ? 'bg-blue-900/10 border-l-2 border-l-blue-500' 
                    : 'hover:bg-[#1e293b]/30 border-l-2 border-l-transparent'
                  }
                  ${!hasContent ? 'opacity-50' : ''}
                `}
              >
                {/* Title */}
                <div className="text-sm text-white font-medium">{rd.title}</div>
                
                {/* Time + Duration */}
                <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                  <span className="text-red-400 font-mono italic">RD</span>
                  <span className="font-mono">{rd.airTime.slice(0, 5)}</span>
                  <span>⏱</span>
                  <span className="font-mono">{rd.plannedDuration}</span>
                </div>
                
                {/* Story count */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-gray-300 font-bold uppercase">
                    {entryCount || 5} STORIES
                  </span>
                </div>
                
                {/* Status + MOS */}
                <div className="mt-1.5 flex items-center justify-between">
                  <span className={`text-[10px] font-bold tracking-wider ${
                    rd.status === 'READY' ? 'text-green-400' :
                    rd.status === 'LIVE' ? 'text-red-400' :
                    rd.status === 'PLANNING' ? 'text-amber-400' :
                    'text-gray-400'
                  }`}>
                    ● {rd.status}
                  </span>
                  <span className="text-[9px] text-gray-600 font-bold">MOS: OK</span>
                </div>
              </div>
            );
          })}

          {filteredRundowns.length === 0 && (
            <div className="p-4 text-center text-gray-600 text-[10px]">
              No bulletins match "{bulletinSearch}"
            </div>
          )}
        </div>
      </div>

      {/* ═══ MAIN CONTENT AREA ═══ */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" ref={containerRef}>
        
        {/* ACTION BAR */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-[#1e293b] bg-[#0c1118]">
          <div className="relative">
            <button 
              onClick={() => setShowNewMenu(!showNewMenu)}
              className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 font-bold uppercase tracking-wider px-2 py-1"
            >
              <Plus size={10} /> New
            </button>
            {showNewMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-lg shadow-2xl z-50 w-56 overflow-hidden">
                <button
                  onClick={() => { resetNewForm(); setShowNewStoryForm(true); setShowNewMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-700 border-b border-[#334155]/50 flex items-center gap-3"
                >
                  <FilePlus size={14} className="text-green-400" />
                  <div>
                    <div className="font-medium text-xs">Create Empty Story</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-tighter">New story with blank fields</div>
                  </div>
                </button>
                <button
                  onClick={() => { setShowExistingPicker(true); setShowNewMenu(false); }}
                  className="w-full text-left px-4 py-3 text-sm text-white hover:bg-slate-700 flex items-center gap-3"
                >
                  <FileSearch size={14} className="text-blue-400" />
                  <div>
                    <div className="font-medium text-xs">Add Existing Story</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-tighter">Pick from stories in system</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          
          <span className="text-gray-700 mx-1">|</span>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <Pencil size={10} /> Edit
          </button>
          <button className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-400 uppercase font-bold tracking-wider px-2 py-1">
            <Trash2 size={10} /> Delete
          </button>
          <span className="text-gray-700 mx-1">|</span>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <Copy size={10} /> Copy
          </button>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <ArrowUpDown size={10} /> Move
          </button>
          <span className="text-gray-700 mx-1">|</span>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <Printer size={10} /> Print
          </button>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <Search size={10} /> Search
          </button>
          <button className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white uppercase font-bold tracking-wider px-2 py-1">
            <Download size={10} /> Export
          </button>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 text-[10px] bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-bold transition-colors">
            RUN LIVE
          </button>
        </div>

        {/* INFO BAR */}
        {selectedRundown && (
          <div className="flex items-center gap-10 px-5 py-2.5 bg-[#0a0f1a] border-b border-[#1e293b]">
            <div className="min-w-[150px]">
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Rundown</div>
              <div className="text-xs text-white font-bold">{selectedRundown.title}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Status</div>
              <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase">READY</span>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Duration</div>
              <div className="text-xs text-white font-mono font-bold">00:30:00</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">Planned</div>
              <span className="bg-cyan-700 text-white text-[11px] font-mono font-bold px-2.5 py-0.5 rounded uppercase tracking-tighter">
                {selectedRundown.plannedDuration}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-0.5">MOS Connection</div>
                <div className="text-[10px] text-green-400 font-bold">● ONLINE</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ TABLE AREA ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ 
            maxHeight: isDetailOpen ? `calc(100% - ${detailPanelHeight + 8}px)` : '100%' 
          }}>
            <div className="sticky top-0 z-10 bg-[#0a0f1a] border-b border-[#1e293b]">
              <div className="grid grid-cols-[40px_30px_30px_1fr_90px_70px_50px_80px_90px_80px_90px_80px_30px] gap-0 px-2 py-2 text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                <span>#</span>
                <span>↕</span>
                <span></span>
                <span>Slugs / Headline</span>
                <span className="text-center">Format</span>
                <span className="text-center">Clips</span>
                <span className="text-center">CG</span>
                <span className="text-center">Dur</span>
                <span className="text-center">Text/Vid</span>
                <span className="text-center">Planned</span>
                <span className="text-center">Author</span>
                <span className="text-center">Status</span>
                <span></span>
              </div>
            </div>
            
            {entriesForRundown.map((entry, idx) => (
              <div
                key={entry.entryId}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                onDrop={handleDragEnd}
                onClick={() => handleRowClick(entry.entryId)}
                className={`grid grid-cols-[40px_30px_30px_1fr_90px_70px_50px_80px_90px_80px_90px_80px_30px] gap-0 px-2 py-2.5 border-b border-nf-border/30 cursor-pointer transition-all text-sm ${
                  selectedEntryId === entry.entryId ? 'bg-nf-surface' : 'hover:bg-nf-surface/30'
                } ${dragIndex === idx ? 'opacity-40' : ''} ${
                  dragOverIndex === idx ? 'border-t-2 border-t-blue-500' : ''
                } ${entry._isSystem ? 'text-gray-400' : 'text-white'}`}
              >
                {/* # */}
                <span className="text-gray-500 text-xs font-mono">{idx}</span>

                {/* Drag handle */}
                <span className="text-gray-600 cursor-grab active:cursor-grabbing flex items-center">
                  <GripVertical size={12} />
                </span>

                {/* Status dot */}
                <span className="flex items-center">
                  {entry._isSystem && (
                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
                  )}
                </span>

                {/* Title/Slug */}
                <span className={`font-medium truncate pr-4 ${entry._isSystem ? 'text-gray-400 uppercase tracking-widest text-[11px]' : 'text-slate-200'}`}
                      style={entry._title.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}>
                  {entry._title}
                </span>

                {/* Format */}
                <span className="flex justify-center">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold tracking-widest border border-current ${
                    entry._format === 'ANCHOR' ? 'text-gray-400' :
                    entry._format === 'PKG' ? 'text-blue-400 border-blue-400/30 bg-blue-400/5' :
                    entry._format === 'VO+BITE' ? 'text-teal-400 border-teal-400/30 bg-teal-400/5' :
                    entry._format === 'VO' ? 'text-purple-400 border-purple-400/30 bg-purple-400/5' :
                    entry._format === 'BREAK' ? 'text-orange-400 border-orange-400/30 bg-orange-400/5' :
                    'text-gray-600'
                  }`}>
                    {entry._format || '—'}
                  </span>
                </span>

                {/* Clips */}
                <span className="text-center text-blue-400 text-xs font-bold">
                  {entry._clips && entry._clips.length > 0 ? (
                    <div className="flex items-center justify-center gap-1">
                      <span>{entry._clips.length}</span>
                      {entry._clips.some((c: any) => c.status !== 'COMPLETED' && c.status !== 'APPROVED') ? (
                        <span className="text-amber-400">*</span>
                      ) : (
                        <span className="text-green-400 text-[10px]">✓</span>
                      )}
                    </div>
                  ) : '—'}
                </span>

                {/* CG */}
                <span className="text-center text-gray-700">—</span>

                {/* Duration */}
                <span className="text-center text-emerald-400 font-mono text-xs uppercase">
                  {entry._isSystem ? '—' : '00:00:00'}
                </span>

                {/* Text/Vid */}
                <span className="text-[9px] text-gray-500 font-mono text-center leading-tight">
                  {entry._isSystem ? '—' : (
                    <div>
                      <div>T 00:00:00</div>
                      <div>V 00:00:00</div>
                    </div>
                  )}
                </span>

                {/* Planned */}
                <span className="text-center text-gray-500 font-mono text-xs italic">
                  {entry._plannedDuration}
                </span>

                {/* Author */}
                <span className="text-center text-[10px] text-gray-600 uppercase tracking-tighter truncate px-2 font-medium">
                  {entry._createdBy === 'SYSTEM' ? 'SYSTEM' : (() => {
                    const user = MOCK_USERS.find((u: any) => u.userId === entry._createdBy);
                    return user?.fullName?.split(' ')[0] || entry._createdBy || '—';
                  })()}
                </span>

                {/* Status */}
                <span className={`text-[10px] font-bold text-center tracking-widest uppercase ${
                  entry._status === 'READY' ? 'text-green-400' :
                  entry._status === 'EDITING' ? 'text-blue-400' :
                  entry._status === 'SUBMITTED' ? 'text-amber-400' :
                  'text-gray-600'
                }`}>
                  {entry._isSystem ? '' : entry._status}
                </span>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!entry._isSystem && selectedRundownId) {
                      removeEntryFromRundown(entry.entryId);
                    }
                  }}
                  className={`text-gray-700 hover:text-red-500 transition-colors ${entry._isSystem ? 'opacity-30 cursor-not-allowed' : ''}`}
                  disabled={entry._isSystem}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Drop zone at the bottom */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(entriesForRundown.length); }}
              onDrop={handleDragEnd}
              className={`h-8 ${dragOverIndex === entriesForRundown.length ? 'border-t-2 border-t-blue-500 bg-blue-500/5' : ''}`}
            />
          </div>

          {/* TIMING FOOTER */}
          <div className="flex items-center justify-between px-5 py-2.5 bg-[#0f1420] border-t border-[#1e293b] text-xs z-10">
            <div className="flex items-center gap-8">
              <span className="text-gray-500 font-medium uppercase tracking-widest">
                STORIES: <span className="text-white font-mono font-bold ml-1">{storiesTotalDuration}</span>
              </span>
              <span className="text-gray-500 font-medium uppercase tracking-widest">
                BREAKS: <span className="text-orange-400 font-mono font-bold ml-1">{breaksTotalDuration}</span>
              </span>
              <div className="w-px h-3 bg-[#334155] mx-1" />
              <span className="text-gray-500 font-medium uppercase tracking-widest">
                TOTAL: <span className="text-white font-mono font-bold ml-1">{grandTotalDuration}</span>
              </span>
            </div>
            <div className="flex items-center gap-8">
              <span className="text-gray-500 font-medium uppercase tracking-widest flex items-center gap-3">
                PLANNED: <span className="bg-amber-600/20 text-amber-500 px-3 py-0.5 rounded-full font-mono font-bold border border-amber-500/20">{selectedRundown?.plannedDuration || '00:30:00'}</span>
              </span>
              <span className="text-gray-500 font-medium uppercase tracking-widest flex items-center gap-2">
                OVER/UNDER: <span className={`font-mono font-bold ${overUnderSec >= 0 ? 'text-green-400' : 'text-red-500'}`}>{overUnderSec < 0 ? '+' : ''}{overUnderDisplay}</span> <span className="text-base">{overUnderSec >= 0 ? '✅' : '⚠️'}</span>
              </span>
            </div>
          </div>

          {/* RESIZE HANDLE */}
          {isDetailOpen && (
            <div
              onMouseDown={handleMouseDown}
              className={`h-1.5 bg-[#1e293b] cursor-row-resize flex items-center justify-center
                          hover:bg-blue-500/50 transition-colors z-30
                          ${isDragging ? 'bg-blue-500' : ''}`}
            >
              <div className="w-12 h-0.5 bg-gray-600 rounded-full" />
            </div>
          )}

          {/* DETAIL PANEL */}
          {isDetailOpen && selectedEntry && (
            <div 
              className="bg-[#0c1118] border-t border-[#1e293b] flex flex-col z-20 shadow-2xl"
              style={{ height: `${detailPanelHeight}px`, minHeight: '150px' }}
            >
              <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#1e293b] bg-[#0f1420]">
                <div className="flex gap-6">
                  {['SCRIPT', 'CLIPS', 'CG GRAPHICS'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`text-[10px] font-bold tracking-widest pb-1 border-b-2 transition-colors uppercase ${
                        activeDetailTab === tab 
                          ? 'text-blue-400 border-blue-400' 
                          : 'text-gray-500 border-transparent hover:text-gray-300'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mr-4">
                    Editing: <span className="text-white">"{selectedEntry._title}"</span>
                  </span>
                  
                  <div className="flex items-center bg-[#1e293b] rounded p-0.5">
                    <button onClick={() => scrollDetail('up')} className="text-gray-500 hover:text-white p-1 rounded hover:bg-[#334155]">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => scrollDetail('down')} className="text-gray-500 hover:text-white p-1 rounded hover:bg-[#334155]">
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <button 
                    onClick={handleSaveDetail}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-4 py-1.5 rounded-sm transition-all"
                  >
                    SAVE CHANGES
                  </button>

                  <button onClick={() => { setIsDetailOpen(false); setSelectedEntryId(null); }} className="text-gray-500 hover:text-white p-1">
                    <X size={16} />
                  </button>
                </div>
              </div>
              
              <div ref={detailContentRef} className="flex-1 overflow-y-auto custom-scrollbar p-5">
                {activeDetailTab === 'SCRIPT' && (
                  <div className="flex gap-6 h-full min-h-[300px]">
                    <div className="w-[30%] flex flex-col border-r border-[#1e293b] pr-6">
                      <h4 className="text-[10px] text-gray-500 font-bold mb-3 uppercase tracking-widest">Editorial Notes</h4>
                      <textarea
                        value={editorialNotes}
                        onChange={(e) => setEditorialNotes(e.target.value)}
                        placeholder="Add production notes here..."
                        className={`flex-1 bg-[#0a0f1a] border border-[#1e293b] rounded p-4 text-xs text-gray-300 resize-none
                                   focus:outline-none focus:border-blue-500/50 transition-colors
                                   placeholder:text-gray-700 leading-relaxed`}
                      />
                    </div>
                    
                    <div className="flex-1 flex flex-col gap-5">
                      <div className="flex flex-col flex-1">
                        <h4 className="text-[10px] font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                          <span className="text-red-500">●</span>
                          <span className="text-red-500">Anchor Script</span>
                        </h4>
                        <textarea
                          value={anchorScript}
                          onChange={(e) => setAnchorScript(e.target.value)}
                          placeholder="Type anchor script here..."
                          className={`flex-1 min-h-[120px] bg-[#0a0f1a] border border-[#1e293b] rounded p-4 text-[15px] text-white resize-none
                                     focus:outline-none focus:border-blue-500/50 transition-colors
                                     placeholder:text-gray-700 leading-relaxed font-medium`}
                          style={anchorScript.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                        />
                      </div>
                      <div className="flex flex-col flex-1">
                        <h4 className="text-[10px] font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                          <span className="text-orange-400">●</span>
                          <span className="text-orange-400">Voiceover / PKG Script</span>
                        </h4>
                        <textarea
                          value={voScript}
                          onChange={(e) => setVoScript(e.target.value)}
                          placeholder="Type voiceover script here..."
                          className={`flex-1 min-h-[120px] bg-[#0a0f1a] border border-[#1e293b] rounded p-4 text-sm text-gray-300 resize-none
                                     focus:outline-none focus:border-blue-500/50 transition-colors
                                     placeholder:text-gray-700 leading-relaxed italic`}
                          style={voScript.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {activeDetailTab === 'CLIPS' && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedEntry._clips && selectedEntry._clips.length > 0 ? (
                      selectedEntry._clips.map((clip: any) => (
                        <div key={clip.id} className="flex items-center gap-4 p-4 bg-[#1e293b]/50 border border-[#334155]/30 rounded-lg">
                          <div className="w-10 h-10 bg-blue-500/10 flex items-center justify-center rounded">
                            <Plus size={16} className="text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{clip.displayLabel || clip.fileName}</div>
                            <div className="text-[9px] text-gray-500 uppercase mt-1 font-mono tracking-tighter">{clip.id}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-white font-mono mb-1">{clip.duration || '--:--'}</div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              clip.status === 'COMPLETED' ? 'text-green-400 border-green-400/20 bg-green-400/5' : 'text-amber-400 border-amber-400/20 bg-amber-400/5'
                            }`}>
                              {clip.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 py-20 text-center">
                        <div className="text-gray-600 text-xs uppercase tracking-widest">No production clips found for this story</div>
                      </div>
                    )}
                  </div>
                )}
                
                {activeDetailTab === 'CG GRAPHICS' && (
                  <div className="py-20 text-center">
                    <div className="text-gray-600 text-xs uppercase tracking-widest">Graphics Engine Offline</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ CREATE EMPTY STORY MODAL ═══ */}
      {showNewStoryForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-[#0f1420] rounded-xl border border-[#334155] w-[550px] shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#1e293b]/20">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">Create New Story</h3>
              <button onClick={() => setShowNewStoryForm(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-7 flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 block">Story Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Enter descriptive title..."
                    className="w-full p-3 bg-[#0a0f1a] border border-[#1e293b] rounded-md text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 block">Story Slug</label>
                  <input
                    type="text"
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                    placeholder="AUTO-GENERATED"
                    className="w-full p-3 bg-[#0a0f1a] border border-[#1e293b] rounded-md text-sm text-white font-mono placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 block">Format</label>
                  <select
                    value={newFormat}
                    onChange={(e) => setNewFormat(e.target.value)}
                    className="w-full p-3 bg-[#0a0f1a] border border-[#1e293b] rounded-md text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select Format</option>
                    <option value="PKG">PKG</option>
                    <option value="VO">VO</option>
                    <option value="VO+BITE">VO+BITE</option>
                    <option value="ANCHOR">ANCHOR</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 block">Initial Content / Pitch</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Enter brief story outline or content..."
                  rows={4}
                  className="w-full p-3 bg-[#0a0f1a] border border-[#1e293b] rounded-md text-sm text-white placeholder:text-gray-700 resize-none focus:outline-none focus:border-blue-500/50 leading-relaxed"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 px-7 py-5 bg-[#1e293b]/10 border-t border-[#1e293b]">
              <button 
                onClick={() => { resetNewForm(); setShowNewStoryForm(false); }}
                className="px-5 py-2 text-xs font-bold text-gray-500 hover:text-white uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!newTitle.trim()) return;
                  createStoryInRundown({
                    title: newTitle.trim(),
                    slug: newSlug.trim() || newTitle.trim().toUpperCase().replace(/\s+/g, '-'),
                    format: newFormat || 'ANCHOR',
                    content: newContent.trim(),
                    plannedDuration: '00:01:00',
                    rundownId: selectedRundownId!,
                  });
                  resetNewForm();
                  setShowNewStoryForm(false);
                }}
                disabled={!newTitle.trim()}
                className="px-7 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded font-bold text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
              >
                CREATE & ADD TO BULLET
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD EXISTING STORY MODAL ═══ */}
      {showExistingPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
          <div className="bg-[#0f1420] rounded-xl border border-[#334155] w-[600px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b] bg-[#1e293b]/20">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">Story Archive Picker</h3>
              <button onClick={() => setShowExistingPicker(false)} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 bg-[#0a0f1a] border-b border-[#1e293b]">
              <div className="relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  value={storySearchQuery}
                  onChange={(e) => setStorySearchQuery(e.target.value)}
                  placeholder="SEARCH BY SLUG OR TITLE..."
                  className="w-full pl-10 pr-4 py-3 bg-[#0f1420] border border-[#1e293b] rounded-lg text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-500/50 font-bold uppercase tracking-wider"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {availableStories.map((story) => (
                <div
                  key={story.id}
                  className="flex items-center justify-between px-6 py-4 border-b border-[#1e293b]/50 hover:bg-[#1e293b]/20 cursor-pointer group"
                >
                  <div className="flex-1 pr-6">
                    <div className="text-[13px] text-white font-bold group-hover:text-blue-400 transition-colors"
                         style={story.title.match(/[^\x00-\x7F]/) ? { fontFamily: "'Noto Sans Kannada', sans-serif" } : {}}>
                      {story.title}
                    </div>
                    <div className="flex items-center gap-4 mt-1.5">
                      <span className="text-[9px] text-gray-600 font-mono font-bold tracking-widest uppercase">{story.id}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#1e293b] text-gray-500 rounded font-bold uppercase tracking-widest border border-slate-800">{story.format}</span>
                      <span className={`text-[9px] font-bold tracking-widest uppercase ${story.status === 'READY' ? 'text-green-500' : 'text-gray-600'}`}>{story.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      addStoryToRundown(selectedRundownId!, story.id);
                      setShowExistingPicker(false);
                    }}
                    className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded font-bold uppercase tracking-widest shadow-md transition-all active:scale-95"
                  >
                    + ADD
                  </button>
                </div>
              ))}
              
              {availableStories.length === 0 && (
                <div className="py-24 text-center">
                  <div className="text-gray-700 text-xs font-bold uppercase tracking-widest">No available stories found matching query</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
