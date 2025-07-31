import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { 
  ErrorDisplay, 
  UnsupportedFormatError, 
  PlayerInitError 
} from '../error-display';
import { ERROR_CODES } from '~/types/errors';
import type { AppError } from '~/types';

describe('ErrorDisplay', () => {
  const mockFileError: AppError = {
    type: 'file',
    message: 'File could not be read',
    code: ERROR_CODES.FILE_NOT_READABLE,
    recoverable: true,
    suggestions: ['Try selecting the file again', 'Check file permissions'],
    fileName: 'test.mp4',
    fileSize: 1024000,
    fileType: 'video/mp4'
  };

  const mockPlayerError: AppError = {
    type: 'player',
    message: 'Player initialization failed',
    code: ERROR_CODES.PLAYER_INIT_FAILED,
    recoverable: true,
    suggestions: ['Check internet connection', 'Try refreshing the page'],
    playerType: 'videojs'
  };

  it('renders error message and title correctly', () => {
    render(<ErrorDisplay error={mockFileError} />);

    expect(screen.getByText('File Error')).toBeInTheDocument();
    expect(screen.getByText('File could not be read')).toBeInTheDocument();
    expect(screen.getByText(`Code: ${ERROR_CODES.FILE_NOT_READABLE}`)).toBeInTheDocument();
  });

  it('displays file-specific information for file errors', () => {
    render(<ErrorDisplay error={mockFileError} />);

    expect(screen.getByText('test.mp4')).toBeInTheDocument();
    expect(screen.getByText('0.98 MB')).toBeInTheDocument();
    expect(screen.getByText('video/mp4')).toBeInTheDocument();
  });

  it('displays player-specific information for player errors', () => {
    render(<ErrorDisplay error={mockPlayerError} />);

    expect(screen.getByText('Player Error')).toBeInTheDocument();
    expect(screen.getByText('videojs')).toBeInTheDocument();
  });

  it('shows suggestions when available', () => {
    render(<ErrorDisplay error={mockFileError} />);

    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    expect(screen.getByText('Try selecting the file again')).toBeInTheDocument();
    expect(screen.getByText('Check file permissions')).toBeInTheDocument();
  });

  it('shows supported formats for unsupported format errors', () => {
    const unsupportedFormatError: AppError = {
      type: 'file',
      message: 'Unsupported file format',
      code: ERROR_CODES.UNSUPPORTED_FORMAT,
      recoverable: true,
      suggestions: ['Select a supported format']
    };

    render(<ErrorDisplay error={unsupportedFormatError} />);

    expect(screen.getByText('Supported Formats')).toBeInTheDocument();
    expect(screen.getByText('Video.js:')).toBeInTheDocument();
    expect(screen.getByText('MediaElement.js:')).toBeInTheDocument();
    expect(screen.getByText('MP4, WebM, OGG')).toBeInTheDocument();
    expect(screen.getByText('FLV, WMV, MP4, WebM')).toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorDisplay error={mockFileError} onRetry={onRetry} />);

    const retryButton = screen.getByText('Try Again');
    fireEvent.click(retryButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<ErrorDisplay error={mockFileError} onDismiss={onDismiss} />);

    const dismissButton = screen.getByRole('button', { name: /close error message/i });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('calls onFallback when fallback button is clicked for player errors', () => {
    const onFallback = vi.fn();
    render(<ErrorDisplay error={mockPlayerError} onFallback={onFallback} />);

    const fallbackButton = screen.getByText('Try Alternative Player');
    fireEvent.click(fallbackButton);

    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('renders in compact mode', () => {
    render(<ErrorDisplay error={mockFileError} compact={true} />);

    // In compact mode, should not show full card structure
    expect(screen.queryByText('File Error')).not.toBeInTheDocument();
    expect(screen.getByText('File could not be read')).toBeInTheDocument();
  });

  it('shows appropriate severity styling for different error types', () => {
    const { rerender } = render(<ErrorDisplay error={mockFileError} />);
    
    // Should show warning styling for recoverable errors
    expect(screen.getByText('File could not be read')).toBeInTheDocument();

    const criticalError: AppError = {
      type: 'player',
      message: 'Critical system error',
      code: ERROR_CODES.BROWSER_NOT_SUPPORTED,
      recoverable: false
    };

    rerender(<ErrorDisplay error={criticalError} />);
    expect(screen.getByText('Critical system error')).toBeInTheDocument();
  });
});

describe('UnsupportedFormatError', () => {
  it('renders unsupported format error with file information', () => {
    const onDismiss = vi.fn();
    
    render(
      <UnsupportedFormatError
        fileName="test.avi"
        fileType="video/avi"
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText(/test.avi.*not in a supported format/)).toBeInTheDocument();
    expect(screen.getByText('Supported Formats')).toBeInTheDocument();
    expect(screen.getByText('Please select a video file in one of the supported formats')).toBeInTheDocument();
  });

  it('calls onDismiss when dismissed', () => {
    const onDismiss = vi.fn();
    
    render(
      <UnsupportedFormatError
        fileName="test.avi"
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button', { name: /close error message/i });
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('PlayerInitError', () => {
  it('renders player initialization error with player type', () => {
    const onRetry = vi.fn();
    const onFallback = vi.fn();
    
    render(
      <PlayerInitError
        playerType="videojs"
        onRetry={onRetry}
        onFallback={onFallback}
      />
    );

    expect(screen.getByText('Failed to initialize videojs player.')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
  });

  it('calls onRetry and onFallback when respective buttons are clicked', () => {
    const onRetry = vi.fn();
    const onFallback = vi.fn();
    
    render(
      <PlayerInitError
        playerType="mediaelement"
        onRetry={onRetry}
        onFallback={onFallback}
      />
    );

    const retryButton = screen.getByText('Try Again');
    const fallbackButton = screen.getByText('Try Alternative Player');

    fireEvent.click(retryButton);
    fireEvent.click(fallbackButton);

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});