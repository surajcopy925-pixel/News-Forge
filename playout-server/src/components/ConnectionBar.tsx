import React from 'react';

interface Props {
  connected: boolean;
  host: string;
  onConnect: () => void;
  onDisconnect: () => void;
}

export default function ConnectionBar({ connected, host, onConnect, onDisconnect }: Props) {
  return (
    <div className="connection-bar">
      <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
      <span style={{ fontSize: 11, fontWeight: 600, color: connected ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {connected ? 'CONNECTED' : 'DISCONNECTED'}
      </span>
      <span className="host">{host}</span>
      <button
        className={`connect-btn ${connected ? 'disconnect' : 'connect'}`}
        onClick={connected ? onDisconnect : onConnect}
      >
        {connected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
