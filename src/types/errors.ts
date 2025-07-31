/**
 * Error handling types and interfaces for the video player application
 */

// Error categories
export type ErrorType = 'file' | 'player' | 'playback' | 'network' | 'browser';

// Base error interface
export interface BaseError {
  type: ErrorType;
  message: string;
  code?: string;
  recoverable: boolean;
  suggestions?: string[];
  timestamp?: number;
}

// File-related errors
export interface FileError extends BaseError {
  type: 'file';
  fileName?: string;
  fileSize?: number;
  fileType?: string;
}

// Player initialization errors
export interface PlayerError extends BaseError {
  type: 'player';
  playerType?: 'videojs' | 'mediaelement';
  libraryVersion?: string;
}

// Playback errors
export interface PlaybackError extends BaseError {
  type: 'playback';
  currentTime?: number;
  duration?: number;
  networkState?: number;
  readyState?: number;
}

// Network-related errors
export interface NetworkError extends BaseError {
  type: 'network';
  statusCode?: number;
  url?: string;
}

// Browser compatibility errors
export interface BrowserError extends BaseError {
  type: 'browser';
  userAgent?: string;
  missingFeatures?: string[];
}

// Union type for all error types
export type AppError = FileError | PlayerError | PlaybackError | NetworkError | BrowserError;

// Error state interface
export interface ErrorState {
  hasError: boolean;
  error: AppError | null;
  errorBoundary?: boolean;
}

// Error handler interface
export interface ErrorHandler {
  handleFileError(error: FileError): void;
  handlePlayerError(error: PlayerError): void;
  handlePlaybackError(error: PlaybackError): void;
  handleNetworkError(error: NetworkError): void;
  handleBrowserError(error: BrowserError): void;
  clearError(): void;
}

// Error recovery strategies
export interface ErrorRecovery {
  canRecover: boolean;
  recoveryAction?: () => void;
  fallbackOptions?: string[];
}

// Predefined error codes
export const ERROR_CODES = {
  // File errors
  UNSUPPORTED_FORMAT: 'FILE_UNSUPPORTED_FORMAT',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_CORRUPTED: 'FILE_CORRUPTED',
  FILE_NOT_READABLE: 'FILE_NOT_READABLE',
  
  // Player errors
  PLAYER_INIT_FAILED: 'PLAYER_INIT_FAILED',
  PLAYER_LIBRARY_MISSING: 'PLAYER_LIBRARY_MISSING',
  PLAYER_DESTROY_FAILED: 'PLAYER_DESTROY_FAILED',
  
  // Playback errors
  MEDIA_ERR_ABORTED: 'MEDIA_ERR_ABORTED',
  MEDIA_ERR_NETWORK: 'MEDIA_ERR_NETWORK',
  MEDIA_ERR_DECODE: 'MEDIA_ERR_DECODE',
  MEDIA_ERR_SRC_NOT_SUPPORTED: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
  
  // Browser errors
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  FEATURE_NOT_AVAILABLE: 'FEATURE_NOT_AVAILABLE',
  SECURITY_RESTRICTION: 'SECURITY_RESTRICTION'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];