"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import { EnhancedVideoPlayer } from './enhanced-video-player';
import type { Player } from '~/types';
import type { MediaElementOptions } from '~/types/player-config';

interface MediaElementPlayerProps {
  file: File;
  fileUrl: string;
  options: MediaElementOptions;
  onReady: (player: Player) => void;
  onError: (error: string, canRetry?: boolean) => void;
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
}

// MediaElement.js player wrapper class
class MediaElementPlayerWrapper implements Player {
  private mediaElementInstance: HTMLMediaElement | null;
  private domNode: HTMLElement | null;
  private isDestroyed = false;

  constructor(mediaElementInstance: HTMLMediaElement, domNode: HTMLElement) {
    this.mediaElementInstance = mediaElementInstance;
    this.domNode = domNode;
  }

  // Basic playback controls
  play(): void {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.play().catch(error => {
        console.warn('MediaElement play error:', error);
      });
    }
  }

  pause(): void {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.pause();
    }
  }

  destroy(): void {
    if (!this.isDestroyed) {
      // Clean up MediaElement instance
      if (this.mediaElementInstance) {
        try {
          // Remove event listeners
          this.mediaElementInstance.pause();
          this.mediaElementInstance.src = '';
          this.mediaElementInstance.load();
        } catch (error) {
          console.warn('Error cleaning up MediaElement instance:', error);
        }
        this.mediaElementInstance = null;
      }

      // Clean up DOM node
      if (this.domNode && this.domNode.parentNode) {
        try {
          this.domNode.parentNode.removeChild(this.domNode);
        } catch (error) {
          console.warn('Error removing MediaElement DOM node:', error);
        }
        this.domNode = null;
      }

      this.isDestroyed = true;
    }
  }

  on(event: string, callback: Function): void {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.addEventListener(event, callback as EventListener);
    }
  }

  // Time controls
  get currentTime(): number {
    return (!this.isDestroyed && this.mediaElementInstance) ? this.mediaElementInstance.currentTime : 0;
  }

  set currentTime(time: number) {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.currentTime = time;
    }
  }

  get duration(): number {
    if (!this.isDestroyed && this.mediaElementInstance) {
      const dur = this.mediaElementInstance.duration;
      return (isNaN(dur) || !isFinite(dur)) ? 0 : dur;
    }
    return 0;
  }

  // Audio controls
  get volume(): number {
    return (!this.isDestroyed && this.mediaElementInstance) ? this.mediaElementInstance.volume : 0;
  }

  set volume(vol: number) {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.volume = Math.max(0, Math.min(1, vol));
    }
  }

  get muted(): boolean {
    return (!this.isDestroyed && this.mediaElementInstance) ? this.mediaElementInstance.muted : false;
  }

  set muted(mute: boolean) {
    if (!this.isDestroyed && this.mediaElementInstance) {
      this.mediaElementInstance.muted = mute;
    }
  }

  // Playback state
  get paused(): boolean {
    return (!this.isDestroyed && this.mediaElementInstance) ? this.mediaElementInstance.paused : true;
  }

  get ended(): boolean {
    return (!this.isDestroyed && this.mediaElementInstance) ? this.mediaElementInstance.ended : false;
  }

  // Additional control methods
  seek(time: number): void {
    if (!this.isDestroyed && this.mediaElementInstance) {
      const duration = this.duration;
      const seekTime = Math.max(0, Math.min(duration, time));
      this.mediaElementInstance.currentTime = seekTime;
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
}

const MediaElementPlayer = React.forwardRef<any, MediaElementPlayerProps>(({ 
  file, 
  fileUrl, 
  options, 
  onReady, 
  onError,
  onPreviousVideo,
  onNextVideo
}, ref) => {
  const playerRef = useRef<MediaElementPlayerWrapper | null>(null);
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
    
    playerRef.current = playerWrapper as MediaElementPlayerWrapper;
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
      autoPlay={false}
      loop={options.loop || false}
      muted={false}
      onLoadStart={() => console.log('MediaElement: Load started')}
      onLoadEnd={() => console.log('MediaElement: Load ended')}
      onError={(error) => onError(error, true)}
      onPreviousVideo={onPreviousVideo}
      onNextVideo={onNextVideo}
      className="w-full h-full"
    />
  );
});

MediaElementPlayer.displayName = 'MediaElementPlayer';
export default MediaElementPlayer;