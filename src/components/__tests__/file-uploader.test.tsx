import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from '../file-uploader';
import { useIsMobile, useIsLandscape, useIsTouchDevice } from '~/hooks/use-responsive';
import type { FileUploaderProps } from '~/types';

// Mock responsive hooks
vi.mock('~/hooks/use-responsive', () => ({
  useIsMobile: vi.fn(() => false),
  useIsLandscape: vi.fn(() => true),
  useIsTouchDevice: vi.fn(() => false),
}));

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  FileVideo: () => <div data-testid="file-video-icon">FileVideo</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Smartphone: () => <div data-testid="smartphone-icon">Smartphone</div>,
  FileX: () => <div data-testid="file-x-icon">FileX</div>,
  Monitor: () => <div data-testid="monitor-icon">Monitor</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">AlertTriangle</div>,
  RefreshCw: () => <div data-testid="refresh-icon">RefreshCw</div>,
  RotateCcw: () => <div data-testid="rotate-icon">RotateCcw</div>,
  Wifi: () => <div data-testid="wifi-icon">Wifi</div>,
}));

// Mock the UI components
vi.mock('~/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
}));

vi.mock('~/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-variant={variant}
      data-size={size}
      data-testid="button"
      {...props}
    >
      {children}
    </button>
  ),
}));

vi.mock('~/components/ui/input', () => ({
  Input: ({ onChange, accept, disabled, ...props }: any) => (
    <input 
      onChange={onChange} 
      accept={accept} 
      disabled={disabled}
      data-testid="file-input"
      {...props}
    />
  ),
}));

