'use client';

import React, { useRef, useEffect, useState } from 'react';

interface VideoPreviewProps {
  fileUrl: string | null;
  proxyUrl?: string | null;
  thumbnailUrl?: string | null;
  className?: string;
}

export default function VideoPreview({
  fileUrl,
  proxyUrl,
  thumbnailUrl,
  className = '',
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useProxy, setUseProxy] = useState(true);
  const [error, setError] = useState(false);

  // Prefer proxy for preview, fall back to original
  const src = useProxy && proxyUrl ? proxyUrl : fileUrl;

  useEffect(() => {
    setError(false);
  }, [src]);

  if (!fileUrl && !proxyUrl) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 rounded text-gray-500 text-xs ${className}`}>
        No video available
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-800 rounded text-red-400 text-xs ${className}`}>
        Failed to load video
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src || undefined}
        poster={thumbnailUrl || undefined}
        controls
        className="w-full h-full rounded bg-black"
        onError={() => {
          // If proxy fails, fall back to original
          if (useProxy && proxyUrl && fileUrl) {
            setUseProxy(false);
          } else {
            setError(true);
          }
        }}
      />
      {/* Quality toggle */}
      {proxyUrl && fileUrl && (
        <button
          onClick={() => setUseProxy(!useProxy)}
          className="absolute top-1 right-1 px-1.5 py-0.5 text-[10px] bg-black/70 text-white rounded hover:bg-black/90"
          title={useProxy ? 'Switch to full quality' : 'Switch to proxy'}
        >
          {useProxy ? 'PROXY' : 'FULL'}
        </button>
      )}
    </div>
  );
}
