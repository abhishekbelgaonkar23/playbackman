"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { EnhancedVideoPlayer } from './enhanced-video-player';
import type { Player } from '~/types';
import type { VideoJSOptions } from '~/types/player-config';

interface VideoJSPlayerProps {
  file: File;
  fileUrl: string;
  options: VideoJSOptions;
  onReady: (player: Player) => void;
  onError: (error: string, canRetry?: boolean) => void;
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
}

// Video.js player wrapper class
class VideoJSPlayerWrapper implements Player {
  private videoJSInstance: any;
  private isDestroyed = false;

  constructor(videoJSInstance: any) {
    this.videoJSInstance = videoJSInstance;
  }

  // Basic playback controls
  play(): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.play();
    }
  }

  pause(): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.pause();
    }
  }

  destroy(): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      try {
        this.videoJSInstance.dispose();
      } catch (error) {
        console.warn('Error disposing Video.js instance:', error);
      }
      this.videoJSInstance = null;
      this.isDestroyed = true;
    }
  }

  on(event: string, callback: Function): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.on(event, callback);
    }
  }

  // Time controls
  get currentTime(): number {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.currentTime() : 0;
  }

  set currentTime(time: number) {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.currentTime(time);
    }
  }

  get duration(): number {
    if (!this.isDestroyed && this.videoJSInstance) {
      const dur = this.videoJSInstance.duration();
      return (isNaN(dur) || !isFinite(dur)) ? 0 : dur;
    }
    return 0;
  }

  // Audio controls
  get volume(): number {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.volume() : 0;
  }

  set volume(vol: number) {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.volume(Math.max(0, Math.min(1, vol)));
    }
  }

  get muted(): boolean {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.muted() : false;
  }

  set muted(mute: boolean) {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.muted(mute);
    }
  }

  // Playback state
  get paused(): boolean {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.paused() : true;
  }

  get ended(): boolean {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.ended() : false;
  }

  // Additional control methods
  seek(time: number): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      const duration = this.duration;
      const seekTime = Math.max(0, Math.min(duration, time));
      this.videoJSInstance.currentTime(seekTime);
    }
  }

  setVolume(volume: number): void {
    this.volume = volume;
  }

  toggleMute(): void {
    this.muted = !this.muted;
  }

  togglePlayPause(): void {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }

  // Fullscreen controls
  requestFullscreen(): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      try {
        this.videoJSInstance.requestFullscreen();
      } catch (error) {
        console.warn('Error requesting fullscreen:', error);
      }
    }
  }

  exitFullscreen(): void {
    if (!this.isDestroyed && this.videoJSInstance) {
      try {
        this.videoJSInstance.exitFullscreen();
      } catch (error) {
        console.warn('Error exiting fullscreen:', error);
      }
    }
  }

  get isFullscreen(): boolean {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.isFullscreen() : false;
  }
}

const VideoJSPlayer = React.forwardRef<any, VideoJSPlayerProps>(({
  file,
  fileUrl,
  options,
  onReady,
  onError,
  onPreviousVideo,
  onNextVideo
}, ref) => {
  const playerRef = useRef<VideoJSPlayerWrapper | null>(null);
  const enhancedPlayerRef = useRef<any>(null);
  const hasInitialized = useRef(false);

  // Create a player wrapper that connects to the enhanced video player
  const createPlayerWrapper = useCallback(() => {
    if (hasInitialized.current) return;
    
    hasInitialized.current = true;
    
    // Create a wrapper that delegates to the enhanced video player
    const playerWrapper: Player = {
      play: () => enhancedPlayerRef.current?.play(),
      pause: () => enhancedPlayerRef.current?.pause(),
      destroy: () => {
        hasInitialized.current = false;
        playerRef.current = null;
      },
      on: () => {},
      get currentTime() { return enhancedPlayerRef.current?.currentTime || 0; },
      get duration() { return enhancedPlayerRef.current?.duration || 0; },
      get volume() { return enhancedPlayerRef.current?.volume || 1; },
      get muted() { return enhancedPlayerRef.current?.muted || false; },
      get paused() { return !enhancedPlayerRef.current?.isPlaying; },
      get ended() { return enhancedPlayerRef.current?.ended || false; },
      seek: (time: number) => enhancedPlayerRef.current?.seek(time),
      setVolume: (volume: number) => enhancedPlayerRef.current?.setVolume(volume),
      toggleMute: () => enhancedPlayerRef.current?.toggleMute(),
      togglePlayPause: () => enhancedPlayerRef.current?.togglePlayPause()
    };
    
    playerRef.current = playerWrapper as VideoJSPlayerWrapper;
    onReady(playerWrapper);
  }, [onReady]);

  // Initialize the player wrapper when component mounts
  useEffect(() => {
    if (fileUrl && !hasInitialized.current) {
      createPlayerWrapper();
    }
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [fileUrl, createPlayerWrapper]);

  return (
    <EnhancedVideoPlayer
      ref={(el) => {
        enhancedPlayerRef.current = el;
        if (ref) {
          if (typeof ref === 'function') {
            ref(el);
          } else {
            ref.current = el;
          }
        }
      }}
      src={fileUrl}
      autoPlay={options.autoplay ?? false}
      loop={options.loop}
      muted={options.muted}
      onLoadStart={() => console.log('VideoJS: Load started')}
      onLoadEnd={() => console.log('VideoJS: Load ended')}
      onError={(error) => onError(error, true)}
      onPreviousVideo={onPreviousVideo}
      onNextVideo={onNextVideo}
      className="w-full h-full"
    />
  );
});

VideoJSPlayer.displayName = 'VideoJSPlayer';
export default VideoJSPlayer;