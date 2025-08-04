/**
 * Core TypeScript interfaces and types for the video player application
 */

import type { AppError } from './errors';

// Player type enumeration
export type PlayerType = 'videojs' | 'mediaelement';

// File information interface
export interface FileInfo {
  name: string;
  size: number;
  type: string; // MIME type
  extension: string;
  lastModified: number;
  url?: string; // Object URL for playback
  duration?: number; // Video duration in seconds
  thumbnail?: string; // Thumbnail data URL
}

// Playlist item interface
export interface PlaylistItem {
  id: string;
  file: File;
  fileInfo: FileInfo;
  playerType: PlayerType;
  position: number;
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  playerType?: PlayerType;
}

// Supported formats interface
export interface SupportedFormats {
  videojs: string[];
  mediaelement: string[];
}

// Application state interface
export interface AppState {
  // File management
  selectedFile: File | null;
  fileInfo: FileInfo | null;
  
  // Playlist management
  playlist: PlaylistItem[];
  currentPlaylistIndex: number;
  
  // Player management
  currentPlayer: Player | null;
  playerType: PlayerType | null;
  isPlayerReady: boolean;
  
  // UI state
  isLoading: boolean;
  error: AppError | null;
  isDragOver: boolean;
  
  // Theme
  theme: 'light' | 'dark' | 'system';
}

// Generic player interface
export interface Player {
  // Basic playback controls
  play(): void;
  pause(): void;
  destroy(): void;
  on(event: string, callback: Function): void;
  
  // Time controls (required for seek functionality)
  currentTime: number;
  duration: number;
  
  // Audio controls (required for volume/mute functionality)
  volume: number;
  muted: boolean;
  
  // Playback state
  paused: boolean;
  ended: boolean;
  
  // Additional control methods
  seek(time: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  togglePlayPause(): void;
}

// File detection service interface
export interface FileDetectionService {
  detectFileType(file: File): PlayerType;
  validateFile(file: File): ValidationResult;
  getSupportedFormats(): SupportedFormats;
}

// Player factory interface
export interface PlayerFactory {
  createPlayer(type: PlayerType, element: HTMLElement, options: any): Promise<Player>;
  destroyPlayer(player: Player): void;
}

// Component prop interfaces
export interface VideoPlayerAppProps {
  className?: string;
}

export interface FileUploaderProps {
  onFileSelect: (files: File | File[]) => void;
  acceptedFormats: string[];
  isLoading: boolean;
  error?: AppError | null;
  multiple?: boolean;
}

export interface PlayerContainerProps {
  file: File;
  playerType: PlayerType;
  onError: (error: AppError) => void;
  onReady: () => void;
  onPreviousVideo?: () => void;
  onNextVideo?: () => void;
  className?: string;
}

export interface PlaylistProps {
  playlist: PlaylistItem[];
  currentIndex: number;
  onReorder: (newPlaylist: PlaylistItem[]) => void;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onFileSelect: (files: File | File[]) => void;
  acceptedFormats: string[];
  isLoading: boolean;
  error?: AppError | null;
  className?: string;
}