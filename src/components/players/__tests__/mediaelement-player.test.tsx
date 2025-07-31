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
  paused: false,
  ended: false,
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

  describe('Playback Controls', () => {
    let playerWrapper: any;

    beforeEach(async () => {
      const onReady = vi.fn((player) => {
        playerWrapper = player;
      });
      
      render(<MediaElementPlayer {...defaultProps} onReady={onReady} />);
      
      await waitFor(() => {
        expect(onReady).toHaveBeenCalled();
      });
    });

    it('implements play control correctly', () => {
      playerWrapper.play();
      expect(mockMediaElementInstance.play).toHaveBeenCalled();
    });

    it('implements pause control correctly', () => {
      playerWrapper.pause();
      expect(mockMediaElementInstance.pause).toHaveBeenCalled();
    });

    it('implements seek functionality', () => {
      // Test normal seek
      playerWrapper.seek(50);
      expect(mockMediaElementInstance.currentTime).toBe(50);

      // Test seek beyond duration (should clamp to duration)
      mockMediaElementInstance.duration = 100;
      playerWrapper.seek(150);
      expect(mockMediaElementInstance.currentTime).toBe(100);

      // Test negative seek (should clamp to 0)
      playerWrapper.seek(-10);
      expect(mockMediaElementInstance.currentTime).toBe(0);
    });

    it('implements volume control correctly', () => {
      // Test setVolume method
      playerWrapper.setVolume(0.5);
      expect(mockMediaElementInstance.volume).toBe(0.5);

      // Test volume property setter with clamping
      playerWrapper.volume = 1.5; // Should clamp to 1
      expect(mockMediaElementInstance.volume).toBe(1);

      playerWrapper.volume = -0.5; // Should clamp to 0
      expect(mockMediaElementInstance.volume).toBe(0);
    });

    it('implements mute control correctly', () => {
      // Test toggleMute when not muted
      mockMediaElementInstance.muted = false;
      playerWrapper.toggleMute();
      expect(mockMediaElementInstance.muted).toBe(true);

      // Test toggleMute when muted
      mockMediaElementInstance.muted = true;
      playerWrapper.toggleMute();
      expect(mockMediaElementInstance.muted).toBe(false);

      // Test direct mute setter
      playerWrapper.muted = true;
      expect(mockMediaElementInstance.muted).toBe(true);
    });

    it('implements play/pause toggle correctly', () => {
      // Test toggle when paused
      mockMediaElementInstance.paused = true;
      playerWrapper.togglePlayPause();
      expect(mockMediaElementInstance.play).toHaveBeenCalled();

      // Test toggle when playing
      mockMediaElementInstance.paused = false;
      playerWrapper.togglePlayPause();
      expect(mockMediaElementInstance.pause).toHaveBeenCalled();
    });

    it('exposes playback state properties correctly', () => {
      mockMediaElementInstance.paused = true;
      mockMediaElementInstance.ended = false;
      
      expect(playerWrapper.paused).toBe(true);
      expect(playerWrapper.ended).toBe(false);

      mockMediaElementInstance.paused = false;
      mockMediaElementInstance.ended = true;
      
      expect(playerWrapper.paused).toBe(false);
      expect(playerWrapper.ended).toBe(true);
    });

    it('handles NaN duration correctly', () => {
      mockMediaElementInstance.duration = NaN;
      expect(playerWrapper.duration).toBe(0);
      
      mockMediaElementInstance.duration = 100;
      expect(playerWrapper.duration).toBe(100);
    });

    it('handles destroyed player state gracefully', () => {
      playerWrapper.destroy();
      
      // All methods should handle destroyed state without throwing
      expect(() => playerWrapper.play()).not.toThrow();
      expect(() => playerWrapper.pause()).not.toThrow();
      expect(() => playerWrapper.seek(50)).not.toThrow();
      expect(() => playerWrapper.setVolume(0.5)).not.toThrow();
      expect(() => playerWrapper.toggleMute()).not.toThrow();
      expect(() => playerWrapper.togglePlayPause()).not.toThrow();
      
      // Properties should return safe defaults
      expect(playerWrapper.currentTime).toBe(0);
      expect(playerWrapper.duration).toBe(0);
      expect(playerWrapper.volume).toBe(0);
      expect(playerWrapper.muted).toBe(false);
      expect(playerWrapper.paused).toBe(true);
      expect(playerWrapper.ended).toBe(false);
    });
  });

  describe('Event Handling', () => {
    it('sets up all required playback event listeners', async () => {
      render(<MediaElementPlayer {...defaultProps} />);
      
      await waitFor(() => {
        // Basic events
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('loadstart', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('canplay', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('loadedmetadata', expect.any(Function));
        
        // Playback control events
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('play', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('pause', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('timeupdate', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('volumechange', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('seeking', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('seeked', expect.any(Function));
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      });
    });
  });
});