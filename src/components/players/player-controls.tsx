'use client';

import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  SkipBack, 
  SkipForward,
  ClosedCaption,
  Upload
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface PlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  playbackRate: number;
  showCaptions: boolean;
  isLoading?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (time: number, showIndicator?: boolean, amount?: number) => void;
  onVolumeChange: (volume: number) => void;
  onMute: () => void;
  onFullscreen: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onCaptionsToggle: () => void;
  onSubtitleUpload?: (file: File) => void;
  className?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  playbackRate,
  showCaptions,
  isLoading = false,
  onPlay,
  onPause,
  onSeek,
  onVolumeChange,
  onMute,
  onFullscreen,
  onPlaybackRateChange,
  onCaptionsToggle,
  onSubtitleUpload,
  className
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [isDraggingVolume, setIsDraggingVolume] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: React.MouseEvent) => {
    if (!progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const handleProgressMouseMove = (e: React.MouseEvent) => {
    if (!progressRef.current || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, hoverX / rect.width));
    const time = percentage * duration;
    
    setHoverTime(time);
    setHoverPosition(percentage * 100);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const handleVolumeChange = (e: React.MouseEvent) => {
    if (!volumeRef.current) return;
    
    const rect = volumeRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const percentage = 1 - (clickY / rect.height);
    const newVolume = Math.max(0, Math.min(1, percentage));
    
    onVolumeChange(newVolume);
  };

  const handleVolumeMouseDown = (e: React.MouseEvent) => {
    setIsDraggingVolume(true);
    handleVolumeChange(e);
  };

  const handleVolumeMouseMove = (e: React.MouseEvent) => {
    if (isDraggingVolume) {
      handleVolumeChange(e);
    }
  };

  const handleVolumeMouseUp = () => {
    setIsDraggingVolume(false);
  };

  const handleSkipBack = () => {
    const newTime = Math.max(0, currentTime - 10);
    onSeek(newTime, true, -10);
  };

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    onSeek(newTime, true, 10);
  };

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onSubtitleUpload) {
      onSubtitleUpload(file);
    }
  };

  return (
    <React.Fragment>
      {/* Progress Bar - Positioned above controls */}
      <div className="absolute left-0 right-0 bottom-12 px-4 py-2">
        <div
          ref={progressRef}
          className="h-0.5 bg-white/15 rounded-full cursor-pointer group hover:h-1 transition-all duration-200 overflow-hidden"
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
        >
          {/* Progress Fill */}
          <div
            className="h-full bg-gradient-to-r from-white via-white/90 to-white/80 rounded-full relative transition-all duration-100 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          >
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
          </div>
          
          {/* Hover Preview */}
          {hoverTime !== null && duration > 0 && (
            <div
              className="absolute top-0 transform -translate-y-full -translate-x-1/2 bg-black/95 backdrop-blur-md text-white text-xs px-2 py-1.5 rounded-md pointer-events-none whitespace-nowrap shadow-xl border border-white/10"
              style={{ left: `${Math.max(0, Math.min(100, hoverPosition))}%` }}
            >
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      </div>

      {/* Controls - Positioned at bottom */}
      <div className={cn(
        "absolute left-0 right-0 bottom-0",
        "transition-all duration-300 ease-in-out",
        className
      )}>
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Controls */}
          <div className="flex items-center space-x-2">
            {/* Skip Back */}
            <button
              onClick={handleSkipBack}
              className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg group"
              aria-label="Skip back 10 seconds"
            >
              <SkipBack size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
            </button>

            {/* Play/Pause */}
            <button
              onClick={isPlaying ? onPause : onPlay}
              disabled={isLoading}
              className="text-white hover:text-white transition-all duration-200 p-2.5 hover:bg-white/5 rounded-lg disabled:opacity-50 group"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <div className="w-5 h-5 border border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              ) : (
                <Play size={20} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              onClick={handleSkipForward}
              className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg group"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
            </button>

            {/* Time Display */}
            <div className="text-white/90 text-sm font-mono ml-2">
              {formatTime(currentTime)} / {duration > 0 ? formatTime(duration) : '--:--'}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Volume Control */}
            <div className="relative group/volume">
              {/* Extended hover area */}
              <div className="absolute -inset-2 -top-24"></div>
              
              <button
                onClick={onMute}
                className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? 
                  <VolumeX size={18} strokeWidth={1.5} className="hover:scale-110 transition-transform duration-200" /> : 
                  <Volume2 size={18} strokeWidth={1.5} className="hover:scale-110 transition-transform duration-200" />
                }
              </button>

            {/* Volume Slider - Only appears on hover */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-black/95 backdrop-blur-md px-4 py-4 rounded-xl opacity-0 invisible group-hover/volume:opacity-100 group-hover/volume:visible transition-all duration-200 pointer-events-none group-hover/volume:pointer-events-auto shadow-2xl border border-white/10">
              <div className="flex justify-center">
                <div
                  ref={volumeRef}
                  className="w-1 h-20 bg-white/15 rounded-full cursor-pointer relative overflow-hidden group/slider"
                  onMouseDown={handleVolumeMouseDown}
                  onMouseMove={handleVolumeMouseMove}
                  onMouseUp={handleVolumeMouseUp}
                  onMouseLeave={handleVolumeMouseUp}
                >
                {/* Volume fill with gradient */}
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-white via-white/90 to-white/80 rounded-full transition-all duration-200 ease-out"
                  style={{ height: `${volume * 100}%` }}
                />
                {/* Hover glow effect */}
                <div
                  className="absolute bottom-0 w-full bg-white/20 rounded-full opacity-0 group-hover/slider:opacity-100 transition-opacity duration-200"
                  style={{ height: `${volume * 100}%` }}
                />
                {/* Volume thumb */}
                <div
                  className="absolute w-3 h-3 bg-white rounded-full shadow-lg transition-all duration-200 ease-out opacity-0 group-hover/slider:opacity-100 border border-white/20"
                  style={{ 
                    bottom: `calc(${volume * 100}% - 6px)`, 
                    left: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)'
                  }}
                />
                </div>
              </div>
              {/* Volume percentage */}
              <div className="text-white/80 text-xs text-center mt-3 font-medium tabular-nums">
                {Math.round(volume * 100)}
              </div>
            </div>
          </div>

            {/* Settings Menu */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg group"
                aria-label="Settings"
              >
                <Settings size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute bottom-full right-0 mb-3 bg-black/95 backdrop-blur-md rounded-xl p-4 min-w-56 shadow-2xl border border-white/10 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
                {/* Playback Speed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/90 text-sm font-medium">Speed</span>
                    <span className="text-white/60 text-xs">{playbackRate}x</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    {playbackRates.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => onPlaybackRateChange(rate)}
                        className={cn(
                          "flex-1 text-xs py-2 px-3 rounded-lg transition-all duration-200 font-medium",
                          playbackRate === rate
                            ? "bg-white text-black shadow-lg scale-105"
                            : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white hover:scale-105"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-white/10 my-4"></div>

                {/* Captions */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white/90 text-sm font-medium">Captions</span>
                    <span className="text-white/60 text-xs">{showCaptions ? 'On' : 'Off'}</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      onClick={onCaptionsToggle}
                      className={cn(
                        "flex items-center justify-between w-full text-left text-sm py-2 px-3 rounded-lg transition-all duration-200 group",
                        showCaptions 
                          ? "bg-white/10 text-white hover:bg-white/20" 
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <div className="flex items-center space-x-3">
                        <ClosedCaption size={16} strokeWidth={1.5} />
                        <span>Toggle Captions</span>
                      </div>
                      <div className={cn(
                        "w-8 h-4 rounded-full transition-all duration-200 relative",
                        showCaptions ? "bg-white" : "bg-white/20"
                      )}>
                        <div className={cn(
                          "w-3 h-3 rounded-full bg-black absolute top-0.5 transition-all duration-200",
                          showCaptions ? "left-4" : "left-0.5"
                        )} />
                      </div>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center space-x-3 w-full text-left text-sm text-white/70 hover:text-white py-2 px-3 hover:bg-white/10 rounded-lg transition-all duration-200 group"
                    >
                      <Upload size={16} strokeWidth={1.5} />
                      <span>Upload Subtitles</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Hidden file input for subtitle upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,.ass"
            onChange={handleSubtitleUpload}
            className="hidden"
          />

            {/* Fullscreen Toggle */}
            <button
              onClick={onFullscreen}
              className="text-white/80 hover:text-white transition-all duration-200 p-2 hover:bg-white/5 rounded-lg group"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? 
                <Minimize size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" /> : 
                <Maximize size={18} strokeWidth={1.5} className="group-hover:scale-110 transition-transform duration-200" />
              }
            </button>
          </div>
        </div>
        </div>
      </div>
    </React.Fragment>
  );
};