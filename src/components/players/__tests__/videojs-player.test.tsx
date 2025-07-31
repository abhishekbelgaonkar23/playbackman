import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import VideoJSPlayer from '../videojs-player';
import type { VideoJSOptions } from '~/types/player-config';

// Mock Video.js
const mockVideoJSInstance = {
  play: vi.fn(),
  pause: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  ready: vi.fn((callback) => callback()),
  currentTime: vi.fn(() => 0),
  duration: vi.fn(() => 100),
  volume: vi.fn(() => 1),
  muted: vi.fn(() => false),
  error: vi.fn(() => null)
};

const mockVideoJS = vi.fn((element, options, callback) => {
  // Simulate async initialization
  setTimeout(() => {
    if (callback) callback();
  }, 50);
  return mockVideoJSInstance;
});

vi.mock('video.js', () => ({
  default: mockVideoJS
}));

// Mock dynamic import
vi.mock('video.js', async () => {
  return {
    default: mockVideoJS
  };
});

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true
});

// Mock document.head.appendChild for CSS loading
const mockAppendChild = vi.fn();
Object.defineProperty(document, 'head', {
  value: {
    appendChild: mockAppendChild
  },
  writable: true
});

Object.defineProperty(document, 'querySelector', {
  value: vi.fn(() => null), // Simulate CSS not loaded
  writable: true
});

describe('VideoJSPlayer', () => {
  const mockFile = new File(['test content'], 'test-video.mp4', {
    type: 'video/mp4'
  });

  const mockOptions: VideoJSOptions = {
    controls: true,
    responsive: true,
    fluid: true,
    playbackRates: [0.5, 1, 1.5, 2]
  };

  const defaultProps = {
    file: mockFile,
    fileUrl: 'blob:mock-url',
    options: mockOptions,
    onReady: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
    mockVideoJSInstance.error.mockReturnValue(null);
    mockVideoJSInstance.ready.mockImplementation((callback) => callback());
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders video element with correct attributes', () => {
    render(<VideoJSPlayer {...defaultProps} />);
    
    const videoElement = screen.getByRole('application', { hidden: true }) || 
                         document.querySelector('video');
    
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', 'blob:mock-url');
    expect(videoElement).toHaveAttribute('preload', 'metadata');
    expect(videoElement).toHaveAttribute('playsinline');
  });

  it('loads Video.js CSS when not already present', async () => {
    render(<VideoJSPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalledWith(
        expect.objectContaining({
          rel: 'stylesheet',
          href: expect.stringContaining('video-js.css')
        })
      );
    });
  });

  it('initializes Video.js with correct options', async () => {
    render(<VideoJSPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockVideoJS).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining({
          ...mockOptions,
          sources: [{
            src: 'blob:mock-url',
            type: 'video/mp4'
          }]
        }),
        expect.any(Function)
      );
    });
  });

  it('calls onReady when player initializes successfully', async () => {
    const onReady = vi.fn();
    render(<VideoJSPlayer {...defaultProps} onReady={onReady} />);
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalledWith(
        expect.objectContaining({
          play: expect.any(Function),
          pause: expect.any(Function),
          destroy: expect.any(Function),
          on: expect.any(Function)
        })
      );
    });
  });

  it('sets up error event listeners', async () => {
    render(<VideoJSPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockVideoJSInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockVideoJSInstance.on).toHaveBeenCalledWith('loadstart', expect.any(Function));
      expect(mockVideoJSInstance.on).toHaveBeenCalledWith('canplay', expect.any(Function));
      expect(mockVideoJSInstance.on).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
    });
  });

  it('handles Video.js initialization errors', async () => {
    const mockError = { code: 4, message: 'Video format not supported' };
    mockVideoJSInstance.error.mockReturnValue(mockError);
    
    const onError = vi.fn();
    render(<VideoJSPlayer {...defaultProps} onError={onError} />);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        'Video format not supported',
        false // Should not retry format errors
      );
    });
  });

  it('handles Video.js library loading errors', async () => {
    // Mock import to throw error
    vi.doMock('video.js', () => {
      throw new Error('Failed to load Video.js');
    });

    const onError = vi.fn();
    
    // Re-render with error
    const { rerender } = render(<VideoJSPlayer {...defaultProps} />);
    rerender(<VideoJSPlayer {...defaultProps} onError={onError} />);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Video.js library error'),
        true
      );
    });
  });

  it('cleans up player on unmount', async () => {
    const { unmount } = render(<VideoJSPlayer {...defaultProps} />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(mockVideoJS).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(mockVideoJSInstance.dispose).toHaveBeenCalled();
  });

  it('handles player wrapper methods correctly', async () => {
    let playerWrapper: any;
    const onReady = vi.fn((player) => {
      playerWrapper = player;
    });
    
    render(<VideoJSPlayer {...defaultProps} onReady={onReady} />);
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    
    // Test wrapper methods
    playerWrapper.play();
    expect(mockVideoJSInstance.play).toHaveBeenCalled();
    
    playerWrapper.pause();
    expect(mockVideoJSInstance.pause).toHaveBeenCalled();
    
    playerWrapper.on('test', vi.fn());
    expect(mockVideoJSInstance.on).toHaveBeenCalledWith('test', expect.any(Function));
    
    // Test getters/setters
    expect(playerWrapper.currentTime).toBe(0);
    expect(playerWrapper.duration).toBe(100);
    expect(playerWrapper.volume).toBe(1);
    expect(playerWrapper.muted).toBe(false);
    
    playerWrapper.currentTime = 50;
    expect(mockVideoJSInstance.currentTime).toHaveBeenCalledWith(50);
    
    playerWrapper.volume = 0.5;
    expect(mockVideoJSInstance.volume).toHaveBeenCalledWith(0.5);
    
    playerWrapper.muted = true;
    expect(mockVideoJSInstance.muted).toHaveBeenCalledWith(true);
  });

  it('handles different error codes correctly', async () => {
    const errorCodes = [
      { code: 1, expectedMessage: 'Video loading was aborted' },
      { code: 2, expectedMessage: 'Network error occurred while loading video' },
      { code: 3, expectedMessage: 'Video decoding error' },
      { code: 4, expectedMessage: 'Video format not supported' }
    ];

    for (const { code, expectedMessage } of errorCodes) {
      const onError = vi.fn();
      mockVideoJSInstance.error.mockReturnValue({ code, message: expectedMessage });
      
      render(<VideoJSPlayer {...defaultProps} onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expectedMessage,
          code !== 4 // Don't retry format errors
        );
      });
      
      // Clean up for next iteration
      vi.clearAllMocks();
    }
  });
});