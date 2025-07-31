import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { useTheme } from 'next-themes';
import { ThemeToggle } from '../theme-toggle';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

const mockUseTheme = vi.mocked(useTheme);

describe('ThemeToggle', () => {
  const mockSetTheme = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
      themes: ['light', 'dark'],
      systemTheme: 'light',
    });
  });

  it('renders correctly in light mode', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Switch to dark mode');
    
    // Should show sun icon (visible) and moon icon (hidden)
    const sunIcon = button.querySelector('.lucide-sun');
    const moonIcon = button.querySelector('.lucide-moon');
    
    expect(sunIcon).toBeInTheDocument();
    expect(moonIcon).toBeInTheDocument();
  });

  it('renders correctly in dark mode', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
      themes: ['light', 'dark'],
      systemTheme: 'dark',
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title', 'Switch to light mode');
  });

  it('toggles theme from light to dark when clicked', async () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  it('toggles theme from dark to light when clicked', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
      themes: ['light', 'dark'],
      systemTheme: 'dark',
    });

    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockSetTheme).toHaveBeenCalledWith('light');
    });
  });

  it('renders with custom className', () => {
    render(<ThemeToggle className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<ThemeToggle size="sm" />);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('h-8'); // sm size class
    
    rerender(<ThemeToggle size="lg" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('h-10'); // lg size class
  });

  it('renders with different variants', () => {
    const { rerender } = render(<ThemeToggle variant="ghost" />);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-accent'); // ghost variant class
    
    rerender(<ThemeToggle variant="secondary" />);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-secondary'); // secondary variant class
  });

  it('handles theme switching correctly', () => {
    // Test that the component properly handles theme state
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Switch to dark mode');
    
    // Verify icons are present
    const sunIcon = button.querySelector('svg');
    expect(sunIcon).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('title');
    
    const srText = screen.getByText('Toggle theme');
    expect(srText).toHaveClass('sr-only');
  });
});