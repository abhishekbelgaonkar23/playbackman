import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMobileDetection } from '../use-mobile-detection';

// Mock window properties
const mockWindow = {
  innerWidth: 1024,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

const mockNavigator = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  maxTouchPoints: 0,
};

describe('useMobileDetection', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: mockWindow.innerWidth,
    });
    
    Object.defineProperty(window, 'addEventListener', {
      writable: true,
      configurable: true,
      value: mockWindow.addEventListener,
    });
    
    Object.defineProperty(window, 'removeEventListener', {
      writable: true,
      configurable: true,
      value: mockWindow.removeEventListener,
    });
    
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: mockNavigator.userAgent,
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: mockNavigator.maxTouchPoints,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('detects desktop as non-mobile', () => {
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTouch).toBe(false);
  });

  it('detects mobile user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isMobile).toBe(true);
  });

  it('detects Android user agent', () => {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 10; SM-G975F)',
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isMobile).toBe(true);
  });

  it('detects touch capability', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isTouch).toBe(true);
  });

  it('detects small screen with touch as mobile', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });
    
    Object.defineProperty(navigator, 'maxTouchPoints', {
      writable: true,
      configurable: true,
      value: 5,
    });
    
    const { result } = renderHook(() => useMobileDetection());
    
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTouch).toBe(true);
  });

  it('adds resize event listener', () => {
    renderHook(() => useMobileDetection());
    
    expect(mockWindow.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });

  it('removes resize event listener on unmount', () => {
    const { unmount } = renderHook(() => useMobileDetection());
    
    unmount();
    
    expect(mockWindow.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
  });
});