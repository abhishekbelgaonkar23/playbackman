"use client";

import React, { useEffect, useRef, useCallback } from 'react';
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

  get currentTime(): number {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.currentTime() : 0;
  }

  set currentTime(time: number) {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.currentTime(time);
    }
  }

  get duration(): number {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.duration() : 0;
  }

  get volume(): number {
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.volume() : 0;
  }

  set volume(vol: number) {
    if (!this.isDestroyed && this.videoJSInstance) {
      this.videoJSInstance.volume(vol);
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
}

export default function VideoJSPlayer({ 
  file, 
  fileUrl, 
  options, 
  onReady, 
  onError 
}: VideoJSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<VideoJSPlayerWrapper | null>(null);
  const isInitializingRef = useRef(false);

  /**
   * Initialize Video.js player
   */
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    try {
      // Dynamic import of Video.js
      const videojs = await import('video.js');
      const VideoJS = videojs.default;

      // Ensure Video.js CSS is loaded
      if (typeof window !== 'undefined' && !document.querySelector('link[href*="video-js.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://vjs.zencdn.net/8.23.3/video-js.css';
        document.head.appendChild(link);
      }

      const videoElement = videoRef.current;
      
      // Set video source
      videoElement.src = fileUrl;
      videoElement.className = 'video-js vjs-default-skin w-full h-auto';

      // Prepare Video.js options
      const playerOptions: VideoJSOptions = {
        ...options,
        sources: [{
          src: fileUrl,
          type: file.type || 'video/mp4'
        }]
      };

      // Initialize Video.js player
      const videoJSInstance = VideoJS(videoElement, playerOptions, function onPlayerReady() {
        const playerWrapper = new VideoJSPlayerWrapper(videoJSInstance);
        playerRef.current = playerWrapper;
        
        // Set up error handling
        videoJSInstance.on('error', (error: any) => {
          const errorObj = videoJSInstance.error();
          let errorMessage = 'Video.js playback error';
          
          if (errorObj) {
            switch (errorObj.code) {
              case 1:
                errorMessage = 'Video loading was aborted';
                break;
              case 2:
                errorMessage = 'Network error occurred while loading video';
                break;
              case 3:
                errorMessage = 'Video decoding error';
                break;
              case 4:
                errorMessage = 'Video format not supported';
                break;
              default:
                errorMessage = errorObj.message || 'Unknown Video.js error';
            }
          }
          
          onError(errorMessage, errorObj?.code !== 4); // Don't retry format errors
        });

        // Set up other event listeners
        videoJSInstance.on('loadstart', () => {
          console.log('Video.js: Load started');
        });

        videoJSInstance.on('canplay', () => {
          console.log('Video.js: Can play');
        });

        videoJSInstance.on('loadedmetadata', () => {
          console.log('Video.js: Metadata loaded');
        });

        onReady(playerWrapper);
      });

      // Handle initialization errors
      videoJSInstance.ready(() => {
        if (videoJSInstance.error()) {
          const error = videoJSInstance.error();
          onError(`Video.js initialization error: ${error.message || 'Unknown error'}`, false);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Video.js';
      onError(`Video.js library error: ${errorMessage}`, true);
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
    <div className="relative w-full">
      <video
        ref={videoRef}
        className="w-full h-auto max-h-[70vh]"
        controls={false} // Video.js will handle controls
        preload="metadata"
        playsInline
      >
        <source src={fileUrl} type={file.type || 'video/mp4'} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}