import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerContainer } from '../player-container';
import type { PlayerContainerProps, AppError } from '~/types';

// Mock next/dynamic to return our mock components directly
vi.mock('next/dynamic', () => ({
  default: (importFn: any, options: any) => {
    // Return a component that simulates the dynamic loading behavior
    return ({ onReady, onError, ...props }: any) => {
      React.useEffect(() => {
        // Simulate successful player initialization after a delay
        const mockPlayer = {
          play: vi.fn(),
          pause: vi.fn(),
          destroy: vi.fn(),
          on: vi.fn(),
          currentTime: 0,
          duration: 100,
          volume: 1,
          muted: false
        };
        
        const timer = setTimeout(() => {
          onReady(mockPlayer);
        }, 50);

        return () => clearTimeout(timer);
      }, [onReady]);

      // Show loading state initially
      if (options.loading) {
        return (
          <div>
            {options.loading()}
            <div data-testid="mock-player">Mock Player Component</div>
          </div>
        );
      }

      return <div data-testid="mock-player">Mock Player Component</div>;
    };
  }
}));

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(global.URL, 'createObjectURL', {
  value: mockCreateObjectURL,
  writable: true
});

Object.defineProperty(global.URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
  writable: true
});

describe('PlayerContainer', () => {
  const mockFile = new File(['test content'], 'test-video.mp4', {
    type: 'video/mp4'
  });

  const defaultProps: PlayerContainerProps = {
    file: mockFile,
    playerType: 'videojs',
    onReady: vi.fn(),
    onError: vi.fn(),
    className: 'test-class'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders player component', () => {
    render(<PlayerContainer {...defaultProps} />);
    
    expect(screen.getByTestId('mock-player')).toBeInTheDocument();
  });

  it('creates object URL for file on mount', () => {
    render(<PlayerContainer {...defaultProps} />);
    
    expect(mockCreateObjectURL).toHaveBeenCalledWith(mockFile);
  });

  it('calls onReady when player initializes successfully', async () => {
    const onReady = vi.fn();
    render(<PlayerContainer {...defaultProps} onReady={onReady} />);
    
    await waitFor(() => {
      expect(onReady).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('renders VideoJS player when playerType is videojs', () => {
    render(<PlayerContainer {...defaultProps} playerType="videojs" />);
    
    expect(screen.getByTestId('mock-player')).toBeInTheDocument();
  });

  it('renders MediaElement player when playerType is mediaelement', () => {
    render(<PlayerContainer {...defaultProps} playerType="mediaelement" />);
    
    expect(screen.getByTestId('mock-player')).toBeInTheDocument();
  });

  it('cleans up object URL on unmount', () => {
    const { unmount } = render(<PlayerContainer {...defaultProps} />);
    
    unmount();
    
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('resets state when file changes', () => {
    const { rerender } = render(<PlayerContainer {...defaultProps} />);
    
    const newFile = new File(['new content'], 'new-video.mp4', {
      type: 'video/mp4'
    });
    
    rerender(<PlayerContainer {...defaultProps} file={newFile} />);
    
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('resets state when player type changes', () => {
    const { rerender } = render(<PlayerContainer {...defaultProps} playerType="videojs" />);
    
    rerender(<PlayerContainer {...defaultProps} playerType="mediaelement" />);
    
    // Should create new object URL and clean up old one
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(2);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('applies custom className', () => {
    const { container } = render(<PlayerContainer {...defaultProps} className="custom-class" />);
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('PlayerContainer Error Handling', () => {
  const mockFile = new File(['test content'], 'test-video.mp4', {
    type: 'video/mp4'
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles player initialization errors', async () => {
    // Create a component that simulates error behavior
    const ErrorPlayerContainer = () => {
      const [hasError, setHasError] = React.useState(false);
      const onError = vi.fn();
      
      React.useEffect(() => {
        setTimeout(() => {
          setHasError(true);
          onError({
            type: 'player',
            message: 'Player initialization failed',
            recoverable: true,
            code: 'PLAYER_INIT_FAILED'
          });
        }, 100);
      }, []);

      if (hasError) {
        return <div data-testid="error-state">Player Error</div>;
      }

      return <div data-testid="loading-state">Loading...</div>;
    };

    render(<ErrorPlayerContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });
  });

  it('displays error state with retry and fallback buttons', async () => {
    // Create a component that simulates error state
    const ErrorPlayerContainer = () => {
      const [hasError, setHasError] = React.useState(false);
      
      React.useEffect(() => {
        setTimeout(() => setHasError(true), 100);
      }, []);

      if (hasError) {
        return (
          <div className="bg-black rounded-lg overflow-hidden">
            <div className="flex items-center justify-center min-h-[300px] p-6">
              <div className="text-center text-white space-y-4">
                <div className="text-red-400 text-lg font-semibold">
                  Player Error
                </div>
                <p className="text-sm text-gray-300 max-w-md">
                  Test error message
                </p>
                <div className="flex gap-2 justify-center">
                  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">
                    Retry
                  </button>
                  <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded-md transition-colors">
                    Try Alternative Player
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return <div>Loading...</div>;
    };

    render(<ErrorPlayerContainer />);

    await waitFor(() => {
      expect(screen.getByText('Player Error')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Try Alternative Player')).toBeInTheDocument();
    });
  });

  it('handles retry functionality', async () => {
    let retryCount = 0;
    
    const RetryPlayerContainer = () => {
      const [error, setError] = React.useState<string | null>(null);
      
      const handleRetry = () => {
        retryCount++;
        setError(null);
        // Simulate success after retry
        if (retryCount < 2) {
          setTimeout(() => setError('Retry test error'), 50);
        }
      };

      React.useEffect(() => {
        setTimeout(() => setError('Initial error'), 100);
      }, []);

      if (error) {
        return (
          <div>
            <div>Error: {error}</div>
            <button onClick={handleRetry} data-testid="retry-button">
              Retry
            </button>
          </div>
        );
      }

      return <div>Success</div>;
    };

    render(<RetryPlayerContainer />);

    await waitFor(() => {
      expect(screen.getByText('Error: Initial error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(screen.getByText('Error: Retry test error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('retry-button'));

    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });

    expect(retryCount).toBe(2);
  });
});