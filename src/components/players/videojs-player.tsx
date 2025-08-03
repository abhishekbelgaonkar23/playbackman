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
  onError
}, ref) => {
  const playerRef = useRef<VideoJSPlayerWrapper | null>(null);
  const hasInitialized = useRef(false);

  // Create a simple player wrapper for the enhanced video player
  const createPlayerWrapper = useCallback(() => {
    if (hasInitialized.current) return;
    
    hasInitialized.current = true;
    
    // Create a minimal wrapper that satisfies the Player interface
    const playerWrapper: Player = {
      play: () => {},
      pause: () => {},
      destroy: () => {
        hasInitialized.current = false;
        playerRef.current = null;
      },
      on: () => {},
      currentTime: 0,
      duration: 0,
      volume: 1,
      muted: false,
      paused: true,
      ended: false,
      seek: () => {},
      setVolume: () => {},
      toggleMute: () => {},
      togglePlayPause: () => {}
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
      ref={ref}
      src={fileUrl}
      autoPlay={options.autoplay}
      loop={options.loop}
      muted={options.muted}
      onLoadStart={() => console.log('VideoJS: Load started')}
      onLoadEnd={() => console.log('VideoJS: Load ended')}
      onError={(error) => onError(error, true)}
      className="w-full h-full"
    />
  );
});

VideoJSPlayer.displayName = 'VideoJSPlayer';
export default VideoJSPlayer;