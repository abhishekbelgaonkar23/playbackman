'use client';

import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { Volume2, VolumeX, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { PlayerControls } from './player-controls';
import { MobileControls } from './mobile-controls';
import { useMobileDetection } from '../../hooks/use-mobile-detection';
import { cn } from '../../lib/utils';

interface EnhancedVideoPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error: string) => void;
}

export const EnhancedVideoPlayer = React.forwardRef<any, EnhancedVideoPlayerProps>(({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted = false,
  className,
  onLoadStart,
  onLoadEnd,
  onError
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showCaptions, setShowCaptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [volumeIndicatorTimeout, setVolumeIndicatorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showSeekIndicator, setShowSeekIndicator] = useState(false);
  const [seekIndicatorTimeout, setSeekIndicatorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [seekAmount, setSeekAmount] = useState(0);
  const [showSpeedIndicator, setShowSpeedIndicator] = useState(false);
  const [speedIndicatorTimeout, setSpeedIndicatorTimeout] = useState<NodeJS.Timeout | null>(null);

  const { isMobile } = useMobileDetection();

  // Auto-hide controls
  useEffect(() => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }

    if (showControls && isPlaying) {
      const timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
      setControlsTimeout(timeout);
    }

    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      if (volumeIndicatorTimeout) {
        clearTimeout(volumeIndicatorTimeout);
      }
      if (seekIndicatorTimeout) {
        clearTimeout(seekIndicatorTimeout);
      }
    };
  }, [showControls, isPlaying]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(isNaN(time) || !isFinite(time) ? 0 : time);
    };
    const handleDurationChange = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };
    const handleLoadedMetadata = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      onLoadStart?.();
    };

    const handleError = () => {
      setIsLoading(false);
      onError?.('Failed to load video');
    };
    const handleRateChange = () => setPlaybackRate(video.playbackRate);
    const handleCanPlay = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };
    
    const handleLoadedData = () => {
      setIsLoading(false);
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
      onLoadEnd?.();
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('canplaythrough', handleCanPlay);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('ratechange', handleRateChange);

    // Force duration check after a short delay
    const checkDuration = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
    };
    const durationTimer = setTimeout(checkDuration, 100);
    const durationInterval = setInterval(checkDuration, 500);
    
    // Clear timers after 5 seconds
    setTimeout(() => {
      clearInterval(durationInterval);
    }, 5000);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('canplaythrough', handleCanPlay);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ratechange', handleRateChange);
      clearTimeout(durationTimer);
      clearInterval(durationInterval);
    };
  }, [onLoadStart, onLoadEnd, onError]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Control handlers
  const handlePlay = () => {
    videoRef.current?.play();
  };

  const handlePause = () => {
    videoRef.current?.pause();
  };

  const handleSeek = (time: number, showIndicator = false, amount = 0) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      
      // Show seek indicator for keyboard/button controls
      if (showIndicator) {
        setSeekAmount(amount);
        setShowSeekIndicator(true);
        if (seekIndicatorTimeout) {
          clearTimeout(seekIndicatorTimeout);
        }
        const timeout = setTimeout(() => {
          setShowSeekIndicator(false);
        }, 1000);
        setSeekIndicatorTimeout(timeout);
      }
    }
  };

  const handleVolumeChange = (newVolume: number, showIndicator = false) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        videoRef.current.muted = false;
      }
      
      // Show volume indicator for keyboard controls
      if (showIndicator) {
        setShowVolumeIndicator(true);
        if (volumeIndicatorTimeout) {
          clearTimeout(volumeIndicatorTimeout);
        }
        const timeout = setTimeout(() => {
          setShowVolumeIndicator(false);
        }, 1500);
        setVolumeIndicatorTimeout(timeout);
      }
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      const newMutedState = !videoRef.current.muted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
      
      // Show volume indicator
      setShowVolumeIndicator(true);
      if (volumeIndicatorTimeout) {
        clearTimeout(volumeIndicatorTimeout);
      }
      const timeout = setTimeout(() => {
        setShowVolumeIndicator(false);
      }, 1500);
      setVolumeIndicatorTimeout(timeout);
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const handlePlaybackRateChange = (rate: number, showIndicator = false) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
      
      if (showIndicator) {
        setShowSpeedIndicator(true);
        
        if (speedIndicatorTimeout) {
          clearTimeout(speedIndicatorTimeout);
        }
        const timeout = setTimeout(() => {
          setShowSpeedIndicator(false);
        }, 1500);
        setSpeedIndicatorTimeout(timeout);
      }
    }
  };

  const handleCaptionsToggle = () => {
    setShowCaptions(!showCaptions);
    // Toggle text tracks if available
    if (videoRef.current?.textTracks.length) {
      const track = videoRef.current.textTracks[0];
      if (track) {
        track.mode = showCaptions ? 'hidden' : 'showing';
      }
    }
  };

  const handleSubtitleUpload = (file: File) => {
    // Create a URL for the subtitle file and add it as a track
    const url = URL.createObjectURL(file);
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = url;
    track.srclang = 'en';
    track.label = 'Uploaded Subtitles';
    track.default = true;
    
    videoRef.current?.appendChild(track);
  };

  const handleControlsToggle = () => {
    setShowControls(!showControls);
  };

  const handleMouseMove = () => {
    setShowControls(true);
  };

  const handleVideoClick = () => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  // Expose player methods through ref
  useImperativeHandle(ref, () => ({
    get isPlaying() {
      return isPlaying;
    },
    get currentTime() {
      return currentTime;
    },
    get duration() {
      return duration;
    },
    get volume() {
      return volume;
    },
    get playbackRate() {
      return playbackRate;
    },
    play: handlePlay,
    pause: handlePause,
    seek: handleSeek,
    setVolume: (vol: number) => handleVolumeChange(vol, true),
    toggleMute: handleMute,
    toggleFullscreen: handleFullscreen,
    toggleCaptions: handleCaptionsToggle,
    setPlaybackRate: (rate: number) => handlePlaybackRateChange(rate, true)
  }), [isPlaying, currentTime, duration, volume, playbackRate]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black rounded-lg overflow-hidden group",
        isFullscreen && "!fixed !inset-0 !rounded-none z-50",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => !isMobile && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        className="w-full h-full object-contain cursor-pointer"
        playsInline
        onClick={handleVideoClick}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Volume Indicator - Top Center */}
      {showVolumeIndicator && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-6 pointer-events-none z-10">
          <div className="bg-black/95 backdrop-blur-md rounded-xl px-4 py-3 flex items-center space-x-3 shadow-2xl border border-white/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="text-white/90">
              {isMuted || volume === 0 ? <VolumeX size={18} strokeWidth={1.5} /> : <Volume2 size={18} strokeWidth={1.5} />}
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-16 h-0.5 bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-200"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
              <div className="text-white/90 text-xs font-medium tabular-nums min-w-[2ch]">
                {Math.round(volume * 100)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Seek Indicator - Top Center */}
      {showSeekIndicator && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-6 pointer-events-none z-10">
          <div className="bg-black/95 backdrop-blur-md rounded-xl px-4 py-3 flex items-center space-x-3 shadow-2xl border border-white/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="text-white/90">
              {seekAmount < 0 ? <SkipBack size={18} strokeWidth={1.5} /> : <SkipForward size={18} strokeWidth={1.5} />}
            </div>
            <div className="text-white/90 text-sm font-medium">
              {seekAmount > 0 ? '+' : ''}{seekAmount}s
            </div>
          </div>
        </div>
      )}

      {/* Speed Indicator - Top Center */}
      {showSpeedIndicator && (
        <div className="absolute top-0 left-0 right-0 flex justify-center pt-6 pointer-events-none z-10">
          <div className="bg-black/95 backdrop-blur-md rounded-xl px-4 py-3 flex items-center space-x-3 shadow-2xl border border-white/10 animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <div className="text-white/90">
              <Gauge size={18} strokeWidth={1.5} />
            </div>
            <div className="text-white/90 text-sm font-medium">
              {playbackRate}x
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      {isMobile ? (
        <MobileControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          isLoading={isLoading}
          showControls={showControls}
          onPlay={handlePlay}
          onPause={handlePause}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onMute={handleMute}
          onFullscreen={handleFullscreen}
          onControlsToggle={handleControlsToggle}
        />
      ) : (
        <div className={cn(
          "transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}>
          <PlayerControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            isFullscreen={isFullscreen}
            playbackRate={playbackRate}
            showCaptions={showCaptions}
            isLoading={isLoading}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onMute={handleMute}
            onFullscreen={handleFullscreen}
            onPlaybackRateChange={handlePlaybackRateChange}
            onCaptionsToggle={handleCaptionsToggle}
            onSubtitleUpload={handleSubtitleUpload}
          />
        </div>
      )}
    </div>
  );
});

EnhancedVideoPlayer.displayName = 'EnhancedVideoPlayer';