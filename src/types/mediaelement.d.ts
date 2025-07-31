declare module 'mediaelement' {
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
    defaultAudioWidth?: number;
    defaultAudioHeight?: number;
    audioWidth?: number;
    audioHeight?: number;
    startVolume?: number;
    loop?: boolean;
    autoRewind?: boolean;
    enableProgressTooltip?: boolean;
    enableKeyboard?: boolean;
    pauseOtherPlayers?: boolean;
    duration?: number;
    alwaysShowHours?: boolean;
    showTimecodeFrameCount?: boolean;
    framesPerSecond?: number;
    alwaysShowControls?: boolean;
    hideVideoControlsOnLoad?: boolean;
    hideVideoControlsOnPause?: boolean;
    clickToPlayPause?: boolean;
    iPadUseNativeControls?: boolean;
    iPhoneUseNativeControls?: boolean;
    AndroidUseNativeControls?: boolean;
    alwaysShowHours?: boolean;
    hideVolumeOnTouchDevices?: boolean;
    enableAutosize?: boolean;
    timeFormat?: string;
    keyActions?: Array<{
      keys: number[];
      action: (player: any, media: HTMLMediaElement, key: KeyboardEvent, event: Event) => void;
    }>;
  }

  export interface MediaElementPlayer {
    media: HTMLMediaElement;
    domNode: HTMLElement;
    container: HTMLElement;
    controls: HTMLElement;
    layers: HTMLElement;
    
    // Media methods
    play(): void;
    pause(): void;
    load(): void;
    stop(): void;
    remove(): void;
    destroy(): void;
    
    // Properties
    paused: boolean;
    ended: boolean;
    muted: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    
    // Setters
    setCurrentTime(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setSrc(src: string): void;
    
    // Event handling
    addEventListener(event: string, callback: Function): void;
    removeEventListener(event: string, callback: Function): void;
  }

  export default class MediaElementPlayer {
    constructor(element: HTMLElement | string, options?: MediaElementOptions);
    
    static extend(name: string, plugin: any): void;
    
    media: HTMLMediaElement;
    domNode: HTMLElement;
    container: HTMLElement;
    controls: HTMLElement;
    layers: HTMLElement;
    
    // Media methods
    play(): void;
    pause(): void;
    load(): void;
    stop(): void;
    remove(): void;
    destroy(): void;
    
    // Properties
    paused: boolean;
    ended: boolean;
    muted: boolean;
    volume: number;
    currentTime: number;
    duration: number;
    
    // Setters
    setCurrentTime(time: number): void;
    setVolume(volume: number): void;
    setMuted(muted: boolean): void;
    setSrc(src: string): void;
    
    // Event handling
    addEventListener(event: string, callback: Function): void;
    removeEventListener(event: string, callback: Function): void;
  }
}