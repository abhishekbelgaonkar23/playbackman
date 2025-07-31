"use client";

import React from 'react';
import { AlertTriangle, FileX, Wifi, Monitor, RefreshCw, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { AppError, ErrorType } from '~/types';
import { ERROR_CODES } from '~/types/errors';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onFallback?: () => void;
  className?: string;
  compact?: boolean;
}

const ERROR_ICONS: Record<ErrorType, React.ComponentType<{ className?: string }>> = {
  file: FileX,
  player: Monitor,
  playback: AlertTriangle,
  network: Wifi,
  browser: Monitor
};

const SUPPORTED_FORMATS = {
  videojs: ['MP4', 'WebM', 'OGG'],
  mediaelement: ['FLV', 'WMV', 'MP4', 'WebM']
};

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  onFallback,
  className,
  compact = false 
}: ErrorDisplayProps) {
  const IconComponent = ERROR_ICONS[error.type];

  const getErrorTitle = (error: AppError): string => {
    switch (error.type) {
      case 'file':
        return 'File Error';
      case 'player':
        return 'Player Error';
      case 'playback':
        return 'Playback Error';
      case 'network':
        return 'Network Error';
      case 'browser':
        return 'Browser Error';
      default:
        return 'Error';
    }
  };

  const getErrorSeverity = (error: AppError): 'error' | 'warning' | 'info' => {
    if (error.code === ERROR_CODES.UNSUPPORTED_FORMAT) return 'warning';
    if (error.recoverable) return 'warning';
    return 'error';
  };

  const severity = getErrorSeverity(error);
  
  const severityStyles = {
    error: 'border-destructive/20 bg-destructive/5',
    warning: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'
  };

  const iconStyles = {
    error: 'text-destructive',
    warning: 'text-orange-600 dark:text-orange-400',
    info: 'text-blue-600 dark:text-blue-400'
  };

  const textStyles = {
    error: 'text-destructive',
    warning: 'text-orange-800 dark:text-orange-200',
    info: 'text-blue-800 dark:text-blue-200'
  };

  if (compact) {
    return (
      <div className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        severityStyles[severity],
        className
      )}>
        <IconComponent className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconStyles[severity])} />
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', textStyles[severity])}>
            {error.message}
          </p>
          {error.suggestions && error.suggestions.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {error.suggestions[0]}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {onRetry && error.recoverable && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="ghost"
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              aria-label="Close error message"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border', severityStyles[severity], className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2 rounded-full',
              severity === 'error' ? 'bg-destructive/10' : 
              severity === 'warning' ? 'bg-orange-100 dark:bg-orange-900/20' :
              'bg-blue-100 dark:bg-blue-900/20'
            )}>
              <IconComponent className={cn('h-5 w-5', iconStyles[severity])} />
            </div>
            <div>
              <CardTitle className={cn('text-base', textStyles[severity])}>
                {getErrorTitle(error)}
              </CardTitle>
              {error.code && (
                <p className="text-xs text-muted-foreground mt-1">
                  Code: {error.code}
                </p>
              )}
            </div>
          </div>
          {onDismiss && (
            <Button
              onClick={onDismiss}
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Close error message"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className={cn('text-sm', textStyles[severity])}>
          {error.message}
        </p>

        {/* File-specific information */}
        {error.type === 'file' && 'fileName' in error && error.fileName && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium">File:</span> {error.fileName}</p>
            {'fileSize' in error && error.fileSize && (
              <p><span className="font-medium">Size:</span> {(error.fileSize / (1024 * 1024)).toFixed(2)} MB</p>
            )}
            {'fileType' in error && error.fileType && (
              <p><span className="font-medium">Type:</span> {error.fileType}</p>
            )}
          </div>
        )}

        {/* Player-specific information */}
        {error.type === 'player' && 'playerType' in error && error.playerType && (
          <div className="text-xs text-muted-foreground">
            <p><span className="font-medium">Player:</span> {error.playerType}</p>
          </div>
        )}

        {/* Supported formats for unsupported format errors */}
        {error.code === ERROR_CODES.UNSUPPORTED_FORMAT && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Supported Formats</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <span className="font-medium">Video.js:</span> {SUPPORTED_FORMATS.videojs.join(', ')}
              </p>
              <p>
                <span className="font-medium">MediaElement.js:</span> {SUPPORTED_FORMATS.mediaelement.join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {error.suggestions && error.suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Suggestions:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {error.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-muted-foreground/60 mt-1">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {onRetry && error.recoverable && (
            <Button
              onClick={onRetry}
              size="sm"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {onFallback && error.type === 'player' && (
            <Button
              onClick={onFallback}
              size="sm"
              variant="outline"
            >
              Try Alternative Player
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Specific error display components for different scenarios
export function UnsupportedFormatError({ 
  fileName, 
  fileType, 
  onDismiss,
  className 
}: {
  fileName: string;
  fileType?: string;
  onDismiss?: () => void;
  className?: string;
}) {
  const error: AppError = {
    type: 'file',
    message: `The file "${fileName}" is not in a supported format.`,
    code: ERROR_CODES.UNSUPPORTED_FORMAT,
    recoverable: true,
    suggestions: [
      'Please select a video file in one of the supported formats',
      'Convert your video to MP4, WebM, or OGG for best compatibility'
    ],
    fileName,
    fileType
  };

  return (
    <ErrorDisplay
      error={error}
      onDismiss={onDismiss}
      className={className}
    />
  );
}

export function PlayerInitError({ 
  playerType, 
  onRetry, 
  onFallback,
  className 
}: {
  playerType: 'videojs' | 'mediaelement';
  onRetry?: () => void;
  onFallback?: () => void;
  className?: string;
}) {
  const error: AppError = {
    type: 'player',
    message: `Failed to initialize ${playerType} player.`,
    code: ERROR_CODES.PLAYER_INIT_FAILED,
    recoverable: true,
    suggestions: [
      'Check your internet connection',
      'Try refreshing the page',
      'Try using a different browser'
    ],
    playerType
  };

  return (
    <ErrorDisplay
      error={error}
      onRetry={onRetry}
      onFallback={onFallback}
      className={className}
    />
  );
}