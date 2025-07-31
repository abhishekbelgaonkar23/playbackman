import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import MediaElementPlayer from '../mediaelement-player';
import type { MediaElementOptions } from '~/types/player-config';

// Mock MediaElement.js
const mockMediaElementInstance = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 100,
  volume: 1,
  muted: false,
  src: '',
  load: vi.fn(),
  error: null
};

const mockDomNode = document.createElement('div');

const mockMediaElementPlayer = vi.fn((element, options) => {
  // Simulate async initialization
  setTimeout(() => {
    if (options.success) {
      options.success(mockMediaElementInstance, mockDomNode);
    }
  }, 50);
});

vi.mock('mediaelement', () => ({
  MediaElementPlayer: mockMediaElementPlayer
}));

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

// Mock MediaError constants
Object.defineProperty(global, 'MediaError', {
  value: {
    MEDIA_ERR_ABORTED: 1,
    MEDIA_ERR_NETWORK: 2,
    MEDIA_ERR_DECODE: 3,
    MEDIA_ERR_SRC_NOT_SUPPORTED: 4
  },
  writable: true
});

describe('MediaElementPlayer', () => {
  const mockFile = new File(['test content'], 'test-video.flv', {
    type: 'video/x-flv'
  });

  const mockOptions: MediaElementOptions = {
    controls: true,
    enableAutosize: true,
    features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
    stretching: 'responsive'
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
    mockMediaElementInstance.error = null;
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders video element with correct attributes', () => {
    render(<MediaElementPlayer {...defaultProps} />);
    
    const videoElement = screen.getByRole('application', { hidden: true }) || 
                         document.querySelector('video');
    
    expect(videoElement).toBeInTheDocument();
    expect(videoElement).toHaveAttribute('src', 'blob:mock-url');
    expect(videoElement).toHaveAttribute('controls');
    expect(videoElement).toHaveAttribute('preload', 'metadata');
    expect(videoElement).toHaveAttribute('playsinline');
  });

  it('loads MediaElement.js CSS when not already present', async () => {
    render(<MediaElementPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockAppendChild).toHaveBeenCalledWith(
        expect.objectContaining({
          rel: 'stylesheet',
          href: expect.stringContaining('mediaelementplayer')
        })
      );
    });
  });

  it('initializes MediaElement.js with correct options', async () => {
    render(<MediaElementPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMediaElementPlayer).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining({
          ...mockOptions,
          success: expect.any(Function),
          error: expect.any(Function)
        })
      );
    });
  });

  it('calls onReady when player initializes successfully', async () => {
    const onReady = vi.fn();
    render(<MediaElementPlayer {...defaultProps} onReady={onReady} />);
    
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
    render(<MediaElementPlayer {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('loadstart', expect.any(Function));
      expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('canplay', expect.any(Function));
      expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
    });
  });

  it('handles MediaElement.js initialization errors', async () => {
    const mockError = new Error('MediaElement initialization failed');
    
    // Mock MediaElementPlayer to call error callback
    mockMediaElementPlayer.mockImplementation((element, options) => {
      setTimeout(() => {
        if (options.error) {
          options.error(mockError);
        }
      }, 50);
    });
    
    const onError = vi.fn();
    render(<MediaElementPlayer {...defaultProps} onError={onError} />);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('MediaElement.js error'),
        true
      );
    });
  });

  it('handles MediaElement.js library loading errors', async () => {
    // Mock import to throw error
    vi.doMock('mediaelement', () => {
      throw new Error('Failed to load MediaElement.js');
    });

    const onError = vi.fn();
    
    // Re-render with error
    const { rerender } = render(<MediaElementPlayer {...defaultProps} />);
    rerender(<MediaElementPlayer {...defaultProps} onError={onError} />);
    
    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('MediaElement.js library error'),
        true
      );
    });
  });

  it('cleans up player on unmount', async () => {
    const { unmount } = render(<MediaElementPlayer {...defaultProps} />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(mockMediaElementPlayer).toHaveBeenCalled();
    });
    
    unmount();
    
    // Verify cleanup methods were called
    expect(mockMediaElementInstance.pause).toHaveBeenCalled();
    expect(mockMediaElementInstance.load).toHaveBeenCalled();
  });

  it('handles player wrapper methods correctly', async () => {
    let playerWrapper: any;
    const onReady = vi.fn((player) => {
      playerWrapper = player;
    });
    
    render(<MediaElementPlayer {...defaultProps} onReady={onReady} />);
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    
    // Test wrapper methods
    playerWrapper.play();
    expect(mockMediaElementInstance.play).toHaveBeenCalled();
    
    playerWrapper.pause();
    expect(mockMediaElementInstance.pause).toHaveBeenCalled();
    
    playerWrapper.on('test', vi.fn());
    expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('test', expect.any(Function));
    
    // Test getters/setters
    expect(playerWrapper.currentTime).toBe(0);
    expect(playerWrapper.duration).toBe(100);
    expect(playerWrapper.volume).toBe(1);
    expect(playerWrapper.muted).toBe(false);
    
    playerWrapper.currentTime = 50;
    expect(mockMediaElementInstance.currentTime).toBe(50);
    
    playerWrapper.volume = 0.5;
    expect(mockMediaElementInstance.volume).toBe(0.5);
    
    playerWrapper.muted = true;
    expect(mockMediaElementInstance.muted).toBe(true);
  });

  it('handles different media error codes correctly', async () => {
    const errorCodes = [
      { code: 1, expectedMessage: 'Video loading was aborted' },
      { code: 2, expectedMessage: 'Network error occurred while loading video' },
      { code: 3, expectedMessage: 'Video decoding error' },
      { code: 4, expectedMessage: 'Video format not supported by MediaElement.js' }
    ];

    for (const { code, expectedMessage } of errorCodes) {
      const onError = vi.fn();
      
      // Mock MediaElementPlayer to simulate error event
      mockMediaElementPlayer.mockImplementation((element, options) => {
        setTimeout(() => {
          if (options.success) {
            const mockElement = {
              ...mockMediaElementInstance,
              error: { code, message: expectedMessage }
            };
            options.success(mockElement, mockDomNode);
            
            // Simulate error event
            const errorEvent = {
              target: mockElement
            };
            
            // Find the error event listener and call it
            const errorListener = mockElement.addEventListener.mock.calls
              .find(call => call[0] === 'error')?.[1];
            
            if (errorListener) {
              errorListener(errorEvent);
            }
          }
        }, 50);
      });
      
      render(<MediaElementPlayer {...defaultProps} onError={onError} />);
      
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

  it('calls original success callback if provided', async () => {
    const originalSuccess = vi.fn();
    const options = {
      ...mockOptions,
      success: originalSuccess
    };
    
    render(<MediaElementPlayer {...defaultProps} options={options} />);
    
    await waitFor(() => {
      expect(originalSuccess).toHaveBeenCalledWith(
        mockMediaElementInstance,
        mockDomNode
      );
    });
  });

  it('calls original error callback if provided', async () => {
    const originalError = vi.fn();
    const mockError = new Error('Test error');
    
    const options = {
      ...mockOptions,
      error: originalError
    };
    
    // Mock MediaElementPlayer to call error callback
    mockMediaElementPlayer.mockImplementation((element, options) => {
      setTimeout(() => {
        if (options.error) {
          options.error(mockError);
        }
      }, 50);
    });
    
    render(<MediaElementPlayer {...defaultProps} options={options} />);
    
    await waitFor(() => {
      expect(originalError).toHaveBeenCalledWith(mockError);
    });
  });

  it('handles volume bounds correctly', async () => {
    let playerWrapper: any;
    const onReady = vi.fn((player) => {
      playerWrapper = player;
    });
    
    render(<MediaElementPlayer {...defaultProps} onReady={onReady} />);
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    });
    
    // Test volume bounds
    playerWrapper.volume = -0.5; // Below minimum
    expect(mockMediaElementInstance.volume).toBe(0);
    
    playerWrapper.volume = 1.5; // Above maximum
    expect(mockMediaElementInstance.volume).toBe(1);
    
    playerWrapper.volume = 0.7; // Within bounds
    expect(mockMediaElementInstance.volume).toBe(0.7);
  });
});