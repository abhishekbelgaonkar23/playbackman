"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { PlayerContainer } from './player-container';
import { Playlist } from './playlist';
import { VideoBacklight } from './video-backlight';
import { ErrorBoundary } from './error-boundary';
import { ErrorDisplay } from './error-display';
import { LoadingState } from './ui/spinner';
import { KeyboardShortcutsLegend } from './keyboard-shortcuts-legend';
import { CompactFileUploader } from './compact-file-uploader';
import { fileDetectionService } from '~/services/file-detection.service';
import { privacySecurityService } from '~/services/privacy-security.service';
import { thumbnailService } from '~/services/thumbnail.service';
import { useResponsive, useIsMobile, useIsLandscape } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import type { 
  VideoPlayerAppProps, 
  AppState, 
  FileInfo, 
  PlaylistItem,
  PlayerType,
  AppError 
} from '~/types';
import { ERROR_CODES } from '~/types/errors';

export function VideoPlayerApp({ className }: VideoPlayerAppProps) {
  // Responsive hooks
  const viewport = useResponsive();
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();

  // Player ref for keyboard shortcuts
  const playerRef = useRef<any>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Application state
  const [state, setState] = useState<AppState>({
    selectedFile: null,
    fileInfo: null,
    playlist: [],
    currentPlaylistIndex: -1,
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
   * Creates file info object from File with secure Object URL and thumbnail
   */
  const createFileInfo = useCallback(async (file: File): Promise<FileInfo> => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Use privacy security service to create secure Object URL
    let url: string;
    try {
      url = privacySecurityService.createSecureObjectUrl(file);
    } catch (error) {
      console.error('Failed to create secure Object URL:', error);
      throw new Error('Failed to process file for security reasons');
    }
    
    // Generate thumbnail and get video metadata
    let duration: number | undefined;
    let thumbnail: string | undefined;
    
    try {
      const metadata = await thumbnailService.generateThumbnail(file);
      duration = metadata.duration;
      thumbnail = metadata.thumbnail;
    } catch (error) {
      console.warn('Failed to generate thumbnail:', error);
      // Continue without thumbnail
    }
    
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      extension,
      lastModified: file.lastModified,
      url,
      duration,
      thumbnail
    };
  }, []);

  /**
   * Handles file selection from FileUploader
   */
  const handleFileSelect = useCallback(async (files: File | File[]) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null
    }));

    try {
      const fileArray = Array.isArray(files) ? files : [files];
      const newPlaylistItems: PlaylistItem[] = [];
      
      // Process each file
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]!;
        
        // Validate file using FileDetectionService
        const validationResult = fileDetectionService.validateFile(file);
        
        if (!validationResult.isValid) {
          console.warn(`Skipping invalid file: ${file.name} - ${validationResult.error}`);
          continue;
        }

        // Create file info with thumbnail
        const fileInfo = await createFileInfo(file);
        const playerType = validationResult.playerType!;

        // Create playlist item
        const playlistItem: PlaylistItem = {
          id: `${file.name}-${file.lastModified}-${Math.random()}`,
          file,
          fileInfo,
          playerType,
          position: state.playlist.length + newPlaylistItems.length
        };

        newPlaylistItems.push(playlistItem);
      }

      if (newPlaylistItems.length === 0) {
        const error: AppError = {
          type: 'file',
          message: 'No valid video files found',
          code: ERROR_CODES.UNSUPPORTED_FORMAT,
          recoverable: true,
          suggestions: ['Please select supported video formats (MP4, WebM, OGG, FLV, WMV)']
        };
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error
        }));
        return;
      }

      // Add to playlist
      setState(prev => {
        const updatedPlaylist = [...prev.playlist, ...newPlaylistItems];
        const shouldStartPlaying = prev.playlist.length === 0; // Start playing if playlist was empty
        
        return {
          ...prev,
          playlist: updatedPlaylist,
          currentPlaylistIndex: shouldStartPlaying ? 0 : prev.currentPlaylistIndex,
          selectedFile: shouldStartPlaying ? newPlaylistItems[0]!.file : prev.selectedFile,
          fileInfo: shouldStartPlaying ? newPlaylistItems[0]!.fileInfo : prev.fileInfo,
          playerType: shouldStartPlaying ? newPlaylistItems[0]!.playerType : prev.playerType,
          isPlayerReady: false,
          isLoading: false
        };
      });

    } catch (error) {
      const appError: AppError = {
        type: 'file',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        code: ERROR_CODES.FILE_NOT_READABLE,
        recoverable: true,
        suggestions: ['Please try selecting the files again']
      };

      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: appError
      }));
    }
  }, [createFileInfo, state.playlist.length]);

  /**
   * Handles player ready event from PlayerContainer
   */
  const handlePlayerReady = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      isPlayerReady: true,
      isLoading: false
    }));
    
    // Try to get the video element for backlight effect
    setTimeout(() => {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      if (videoElement) {
        videoElementRef.current = videoElement;
      }
    }, 100);
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
   * Handles playlist reordering
   */
  const handlePlaylistReorder = useCallback((newPlaylist: PlaylistItem[]) => {
    setState(prev => {
      // Find the current item in the new playlist
      const currentItem = prev.currentPlaylistIndex >= 0 ? prev.playlist[prev.currentPlaylistIndex] : null;
      const newCurrentIndex = currentItem ? newPlaylist.findIndex(item => item.id === currentItem.id) : -1;
      
      return {
        ...prev,
        playlist: newPlaylist,
        currentPlaylistIndex: newCurrentIndex
      };
    });
  }, []);

  /**
   * Handles playlist item selection
   */
  const handlePlaylistSelect = useCallback((index: number) => {
    const item = state.playlist[index];
    if (!item) return;

    setState(prev => ({
      ...prev,
      currentPlaylistIndex: index,
      selectedFile: item.file,
      fileInfo: item.fileInfo,
      playerType: item.playerType,
      isPlayerReady: false
    }));
  }, [state.playlist]);

  /**
   * Handles playlist item removal
   */
  const handlePlaylistRemove = useCallback((index: number) => {
    setState(prev => {
      const newPlaylist = prev.playlist.filter((_, i) => i !== index);
      let newCurrentIndex = prev.currentPlaylistIndex;
      
      // Adjust current index if needed
      if (index === prev.currentPlaylistIndex) {
        // If removing current item, play next item or previous if no next
        if (newPlaylist.length === 0) {
          newCurrentIndex = -1;
        } else if (index >= newPlaylist.length) {
          newCurrentIndex = newPlaylist.length - 1;
        }
        // else keep the same index (next item will move to current position)
      } else if (index < prev.currentPlaylistIndex) {
        // If removing item before current, adjust index
        newCurrentIndex = prev.currentPlaylistIndex - 1;
      }

      // Update current file if current item changed
      const newCurrentItem = newCurrentIndex >= 0 ? newPlaylist[newCurrentIndex] : null;
      
      return {
        ...prev,
        playlist: newPlaylist,
        currentPlaylistIndex: newCurrentIndex,
        selectedFile: newCurrentItem?.file || null,
        fileInfo: newCurrentItem?.fileInfo || null,
        playerType: newCurrentItem?.playerType || null,
        isPlayerReady: newCurrentItem ? false : prev.isPlayerReady
      };
    });
  }, []);

  /**
   * Clears current error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Handles keyboard shortcuts
   */
  const handleKeyboardShortcut = useCallback((action: string, data?: any) => {
    if (!playerRef.current) return;

    const player = playerRef.current;
    
    switch (action) {
      case 'toggle-play':
        if (player.isPlaying) {
          player.pause();
        } else {
          player.play();
        }
        break;
      
      case 'rewind-10':
        player.seek(Math.max(0, player.currentTime - 10));
        break;
      
      case 'forward-10':
        player.seek(Math.min(player.duration || 0, player.currentTime + 10));
        break;
      
      case 'seek-back-5':
        player.seek(Math.max(0, player.currentTime - 5));
        break;
      
      case 'seek-forward-5':
        player.seek(Math.min(player.duration || 0, player.currentTime + 5));
        break;
      
      case 'jump-to-percent':
        if (player.duration && typeof data === 'number') {
          player.seek((data / 100) * player.duration);
        }
        break;
      
      case 'jump-to-start':
        player.seek(0);
        break;
      
      case 'jump-to-end':
        if (player.duration) {
          player.seek(player.duration - 1);
        }
        break;
      
      case 'volume-up':
        player.setVolume(Math.min(1, player.volume + 0.1));
        break;
      
      case 'volume-down':
        player.setVolume(Math.max(0, player.volume - 0.1));
        break;
      
      case 'toggle-mute':
        player.toggleMute();
        break;
      
      case 'toggle-fullscreen':
        player.toggleFullscreen();
        break;
      
      case 'toggle-captions':
        player.toggleCaptions();
        break;
      
      case 'speed-up':
        player.setPlaybackRate(Math.min(2, player.playbackRate + 0.25));
        break;
      
      case 'speed-down':
        player.setPlaybackRate(Math.max(0.25, player.playbackRate - 0.25));
        break;
      
      case 'frame-back':
        if (!player.isPlaying && player.duration) {
          player.seek(Math.max(0, player.currentTime - (1/30))); // Assume 30fps
        }
        break;
      
      case 'frame-forward':
        if (!player.isPlaying && player.duration) {
          player.seek(Math.min(player.duration, player.currentTime + (1/30))); // Assume 30fps
        }
        break;
      
      case 'next-video':
        navigatePlaylist('next');
        break;
      
      case 'previous-video':
        navigatePlaylist('previous');
        break;
    }
  }, []);

  /**
   * Navigate to next/previous playlist item
   */
  const navigatePlaylist = useCallback((direction: 'next' | 'previous') => {
    if (state.playlist.length === 0) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = state.currentPlaylistIndex + 1;
      if (newIndex >= state.playlist.length) {
        newIndex = 0; // Loop to beginning
      }
    } else {
      newIndex = state.currentPlaylistIndex - 1;
      if (newIndex < 0) {
        newIndex = state.playlist.length - 1; // Loop to end
      }
    }
    
    handlePlaylistSelect(newIndex);
  }, [state.playlist.length, state.currentPlaylistIndex, handlePlaylistSelect]);

  /**
   * Cleanup on unmount and file changes
   */
  useEffect(() => {
    return () => {
      // Clean up object URLs for all playlist items
      state.playlist.forEach(item => {
        if (item.fileInfo.url) {
          privacySecurityService.revokeSecureObjectUrl(item.fileInfo.url);
        }
      });
    };
  }, [state.playlist]);

  /**
   * Global cleanup on app unmount
   */
  useEffect(() => {
    // Verify client-side only operation on mount
    if (!privacySecurityService.verifyClientSideOnly()) {
      console.error('[Privacy] Application is not running in client-side only mode!');
    }

    // Verify offline capability
    if (!privacySecurityService.verifyOfflineCapability()) {
      console.warn('[Privacy] Application may not work properly offline');
    }

    return () => {
      // Cleanup all Object URLs on app unmount
      privacySecurityService.revokeAllObjectUrls();
    };
  }, []);

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
        {/* Welcome message - only show when no playlist */}
        {state.playlist.length === 0 && (
          <div className="text-center space-y-2 px-2">
            <h1 className="text-2xl sm:text-3xl font-bold">PlaybackMan</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Your local video player - no uploads, complete privacy
            </p>
          </div>
        )}

        {/* Show file uploader when no playlist */}
        {state.playlist.length === 0 && (
          <div className="space-y-4">
            <CompactFileUploader
              onFileSelect={handleFileSelect}
              acceptedFormats={acceptedFormats}
              isLoading={state.isLoading}
              error={state.error}
              multiple={true}
            />
            
            {/* Show keyboard shortcuts instead of empty playlist message */}
            <div className="animate-in fade-in duration-500">
              <KeyboardShortcutsLegend onShortcut={handleKeyboardShortcut} />
            </div>
          </div>
        )}

        {/* Player Container */}
        {state.fileInfo && state.selectedFile && (
          <div className="space-y-3 sm:space-y-4">
            {/* Video Player with ambient backlight and smooth transition */}
            <div className="relative transition-all duration-300 ease-in-out">
              {/* Ambient video backlight */}
              <VideoBacklight
                videoElement={videoElementRef.current}
                intensity={0.4}
                enabled={state.isPlayerReady}
              />
              
              {/* Static backlight fallback */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5 rounded-lg blur-xl scale-110 -z-10" />
              
              <PlayerContainer
                ref={playerRef}
                file={state.selectedFile}
                playerType={state.playerType!}
                onReady={handlePlayerReady}
                onError={handlePlayerError}
                onPreviousVideo={() => navigatePlaylist('previous')}
                onNextVideo={() => navigatePlaylist('next')}
                className={cn(
                  // Base responsive heights
                  "min-h-[200px] sm:min-h-[300px] lg:min-h-[400px]",
                  // Mobile landscape optimization
                  isMobile && isLandscape && "min-h-[150px]",
                  // Enhanced styling with shadow
                  "shadow-2xl shadow-black/20 relative z-10 border border-white/10"
                )}
              />
            </div>

            {/* Player Status with fade-in animation */}
            {state.isPlayerReady && (
              <div className="flex justify-center">
                <div className="text-xs sm:text-sm text-muted-foreground animate-in fade-in duration-500 bg-muted/30 rounded-full px-3 py-1">
                  ✓ Player ready and loaded
                </div>
              </div>
            )}

          </div>
        )}

        {/* Playlist below video player */}
        {state.playlist.length > 0 && (
          <div className="space-y-4">
            {/* Compact uploader for adding more videos */}
            <div className="animate-in fade-in duration-500">
              <CompactFileUploader
                onFileSelect={handleFileSelect}
                acceptedFormats={acceptedFormats}
                isLoading={state.isLoading}
                error={state.error}
                multiple={true}
              />
            </div>
            
            <Playlist
              playlist={state.playlist}
              currentIndex={state.currentPlaylistIndex}
              onReorder={handlePlaylistReorder}
              onSelect={handlePlaylistSelect}
              onRemove={handlePlaylistRemove}
              onFileSelect={handleFileSelect}
              acceptedFormats={acceptedFormats}
              isLoading={state.isLoading}
              error={state.error}
            />
          </div>
        )}

        {/* Keyboard Shortcuts Legend - below playlist */}
        {state.isPlayerReady && (
          <div className="animate-in fade-in duration-700 delay-300">
            <KeyboardShortcutsLegend onShortcut={handleKeyboardShortcut} />
          </div>
        )}

        {/* Enhanced Error Display */}
        {state.error && !state.isLoading && (
          <div className="animate-in slide-in-from-top-2 duration-300">
            <ErrorDisplay
              error={state.error}
              onDismiss={clearError}
              onRetry={() => {
                // Clear error and allow user to try again
                clearError();
              }}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}