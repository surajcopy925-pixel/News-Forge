import React from 'react';
import TimecodeDisplay from './TimecodeDisplay';
import TransportControls from './TransportControls';
import type { ChannelInfo } from '../types';

interface Props {
  label: string;
  info: ChannelInfo;
  loopEnabled: boolean;
  autoEnabled: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPauseResume: () => void;
  onNext: () => void;
  onClear: () => void;
  onToggleLoop: () => void;
  onToggleAuto: () => void;
}

export default function ChannelPanel({
  label, info, loopEnabled, autoEnabled,
  onPlay, onStop, onPauseResume, onNext, onClear,
  onToggleLoop, onToggleAuto,
}: Props) {
  const progress = info.totalFrames > 0
    ? (info.currentFrame / info.totalFrames) * 100
    : 0;

  return (
    <div className="channel-panel">
      <div className="channel-panel-title">{label}</div>
      <div className="channel-preview">No Image</div>
      <TimecodeDisplay timecode={info.timecode} playing={info.playing} paused={info.paused} />
      <div className={`channel-clip-name ${info.playing ? 'playing' : ''}`}>
        {info.clipName || 'No clip loaded'}
      </div>
      <div className="progress-bar-container">
        <div
          className={`progress-bar-fill ${info.paused ? 'paused' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <TransportControls
        playing={info.playing}
        paused={info.paused}
        loopEnabled={loopEnabled}
        autoEnabled={autoEnabled}
        onPlay={onPlay}
        onStop={onStop}
        onPauseResume={onPauseResume}
        onNext={onNext}
        onClear={onClear}
        onToggleLoop={onToggleLoop}
        onToggleAuto={onToggleAuto}
      />
    </div>
  );
}
