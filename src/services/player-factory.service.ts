/**
 * Player Factory Service
 * Handles dynamic creation and management of video players (Video.js and MediaElement.js)
 */

import type { 
  PlayerFactory as IPlayerFactory, 
  Player, 
  PlayerType 
} from '../types/core';
import type { VideoJSOptions, MediaElementOptions } from '../types/player-config';

// Video.js player wrapper
class VideoJSPlayer implements Player {
  private videoJSInstance: any;

  constructor(videoJSInstance: any) {
    this.videoJSInstance = videoJSInstance;
  }

  play(): void {
    this.videoJSInstance?.play();
  }

  pause(): void {
    this.videoJSInstance?.pause();
  }

  destroy(): void {
    if (this.videoJSInstance) {
      this.videoJSInstance.dispose();
      this.videoJSInstance = null;
    }
  }

  on(event: string, callback: Function): void {
    this.videoJSInstance?.on(event, callback);
  }

  get currentTime(): number {
    return this.videoJSInstance?.currentTime() || 0;
  }

  set currentTime(time: number) {
    this.videoJSInstance?.currentTime(time);
  }

  get duration(): number {
    return this.videoJSInstance?.duration() || 0;
  }

  get volume(): number {
    return this.videoJSInstance?.volume() || 0;
  }

  set volume(vol: number) {
    this.videoJSInstance?.volume(vol);
  }

  get muted(): boolean {
    return this.videoJSInstance?.muted() || false;
  }

  set muted(mute: boolean) {
    this.videoJSInstance?.muted(mute);
  }

  get paused(): boolean {
    return this.videoJSInstance?.paused() || false;
  }

  get ended(): boolean {
    return this.videoJSInstance?.ended() || false;
  }

  seek(time: number): void {
    this.videoJSInstance?.currentTime(time);
  }

  setVolume(volume: number): void {
    this.videoJSInstance?.volume(volume);
  }

  toggleMute(): void {
    this.videoJSInstance?.muted(!this.videoJSInstance.muted());
  }

  togglePlayPause(): void {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }
}

// MediaElement.js player wrapper
class MediaElementPlayer implements Player {
  private mediaElementInstance: any;
  private domNode: HTMLElement;

  constructor(mediaElementInstance: any, domNode: HTMLElement) {
    this.mediaElementInstance = mediaElementInstance;
    this.domNode = domNode;
  }

  play(): void {
    this.mediaElementInstance?.play();
  }

  pause(): void {
    this.mediaElementInstance?.pause();
  }

  destroy(): void {
    if (this.mediaElementInstance) {
      // Remove MediaElement.js instance
      if (typeof this.mediaElementInstance.remove === 'function') {
        this.mediaElementInstance.remove();
      }
      this.mediaElementInstance = null;
    }
    
    // Clean up DOM node
    if (this.domNode && this.domNode.parentNode) {
      this.domNode.parentNode.removeChild(this.domNode);
    }
  }

  on(event: string, callback: Function): void {
    this.mediaElementInstance?.addEventListener(event, callback);
  }

  get currentTime(): number {
    return this.mediaElementInstance?.currentTime || 0;
  }

  set currentTime(time: number) {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.currentTime = time;
    }
  }

  get duration(): number {
    return this.mediaElementInstance?.duration || 0;
  }

  get volume(): number {
    return this.mediaElementInstance?.volume || 0;
  }

  set volume(vol: number) {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.volume = vol;
    }
  }

  get muted(): boolean {
    return this.mediaElementInstance?.muted || false;
  }

  set muted(mute: boolean) {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.muted = mute;
    }
  }

  get paused(): boolean {
    return this.mediaElementInstance?.paused || false;
  }

  get ended(): boolean {
    return this.mediaElementInstance?.ended || false;
  }

  seek(time: number): void {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.currentTime = time;
    }
  }

  setVolume(volume: number): void {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.volume = volume;
    }
  }

  toggleMute(): void {
    if (this.mediaElementInstance) {
      this.mediaElementInstance.muted = !this.mediaElementInstance.muted;
    }
  }

  togglePlayPause(): void {
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  }
}

export class PlayerFactoryService implements IPlayerFactory {
  private static instance: PlayerFactoryService;
  private activePlayer: Player | null = null;

  private constructor() {}

  /**
   * Get singleton instance of PlayerFactory
   */
  static getInstance(): PlayerFactoryService {
    if (!PlayerFactoryService.instance) {
      PlayerFactoryService.instance = new PlayerFactoryService();
    }
    return PlayerFactoryService.instance;
  }

