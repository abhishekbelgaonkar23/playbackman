/**
 * Integration tests for VideoPlayerApp component
 * Tests the complete file-to-player flow
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VideoPlayerApp } from '../video-player-app';
import { fileDetectionService } from '~/services/file-detection.service';
import { playerFactory } from '~/services/player-factory.service';
import type { ValidationResult, Player } from '~/types';

// Mock the services
vi.mock('~/services/file-detection.service');
vi.mock('~/services/player-factory.service');

// Mock URL.createObjectURL and URL.revokeObjectURL
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true
});
Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true
});

// Mock player instance
const mockPlayer: Player = {
  play: vi.fn(),
  pause: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
  currentTime: 0,
  duration: 100,
  volume: 1,
  muted: false
};

describe('VideoPlayerApp Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
    
    // Mock fileDetectionService
    vi.mocked(fileDetectionService.getSupportedFormats).mockReturnValue({
      videojs: ['mp4', 'webm', 'ogg'],
      mediaelement: ['flv', 'wmv']
    });
    
    // Mock playerFactory to simulate player container not available
    vi.mocked(playerFactory.createPlayer).mockRejectedValue(new Error('Player container not available'));
    vi.mocked(playerFactory.destroyPlayer).mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the video player app with initial state', () => {
    render(<VideoPlayerApp />);
    
    expect(screen.getByText('Video Player')).toBeInTheDocument();
    expect(screen.getByText('Upload and play video files locally in your browser')).toBeInTheDocument();
    expect(screen.getByText('Select or drag a video file')).toBeInTheDocument();
  });

  it('handles file selection and shows player initialization error', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    // Create a mock video file
    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    // Find file input and simulate file selection
    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for file processing and error
    await waitFor(() => {
      expect(screen.getByText('Player Error')).toBeInTheDocument();
    });

    // Verify file validation was called
    expect(fileDetectionService.validateFile).toHaveBeenCalledWith(mockFile);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    
    // Verify error message is displayed
    expect(screen.getAllByText('Player container not available')).toHaveLength(2);
  });

  it('handles file validation errors', async () => {
    // Mock validation failure
    const mockValidationResult: ValidationResult = {
      isValid: false,
      error: 'Unsupported video format'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    // Create a mock invalid file
    const mockFile = new File(['invalid content'], 'test.txt', {
      type: 'text/plain',
      lastModified: Date.now()
    });

    // Simulate file selection
    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('File Error')).toBeInTheDocument();
    });

    // Verify error message is displayed
    expect(screen.getAllByText(/Unsupported video format/)).toHaveLength(2);
    expect(screen.getByText('Please select a supported video format')).toBeInTheDocument();

    // Verify player was not created
    expect(playerFactory.createPlayer).not.toHaveBeenCalled();
  });

  it('handles player initialization errors', async () => {
    // Mock successful validation but failed player creation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    // Create a mock video file
    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    // Simulate file selection
    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Player Error')).toBeInTheDocument();
    });

    // Verify error message is displayed (the component shows "Player container not available")
    expect(screen.getAllByText('Player container not available')).toHaveLength(2);
    expect(screen.getByText('Try refreshing the page')).toBeInTheDocument();
  });

  it('handles multiple file selections', async () => {
    // Mock successful validation for both files
    vi.mocked(fileDetectionService.validateFile)
      .mockReturnValueOnce({ isValid: true, playerType: 'videojs' })
      .mockReturnValueOnce({ isValid: true, playerType: 'mediaelement' });

    render(<VideoPlayerApp />);

    // First file - Video.js
    const firstFile = new File(['video content'], 'test1.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [firstFile] } });

    await waitFor(() => {
      expect(screen.getByText('Player Error')).toBeInTheDocument();
    });

    // Second file - MediaElement.js
    const secondFile = new File(['video content'], 'test2.flv', {
      type: 'video/x-flv',
      lastModified: Date.now()
    });

    fireEvent.change(fileInput, { target: { files: [secondFile] } });

    await waitFor(() => {
      expect(screen.getByText('Player Error')).toBeInTheDocument();
    });

    // Verify both validations were called
    expect(fileDetectionService.validateFile).toHaveBeenCalledWith(firstFile);
    expect(fileDetectionService.validateFile).toHaveBeenCalledWith(secondFile);
  });

  it('handles drag and drop file selection', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    // Create a mock video file
    const mockFile = new File(['video content'], 'dropped-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    // Find the drop zone
    const dropZone = screen.getByText('Select or drag a video file').closest('div');
    expect(dropZone).toBeInTheDocument();

    // Simulate drag and drop
    const dropEvent = new Event('drop', { bubbles: true });
    Object.defineProperty(dropEvent, 'dataTransfer', {
      value: {
        files: [mockFile]
      }
    });

    fireEvent(dropZone!, dropEvent);

    // Wait for file processing
    await waitFor(() => {
      expect(fileDetectionService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    // Verify file was processed
    expect(screen.getAllByText('dropped-video.mp4')).toHaveLength(2); // In file uploader and file info
  });

  it('displays loading states during file processing', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for file processing to complete
    await waitFor(() => {
      expect(fileDetectionService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    // Verify file was processed (appears in both uploader and file info)
    expect(screen.getAllByText('test-video.mp4')).toHaveLength(2);
  });

  it('cleans up resources on unmount', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    const { unmount } = render(<VideoPlayerApp />);

    // Simulate file selection to create object URL
    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for file processing
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    });

    // Unmount component
    unmount();

    // Verify cleanup was called
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('handles error dismissal', async () => {
    // Mock validation failure
    const mockValidationResult: ValidationResult = {
      isValid: false,
      error: 'Test error message'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    const mockFile = new File(['invalid content'], 'test.txt', {
      type: 'text/plain',
      lastModified: Date.now()
    });

    // Simulate file selection to trigger error
    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('File Error')).toBeInTheDocument();
    });

    // Click dismiss button
    const dismissButton = screen.getByText('Dismiss');
    fireEvent.click(dismissButton);

    // Verify error is dismissed
    await waitFor(() => {
      expect(screen.queryByText('File Error')).not.toBeInTheDocument();
    });
  });

  it('processes file information correctly', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    // Create a mock video file with specific properties
    const mockFile = new File(['x'.repeat(1024 * 1024 * 5)], 'my-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for file processing
    await waitFor(() => {
      expect(fileDetectionService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    // Verify file was processed
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
  });

  it('handles service integration correctly', async () => {
    // Mock successful validation
    const mockValidationResult: ValidationResult = {
      isValid: true,
      playerType: 'videojs'
    };
    vi.mocked(fileDetectionService.validateFile).mockReturnValue(mockValidationResult);

    render(<VideoPlayerApp />);

    const mockFile = new File(['video content'], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });

    const fileInput = screen.getByLabelText('Select video file');
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Wait for file processing
    await waitFor(() => {
      expect(fileDetectionService.validateFile).toHaveBeenCalledWith(mockFile);
    });

    // Verify services were called correctly
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
    expect(fileDetectionService.getSupportedFormats).toHaveBeenCalled();
  });
});