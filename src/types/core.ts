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
  play(): void;
  pause(): void;
  destroy(): void;
  on(event: string, callback: Function): void;
  currentTime?: number;
  duration?: number;
  volume?: number;
  muted?: boolean;
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
  onFileSelect: (file: File) => void;
  acceptedFormats: string[];
  isLoading: boolean;
  error?: AppError | null;
}

export interface PlayerContainerProps {
  file: File;
  playerType: PlayerType;
  onError: (error: AppError) => void;
  onReady: () => void;
  className?: string;
}