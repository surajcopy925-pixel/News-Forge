import React from 'react';
import { Play, Repeat, Crosshair } from 'lucide-react';
import type { PlaylistClip } from '../types';

interface PlaylistTableProps {
  clips: PlaylistClip[];
  selectedIndex: number;
  playingIndex: number;
  onSelect: (index: number) => void;
  onCue: (index: number) => void;
  onPlayClip: (index: number) => void;
  onLoopClip: (index: number) => void;
  activeRundownTitle: string | null;
}

export default function PlaylistTable({
  clips,
  selectedIndex,
  playingIndex,
  onSelect,
  onCue,
  onPlayClip,
  onLoopClip,
  activeRundownTitle,
}: PlaylistTableProps) {
  // Filter out story breaks for numbering
  let clipNumber = 0;

  return (
    <div className="playlist-panel">
      <div className="playlist-header">
        <span className="playlist-title">
          {activeRundownTitle ? `PLAYLIST — ${activeRundownTitle}` : 'PLAYLIST'}
        </span>
        <span className="playlist-count">
          {clips.filter(c => !c.isStoryBreak).length} clips
        </span>
      </div>

      <div className="playlist-table-wrapper">
        <table className="playlist-table">
          <thead>
            <tr>
              <th className="col-num">#</th>
              <th className="col-status"></th>
              <th className="col-name">CLIP NAME</th>
              <th className="col-story">STORY</th>
              <th className="col-category">TYPE</th>
              <th className="col-duration">DURATION</th>
              <th className="col-actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {clips.length === 0 && (
              <tr className="playlist-empty-row">
                <td colSpan={7}>
                  <div className="playlist-empty-message">
                    Double-click a rundown in the sidebar to load clips
                  </div>
                </td>
              </tr>
            )}

            {clips.map((clip, index) => {
              if (clip.isStoryBreak) {
                return (
                  <tr key={`break-${index}`} className="story-break-row">
                    <td colSpan={7}>
                      <div className="story-break-line">
                        <span className="story-break-text">═══ {clip.storyTitle} ═══</span>
                      </div>
                    </td>
                  </tr>
                );
              }

              clipNumber++;
              const isSelected = index === selectedIndex;
              const isPlaying = index === playingIndex;

              let rowClass = 'playlist-row';
              if (isPlaying) rowClass += ' playing';
              else if (isSelected) rowClass += ' selected';
              if (clip.status === 'PLAYED') rowClass += ' played';

              return (
                <tr
                  key={clip.id}
                  className={rowClass}
                  onClick={() => onSelect(index)}
                >
                  <td className="col-num">{clipNumber}</td>
                  <td className="col-status">
                    {isPlaying && <span className="status-playing-dot" />}
                    {clip.status === 'PLAYED' && <span className="status-played-check">✓</span>}
                  </td>
                  <td className="col-name" title={clip.playoutName}>{clip.playoutName}</td>
                  <td className="col-story" title={clip.storyTitle}>{clip.storyTitle}</td>
                  <td className="col-category">
                    <span className={`category-badge cat-${clip.category.toLowerCase()}`}>
                      {clip.category}
                    </span>
                  </td>
                  <td className="col-duration">{clip.duration}</td>
                  <td className="col-actions">
                    <button
                      className="action-btn cue-btn"
                      onClick={(e) => { e.stopPropagation(); onCue(index); }}
                      title="Cue clip"
                    >
                      <Crosshair size={13} />
                    </button>
                    <button
                      className="action-btn play-btn"
                      onClick={(e) => { e.stopPropagation(); onPlayClip(index); }}
                      title="Play clip"
                    >
                      <Play size={13} />
                    </button>
                    <button
                      className="action-btn loop-btn"
                      onClick={(e) => { e.stopPropagation(); onLoopClip(index); }}
                      title="Loop clip"
                    >
                      <Repeat size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
