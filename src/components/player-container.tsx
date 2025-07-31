"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { PlayerContainerProps, Player, PlayerType } from '~/types';
import type { VideoJSOptions, MediaElementOptions } from '~/types/player-config';
import { ERROR_CODES } from '~/types/errors';
import { cn } from '~/lib/utils';

// Dynamic imports for player components to ensure client-side only loading
const VideoJSPlayerComponent = dynamic(() => import('./players/videojs-player'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px] bg-black rounded-lg">
      <div className="text-white text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>Loading Video.js player...</p>
      </div>
    </div>
  )
});

const MediaElementPlayerComponent = dynamic(() => import('./players/mediaelement-player'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px] bg-black rounded-lg">
      <div className="text-white text-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p>Loading MediaElement.js player...</p>
      </div>
    </div>
  )
});

interface PlayerContainerState {
  isLoading: boolean;
  isReady: boolean;
  hasError: boolean;
  errorMessage: string | null;
  retryCount: number;
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

export function PlayerContainer({ 
  file, 
  playerType, 
  onError, 
  onReady, 
  className 
}: PlayerContainerProps) {
  const [state, setState] = useState<PlayerContainerState>({
    isLoading: true,
    isReady: false,
    hasError: false,
    errorMessage: null,
    retryCount: 0
  });

  const playerRef = useRef<Player | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileUrlRef = useRef<string | null>(null);

  /**
   * Creates object URL for the file and manages cleanup
   */
  const createFileUrl = useCallback((file: File): string => {
    // Clean up previous URL if exists
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
    }
    
    // Create new object URL
    const url = URL.createObjectURL(file);
    fileUrlRef.current = url;
    return url;
  }, []);

  /**
   * Handles player ready event
   */
  const handlePlayerReady = useCallback((player: Player) => {
    playerRef.current = player;
    setState(prev => ({
      ...prev,
      isLoading: false,
      isReady: true,
      hasError: false,
      errorMessage: null
    }));
    onReady();
  }, [onReady]);

  /**
   * Handles player errors with retry logic
   */
  const handlePlayerError = useCallback((error: string, canRetry: boolean = true) => {
    const shouldRetry = canRetry && state.retryCount < MAX_RETRY_ATTEMPTS;
    
    if (shouldRetry) {
      // Retry after delay
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          retryCount: prev.retryCount + 1,
          isLoading: true,
          hasError: false,
          errorMessage: null
        }));
      }, RETRY_DELAY * (state.retryCount + 1)); // Exponential backoff
    } else {
      // Max retries reached or non-retryable error
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: error
      }));

      onError({
        type: 'player',
        message: error,
        code: ERROR_CODES.PLAYER_INIT_FAILED,
        recoverable: true,
        suggestions: [
          'Try refreshing the page',
          'Check if your browser supports the video format',
          'Try selecting a different video file'
        ],
        playerType
      });
    }
  }, [state.retryCount, onError, playerType]);

  /**
   * Handles fallback to alternative player
   */
  const handleFallback = useCallback(() => {
    const fallbackPlayerType: PlayerType = playerType === 'videojs' ? 'mediaelement' : 'videojs';
    
    onError({
      type: 'player',
      message: `${playerType} player failed, attempting fallback to ${fallbackPlayerType}`,
      code: ERROR_CODES.PLAYER_INIT_FAILED,
      recoverable: true,
      suggestions: [
        `Switching to ${fallbackPlayerType} player`,
        'This may resolve compatibility issues'
      ],
      playerType: fallbackPlayerType
    });
  }, [playerType, onError]);

  /**
   * Manual retry function
   */
  const handleRetry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      hasError: false,
      errorMessage: null,
      retryCount: 0
    }));
  }, []);

  /**
   * Cleanup function
   */
  const cleanup = useCallback(() => {
    // Destroy player instance
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying player:', error);
      }
      playerRef.current = null;
    }

    // Clean up object URL
    if (fileUrlRef.current) {
      URL.revokeObjectURL(fileUrlRef.current);
      fileUrlRef.current = null;
    }
  }, []);

  /**
   * Effect to handle file changes and cleanup
   */
  useEffect(() => {
    // Reset state when file or player type changes
    setState({
      isLoading: true,
      isReady: false,
      hasError: false,
      errorMessage: null,
      retryCount: 0
    });

    // Create file URL
    createFileUrl(file);

    // Cleanup on unmount or file change
    return cleanup;
  }, [file, playerType, createFileUrl, cleanup]);

  /**
   * Effect for cleanup on unmount
   */
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Prepare player options
  const videoJSOptions: VideoJSOptions = {
    controls: true,
    responsive: true,
    fluid: true,
    playbackRates: [0.5, 1, 1.25, 1.5, 2],
    preload: 'metadata',
    sources: fileUrlRef.current ? [{
      src: fileUrlRef.current,
      type: file.type || 'video/mp4'
    }] : undefined
  };

  const mediaElementOptions: MediaElementOptions = {
    controls: true,
    enableAutosize: true,
    features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
    stretching: 'responsive'
  };

  // Error state rendering
  if (state.hasError) {
    return (
      <div className={cn("bg-black rounded-lg overflow-hidden", className)}>
        <div className="flex items-center justify-center min-h-[300px] p-6">
          <div className="text-center text-white space-y-4">
            <div className="text-red-400 text-lg font-semibold">
              Player Error
            </div>
            <p className="text-sm text-gray-300 max-w-md">
              {state.errorMessage}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                Retry
              </button>
              <button
                onClick={handleFallback}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors"
              >
                Try Alternative Player
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("bg-black rounded-lg overflow-hidden", className)}
    >
      {playerType === 'videojs' ? (
        <VideoJSPlayerComponent
          file={file}
          fileUrl={fileUrlRef.current || ''}
          options={videoJSOptions}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          key={`videojs-${file.name}-${state.retryCount}`}
        />
      ) : (
        <MediaElementPlayerComponent
          file={file}
          fileUrl={fileUrlRef.current || ''}
          options={mediaElementOptions}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          key={`mediaelement-${file.name}-${state.retryCount}`}
        />
      )}
      
      {/* Loading overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">
              {state.retryCount > 0 ? `Retrying... (${state.retryCount}/${MAX_RETRY_ATTEMPTS})` : 'Initializing player...'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}