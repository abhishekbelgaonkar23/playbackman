/**
 * Player configuration interfaces for Video.js and MediaElement.js
 */

import type { PlayerType } from './core';

// Video.js configuration options
export interface VideoJSOptions {
  controls: boolean;
  responsive: boolean;
  fluid: boolean;
  playbackRates?: number[];
  plugins?: Record<string, any>;
  sources?: Array<{
    src: string;
    type: string;
  }>;
  poster?: string;
  preload?: 'auto' | 'metadata' | 'none';
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  width?: number;
  height?: number;
  aspectRatio?: string;
  fill?: boolean;
  techOrder?: string[];
  html5?: {
    vhs?: {
      overrideNative?: boolean;
    };
    nativeAudioTracks?: boolean;
    nativeVideoTracks?: boolean;
    nativeTextTracks?: boolean;
  };
}

// MediaElement.js configuration options (extending the existing interface)
export interface MediaElementOptions {
  controls?: boolean;
  enableAutosize?: boolean;
  features?: string[];
  success?: (mediaElement: HTMLMediaElement, domNode: HTMLElement) => void;
  error?: (error: any) => void;
  stretching?: 'responsive' | 'fill' | 'uniform' | 'uniformtofill' | 'none';
  pluginPath?: string;
  shimScriptAccess?: 'always' | 'sameDomain';
  showPosterWhenPaused?: boolean;
  showPosterWhenEnded?: boolean;
  defaultVideoWidth?: number;
  defaultVideoHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  startVolume?: number;
  loop?: boolean;
  autoRewind?: boolean;
  enableProgressTooltip?: boolean;
  enableKeyboard?: boolean;
  pauseOtherPlayers?: boolean;
  duration?: number;
  alwaysShowHours?: boolean;
  hideVideoControlsOnLoad?: boolean;
  hideVideoControlsOnPause?: boolean;
  clickToPlayPause?: boolean;
  iPadUseNativeControls?: boolean;
  iPhoneUseNativeControls?: boolean;
  AndroidUseNativeControls?: boolean;
  hideVolumeOnTouchDevices?: boolean;
  timeFormat?: string;
}

// Player configuration model
export interface PlayerConfig {
  type: PlayerType;
  options: VideoJSOptions | MediaElementOptions;
  container: HTMLElement;
}

// Player options union type for type safety
export type PlayerOptions = VideoJSOptions | MediaElementOptions;