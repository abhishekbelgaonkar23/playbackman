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
    return (!this.isDestroyed && this.videoJSInstance) ? this.videoJSInstance.duration() : 0;
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
  const videoIdRef = useRef(`vjs-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
  const hasInitialized = useRef(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  /**
   * Initialize Video.js player
   */
  const initializePlayer = useCallback(async () => {
    if (!videoRef.current || isInitializingRef.current || hasInitialized.current || !isMountedRef.current) {
      return;
    }

    // Ensure the video element is attached to the DOM with retry limit
    if (!document.contains(videoRef.current)) {
      // Don't retry if component is unmounting or already cleaned up
      if (!videoRef.current || hasInitialized.current || !isMountedRef.current) {
        return;
      }
      console.warn('Video element not attached to DOM, retrying in 100ms');
      retryTimeoutRef.current = setTimeout(() => {
        if (videoRef.current && !hasInitialized.current && isMountedRef.current) {
          initializePlayer();
        }
      }, 100);
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

        // Wait a bit for CSS to load
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Add custom CSS to fix Video.js display issues
      if (typeof window !== 'undefined' && !document.querySelector('#videojs-custom-styles')) {
        const style = document.createElement('style');
        style.id = 'videojs-custom-styles';
        style.textContent = `
          .video-js {
            width: 100% !important;
            height: 100% !important;
            position: relative;
          }
          
          .video-js .vjs-tech {
            width: 100% !important;
            height: 100% !important;
            object-fit: contain;
          }
          
          .video-js .vjs-poster {
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
          }
          
          .video-js .vjs-control-bar {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2;
          }
          
          .video-js.vjs-fluid {
            padding-top: 0 !important;
          }
          
          .video-js.vjs-fill {
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Hide any default fullscreen buttons */
          .video-js .vjs-fullscreen-control:not(.custom-fullscreen) {
            display: none !important;
          }
          
          /* Video.js fullscreen styles */
          .video-js.vjs-fullscreen {
            width: 100vw !important;
            height: 100vh !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 9999 !important;
          }
          
          .video-js.vjs-fullscreen .vjs-tech {
            width: 100vw !important;
            height: 100vh !important;
            object-fit: contain;
          }
        `;
        document.head.appendChild(style);
      }

      const videoElement = videoRef.current;
      
      // Check if element already has a Video.js player and dispose it
      if ((videoElement as any).player) {
        console.log('Disposing existing Video.js player');
        try {
          (videoElement as any).player.dispose();
        } catch (e) {
          console.warn('Error disposing existing player:', e);
        }
      }

      // Set up the video element for Video.js
      videoElement.className = 'video-js vjs-default-skin';
      videoElement.id = videoIdRef.current;

      // Prepare Video.js options with controls enabled and mobile-friendly settings
      const playerOptions: any = {
        controls: true,
        responsive: true,
        fluid: true,
        fill: true, // This ensures the video fills the container
        playbackRates: [0.5, 1, 1.25, 1.5, 2],
        playsinline: true,
        preload: 'metadata',

        // Responsive breakpoints
        breakpoints: {
          tiny: 300,
          xsmall: 400,
          small: 500,
          medium: 600,
          large: 700,
          xlarge: 800,
          huge: 900
        },
        // Touch-friendly control bar - disable Video.js fullscreen completely
        controlBar: {
          volumePanel: {
            inline: false // Use popup volume control on mobile
          },
          fullscreenToggle: false, // Disable Video.js fullscreen button
          children: [
            'playToggle',
            'volumePanel',
            'currentTimeDisplay',
            'timeDivider',
            'durationDisplay',
            'progressControl',
            'liveDisplay',
            'seekToLive',
            'remainingTimeDisplay',
            'customControlSpacer',
            'playbackRateMenuButton',
            'chaptersButton',
            'descriptionsButton',
            'subsCapsButton',
            'audioTrackButton'
            // Explicitly exclude 'fullscreenToggle'
          ]
        },
        // HTML5 tech options to prevent source loss
        html5: {
          vhs: {
            overrideNative: true
          },
          nativeVideoTracks: false,
          nativeAudioTracks: false,
          nativeTextTracks: false
        },
        // Fullscreen configuration to prevent DOM issues
        fullscreen: {
          options: {
            navigationUI: 'hide'
          }
        },
        // Prevent Video.js from manipulating DOM during fullscreen
        userActions: {
          hotkeys: true
        },
        ...options,
        sources: [{
          src: fileUrl,
          type: file.type || 'video/mp4'
        }]
      };

      // Initialize Video.js player
      console.log('Creating new Video.js instance');

      const videoJSInstance = VideoJS(videoElement, playerOptions, function onPlayerReady() {
        console.log('Video.js ready - forcing controls on');
        hasInitialized.current = true;

        // Force controls to be visible
        videoJSInstance.controls(true);
        
        // Add custom fullscreen button
        videoJSInstance.ready(() => {
          const Button = VideoJS.getComponent('Button');
          
          class SimpleFullscreenButton extends Button {
            buildCSSClass() {
              return 'vjs-fullscreen-control vjs-control vjs-button custom-fullscreen';
            }

            createEl() {
              return super.createEl('button', {
                innerHTML: '<span aria-hidden="true" class="vjs-icon-fullscreen-enter"></span><span class="vjs-control-text">Fullscreen</span>',
                className: 'vjs-fullscreen-control vjs-control vjs-button custom-fullscreen',
                type: 'button'
              });
            }

            handleClick() {
              const playerEl = videoJSInstance.el();
              if (document.fullscreenElement) {
                document.exitFullscreen();
              } else if (playerEl) {
                playerEl.requestFullscreen().catch(() => {
                  // Fallback: try fullscreen on video element
                  const videoEl = videoJSInstance.tech().el();
                  if (videoEl && videoEl.requestFullscreen) {
                    videoEl.requestFullscreen();
                  }
                });
              }
            }
          }

          const fullscreenButton = new SimpleFullscreenButton(videoJSInstance, {});
          if (videoJSInstance.controlBar && videoJSInstance.controlBar.addChild) {
            videoJSInstance.controlBar.addChild(fullscreenButton);
          }

          // Update button icon on fullscreen changes
          const updateButton = () => {
            const button = fullscreenButton.el();
            if (!button) return;
            
            if (document.fullscreenElement) {
              button.innerHTML = '<span aria-hidden="true" class="vjs-icon-fullscreen-exit"></span><span class="vjs-control-text">Exit Fullscreen</span>';
              (button as HTMLElement).title = 'Exit Fullscreen';
              videoJSInstance.el().classList.add('vjs-fullscreen');
            } else {
              button.innerHTML = '<span aria-hidden="true" class="vjs-icon-fullscreen-enter"></span><span class="vjs-control-text">Fullscreen</span>';
              (button as HTMLElement).title = 'Fullscreen';
              videoJSInstance.el().classList.remove('vjs-fullscreen');
            }
          };

          document.addEventListener('fullscreenchange', updateButton);
        });
        
        // Force a resize to ensure proper display
        setTimeout(() => {
          if (videoJSInstance && !videoJSInstance.isDisposed()) {
            videoJSInstance.trigger('resize');
          }
        }, 100);
        
        const playerWrapper = new VideoJSPlayerWrapper(videoJSInstance);
        playerRef.current = playerWrapper;

        // Set up error handling
        videoJSInstance.on('error', () => {
          const errorObj = videoJSInstance.error();
          let errorMessage = 'Video.js playback error';

          console.error('Video.js error:', errorObj);

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

        // Set up playback event listeners for real-time responsiveness
        videoJSInstance.on('loadstart', () => {
          console.log('Video.js: Load started');
        });

        videoJSInstance.on('canplay', () => {
          console.log('Video.js: Can play');
        });

        videoJSInstance.on('loadedmetadata', () => {
          console.log('Video.js: Metadata loaded');
        });

        // Playback control events
        videoJSInstance.on('play', () => {
          console.log('Video.js: Play started');
        });

        videoJSInstance.on('pause', () => {
          console.log('Video.js: Paused');
        });

        videoJSInstance.on('timeupdate', () => {
          // Real-time time updates for seek responsiveness
          // This ensures UI components can sync with playback position
        });

        videoJSInstance.on('volumechange', () => {
          console.log('Video.js: Volume changed');
        });

        videoJSInstance.on('seeking', () => {
          console.log('Video.js: Seeking');
        });

        videoJSInstance.on('seeked', () => {
          console.log('Video.js: Seek completed');
        });

        videoJSInstance.on('ended', () => {
          console.log('Video.js: Playback ended');
        });







        onReady(playerWrapper);
      });

      // Handle initialization errors
      videoJSInstance.ready(() => {
        if (videoJSInstance.error()) {
          const errorObj = videoJSInstance.error();
          onError(`Video.js initialization error: ${errorObj?.message || 'Unknown error'}`, false);
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load Video.js';
      onError(`Video.js library error: ${errorMessage}`, true);
      hasInitialized.current = false;
    } finally {
      isInitializingRef.current = false;
    }
  }, [file, fileUrl, options, onReady, onError]);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    // Mark component as unmounted to prevent further operations
    isMountedRef.current = false;

    // Clear any pending retry timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Mark as cleaned up first to prevent further initialization attempts
    hasInitialized.current = false;
    isInitializingRef.current = false;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying Video.js player:', error);
      }
      playerRef.current = null;
    }

    // Also dispose any Video.js instance directly attached to the element
    if (videoRef.current && (videoRef.current as any).player) {
      try {
        (videoRef.current as any).player.dispose();
        (videoRef.current as any).player = null;
      } catch (error) {
        console.warn('Error disposing Video.js instance:', error);
      }
    }
  }, []);

  /**
   * Effect to initialize player when component mounts or props change
   */
  useEffect(() => {
    isMountedRef.current = true;
    
    if (fileUrl && videoRef.current && !hasInitialized.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      const initFrame = requestAnimationFrame(() => {
        if (videoRef.current && !hasInitialized.current && isMountedRef.current) {
          initializePlayer();
        }
      });
      
      return () => cancelAnimationFrame(initFrame);
    }
  }, [fileUrl, initializePlayer]);

  /**
   * Effect for cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return (
    <div className="w-full h-full">
      <video
        ref={videoRef}
        id={videoIdRef.current}
        className="video-js vjs-default-skin w-full h-full"
        controls={false} // Let Video.js handle controls
        preload="metadata"
        playsInline
        data-setup="{}"
        src={fileUrl} // Set source directly as fallback
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}