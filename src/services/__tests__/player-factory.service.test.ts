/**
 * Unit tests for PlayerFactoryService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PlayerFactoryService } from '../player-factory.service';
import type { VideoJSOptions, MediaElementOptions } from '../../types/player-config';

// Mock Video.js
const mockVideoJSInstance = {
  play: vi.fn(),
  pause: vi.fn(),
  dispose: vi.fn(),
  on: vi.fn(),
  ready: vi.fn((callback) => callback()),
  currentTime: vi.fn().mockReturnValue(0),
  duration: vi.fn().mockReturnValue(100),
  volume: vi.fn().mockReturnValue(1),
  muted: vi.fn().mockReturnValue(false)
};

const mockVideoJS = vi.fn((element, options, callback) => {
  // Simulate async initialization
  setTimeout(() => callback?.(), 0);
  return mockVideoJSInstance;
});

// Mock MediaElement.js
const mockMediaElementInstance = {
  play: vi.fn(),
  pause: vi.fn(),
  remove: vi.fn(),
  addEventListener: vi.fn(),
  currentTime: 0,
  duration: 100,
  volume: 1,
  muted: false
};

const mockMediaElementPlayer = vi.fn((element, options) => {
  // Simulate async initialization
  setTimeout(() => {
    options?.success?.(mockMediaElementInstance, element);
  }, 0);
});

// Mock dynamic imports
vi.mock('video.js', () => ({
  default: mockVideoJS
}));

vi.mock('mediaelement', () => ({
  MediaElementPlayer: mockMediaElementPlayer
}));

describe('PlayerFactoryService', () => {
  let playerFactory: PlayerFactoryService;
  let mockElement: HTMLElement;

  beforeEach(() => {
    playerFactory = PlayerFactoryService.getInstance();
    mockElement = document.createElement('div');
    
    // Reset all mocks
    vi.clearAllMocks();
    mockVideoJSInstance.dispose.mockClear();
    mockMediaElementInstance.remove.mockClear();
  });

  afterEach(() => {
    // Clean up any active players
    const activePlayer = playerFactory.getActivePlayer();
    if (activePlayer) {
      playerFactory.destroyPlayer(activePlayer);
    }
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = PlayerFactoryService.getInstance();
      const instance2 = PlayerFactoryService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Video.js Player Creation', () => {
    it('should create a Video.js player successfully', async () => {
      const options: VideoJSOptions = {
        controls: true,
        responsive: true,
        fluid: true
      };

      const player = await playerFactory.createPlayer('videojs', mockElement, options);

      expect(player).toBeDefined();
      expect(mockVideoJS).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining(options),
        expect.any(Function)
      );
    });

    it('should create video element if container is not a video element', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      
      await playerFactory.createPlayer('videojs', mockElement, options);

      expect(mockElement.children.length).toBe(1);
      expect(mockElement.children[0].tagName.toLowerCase()).toBe('video');
    });

    it('should use existing video element if container is already a video element', async () => {
      const videoElement = document.createElement('video');
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      
      await playerFactory.createPlayer('videojs', videoElement, options);

      expect(mockVideoJS).toHaveBeenCalledWith(
        videoElement,
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should apply default options when creating Video.js player', async () => {
      const options: VideoJSOptions = { controls: false };
      
      await playerFactory.createPlayer('videojs', mockElement, options);

      expect(mockVideoJS).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining({
          controls: false,
          responsive: true,
          fluid: true,
          playbackRates: [0.5, 1, 1.25, 1.5, 2],
          preload: 'metadata'
        }),
        expect.any(Function)
      );
    });
  });

  describe('MediaElement.js Player Creation', () => {
    it('should create a MediaElement.js player successfully', async () => {
      const options: MediaElementOptions = {
        controls: true,
        enableAutosize: true
      };

      const player = await playerFactory.createPlayer('mediaelement', mockElement, options);

      expect(player).toBeDefined();
      expect(mockMediaElementPlayer).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining(options)
      );
    });

    it('should create video element for MediaElement.js if container is not a video element', async () => {
      const options: MediaElementOptions = { controls: true };
      
      await playerFactory.createPlayer('mediaelement', mockElement, options);

      expect(mockElement.children.length).toBe(1);
      expect(mockElement.children[0].tagName.toLowerCase()).toBe('video');
    });

    it('should apply default options when creating MediaElement.js player', async () => {
      const options: MediaElementOptions = { controls: false };
      
      await playerFactory.createPlayer('mediaelement', mockElement, options);

      expect(mockMediaElementPlayer).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.objectContaining({
          controls: false,
          enableAutosize: true,
          features: ['playpause', 'progress', 'current', 'duration', 'tracks', 'volume', 'fullscreen'],
          stretching: 'responsive'
        })
      );
    });

    it('should handle MediaElement.js initialization errors', async () => {
      const options: MediaElementOptions = { controls: true };
      
      // Mock MediaElement.js to call error callback
      mockMediaElementPlayer.mockImplementationOnce((element, opts) => {
        setTimeout(() => opts?.error?.(new Error('Initialization failed')), 0);
      });

      await expect(
        playerFactory.createPlayer('mediaelement', mockElement, options)
      ).rejects.toThrow('Initialization failed');
    });
  });

  describe('Player Management', () => {
    it('should track active player', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      
      expect(playerFactory.getActivePlayer()).toBeNull();
      
      const player = await playerFactory.createPlayer('videojs', mockElement, options);
      
      expect(playerFactory.getActivePlayer()).toBe(player);
    });

    it('should destroy previous player when creating a new one', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      
      // Create first player
      const player1 = await playerFactory.createPlayer('videojs', mockElement, options);
      const destroySpy = vi.spyOn(player1, 'destroy');
      
      // Create second player
      const mockElement2 = document.createElement('div');
      await playerFactory.createPlayer('videojs', mockElement2, options);
      
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should handle unsupported player types', async () => {
      const options = { controls: true };
      
      await expect(
        playerFactory.createPlayer('unsupported' as any, mockElement, options)
      ).rejects.toThrow('Unsupported player type: unsupported');
    });
  });

  describe('Player Destruction', () => {
    it('should destroy Video.js player properly', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      const player = await playerFactory.createPlayer('videojs', mockElement, options);
      
      playerFactory.destroyPlayer(player);
      
      expect(mockVideoJSInstance.dispose).toHaveBeenCalled();
      expect(playerFactory.getActivePlayer()).toBeNull();
    });

    it('should destroy MediaElement.js player properly', async () => {
      const options: MediaElementOptions = { controls: true };
      const player = await playerFactory.createPlayer('mediaelement', mockElement, options);
      
      playerFactory.destroyPlayer(player);
      
      expect(mockMediaElementInstance.remove).toHaveBeenCalled();
      expect(playerFactory.getActivePlayer()).toBeNull();
    });

    it('should handle destruction errors gracefully', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      const player = await playerFactory.createPlayer('videojs', mockElement, options);
      
      // Mock dispose to throw error
      mockVideoJSInstance.dispose.mockImplementationOnce(() => {
        throw new Error('Disposal failed');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      expect(() => playerFactory.destroyPlayer(player)).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error destroying player:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should handle null player destruction gracefully', () => {
      expect(() => playerFactory.destroyPlayer(null as any)).not.toThrow();
    });
  });

  describe('Player Wrapper Functionality', () => {
    describe('VideoJSPlayer Wrapper', () => {
      let player: any;

      beforeEach(async () => {
        const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
        player = await playerFactory.createPlayer('videojs', mockElement, options);
      });

      it('should proxy play method', () => {
        player.play();
        expect(mockVideoJSInstance.play).toHaveBeenCalled();
      });

      it('should proxy pause method', () => {
        player.pause();
        expect(mockVideoJSInstance.pause).toHaveBeenCalled();
      });

      it('should proxy on method', () => {
        const callback = vi.fn();
        player.on('play', callback);
        expect(mockVideoJSInstance.on).toHaveBeenCalledWith('play', callback);
      });

      it('should handle currentTime getter', () => {
        mockVideoJSInstance.currentTime.mockReturnValue(50);
        expect(player.currentTime).toBe(50);
      });

      it('should handle currentTime setter', () => {
        player.currentTime = 30;
        expect(mockVideoJSInstance.currentTime).toHaveBeenCalledWith(30);
      });

      it('should handle volume getter', () => {
        mockVideoJSInstance.volume.mockReturnValue(0.8);
        expect(player.volume).toBe(0.8);
      });

      it('should handle volume setter', () => {
        player.volume = 0.5;
        expect(mockVideoJSInstance.volume).toHaveBeenCalledWith(0.5);
      });
    });

    describe('MediaElementPlayer Wrapper', () => {
      let player: any;

      beforeEach(async () => {
        const options: MediaElementOptions = { controls: true };
        player = await playerFactory.createPlayer('mediaelement', mockElement, options);
      });

      it('should proxy play method', () => {
        player.play();
        expect(mockMediaElementInstance.play).toHaveBeenCalled();
      });

      it('should proxy pause method', () => {
        player.pause();
        expect(mockMediaElementInstance.pause).toHaveBeenCalled();
      });

      it('should proxy on method', () => {
        const callback = vi.fn();
        player.on('play', callback);
        expect(mockMediaElementInstance.addEventListener).toHaveBeenCalledWith('play', callback);
      });

      it('should handle currentTime getter and setter', () => {
        mockMediaElementInstance.currentTime = 25;
        expect(player.currentTime).toBe(25);
        
        player.currentTime = 40;
        expect(mockMediaElementInstance.currentTime).toBe(40);
      });

      it('should handle volume getter and setter', () => {
        mockMediaElementInstance.volume = 0.7;
        expect(player.volume).toBe(0.7);
        
        player.volume = 0.3;
        expect(mockMediaElementInstance.volume).toBe(0.3);
      });

      it('should handle muted getter and setter', () => {
        mockMediaElementInstance.muted = true;
        expect(player.muted).toBe(true);
        
        player.muted = false;
        expect(mockMediaElementInstance.muted).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle Video.js creation errors', async () => {
      const options: VideoJSOptions = { controls: true, responsive: true, fluid: true };
      
      // Mock Video.js to throw error
      mockVideoJS.mockImplementationOnce(() => {
        throw new Error('Video.js initialization failed');
      });

      await expect(
        playerFactory.createPlayer('videojs', mockElement, options)
      ).rejects.toThrow('Failed to create videojs player: Video.js initialization failed');
    });

    it('should handle MediaElement.js creation errors', async () => {
      const options: MediaElementOptions = { controls: true };
      
      // Mock MediaElement.js to throw error
      mockMediaElementPlayer.mockImplementationOnce(() => {
        throw new Error('MediaElement.js initialization failed');
      });

      await expect(
        playerFactory.createPlayer('mediaelement', mockElement, options)
      ).rejects.toThrow('Failed to create mediaelement player: MediaElement.js initialization failed');
    });
  });
});