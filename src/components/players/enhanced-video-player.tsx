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
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
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
  onError,
  onPreviousVideo,
  onNextVideo
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
  const [canPlay, setCanPlay] = useState(false);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

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

  // Video source validation
  useEffect(() => {
    if (src && videoRef.current) {
      // Reset states when source changes
      setIsLoading(true);
      setCanPlay(false);
      
      // Check if the source is a valid URL
      try {
        new URL(src);
      } catch {
        // If not a valid URL, check if it's a blob URL or data URL
        if (!src.startsWith('blob:') && !src.startsWith('data:')) {
          onError?.('Invalid video source URL');
          setIsLoading(false);
          return;
        }
      }
    }
  }, [src, onError]);

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
    const handlePlay = () => {
      setIsPlaying(true);
      setAutoplayFailed(false);
    };
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleLoadStart = () => {
      setIsLoading(true);
      onLoadStart?.();
    };

    const handleError = (event: Event) => {
      setIsLoading(false);
      
      const video = event.target as HTMLVideoElement;
      const error = video.error;
      
      let errorMessage = 'Failed to load video';
      
      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error occurred while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format is corrupted or not supported';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported by your browser';
            break;
          default:
            errorMessage = error.message || 'Unknown video error occurred';
        }
      }
      
      onError?.(errorMessage);
    };
    const handleRateChange = () => setPlaybackRate(video.playbackRate);
    const handleCanPlay = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && !isNaN(dur) && dur > 0) {
        setDuration(dur);
      }
      setIsLoading(false);
      setCanPlay(true);
      
      // Auto-play when ready if autoPlay is enabled
      if (autoPlay && video.paused) {
        video.play().catch((error) => {
          console.warn('Autoplay failed:', error);
          setAutoplayFailed(true);
        });
      }
    };

    const handleWaiting = () => {
      // Only show loading for actual buffering, not seeking
      if (video && !video.seeking) {
        setIsLoading(true);
      }
    };

    const handleCanPlayThrough = () => {
      setIsLoading(false);
    };

    const handleProgress = () => {
      // Hide loading when video has buffered enough
      if (video && video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const currentTime = video.currentTime;
        if (bufferedEnd > currentTime + 2) { // 2 seconds ahead buffered
          setIsLoading(false);
        }
      }
    };

    const handleSeeking = () => {
      // Don't show loading spinner for seeking, it's handled by seeked event
    };

    const handleSeeked = () => {
      setIsLoading(false);
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
    video.addEventListener('canplaythrough', handleCanPlayThrough);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('ratechange', handleRateChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('seeking', handleSeeking);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('progress', handleProgress);

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
      video.removeEventListener('canplaythrough', handleCanPlayThrough);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('ratechange', handleRateChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('seeking', handleSeeking);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('progress', handleProgress);
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
  const handlePlay = async () => {
    if (!videoRef.current) return;
    
    // Check if video source is valid
    if (!src || src.trim() === '') {
      onError?.('No video source provided');
      return;
    }
    
    // Check if video can be played
    if (!canPlay) {
      onError?.('Video is not ready to play yet');
      return;
    }
    
    try {
      await videoRef.current.play();
    } catch (error) {
      console.error('Play failed:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        let errorMessage = 'Failed to play video';
        
        if (error.name === 'NotSupportedError') {
          errorMessage = 'Video format not supported by your browser';
        } else if (error.name === 'NotAllowedError') {
          errorMessage = 'Playback blocked by browser policy';
        } else if (error.name === 'AbortError') {
          errorMessage = 'Playback was aborted';
        }
        
        onError?.(errorMessage);
      }
    }
  };

  const handlePause = () => {
    videoRef.current?.pause();
  };

  const handleSeek = (time: number, showIndicator = false, amount = 0) => {
    if (videoRef.current && duration > 0 && isFinite(duration) && isFinite(time)) {
      const seekTime = Math.max(0, Math.min(duration, time));
      
      try {
        // Set the current time directly
        videoRef.current.currentTime = seekTime;
      } catch (error) {
        console.warn('Seek failed:', error);
      }
      
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
    if (!canPlay) return;
    
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
        src={src || undefined}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        preload="metadata"
        className={cn(
          "w-full h-full object-contain",
          canPlay ? "cursor-pointer" : "cursor-not-allowed"
        )}
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

      {/* Error overlay for unsupported video */}
      {!canPlay && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="text-center text-white p-6 max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Video Cannot Be Played</h3>
            <p className="text-sm text-white/80">
              This video format may not be supported by your browser, or the file may be corrupted.
            </p>
          </div>
        </div>
      )}

      {/* Click to play overlay when autoplay fails */}
      {canPlay && autoplayFailed && !isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm cursor-pointer transition-opacity hover:bg-black/70"
          onClick={handleVideoClick}
        >
          <div className="text-center text-white">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </div>
            <p className="text-lg font-medium mb-1">Click to Play</p>
            <p className="text-sm text-gray-300">Autoplay was blocked by your browser</p>
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
          onPlay={canPlay ? handlePlay : () => {}}
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
            onPlay={canPlay ? handlePlay : () => {}}
            onPause={handlePause}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onMute={handleMute}
            onFullscreen={handleFullscreen}
            onPlaybackRateChange={handlePlaybackRateChange}
            onCaptionsToggle={handleCaptionsToggle}
            onSubtitleUpload={handleSubtitleUpload}
            onPreviousVideo={onPreviousVideo}
            onNextVideo={onNextVideo}
          />
        </div>
      )}
    </div>
  );
});

EnhancedVideoPlayer.displayName = 'EnhancedVideoPlayer';