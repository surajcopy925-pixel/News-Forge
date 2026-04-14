'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Maximize, Volume2, VolumeX } from 'lucide-react';

interface VideoPreviewProps {
  fileUrl: string | null;
  fileName: string;
  duration?: string | null;
  thumbnailUrl?: string | null;
  className?: string;
}

export default function VideoPreview({ 
  fileUrl, 
  fileName, 
  duration,
  thumbnailUrl,
  className = '' 
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset state when URL changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    setIsLoaded(false);
  }, [fileUrl]);

  const togglePlay = () => {
    if (!videoRef.current || !fileUrl) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {
        setHasError(true);
      });
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setIsLoaded(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const time = parseFloat(e.target.value);
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // No URL — show placeholder
  if (!fileUrl) {
    return (
      <div className={`bg-black rounded-lg flex flex-col items-center justify-center ${className} relative overflow-hidden bg-[#050505]`}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
        <div className="text-gray-600 text-sm font-medium z-10 uppercase tracking-widest">No video available</div>
        <div className="text-gray-700 text-[10px] mt-1 font-mono z-10">{fileName}</div>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-lg overflow-hidden flex flex-col border border-white/5 ${className} shadow-2xl`}>
      {/* Video Element */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#050505]">
        <video
          ref={videoRef}
          src={fileUrl}
          muted={isMuted}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onError={() => setHasError(true)}
          className="max-w-full max-h-full object-contain"
          poster={thumbnailUrl || undefined}
          playsInline
        />

        {/* Play overlay — shown when paused */}
        {!isPlaying && !hasError && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition-all duration-300 group"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
              <Play size={28} className="text-white ml-1 filter drop-shadow-lg" fill="currentColor" />
            </div>
          </button>
        )}

        {/* Error state */}
        {hasError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0a]/95 backdrop-blur-sm">
            <div className="text-red-400 text-sm font-semibold tracking-wide flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              PREVIEW UNAVAILABLE
            </div>
            <div className="text-gray-500 text-[10px] mt-2 max-w-[200px] text-center leading-relaxed">
              Format may not be supported by your browser codec.
            </div>
            <div className="text-gray-600 text-[9px] mt-3 font-mono opacity-50 px-2 truncate w-full text-center">
              {fileName}
            </div>
          </div>
        )}

        {/* Status badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className={`flex items-center gap-2 px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10`}>
             <div className={`w-1.5 h-1.5 rounded-full ${isLoaded ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : hasError ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-yellow-500 h-animate-pulse'}`} />
             <span className={`text-[9px] font-bold tracking-tighter ${isLoaded ? 'text-green-400' : hasError ? 'text-red-400' : 'text-yellow-400'}`}>
               {isLoaded ? 'LIVE_STREAM_OK' : hasError ? 'CODEC_ERR' : 'SYNCING...'}
             </span>
          </div>
          {isLoaded && videoRef.current && (
             <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10">
               <span className="text-[9px] text-gray-400 font-bold tabular-nums tracking-tighter">
                 {videoRef.current.videoWidth}x{videoRef.current.videoHeight} • 1080P
               </span>
             </div>
          )}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="bg-[#050505] border-t border-white/5 px-4 py-3 flex flex-col gap-2.5">
        {/* Seek bar */}
        <div className="group relative h-4 flex items-center">
          <input
            type="range"
            min={0}
            max={videoDuration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer group-hover:h-1.5 transition-all
                       accent-white focus:outline-none"
          />
          <div 
            className="absolute h-1 bg-white/30 rounded-full pointer-events-none transition-all group-hover:h-1.5" 
            style={{ width: `${(currentTime / (videoDuration || 1)) * 100}%` }} 
          />
        </div>
        
        {/* Buttons row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button 
              onClick={togglePlay} 
              className="text-white hover:text-white/80 transition-all active:scale-95"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
            </button>
            
            {/* Mute */}
            <button 
              onClick={toggleMute} 
              className="text-gray-400 hover:text-white transition-all active:scale-95"
              aria-label={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            
            {/* Time */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/10 font-mono">
              <span className="text-[10px] text-white font-medium">{formatTime(currentTime)}</span>
              <span className="text-[10px] text-gray-600">/</span>
              <span className="text-[10px] text-gray-400">{formatTime(videoDuration)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Duration from metadata */}
            {duration && duration !== '00:00:00' && (
              <div className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20">
                <span className="text-[9px] text-amber-500 font-black tracking-widest uppercase">
                  META: {duration}
                 </span>
              </div>
            )}
            
            {/* Fullscreen */}
            <button 
              onClick={handleFullscreen} 
              className="text-gray-400 hover:text-white transition-all active:scale-95"
              aria-label="Fullscreen"
            >
              <Maximize size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
