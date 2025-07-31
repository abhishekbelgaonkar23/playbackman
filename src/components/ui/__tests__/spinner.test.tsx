import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Spinner, LoadingState, LoadingOverlay } from '../spinner';

describe('Spinner', () => {
  it('renders with default size', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('h-6', 'w-6');
  });

  it('renders with small size', () => {
    render(<Spinner size="sm" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4');
  });

  it('renders with large size', () => {
    render(<Spinner size="lg" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });

  it('applies custom className', () => {
    render(<Spinner className="text-red-500" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('text-red-500');
  });

  it('has proper accessibility attributes', () => {
    render(<Spinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('LoadingState', () => {
  it('renders with default message', () => {
    render(<LoadingState />);
    
    expect(screen.getAllByText('Loading...')).toHaveLength(2); // One in spinner sr-only, one visible
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingState message="Processing file..." />);
    
    expect(screen.getByText('Processing file...')).toBeInTheDocument();
  });

  it('shows progress bar when showProgress is true', () => {
    render(<LoadingState progress={50} showProgress={true} />);
    
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not show progress bar when showProgress is false', () => {
    render(<LoadingState progress={50} showProgress={false} />);
    
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('clamps progress value between 0 and 100', () => {
    const { rerender } = render(<LoadingState progress={-10} showProgress={true} />);
    
    let progressBar = screen.getByText('Progress').parentElement?.parentElement?.querySelector('div[style*="width"]');
    expect(progressBar).toHaveStyle('width: 0%');

    rerender(<LoadingState progress={150} showProgress={true} />);
    
    progressBar = screen.getByText('Progress').parentElement?.parentElement?.querySelector('div[style*="width"]');
    expect(progressBar).toHaveStyle('width: 100%');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingState size="sm" />);
    
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-4', 'w-4');

    rerender(<LoadingState size="lg" />);
    
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('h-8', 'w-8');
  });
});

describe('LoadingOverlay', () => {
  it('renders when isVisible is true', () => {
    render(<LoadingOverlay isVisible={true} message="Loading..." />);
    
    expect(screen.getAllByText('Loading...')).toHaveLength(2); // One in spinner sr-only, one visible
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not render when isVisible is false', () => {
    render(<LoadingOverlay isVisible={false} message="Loading..." />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows progress when showProgress is true', () => {
    render(
      <LoadingOverlay 
        isVisible={true} 
        progress={75} 
        showProgress={true}
        message="Processing..."
      />
    );
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <LoadingOverlay 
        isVisible={true} 
        className="custom-overlay"
        message="Loading..."
      />
    );
    
    const overlay = screen.getByRole('status').closest('div')?.parentElement?.parentElement;
    expect(overlay).toHaveClass('custom-overlay');
  });

  it('has proper overlay styling', () => {
    render(<LoadingOverlay isVisible={true} message="Loading..." />);
    
    const overlay = screen.getByRole('status').closest('div')?.parentElement?.parentElement;
    expect(overlay).toHaveClass('absolute', 'inset-0', 'bg-background/80', 'backdrop-blur-sm');
  });
});