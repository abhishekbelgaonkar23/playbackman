'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MobileControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isLoading?: boolean;
  showControls: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number, showIndicator?: boolean, amount?: number) => void;
  onVolumeChange: (volume: number) => void;
  onMute: () => void;
  onFullscreen: () => void;
  onControlsToggle: () => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const MobileControls: React.FC<MobileControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  isLoading = false,
  showControls,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMute,
  onFullscreen,
  onControlsToggle,
  className
}) => {
  const [lastTap, setLastTap] = useState(0);
  const [tapSide, setTapSide] = useState<'left' | 'right' | null>(null);
  const [showTapFeedback, setShowTapFeedback] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Handle double tap for skip
  const handleTap = (e: React.TouchEvent, side: 'left' | 'right') => {
    const now = Date.now();
    const timeDiff = now - lastTap;

    if (timeDiff < 300 && timeDiff > 0) {
      // Double tap detected
      if (side === 'left') {
        onSeek(Math.max(0, currentTime - 10), true, -10);
      } else {
        onSeek(Math.min(duration, currentTime + 10), true, 10);
      }
      
      setTapSide(side);
      setShowTapFeedback(true);
      setTimeout(() => setShowTapFeedback(false), 1000);
    } else {
      // Single tap - toggle controls
      onControlsToggle();
    }
    
    setLastTap(now);
  };

  // Handle swipe gestures
  const handleTouchStart = useRef({ x: 0, y: 0, time: 0 });
  
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      handleTouchStart.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      };
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const deltaX = touch.clientX - handleTouchStart.current.x;
    const deltaY = touch.clientY - handleTouchStart.current.y;
    const deltaTime = Date.now() - handleTouchStart.current.time;

    // Only process swipes (not taps)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaY) < 100 && deltaTime < 500) {
      const swipeDistance = Math.abs(deltaX);
      const seekAmount = Math.min(30, Math.max(5, swipeDistance / 10));
      
      if (deltaX > 0) {
        // Swipe right - seek forward
        onSeek(Math.min(duration, currentTime + seekAmount));
      } else {
        // Swipe left - seek backward
        onSeek(Math.max(0, currentTime - seekAmount));
      }
    }
  };

  const handleProgressTouch = (e: React.TouchEvent) => {
    if (!progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    
    const touchX = touch.clientX - rect.left;
    const percentage = touchX / rect.width;
    const newTime = percentage * duration;
    
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "absolute inset-0 flex flex-col",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Tap Areas for Double Tap Skip */}
      <div className="flex-1 flex">
        {/* Left Tap Area */}
        <div 
          className="flex-1 flex items-center justify-center"
          onTouchEnd={(e) => {
            e.stopPropagation();
            handleTap(e, 'left');
          }}
        >
          {showTapFeedback && tapSide === 'left' && (
            <div className="bg-black/60 rounded-full p-4 animate-pulse">
              <SkipBack size={32} className="text-white" />
              <div className="text-white text-sm text-center mt-1">-10s</div>
            </div>
          )}
        </div>

        {/* Center Play/Pause Area */}
        <div className="flex-1 flex items-center justify-center">
          {!showControls && (
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="bg-black/80 backdrop-blur-sm rounded-full p-5 text-white hover:bg-black/90 transition-all duration-200 disabled:opacity-50 border border-white/10 group"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-6 h-6 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={28} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Play size={28} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              )}
            </button>
          )}
        </div>

        {/* Right Tap Area */}
        <div 
          className="flex-1 flex items-center justify-center"
          onTouchEnd={(e) => {
            e.stopPropagation();
            handleTap(e, 'right');
          }}
        >
          {showTapFeedback && tapSide === 'right' && (
            <div className="bg-black/60 rounded-full p-4 animate-pulse">
              <SkipForward size={32} className="text-white" />
              <div className="text-white text-sm text-center mt-1">+10s</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls Drawer */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 translate-y-2",
        "bg-black/80 backdrop-blur-sm transition-transform duration-300 ease-in-out",
        showControls ? "translate-y-2" : "translate-y-full"
      )}>
        {/* Progress Bar - Positioned for letterbox area */}
        <div className="px-4 pt-4 pb-2">
          <div
            ref={progressRef}
            className="h-1.5 bg-white/15 rounded-full cursor-pointer relative overflow-hidden"
            onTouchMove={handleProgressTouch}
            onTouchStart={handleProgressTouch}
          >
            <div
              className="h-full bg-gradient-to-r from-white via-white/90 to-white/80 rounded-full relative"
              style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            >
            </div>
          </div>
          
          {/* Time Display */}
          <div className="flex justify-between text-white text-sm mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between p-4">
          {/* Left Side */}
          <div className="flex items-center space-x-3">
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="text-white/90 hover:text-white p-2.5 disabled:opacity-50 hover:bg-white/5 rounded-lg transition-all duration-200 group"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-5 h-5 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Play size={24} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              )}
            </button>

            <button
              onClick={onMute}
              className="text-white/80 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all duration-200 group"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? 
                <VolumeX size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" /> : 
                <Volume2 size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              }
            </button>
          </div>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onFullscreen}
              className="text-white/80 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all duration-200 group"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? 
                <Minimize size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" /> : 
                <Maximize size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};