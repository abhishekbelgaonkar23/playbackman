import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MobileControls } from '../mobile-controls';

const mockProps = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  volume: 0.8,
  isMuted: false,
  isFullscreen: false,
  showControls: true,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onSeek: vi.fn(),
  onVolumeChange: vi.fn(),
  onMute: vi.fn(),
  onFullscreen: vi.fn(),
  onControlsToggle: vi.fn(),
};

describe('MobileControls', () => {
  it('renders play button when not playing', () => {
    render(<MobileControls {...mockProps} />);
    
    const playButtons = screen.getAllByLabelText('Play');
    expect(playButtons.length).toBeGreaterThan(0);
  });

  it('renders pause button when playing', () => {
    render(<MobileControls {...mockProps} isPlaying={true} />);
    
    const pauseButtons = screen.getAllByLabelText('Pause');
    expect(pauseButtons.length).toBeGreaterThan(0);
  });

  it('displays correct time format', () => {
    render(<MobileControls {...mockProps} />);
    
    expect(screen.getByText('00:30')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    render(<MobileControls {...mockProps} />);
    
    const playButton = screen.getAllByLabelText('Play')[0];
    fireEvent.click(playButton);
    
    expect(mockProps.onPlay).toHaveBeenCalled();
  });

  it('calls onPause when pause button is clicked', () => {
    render(<MobileControls {...mockProps} isPlaying={true} />);
    
    const pauseButton = screen.getAllByLabelText('Pause')[0];
    fireEvent.click(pauseButton);
    
    expect(mockProps.onPause).toHaveBeenCalled();
  });

  it('calls onMute when volume button is clicked', () => {
    render(<MobileControls {...mockProps} />);
    
    const muteButton = screen.getByLabelText('Mute');
    fireEvent.click(muteButton);
    
    expect(mockProps.onMute).toHaveBeenCalled();
  });

  it('calls onFullscreen when fullscreen button is clicked', () => {
    render(<MobileControls {...mockProps} />);
    
    const fullscreenButton = screen.getByLabelText('Enter fullscreen');
    fireEvent.click(fullscreenButton);
    
    expect(mockProps.onFullscreen).toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    render(<MobileControls {...mockProps} isLoading={true} />);
    
    const spinners = screen.getAllByRole('button').filter(button => 
      button.querySelector('.animate-spin')
    );
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('hides controls when showControls is false', () => {
    render(<MobileControls {...mockProps} showControls={false} />);
    
    const controlsDrawer = screen.getByText('00:30').closest('.translate-y-full');
    expect(controlsDrawer).toBeInTheDocument();
  });

  it('shows controls when showControls is true', () => {
    render(<MobileControls {...mockProps} showControls={true} />);
    
    const controlsDrawer = screen.getByText('00:30').closest('.translate-y-0');
    expect(controlsDrawer).toBeInTheDocument();
  });
});