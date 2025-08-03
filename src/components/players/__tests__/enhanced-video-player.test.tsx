import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedVideoPlayer } from '../enhanced-video-player';

// Mock the mobile detection hook
vi.mock('../../../hooks/use-mobile-detection', () => ({
  useMobileDetection: () => ({ isMobile: false, isTouch: false })
}));

const mockProps = {
  src: 'test-video.mp4',
  poster: 'test-poster.jpg',
};

describe('EnhancedVideoPlayer', () => {
  it('renders video element with correct src', () => {
    render(<EnhancedVideoPlayer {...mockProps} />);
    
    const video = screen.getByRole('application') || document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'test-video.mp4');
  });

  it('renders video element with poster', () => {
    render(<EnhancedVideoPlayer {...mockProps} />);
    
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('poster', 'test-poster.jpg');
  });

  it('applies autoPlay attribute when specified', () => {
    render(<EnhancedVideoPlayer {...mockProps} autoPlay={true} />);
    
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('autoplay');
  });

  it('applies loop attribute when specified', () => {
    render(<EnhancedVideoPlayer {...mockProps} loop={true} />);
    
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('loop');
  });

  it('applies muted attribute when specified', () => {
    render(<EnhancedVideoPlayer {...mockProps} muted={true} />);
    
    const video = document.querySelector('video');
    expect(video).toHaveAttribute('muted');
  });

  it('applies custom className', () => {
    render(<EnhancedVideoPlayer {...mockProps} className="custom-class" />);
    
    const container = screen.getByRole('application')?.parentElement || document.querySelector('.custom-class');
    expect(container).toHaveClass('custom-class');
  });

  it('calls onLoadStart when provided', () => {
    const onLoadStart = vi.fn();
    render(<EnhancedVideoPlayer {...mockProps} onLoadStart={onLoadStart} />);
    
    // Simulate loadstart event
    const video = document.querySelector('video');
    if (video) {
      const event = new Event('loadstart');
      video.dispatchEvent(event);
    }
    
    expect(onLoadStart).toHaveBeenCalled();
  });

  it('calls onLoadEnd when provided', () => {
    const onLoadEnd = vi.fn();
    render(<EnhancedVideoPlayer {...mockProps} onLoadEnd={onLoadEnd} />);
    
    // Simulate loadeddata event
    const video = document.querySelector('video');
    if (video) {
      const event = new Event('loadeddata');
      video.dispatchEvent(event);
    }
    
    expect(onLoadEnd).toHaveBeenCalled();
  });

  it('calls onError when provided', () => {
    const onError = vi.fn();
    render(<EnhancedVideoPlayer {...mockProps} onError={onError} />);
    
    // Simulate error event
    const video = document.querySelector('video');
    if (video) {
      const event = new Event('error');
      video.dispatchEvent(event);
    }
    
    expect(onError).toHaveBeenCalledWith('Failed to load video');
  });
});