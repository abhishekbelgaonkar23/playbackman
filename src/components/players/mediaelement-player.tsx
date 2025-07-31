"use client";

import React, { useEffect, useRef, useCallback } from 'react';
import type { Player } from '~/types';
import type { MediaElementOptions } from '~/types/player-config';

interface MediaElementPlayerProps {
  file: File;
  fileUrl: string;
  options: MediaElementOptions;
  onReady: (player: Player) => void;
  onError: (error: string, canRetry?: boolean) => void;
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
    return (!this.isDestroyed && this.mediaElementInstance) ? 
      (isNaN(this.mediaElementInstance.duration) ? 0 : this.mediaElementInstance.duration) : 0;
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

export default function MediaElementPlayer({ 
  file, 
  fileUrl, 
  options, 
  onReady, 
  onError 
}: MediaElementPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<MediaElementPlayerWrapper | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * Initialize MediaElement.js player
   */
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // Dynamic import of MediaElement.js
      const MediaElementJS = await import('mediaelement');

      // Ensure MediaElement.js CSS is loaded
      if (typeof window !== 'undefined' && !document.querySelector('link[href*="mediaelementplayer.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/mediaelement@7.0.7/build/mediaelementplayer.min.css';
        document.head.appendChild(link);
      }

      const videoElement = videoRef.current;
      
      // Set video source
      videoElement.src = fileUrl;
      videoElement.controls = true;

      // Prepare MediaElement.js options with controls enabled
      const playerOptions: MediaElementOptions = {
        controls: true,
        enableAutosize: true,
        features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
        ...options,
        success: (mediaElement: HTMLMediaElement, domNode: HTMLElement) => {
          const playerWrapper = new MediaElementPlayerWrapper(mediaElement, domNode);
          playerRef.current = playerWrapper;

          // Set up error handling
          mediaElement.addEventListener('error', (event) => {
            const target = event.target as HTMLMediaElement;
            let errorMessage = 'MediaElement.js playback error';
            
            if (target.error) {
              switch (target.error.code) {
                case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage = 'Video loading was aborted';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage = 'Network error occurred while loading video';
                  break;
                case MediaError.MEDIA_ERR_DECODE:
                  errorMessage = 'Video decoding error';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage = 'Video format not supported by MediaElement.js';
                  break;
                default:
                  errorMessage = target.error.message || 'Unknown MediaElement.js error';
              }
            }
            
            onError(errorMessage, target.error?.code !== MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
          });

          // Set up playback event listeners for real-time responsiveness
          mediaElement.addEventListener('loadstart', () => {
            console.log('MediaElement.js: Load started');
          });

          mediaElement.addEventListener('canplay', () => {
            console.log('MediaElement.js: Can play');
          });

          mediaElement.addEventListener('loadedmetadata', () => {
            console.log('MediaElement.js: Metadata loaded');
          });

          // Playback control events
          mediaElement.addEventListener('play', () => {
            console.log('MediaElement.js: Play started');
          });

          mediaElement.addEventListener('pause', () => {
            console.log('MediaElement.js: Paused');
          });

          mediaElement.addEventListener('timeupdate', () => {
            // Real-time time updates for seek responsiveness
            // This ensures UI components can sync with playback position
          });

          mediaElement.addEventListener('volumechange', () => {
            console.log('MediaElement.js: Volume changed');
          });

          mediaElement.addEventListener('seeking', () => {
            console.log('MediaElement.js: Seeking');
          });

          mediaElement.addEventListener('seeked', () => {
            console.log('MediaElement.js: Seek completed');
          });

          mediaElement.addEventListener('ended', () => {
            console.log('MediaElement.js: Playback ended');
          });

          // Call original success callback if provided
          if (options.success) {
            options.success(mediaElement, domNode);
          }

          onReady(playerWrapper);
        },
        error: (error: any) => {
          const errorMessage = error?.message || 'MediaElement.js initialization failed';
          onError(`MediaElement.js error: ${errorMessage}`, true);
          
          // Call original error callback if provided
          if (options.error) {
            options.error(error);
          }
        }
      };

      // Initialize MediaElement.js player
      new MediaElementJS.MediaElementPlayer(videoElement, playerOptions);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load MediaElement.js';
      onError(`MediaElement.js library error: ${errorMessage}`, true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [file, fileUrl, options, onReady, onError]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    isInitializingRef.current = false;
  }, []);

  /**
   * Effect to initialize player when component mounts or props change
   */
  useEffect(() => {
    if (fileUrl) {
      initializePlayer();
    }

    return cleanup;
  }, [fileUrl, initializePlayer, cleanup]);

  /**
   * Effect for cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="relative w-full aspect-video max-w-full">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        controls
        preload="metadata"
        playsInline
      >
        <source src={fileUrl} type={file.type || 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}