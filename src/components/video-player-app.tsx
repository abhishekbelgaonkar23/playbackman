"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { FileUploader } from './file-uploader';
import { PlayerContainer } from './player-container';
import { ErrorBoundary } from './error-boundary';
import { ErrorDisplay } from './error-display';
import { LoadingState } from './ui/spinner';
import { fileDetectionService } from '~/services/file-detection.service';
import { useResponsive, useIsMobile, useIsLandscape } from '~/hooks/use-responsive';
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
  // Responsive hooks
  const viewport = useResponsive();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

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
    <ErrorBoundary>
      <div className={cn(
        "w-full mx-auto space-y-4 sm:space-y-6",
        // Responsive max-width and padding
        "max-w-7xl p-3 sm:p-4 lg:p-6",
        // Adjust layout for mobile landscape
        isMobile && isLandscape && "space-y-2 p-2",
        className
      )}>
        {/* Welcome message - more compact on mobile landscape */}
        <div className={cn(
          "text-center space-y-2 px-2",
          isMobile && isLandscape && "space-y-1"
        )}>
          {!(isMobile && isLandscape) && (
            <p className="text-muted-foreground text-sm sm:text-base">
              Upload and play video files locally in your browser
            </p>
          )}
        </div>

        {/* File Uploader */}
        <FileUploader
          onFileSelect={handleFileSelect}
          acceptedFormats={acceptedFormats}
          isLoading={state.isLoading}
          error={state.error}
        />

        {/* Loading State for File Processing */}
        {state.isLoading && !state.fileInfo && (
          <div className="flex justify-center py-8">
            <LoadingState
              message="Processing video file..."
              size="lg"
            />
          </div>
        )}

        {/* Player Container */}
        {state.fileInfo && (
          <div className="space-y-3 sm:space-y-4">
            {/* File Information with enhanced visual hierarchy */}
            <div className="bg-card border rounded-lg p-4 sm:p-6 transition-all duration-300 ease-in-out shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base sm:text-lg text-card-foreground">
                  Now Playing
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground font-medium">
                    {state.playerType === 'videojs' ? 'Video.js' : 'MediaElement.js'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                {/* File name with icon */}
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-card-foreground truncate" title={state.fileInfo.name}>
                      {state.fileInfo.name}
                    </p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{(state.fileInfo.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <span className="uppercase">{state.fileInfo.extension}</span>
                      <span>{state.fileInfo.type || 'Unknown type'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Video Player with smooth transition and responsive sizing */}
            <div className="transition-all duration-300 ease-in-out">
              <PlayerContainer
                file={state.selectedFile!}
                playerType={state.playerType!}
                onReady={handlePlayerReady}
                onError={handlePlayerError}
                className={cn(
                  // Base responsive heights
                  "min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]",
                  // Mobile landscape optimization
                  isMobile && isLandscape && "min-h-[150px]"
                )}
              />
            </div>

            {/* Player Status with fade-in animation */}
            {state.isPlayerReady && (
              <div className="text-center text-xs sm:text-sm text-muted-foreground animate-in fade-in duration-500 bg-muted/30 rounded-full px-3 py-1 inline-block">
                ✓ Player ready and loaded
              </div>
            )}
          </div>
        )}

        {/* Enhanced Error Display */}
        {state.error && !state.isLoading && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <ErrorDisplay
              error={state.error}
              onDismiss={clearError}
              onRetry={() => {
                // Retry file processing if it's a file error
                if (state.error?.type === 'file' && state.selectedFile) {
                  clearError();
                  handleFileSelect(state.selectedFile);
                }
              }}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}