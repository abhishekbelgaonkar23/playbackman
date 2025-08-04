/**
 * Main types export file for the video player application
 */

// Core types and interfaces
export type {
  PlayerType,
  FileInfo,
  PlaylistItem,
  ValidationResult,
  SupportedFormats,
  AppState,
  Player,
  FileDetectionService,
  PlayerFactory,
  VideoPlayerAppProps,
  FileUploaderProps,
  PlayerContainerProps,
  PlaylistProps
} from './core';

// Player configuration types
export type {
  VideoJSOptions,
  MediaElementOptions,
  PlayerConfig,
  PlayerOptions
} from './player-config';

// Error handling types
export type {
  ErrorType,
  BaseError,
  FileError,
  PlayerError,
  PlaybackError,
  NetworkError,
  BrowserError,
  AppError,
  ErrorState,
  ErrorHandler,
  ErrorRecovery,
  ErrorCode
} from './errors';

export { ERROR_CODES } from './errors';