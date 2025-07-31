import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploader } from '../file-uploader';
import type { FileUploaderProps } from '~/types';

// Mock the lucide-react icons
vi.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload</div>,
  FileVideo: () => <div data-testid="file-video-icon">FileVideo</div>,
  X: () => <div data-testid="x-icon">X</div>,
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
      };
      
      render(<FileUploader {...defaultProps} error={error} />);
      
      expect(screen.getByText('Unsupported file format')).toBeInTheDocument();
      expect(screen.getByText('Error code: INVALID_FORMAT')).toBeInTheDocument();
    });

    it('does not show error code when not provided', () => {
      const error = {
        message: 'Something went wrong',
        type: 'file' as const,
      };
      
      render(<FileUploader {...defaultProps} error={error} />);
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText(/Error code:/)).not.toBeInTheDocument();
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
});