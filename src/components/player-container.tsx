"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { LoadingState, LoadingOverlay } from '~/components/ui/spinner';
import { ErrorDisplay, PlayerInitError } from '~/components/error-display';
import { privacySecurityService } from '~/services/privacy-security.service';
import type { PlayerContainerProps, Player, PlayerType } from '~/types';
import type { VideoJSOptions, MediaElementOptions } from '~/types/player-config';
import { ERROR_CODES } from '~/types/errors';
import { cn } from '~/lib/utils';

// Dynamic imports for player components to ensure client-side only loading
const VideoJSPlayerComponent = dynamic(() => import('./players/videojs-player'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px] bg-black rounded-lg">
      <LoadingState
        message="Loading Video.js player..."
        size="lg"
        className="text-white"
      />
    </div>
  )
});

const MediaElementPlayerComponent = dynamic(() => import('./players/mediaelement-player'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[300px] bg-black rounded-lg">
      <LoadingState
        message="Loading MediaElement.js player..."
        size="lg"
        className="text-white"
      />
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
      <div className={cn("bg-black rounded-lg overflow-hidden min-h-[200px] sm:min-h-[300px] lg:min-h-[400px] flex items-center justify-center p-4 sm:p-6", className)}>
        <PlayerInitError
          playerType={playerType}
          onRetry={handleRetry}
          onFallback={handleFallback}
          className="bg-background/95 backdrop-blur-sm max-w-md w-full"
        />
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn("bg-black rounded-lg overflow-hidden w-full aspect-video", className)}
    >
      {playerType === 'videojs' ? (
        <VideoJSPlayerComponent
          file={file}
          fileUrl={fileUrlRef.current || ''}
          options={videoJSOptions}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          key={`videojs-${file.name}-${file.lastModified}-${state.retryCount}`}
        />
      ) : (
        <MediaElementPlayerComponent
          file={file}
          fileUrl={fileUrlRef.current || ''}
          options={mediaElementOptions}
          onReady={handlePlayerReady}
          onError={handlePlayerError}
          key={`mediaelement-${file.name}-${file.lastModified}-${state.retryCount}`}
        />
      )}
      
      {/* Loading overlay */}
      <LoadingOverlay
        isVisible={state.isLoading}
        message={state.retryCount > 0 ? `Retrying... (${state.retryCount}/${MAX_RETRY_ATTEMPTS})` : 'Initializing player...'}
        className="bg-black/75 text-white"
      />
    </div>
  );
}