"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './file-uploader';
import { PlayerContainer } from './player-container';
import { fileDetectionService } from '~/services/file-detection.service';
import { cn } from '~/lib/utils';
import type { 
  VideoPlayerAppProps, 
  AppState, 
  FileInfo, 
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

      // File processing complete - PlayerContainer will handle player initialization
      setState(prev => ({ 
        ...prev, 
        isLoading: false
      }));

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
   * Handles player ready event from PlayerContainer
   */
  const handlePlayerReady = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isPlayerReady: true,
      isLoading: false
    }));
  }, []);

  /**
   * Handles player errors from PlayerContainer
   */
  const handlePlayerError = useCallback((error: AppError) => {
    setState(prev => ({ 
      ...prev, 
      error,
      isLoading: false,
      isPlayerReady: false
    }));
  }, []);

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
      // Clean up object URLs
      if (state.fileInfo?.url) {
        URL.revokeObjectURL(state.fileInfo.url);
      }
    };
  }, [state.fileInfo?.url]);

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
          <PlayerContainer
            file={state.selectedFile!}
            playerType={state.playerType!}
            onReady={handlePlayerReady}
            onError={handlePlayerError}
            className="min-h-[300px]"
          />

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