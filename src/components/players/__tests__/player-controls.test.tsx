import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PlayerControls } from '../player-controls';

const mockProps = {
  isPlaying: false,
  currentTime: 30,
  duration: 120,
  volume: 0.8,
  isMuted: false,
  isFullscreen: false,
  playbackRate: 1,
  showCaptions: false,
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onSeek: vi.fn(),
  onVolumeChange: vi.fn(),
  onMute: vi.fn(),
  onFullscreen: vi.fn(),
  onPlaybackRateChange: vi.fn(),
  onCaptionsToggle: vi.fn(),
};

describe('PlayerControls', () => {
  it('renders play button when not playing', () => {
    render(<PlayerControls {...mockProps} />);
    
    const playButton = screen.getByLabelText('Play');
    expect(playButton).toBeInTheDocument();
  });

  it('renders pause button when playing', () => {
    render(<PlayerControls {...mockProps} isPlaying={true} />);
    
    const pauseButton = screen.getByLabelText('Pause');
    expect(pauseButton).toBeInTheDocument();
  });

  it('displays correct time format', () => {
    render(<PlayerControls {...mockProps} />);
    
    expect(screen.getByText('00:30 / 02:00')).toBeInTheDocument();
  });

  it('calls onPlay when play button is clicked', () => {
    render(<PlayerControls {...mockProps} />);
    
    const playButton = screen.getByLabelText('Play');
    fireEvent.click(playButton);
    
    expect(mockProps.onPlay).toHaveBeenCalled();
  });

  it('calls onPause when pause button is clicked', () => {
    render(<PlayerControls {...mockProps} isPlaying={true} />);
    
    const pauseButton = screen.getByLabelText('Pause');
    fireEvent.click(pauseButton);
    
    expect(mockProps.onPause).toHaveBeenCalled();
  });

  it('calls onMute when volume button is clicked', () => {
    render(<PlayerControls {...mockProps} />);
    
    const muteButton = screen.getByLabelText('Mute');
    fireEvent.click(muteButton);
    
    expect(mockProps.onMute).toHaveBeenCalled();
  });

  it('calls onFullscreen when fullscreen button is clicked', () => {
    render(<PlayerControls {...mockProps} />);
    
    const fullscreenButton = screen.getByLabelText('Enter fullscreen');
    fireEvent.click(fullscreenButton);
    
    expect(mockProps.onFullscreen).toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    render(<PlayerControls {...mockProps} isLoading={true} />);
    
    const spinner = screen.getByRole('button', { name: 'Play' }).querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows captions toggle button', () => {
    render(<PlayerControls {...mockProps} />);
    
    const captionsButton = screen.getByLabelText('Toggle captions');
    expect(captionsButton).toBeInTheDocument();
  });

  it('shows subtitle upload button', () => {
    render(<PlayerControls {...mockProps} />);
    
    const uploadButton = screen.getByLabelText('Upload subtitle file');
    expect(uploadButton).toBeInTheDocument();
  });

  it('shows settings button', () => {
    render(<PlayerControls {...mockProps} />);
    
    const settingsButton = screen.getByLabelText('Settings');
    expect(settingsButton).toBeInTheDocument();
  });

  it('shows skip buttons', () => {
    render(<PlayerControls {...mockProps} />);
    
    const skipBackButton = screen.getByLabelText('Skip back 10 seconds');
    const skipForwardButton = screen.getByLabelText('Skip forward 10 seconds');
    
    expect(skipBackButton).toBeInTheDocument();
    expect(skipForwardButton).toBeInTheDocument();
  });
});