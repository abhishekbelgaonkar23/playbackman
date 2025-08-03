'use client';

import React, { useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'playback' | 'navigation' | 'volume' | 'display';
  action: string;
}

interface KeyboardShortcutsLegendProps {
  onShortcut?: (action: string, data?: any) => void;
}

const shortcuts: ShortcutItem[] = [
  // Playback
  { keys: ['K', 'Space'], description: 'Play/Pause', category: 'playback', action: 'toggle-play' },
  { keys: ['J'], description: 'Rewind 10 seconds', category: 'playback', action: 'rewind-10' },
  { keys: ['L'], description: 'Fast forward 10 seconds', category: 'playback', action: 'forward-10' },
  { keys: ['<', ','], description: 'Previous frame (when paused)', category: 'playback', action: 'frame-back' },
  { keys: ['>', '.'], description: 'Next frame (when paused)', category: 'playback', action: 'frame-forward' },
  
  // Navigation
  { keys: ['←'], description: 'Seek backward 5 seconds', category: 'navigation', action: 'seek-back-5' },
  { keys: ['→'], description: 'Seek forward 5 seconds', category: 'navigation', action: 'seek-forward-5' },
  { keys: ['0-9'], description: 'Jump to 0%-90% of video', category: 'navigation', action: 'jump-to-percent' },
  { keys: ['Home'], description: 'Jump to beginning', category: 'navigation', action: 'jump-to-start' },
  { keys: ['End'], description: 'Jump to end', category: 'navigation', action: 'jump-to-end' },
  
  // Volume
  { keys: ['↑'], description: 'Volume up', category: 'volume', action: 'volume-up' },
  { keys: ['↓'], description: 'Volume down', category: 'volume', action: 'volume-down' },
  { keys: ['M'], description: 'Mute/Unmute', category: 'volume', action: 'toggle-mute' },
  
  // Display
  { keys: ['F'], description: 'Toggle fullscreen', category: 'display', action: 'toggle-fullscreen' },
  { keys: ['C'], description: 'Toggle captions', category: 'display', action: 'toggle-captions' },
  { keys: ['='], description: 'Increase playback speed', category: 'display', action: 'speed-up' },
  { keys: ['-'], description: 'Decrease playback speed', category: 'display', action: 'speed-down' },
];

const categoryLabels = {
  playback: 'Playback',
  navigation: 'Navigation',
  volume: 'Volume',
  display: 'Display'
};

const categoryColors = {
  playback: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  navigation: 'bg-green-500/10 text-green-400 border-green-500/20',
  volume: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  display: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
};

export const KeyboardShortcutsLegend: React.FC<KeyboardShortcutsLegendProps> = ({ onShortcut }) => {
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if user is typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key;
      const code = event.code;
      const isShift = event.shiftKey;
      const isCtrl = event.ctrlKey;
      const isMeta = event.metaKey;



      // Find matching shortcut
      const matchingShortcut = shortcuts.find(shortcut => {
        return shortcut.keys.some(shortcutKey => {
          // Handle special cases
          if (shortcutKey === 'Space' && key === ' ') return true;
          if (shortcutKey === '←' && key === 'ArrowLeft') return true;
          if (shortcutKey === '→' && key === 'ArrowRight') return true;
          if (shortcutKey === '↑' && key === 'ArrowUp') return true;
          if (shortcutKey === '↓' && key === 'ArrowDown') return true;
          // Handle = key for speed up
          if (shortcutKey === '=' && code === 'Equal') return true;
          if (shortcutKey === '-' && key === '-') return true;
          if (shortcutKey === '<' && key === ',' && isShift) return true;
          if (shortcutKey === '>' && key === '.' && isShift) return true;
          if (shortcutKey === ',' && key === ',' && !isShift) return true;
          if (shortcutKey === '.' && key === '.' && !isShift) return true;
          if (shortcutKey === '0-9' && /^[0-9]$/.test(key)) return true;
          
          // Regular key matching
          return shortcutKey.toLowerCase() === key.toLowerCase();
        });
      });

      if (matchingShortcut && onShortcut) {
        event.preventDefault();
        
        // Handle number keys for percentage jumping
        if (matchingShortcut.action === 'jump-to-percent' && /^[0-9]$/.test(key)) {
          const percentage = parseInt(key) * 10;
          onShortcut(matchingShortcut.action, percentage);
        } else {
          onShortcut(matchingShortcut.action, matchingShortcut.data);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onShortcut]);

  const renderKey = (key: string) => (
    <kbd
      key={key}
      className="inline-flex items-center px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded shadow-sm"
    >
      {key}
    </kbd>
  );

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-center space-x-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <Keyboard size={20} className="text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Keyboard Shortcuts
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({shortcuts.length} shortcuts)
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              <div key={category} className="space-y-3">
                {/* Category Header */}
                <div className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border",
                  categoryColors[category as keyof typeof categoryColors]
                )}>
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </div>

                {/* Shortcuts List */}
                <div className="space-y-2">
                  {categoryShortcuts.map((shortcut, index) => (
                    <div
                      key={`${category}-${index}`}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150"
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center space-x-1 ml-4">
                        {shortcut.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            {keyIndex > 0 && (
                              <span className="text-xs text-gray-400 mx-1">or</span>
                            )}
                            {renderKey(key)}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

        {/* Footer tip */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            💡 Tip: Keyboard shortcuts work when the page is focused (not typing in inputs)
          </p>
        </div>
      </div>
    </div>
  );
};