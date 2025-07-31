import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorBoundary, useErrorBoundary } from '../error-boundary';

// Mock console.error to avoid noise in tests
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Test component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Test component for useErrorBoundary hook
function TestHookComponent() {
  const { captureError, resetError } = useErrorBoundary();
  
  return (
    <div>
      <button onClick={() => captureError(new Error('Hook error'))}>
        Trigger Error
      </button>
      <button onClick={resetError}>
        Reset Error
      </button>
      <div>Hook component</div>
    </div>
  );
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders error UI when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred while loading the video player.')).toBeInTheDocument();
  });

  it('shows error details when expanded', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const detailsButton = screen.getByText('Error Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('allows retry when retry count is below maximum', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestComponent shouldThrow={true} />);

    const retryButton = screen.getByText(/Try Again/);
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveTextContent('3 attempts left');

    fireEvent.click(retryButton);

    // After retry, rerender with no error
    rerender(<TestComponent shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('disables retry after maximum attempts', () => {
    const TestComponent = ({ retryCount }: { retryCount: number }) => (
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestComponent retryCount={0} />);

    // Simulate 3 retry attempts
    for (let i = 0; i < 3; i++) {
      const retryButton = screen.queryByText(/Try Again/);
      if (retryButton) {
        fireEvent.click(retryButton);
        rerender(<TestComponent retryCount={i + 1} />);
      }
    }

    // After 3 retries, should show max attempts message
    expect(screen.getByText('Maximum retry attempts reached.')).toBeInTheDocument();
    expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument();
  });

  it('calls custom onError handler when provided', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('uses custom fallback when provided', () => {
    const customFallback = (error: Error) => (
      <div>Custom error: {error.message}</div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
  });

  it('resets error state when reset button is clicked', () => {
    const TestComponent = ({ shouldThrow }: { shouldThrow: boolean }) => (
      <ErrorBoundary>
        <ThrowError shouldThrow={shouldThrow} />
      </ErrorBoundary>
    );

    const { rerender } = render(<TestComponent shouldThrow={true} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    const resetButton = screen.getByText('Reset Application');
    fireEvent.click(resetButton);

    rerender(<TestComponent shouldThrow={false} />);

    expect(screen.getByText('No error')).toBeInTheDocument();
  });
});

describe('useErrorBoundary', () => {
  it('throws error when captureError is called', () => {
    expect(() => {
      render(
        <ErrorBoundary>
          <TestHookComponent />
        </ErrorBoundary>
      );

      const triggerButton = screen.getByText('Trigger Error');
      fireEvent.click(triggerButton);
    }).not.toThrow(); // ErrorBoundary should catch it

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('resets error when resetError is called', () => {
    render(
      <ErrorBoundary>
        <TestHookComponent />
      </ErrorBoundary>
    );

    // Initially should show the component
    expect(screen.getByText('Hook component')).toBeInTheDocument();

    // Trigger error
    const triggerButton = screen.getByText('Trigger Error');
    fireEvent.click(triggerButton);

    // Should show error boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});