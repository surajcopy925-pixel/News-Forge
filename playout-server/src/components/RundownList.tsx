import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import type { RundownSummary, RundownListResponse } from '../types';

interface RundownListProps {
  onSelectRundown: (rundownId: string) => void;
  activeRundownId: string | null;
}

export default function RundownList({ onSelectRundown, activeRundownId }: RundownListProps) {
  const [rundowns, setRundowns] = useState<RundownSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRundowns = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/rundowns/live');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: RundownListResponse = await res.json();
      setRundowns(data.rundowns || []);
    } catch (err: any) {
      console.error('[RundownList] Fetch error:', err);
      setError(err.message || 'Failed to load');
      setRundowns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRundowns();
    const interval = setInterval(fetchRundowns, 10000);
    return () => clearInterval(interval);
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'LIVE': return 'rundown-status-live';
      case 'PLANNING': return 'rundown-status-planning';
      case 'COMPLETED': return 'rundown-status-completed';
      default: return 'rundown-status-default';
    }
  };

  return (
    <div className="rundown-list-panel">
      <div className="rundown-list-header">
        <span className="rundown-list-title">RUNDOWNS</span>
        <button className="rundown-refresh-btn" onClick={fetchRundowns} title="Refresh">
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div className="rundown-list-body">
        {loading && rundowns.length === 0 && (
          <div className="rundown-list-loading">Loading...</div>
        )}

        {error && (
          <div className="rundown-list-error">
            <span>⚠ {error}</span>
            <button onClick={fetchRundowns} className="rundown-retry-btn">Retry</button>
          </div>
        )}

        {!loading && !error && rundowns.length === 0 && (
          <div className="rundown-list-empty">No rundowns found</div>
        )}

        {rundowns.map((r) => (
          <div
            key={r.rundownId}
            className={`rundown-list-item ${activeRundownId === r.rundownId ? 'active' : ''}`}
            onDoubleClick={() => onSelectRundown(r.rundownId)}
            title={`Double-click to load: ${r.title}`}
          >
            <div className="rundown-item-top">
              <span className={`rundown-status-badge ${getStatusClass(r.status)}`}>
                {r.status}
              </span>
              <span className="rundown-item-time">{r.broadcastTime}</span>
            </div>
            <div className="rundown-item-title">{r.title}</div>
            <div className="rundown-item-meta">
              <span>{r.date}</span>
              <span>{r.entryCount} stories</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
