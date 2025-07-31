import { renderHook, act } from '@testing-library/react';
import { useResponsive, useIsMobile, useIsTablet, useIsDesktop, useIsLandscape, useIsPortrait, useIsTouchDevice } from '../use-responsive';

// Mock window.matchMedia
const mockMatchMedia = (matches: boolean) => ({
  matches,
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

// Mock window properties
const mockWindow = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
};

describe('useResponsive', () => {
  beforeEach(() => {
    // Reset window dimensions
    mockWindow(1024, 768);
    
    // Mock matchMedia
    window.matchMedia = vi.fn().mockImplementation(() => mockMatchMedia(false));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useResponsive hook', () => {
    it('should return correct viewport info for desktop', () => {
      mockWindow(1200, 800);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.width).toBe(1200);
      expect(result.current.height).toBe(800);
      expect(result.current.isDesktop).toBe(true);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.orientation).toBe('landscape');
      expect(result.current.aspectRatio).toBe(1.5);
    });

    it('should return correct viewport info for mobile', () => {
      mockWindow(375, 667);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isTablet).toBe(false);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.orientation).toBe('portrait');
      expect(result.current.aspectRatio).toBeCloseTo(0.562);
    });

    it('should return correct viewport info for tablet', () => {
      mockWindow(768, 1024);
      
      const { result } = renderHook(() => useResponsive());
      
      expect(result.current.width).toBe(768);
      expect(result.current.height).toBe(1024);
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isTablet).toBe(true);
      expect(result.current.isDesktop).toBe(false);
      expect(result.current.orientation).toBe('portrait');
      expect(result.current.aspectRatio).toBe(0.75);
    });

    it('should update viewport info on window resize', () => {
      const { result } = renderHook(() => useResponsive());
      
      // Initial state
      expect(result.current.width).toBe(1024);
      expect(result.current.height).toBe(768);
      expect(result.current.isDesktop).toBe(true);
      
      // Simulate window resize
      act(() => {
        mockWindow(375, 667);
        window.dispatchEvent(new Event('resize'));
      });
      
      expect(result.current.width).toBe(375);
      expect(result.current.height).toBe(667);
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });

    it('should update viewport info on orientation change', () => {
      mockWindow(375, 667);
      const { result } = renderHook(() => useResponsive());
      
      // Initial portrait
      expect(result.current.orientation).toBe('portrait');
      
      // Simulate orientation change to landscape
      act(() => {
        mockWindow(667, 375);
        window.dispatchEvent(new Event('orientationchange'));
      });
      
      // Wait for timeout
      setTimeout(() => {
        expect(result.current.orientation).toBe('landscape');
      }, 150);
    });
  });

  describe('Media query hooks', () => {
    it('useIsMobile should return true for mobile viewport', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(max-width: 767px)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsMobile());
      expect(result.current).toBe(true);
    });

    it('useIsTablet should return true for tablet viewport', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(min-width: 768px) and (max-width: 1023px)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsTablet());
      expect(result.current).toBe(true);
    });

    it('useIsDesktop should return true for desktop viewport', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(min-width: 1024px)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsDesktop());
      expect(result.current).toBe(true);
    });

    it('useIsLandscape should return true for landscape orientation', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(orientation: landscape)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsLandscape());
      expect(result.current).toBe(true);
    });

    it('useIsPortrait should return true for portrait orientation', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(orientation: portrait)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsPortrait());
      expect(result.current).toBe(true);
    });

    it('useIsTouchDevice should return true for touch devices', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => {
        if (query === '(pointer: coarse)') {
          return mockMatchMedia(true);
        }
        return mockMatchMedia(false);
      });
      
      const { result } = renderHook(() => useIsTouchDevice());
      expect(result.current).toBe(true);
    });
  });

  describe('Media query change events', () => {
    it('should update when media query changes', () => {
      const mockMediaQuery = {
        matches: false,
        media: '(max-width: 767px)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);
      
      const { result } = renderHook(() => useIsMobile());
      
      expect(result.current).toBe(false);
      
      // Simulate media query change
      act(() => {
        mockMediaQuery.matches = true;
        const changeHandler = mockMediaQuery.addEventListener.mock.calls.find(
          call => call[0] === 'change'
        )?.[1];
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent);
        }
      });
      
      expect(result.current).toBe(true);
    });
  });
});