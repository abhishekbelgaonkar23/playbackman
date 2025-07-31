"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploader } from './file-uploader';
import { fileDetectionService } from '~/services/file-detection.service';
import { playerFactory } from '~/services/player-factory.service';
import { cn } from '~/lib/utils';
import type { 
  VideoPlayerAppProps, 
  AppState, 
  FileInfo, 
  Player, 
  PlayerType,
  AppError 
} from '~/types';
import { ERROR_CODES } from '~/types/errors';

export function VideoPlayerApp({ className }: VideoPlayerAppProps) {
  // Application state
  const [state, setState] = useState<AppState>({
    selectedFile: null,
    fileInfo: null,
    currentPlayer: null,
    playerType: null,
    isPlayerReady: false,
    isLoading: false,
    error: null,
    isDragOver: false,
    theme: 'system'
  });

  // Refs for player container
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Get supported formats for file uploader
  const supportedFormats = fileDetectionService.getSupportedFormats();
  const acceptedFormats = [
    ...supportedFormats.videojs.filter(format => !format.includes('/')),
    ...supportedFormats.mediaelement.filter(format => !format.includes('/'))
  ].map(ext => `.${ext}`);

  /**
   * Creates file info object from File
   */
  const createFileInfo = useCallback((file: File): FileInfo => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
      lastModified: file.lastModified,
      url: URL.createObjectURL(file)
    };
  }, []);

  /**
   * Handles file selection from FileUploader
   */
  const handleFileSelect = useCallback(async (file: File) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      selectedFile: file
    }));

    try {
      // Validate file using FileDetectionService
      const validationResult = fileDetectionService.validateFile(file);
      
      if (!validationResult.isValid) {
        const error: AppError = {
          type: 'file',
          message: validationResult.error || 'File validation failed',
          code: ERROR_CODES.UNSUPPORTED_FORMAT,
          recoverable: true,
          suggestions: ['Please select a supported video format'],
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        };
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error,
          selectedFile: null,
          fileInfo: null
        }));
        return;
      }

      // Create file info
      const fileInfo = createFileInfo(file);
      const playerType = validationResult.playerType!;

      // Update state with file info and player type
      setState(prev => ({ 
        ...prev, 
        fileInfo,
        playerType,
        isPlayerReady: false
      }));

      // Initialize player
      await initializePlayer(file, playerType, fileInfo);

    } catch (error) {
      const appError: AppError = {
        type: 'file',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: ERROR_CODES.FILE_NOT_READABLE,
        recoverable: true,
        suggestions: ['Please try selecting the file again'],
        fileName: file.name
      };

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: appError,
        selectedFile: null,
        fileInfo: null
      }));
    }
  }, [createFileInfo]);

  /**
   * Initializes the appropriate player based on file type
   */
  const initializePlayer = useCallback(async (file: File, playerType: PlayerType, fileInfo: FileInfo) => {
    if (!playerContainerRef.current) {
      const error: AppError = {
        type: 'player',
        message: 'Player container not available',
        code: ERROR_CODES.PLAYER_INIT_FAILED,
        recoverable: true,
        suggestions: ['Try refreshing the page'],
        playerType
      };
      
      setState(prev => ({ 
        ...prev, 
        error, 
        isLoading: false 
      }));
      return;
    }

    try {
      // Clean up existing player
      if (state.currentPlayer) {
        playerFactory.destroyPlayer(state.currentPlayer);
      }

      // Clear container
      playerContainerRef.current.innerHTML = '';

      // Create video element
      const videoElement = document.createElement('video');
      videoElement.src = fileInfo.url!;
      videoElement.className = 'w-full h-auto max-h-[70vh] rounded-lg';
      playerContainerRef.current.appendChild(videoElement);

      // Player options based on type
      const playerOptions = playerType === 'videojs' 
        ? {
            controls: true,
            responsive: true,
            fluid: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            preload: 'metadata'
          }
        : {
            controls: true,
            enableAutosize: true,
            features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
            stretching: 'responsive'
          };

      // Create player instance
      const player = await playerFactory.createPlayer(playerType, videoElement, playerOptions);

      // Set up player event listeners
      player.on('ready', () => {
        setState(prev => ({ 
          ...prev, 
          isPlayerReady: true, 
          isLoading: false 
        }));
      });

      player.on('error', (error: any) => {
        const appError: AppError = {
          type: 'playback',
          message: 'Video playback error occurred',
          code: ERROR_CODES.MEDIA_ERR_DECODE,
          recoverable: true,
          suggestions: ['Try selecting a different video file'],
          playerType
        };

        setState(prev => ({ 
          ...prev, 
          error: appError, 
          isLoading: false 
        }));
      });

      // Update state with new player
      setState(prev => ({ 
        ...prev, 
        currentPlayer: player,
        isLoading: false
      }));

    } catch (error) {
      const appError: AppError = {
        type: 'player',
        message: error instanceof Error ? error.message : 'Failed to initialize player',
        code: ERROR_CODES.PLAYER_INIT_FAILED,
        recoverable: true,
        suggestions: ['Try refreshing the page and selecting the file again'],
        playerType
      };

      setState(prev => ({ 
        ...prev, 
        error: appError, 
        isLoading: false,
        currentPlayer: null,
        isPlayerReady: false
      }));
    }
  }, [state.currentPlayer]);

  /**
   * Clears current error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clean up player on unmount
      if (state.currentPlayer) {
        playerFactory.destroyPlayer(state.currentPlayer);
      }
      
      // Clean up object URLs
      if (state.fileInfo?.url) {
        URL.revokeObjectURL(state.fileInfo.url);
      }
    };
  }, [state.currentPlayer, state.fileInfo?.url]);

  return (
    <div className={cn("w-full max-w-6xl mx-auto p-4 space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Video Player</h1>
        <p className="text-muted-foreground">
          Upload and play video files locally in your browser
        </p>
      </div>

      {/* File Uploader */}
      <FileUploader
        onFileSelect={handleFileSelect}
        acceptedFormats={acceptedFormats}
        isLoading={state.isLoading}
        error={state.error}
      />

      {/* Player Container */}
      {state.fileInfo && (
        <div className="space-y-4">
          {/* File Information */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">File Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="font-medium">Name:</span> {state.fileInfo.name}
              </div>
              <div>
                <span className="font-medium">Size:</span> {(state.fileInfo.size / (1024 * 1024)).toFixed(2)} MB
              </div>
              <div>
                <span className="font-medium">Player:</span> {state.playerType}
              </div>
            </div>
          </div>

          {/* Video Player */}
          <div className="bg-black rounded-lg overflow-hidden">
            <div 
              ref={playerContainerRef}
              className="min-h-[300px] flex items-center justify-center"
            >
              {state.isLoading && (
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p>Loading player...</p>
                </div>
              )}
            </div>
          </div>

          {/* Player Status */}
          {state.isPlayerReady && (
            <div className="text-center text-sm text-muted-foreground">
              Player ready • Using {state.playerType === 'videojs' ? 'Video.js' : 'MediaElement.js'}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-destructive mb-1">
                {state.error.type.charAt(0).toUpperCase() + state.error.type.slice(1)} Error
              </h4>
              <p className="text-sm text-destructive/80 mb-2">
                {state.error.message}
              </p>
              {state.error.suggestions && state.error.suggestions.length > 0 && (
                <div className="text-xs text-destructive/70">
                  <p className="font-medium">Suggestions:</p>
                  <ul className="list-disc list-inside">
                    {state.error.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={clearError}
              className="text-destructive/60 hover:text-destructive text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}