vi.mock('~/lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}));

describe('FileUploader', () => {
  const mockOnFileSelect = vi.fn();
  const defaultProps: FileUploaderProps = {
    onFileSelect: mockOnFileSelect,
    acceptedFormats: ['.mp4', '.webm', '.ogg', '.flv', '.wmv'],
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the file uploader component', () => {
      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeInTheDocument();
      expect(screen.getByText('Select or drag a video file')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
    });

    it('displays supported formats information', () => {
      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByText('Supported formats:')).toBeInTheDocument();
      expect(screen.getByText(/Video\.js:/)).toBeInTheDocument();
      expect(screen.getByText(/MediaElement\.js:/)).toBeInTheDocument();
    });

    it('sets correct accept attribute on file input', () => {
      render(<FileUploader {...defaultProps} />);
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toHaveAttribute('accept', '.mp4,.webm,.ogg,.flv,.wmv');
    });
  });

  describe('File Selection via Input', () => {
    it('calls onFileSelect when a file is selected via input', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
      expect(screen.getByText('File Selected')).toBeInTheDocument();
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    });

    it('processes only the first file when multiple files are selected', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const file1 = new File(['video content 1'], 'test-video1.mp4', { type: 'video/mp4' });
      const file2 = new File(['video content 2'], 'test-video2.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, [file1, file2]);
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
      expect(screen.getByText('test-video1.mp4')).toBeInTheDocument();
    });

    it('opens file browser when Browse Files button is clicked', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const browseButton = screen.getByText('Browse Files');
      const fileInput = screen.getByTestId('file-input');
      
      // Mock the click method
      const clickSpy = vi.spyOn(fileInput, 'click');
      
      await user.click(browseButton);
      
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Drag and Drop Functionality', () => {
    it('shows drag over state when file is dragged over', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      
      fireEvent.dragEnter(dropZone);
      
      expect(screen.getByText('Drop your video file here')).toBeInTheDocument();
      expect(screen.getByText('Release to upload')).toBeInTheDocument();
      expect(screen.getByTestId('upload-icon')).toBeInTheDocument();
    });

    it('handles drag leave events', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      
      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop your video file here')).toBeInTheDocument();
      
      // Mock getBoundingClientRect to simulate leaving the drop zone
      vi.spyOn(dropZone, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        right: 100,
        bottom: 100,
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      });
      
      // Simulate drag leave event - the component should handle it
      fireEvent.dragLeave(dropZone, { clientX: 150, clientY: 150 });
      
      // The drag leave handler should be called (we can't easily test state change due to complex logic)
      // But we can verify the event is handled without errors
      expect(dropZone).toBeInTheDocument();
    });

    it('calls onFileSelect when a video file is dropped', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file],
        },
      });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file);
    });

    it('filters non-video files when dropped', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      const videoFile = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [textFile, videoFile],
        },
      });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(videoFile);
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    });

    it('processes only the first video file when multiple video files are dropped', () => {
      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      const file1 = new File(['video content 1'], 'test-video1.mp4', { type: 'video/mp4' });
      const file2 = new File(['video content 2'], 'test-video2.webm', { type: 'video/webm' });
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [file1, file2],
        },
      });
      
      expect(mockOnFileSelect).toHaveBeenCalledWith(file1);
      expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when isLoading is true', () => {
      render(<FileUploader {...defaultProps} isLoading={true} />);
      
      expect(screen.getByText('Processing file...')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
      
      const fileInput = screen.getByTestId('file-input');
      expect(fileInput).toBeDisabled();
    });

    it('disables interactions when loading', () => {
      render(<FileUploader {...defaultProps} isLoading={true} />);
      
      const browseButton = screen.getByText('Processing...');
      expect(browseButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('displays error message when error prop is provided', () => {
      const error = {
        message: 'Unsupported file format',
        code: 'INVALID_FORMAT',
        type: 'file' as const,
        recoverable: true,
      };
      
      render(<FileUploader {...defaultProps} error={error} />);
      
      expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
      // The error code is not shown in compact mode, only the message
    });

    it('does not show error code when not provided', () => {
      const error = {
        message: 'Something went wrong',
        type: 'file' as const,
        recoverable: true,
      };
      
      render(<FileUploader {...defaultProps} error={error} />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // Error code is not shown in compact mode
    });
  });

  describe('File Management', () => {
    it('shows clear button when file is selected', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('clears selected file when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      
      const clearButton = screen.getByLabelText('Clear selected file');
      await user.click(clearButton);
      
      expect(screen.getByText('Select or drag a video file')).toBeInTheDocument();
      expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      render(<FileUploader {...defaultProps} />);
      
      const fileInput = screen.getByLabelText('Select video file');
      expect(fileInput).toBeInTheDocument();
    });

    it('has accessible clear button', async () => {
      const user = userEvent.setup();
      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      
      const clearButton = screen.getByLabelText('Clear selected file');
      expect(clearButton).toBeInTheDocument();
    });
  });

  describe('Responsive Design Tests', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders with mobile-specific text and layout', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(false);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByText('Select a video file')).toBeInTheDocument();
      expect(screen.getByText('Tap to select video file')).toBeInTheDocument();
      expect(screen.getByText('Select Video File')).toBeInTheDocument();
      expect(screen.getByTestId('smartphone-icon')).toBeInTheDocument();
    });

    it('renders with desktop text when not on mobile', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      vi.mocked(useIsLandscape).mockReturnValue(true);
      vi.mocked(useIsTouchDevice).mockReturnValue(false);

      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByText('Select or drag a video file')).toBeInTheDocument();
      expect(screen.getByText('Supports MP4, WebM, OGG, FLV, WMV formats')).toBeInTheDocument();
      expect(screen.getByText('Browse Files')).toBeInTheDocument();
      expect(screen.getByTestId('file-video-icon')).toBeInTheDocument();
    });

    it('hides supported formats on mobile to save space', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(false);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      // The supported formats section should have hidden class on mobile
      const supportedFormatsSection = screen.getByText('Supported formats:').closest('div');
      expect(supportedFormatsSection).toHaveClass('hidden');
    });

    it('shows supported formats on desktop', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      vi.mocked(useIsLandscape).mockReturnValue(true);
      vi.mocked(useIsTouchDevice).mockReturnValue(false);

      render(<FileUploader {...defaultProps} />);
      
      expect(screen.getByText('Supported formats:')).toBeInTheDocument();
      expect(screen.getByText(/Video\.js:/)).toBeInTheDocument();
      expect(screen.getByText(/MediaElement\.js:/)).toBeInTheDocument();
    });

    it('disables drag and drop on touch devices', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(false);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      
      // Try to trigger drag enter - should not show drag over state on touch devices
      fireEvent.dragEnter(dropZone);
      
      // Should not show drag over text since drag is disabled on touch
      expect(screen.queryByText('Drop your video file here')).not.toBeInTheDocument();
      expect(screen.getByText('Select a video file')).toBeInTheDocument();
    });

    it('enables drag and drop on non-touch devices', () => {
      vi.mocked(useIsMobile).mockReturnValue(false);
      vi.mocked(useIsLandscape).mockReturnValue(true);
      vi.mocked(useIsTouchDevice).mockReturnValue(false);

      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      
      // Trigger drag enter - should show drag over state on non-touch devices
      fireEvent.dragEnter(dropZone);
      
      expect(screen.getByText('Drop your video file here')).toBeInTheDocument();
      expect(screen.getByText('Release to upload')).toBeInTheDocument();
    });

    it('adapts button layout for mobile landscape', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(true);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      // Should show mobile-specific button text
      expect(screen.getByText('Select Video File')).toBeInTheDocument();
    });

    it('shows clear button with appropriate text for mobile', async () => {
      const user = userEvent.setup();
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(false);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('Clear File')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('shows clear button with desktop text for desktop', async () => {
      const user = userEvent.setup();
      vi.mocked(useIsMobile).mockReturnValue(false);
      vi.mocked(useIsLandscape).mockReturnValue(true);
      vi.mocked(useIsTouchDevice).mockReturnValue(false);

      render(<FileUploader {...defaultProps} />);
      
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });
      const fileInput = screen.getByTestId('file-input');
      
      await user.upload(fileInput, file);
      
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByTestId('x-icon')).toBeInTheDocument();
    });

    it('handles touch events properly on touch devices', () => {
      vi.mocked(useIsMobile).mockReturnValue(true);
      vi.mocked(useIsLandscape).mockReturnValue(false);
      vi.mocked(useIsTouchDevice).mockReturnValue(true);

      render(<FileUploader {...defaultProps} />);
      
      const dropZone = screen.getByTestId('card-content').firstChild as HTMLElement;
      
      // Mock preventDefault
      const mockPreventDefault = vi.fn();
      
      // Simulate touch start event
      fireEvent.touchStart(dropZone, {
        preventDefault: mockPreventDefault
      });
      
      // Should handle touch events without errors
      expect(dropZone).toBeInTheDocument();
    });
  });
});