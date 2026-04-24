// src/components/CasparIndicator.tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

export default function CasparIndicator({ rundownId }: { rundownId?: string | null }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const pathname = usePathname();

  // Only show on output page
  if (pathname !== '/output') return null;

  const handleCasClick = async () => {
    setStatus('copying');
    setMessage('Copying files to CasparCG...');

    try {
      const res = await fetch('/api/caspar/prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty = copy ALL clips
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus('error');
        setMessage(data.error || `Server error: ${res.status}`);
        setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
        return;
      }

      if (data.success) {
        setStatus('done');
        setMessage(`✅ ${data.message}`);
        if (data.errors?.length > 0) {
          setMessage(`✅ Copied ${data.copied}/${data.total} (${data.errors.length} errors)`);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('error');
      setMessage(`Network error: ${err}`);
    }

    setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCasClick}
        disabled={status === 'copying'}
        className={`
          px-3 py-1 text-xs font-mono font-bold rounded transition-all
          ${status === 'idle'
            ? 'bg-purple-900/50 hover:bg-purple-800/60 text-purple-300 border border-purple-700/50'
            : status === 'copying'
            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 animate-pulse'
            : status === 'done'
            ? 'bg-green-900/50 text-green-300 border border-green-700/50'
            : 'bg-red-900/50 text-red-300 border border-red-700/50'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
        title="Copy video files to CasparCG media folder"
      >
        {status === 'copying' ? 'CAS...' : 'CAS'}
      </button>
      {message && (
        <span className={`text-[10px] font-mono max-w-[300px] truncate ${
          status === 'done' ? 'text-green-400'
          : status === 'error' ? 'text-red-400'
          : 'text-yellow-400'
        }`}>
          {message}
        </span>
      )}
    </div>
  );
}
