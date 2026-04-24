import React from 'react';
import { Play, Pause, Square, SkipForward, Trash2 } from 'lucide-react';

interface Props {
  playing: boolean;
  paused: boolean;
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

export default function TransportControls({
  playing, paused, loopEnabled, autoEnabled,
  onPlay, onStop, onPauseResume, onNext, onClear,
  onToggleLoop, onToggleAuto,
}: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div className="transport-controls">
        <button className="transport-btn play" onClick={onPlay} title="Play">
          <Play size={16} fill="currentColor" />
        </button>
        <button className={`transport-btn pause ${paused ? 'active' : ''}`} onClick={onPauseResume} title={paused ? 'Resume' : 'Pause'}>
          <Pause size={16} />
        </button>
        <button className="transport-btn stop" onClick={onStop} title="Stop">
          <Square size={14} fill="currentColor" />
        </button>
        <button className="transport-btn" onClick={onNext} title="Next">
          <SkipForward size={16} />
        </button>
        <button className="transport-btn" onClick={onClear} title="Clear">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="toggle-row">
        <button className={`toggle-btn ${loopEnabled ? 'on' : 'off'}`} onClick={onToggleLoop}>
          LOOP {loopEnabled ? 'ON' : 'OFF'}
        </button>
        <button className={`toggle-btn ${autoEnabled ? 'on' : 'off'}`} onClick={onToggleAuto}>
          AUTO {autoEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