  /**
   * Creates a player instance based on the specified type
   * @param type - The type of player to create ('videojs' or 'mediaelement')
   * @param element - The HTML element to attach the player to
   * @param options - Configuration options for the player
   * @returns Promise that resolves to a Player instance
   */
  async createPlayer(type: PlayerType, element: HTMLElement, options: VideoJSOptions | MediaElementOptions): Promise<Player> {
    // Clean up any existing player first
    if (this.activePlayer) {
      this.destroyPlayer(this.activePlayer);
    }

    try {
      let player: Player;

      if (type === 'videojs') {
        player = await this.createVideoJSPlayer(element, options as VideoJSOptions);
      } else if (type === 'mediaelement') {
        player = await this.createMediaElementPlayer(element, options as MediaElementOptions);
      } else {
        throw new Error(`Unsupported player type: ${type}`);
      }

      this.activePlayer = player;
      return player;
    } catch (error) {
      throw new Error(`Failed to create ${type} player: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Destroys a player instance and cleans up resources
   * @param player - The player instance to destroy
   */
  destroyPlayer(player: Player): void {
    try {
      if (player) {
        player.destroy();
        
        // Clear active player reference if it matches
        if (this.activePlayer === player) {
          this.activePlayer = null;
        }
      }
    } catch (error) {
      console.error('Error destroying player:', error);
    }
  }

  /**
   * Gets the currently active player instance
   * @returns The active player or null if none exists
   */
  getActivePlayer(): Player | null {
    return this.activePlayer;
  }

  /**
   * Creates a Video.js player instance
   * @param element - HTML element to attach to
   * @param options - Video.js configuration options
   * @returns Promise that resolves to VideoJSPlayer instance
   */
  private async createVideoJSPlayer(element: HTMLElement, options: VideoJSOptions): Promise<VideoJSPlayer> {
    // Dynamic import to avoid SSR issues
    const videojs = await import('video.js');
    const VideoJS = videojs.default;

    // Ensure element is a video element
    let videoElement: HTMLVideoElement;
    if (element.tagName.toLowerCase() === 'video') {
      videoElement = element as HTMLVideoElement;
    } else {
      // Create video element if container is not a video element
      videoElement = document.createElement('video');
      videoElement.className = 'video-js vjs-default-skin';
      element.appendChild(videoElement);
    }

    // Default Video.js options
    const defaultOptions: VideoJSOptions = {
      ...options,
      // Override with defaults if not provided
      controls: options.controls ?? true,
      responsive: options.responsive ?? true,
      fluid: options.fluid ?? true,
      playbackRates: options.playbackRates ?? [0.5, 1, 1.25, 1.5, 2],
      preload: options.preload ?? 'metadata'
    };

    return new Promise((resolve, reject) => {
      try {
        const videoJSInstance = VideoJS(videoElement, defaultOptions, function onPlayerReady() {
          resolve(new VideoJSPlayer(videoJSInstance));
        });

        // Handle initialization errors
        videoJSInstance.ready(() => {
          videoJSInstance.on('error', (error: any) => {
            console.error('Video.js error:', error);
          });
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Creates a MediaElement.js player instance
   * @param element - HTML element to attach to
   * @param options - MediaElement.js configuration options
   * @returns Promise that resolves to MediaElementPlayer instance
   */
  private async createMediaElementPlayer(element: HTMLElement, options: MediaElementOptions): Promise<MediaElementPlayer> {
    // Dynamic import to avoid SSR issues
    const MediaElementJS = await import('mediaelement');

    // Ensure element is a video element
    let videoElement: HTMLVideoElement;
    if (element.tagName.toLowerCase() === 'video') {
      videoElement = element as HTMLVideoElement;
    } else {
      // Create video element if container is not a video element
      videoElement = document.createElement('video');
      videoElement.controls = true;
      element.appendChild(videoElement);
    }

    // Default MediaElement.js options
    const defaultOptions: MediaElementOptions = {
      controls: true,
      enableAutosize: true,
      features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
      stretching: 'responsive',
      ...options
    };

    return new Promise((resolve, reject) => {
      const successCallback = (mediaElement: HTMLMediaElement, domNode: HTMLElement) => {
        resolve(new MediaElementPlayer(mediaElement, domNode));
        if (options.success) {
          options.success(mediaElement, domNode);
        }
      };

      const errorCallback = (error: any) => {
        reject(error);
        if (options.error) {
          options.error(error);
        }
      };

      try {
        new (MediaElementJS as any).MediaElementPlayer(videoElement, {
          ...defaultOptions,
          success: successCallback,
          error: errorCallback
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Export singleton instance
export const playerFactory = PlayerFactoryService.getInstance();