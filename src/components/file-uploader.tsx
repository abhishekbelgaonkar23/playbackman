"use client";

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileVideo, X, Smartphone } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { LoadingOverlay } from '~/components/ui/spinner';
import { ErrorDisplay } from '~/components/error-display';
import { useIsMobile, useIsLandscape, useIsTouchDevice } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import type { FileUploaderProps } from '~/types';

export function FileUploader({
  onFileSelect,
  acceptedFormats,
  isLoading,
  error,
  multiple = false
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Responsive hooks
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const isTouchDevice = useIsTouchDevice();

  // Create accept string for file input
  const acceptString = acceptedFormats.join(',');

  const handleFileSelect = useCallback((files: File | File[]) => {
    if (Array.isArray(files)) {
      if (files.length === 1) {
        setSelectedFileName(files[0]!.name);
      } else {
        setSelectedFileName(`${files.length} files selected`);
      }
      onFileSelect(files);
    } else {
      setSelectedFileName(files.name);
      onFileSelect(files);
    }
  }, [onFileSelect]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      if (multiple) {
        const fileArray = Array.from(files);
        handleFileSelect(fileArray);
      } else if (files[0]) {
        handleFileSelect(files[0]);
      }
    }
  }, [handleFileSelect, multiple]);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Only set drag over to false if we're leaving the drop zone entirely
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      // Filter for video files
      const videoFiles = Array.from(files).filter(file => 
        file.type.startsWith('video/') || 
        acceptedFormats.some(format => file.name.toLowerCase().endsWith(format.replace('*', '')))
      );
      
      if (videoFiles.length > 0) {
        if (multiple) {
          handleFileSelect(videoFiles);
        } else if (videoFiles[0]) {
          handleFileSelect(videoFiles[0]);
        }
      }
    }
  }, [acceptedFormats, handleFileSelect, multiple]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className={cn(
        "p-4 sm:p-6",
        isMobile && isLandscape && "p-3"
      )}>
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg text-center transition-all duration-200",
            "touch-manipulation", // Improve touch responsiveness
            // Responsive padding
            isMobile && isLandscape ? "p-3" : "p-4 sm:p-6 lg:p-8",
            // Drag and touch states
            isDragOver 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50 active:border-muted-foreground/75",
            // Disable drag on touch devices to avoid conflicts
            isTouchDevice && "border-muted-foreground/25",
            isLoading && "pointer-events-none"
          )}
          // Only enable drag events on non-touch devices
          {...(!isTouchDevice && {
            onDragEnter: handleDragEnter,
            onDragLeave: handleDragLeave,
            onDragOver: handleDragOver,
            onDrop: handleDrop
          })}
          // Add touch events for better mobile support
          onTouchStart={(e) => {
            // Prevent default to avoid unwanted behaviors on touch
            if (isTouchDevice) {
              e.preventDefault();
            }
          }}
        >
          {/* Hidden file input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            multiple={multiple}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
            aria-label={multiple ? "Select video files" : "Select video file"}
          />

          <div className={cn(
            "flex flex-col items-center",
            isMobile && isLandscape ? "gap-2" : "gap-3 sm:gap-4"
          )}>
            {isDragOver && !isTouchDevice ? (
              <>
                <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                  <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-medium text-primary">
                    Drop your video file here
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Release to upload
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 sm:p-3 rounded-full bg-muted">
                  {isTouchDevice ? (
                    <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  ) : (
                    <FileVideo className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-1">
                  <p className={cn(
                    "font-medium",
                    isMobile && isLandscape ? "text-sm" : "text-base sm:text-lg"
                  )}>
                    {selectedFileName ? (multiple ? 'Files Selected' : 'File Selected') : (
                      isTouchDevice ? (multiple ? 'Select video files' : 'Select a video file') : (multiple ? 'Select or drag video files' : 'Select or drag a video file')
                    )}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground px-2">
                    {selectedFileName ? (
                      <span className="break-all">{selectedFileName}</span>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Supports MP4, WebM, OGG, FLV, WMV formats</span>
                        <span className="sm:hidden">{multiple ? 'Tap to select video files' : 'Tap to select video file'}</span>
                      </>
                    )}
                  </p>
                </div>
                
                <div className={cn(
                  "flex gap-2 w-full sm:w-auto",
                  isMobile && isLandscape ? "flex-row" : "flex-col sm:flex-row"
                )}>
                  <Button 
                    onClick={handleBrowseClick}
                    disabled={isLoading}
                    variant="outline"
                    size={isMobile && isLandscape ? "default" : "lg"}
                    className="w-full sm:w-auto min-h-[44px] touch-manipulation" // Minimum touch target size
                  >
                    {isLoading ? 'Processing...' : (
                      <>
                        <span className="sm:hidden">{multiple ? 'Select Video Files' : 'Select Video File'}</span>
                        <span className="hidden sm:inline">Browse Files</span>
                      </>
                    )}
                  </Button>
                  
                  {selectedFileName && (
                    <Button 
                      onClick={handleClearFile}
                      disabled={isLoading}
                      variant="ghost"
                      size={isMobile && isLandscape ? "default" : "lg"}
                      className="w-full sm:w-auto min-h-[44px] touch-manipulation"
                      aria-label="Clear selected file"
                    >
                      <X className="w-4 h-4 sm:mr-2" />
                      <span className="sm:hidden">Clear File</span>
                      <span className="hidden sm:inline">Clear</span>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Loading overlay */}
          <LoadingOverlay
            isVisible={isLoading}
            message="Processing file..."
            className="rounded-lg"
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4">
            <ErrorDisplay
              error={error}
              compact={true}
              onDismiss={() => {
                // Clear file selection on error dismiss
                setSelectedFileName(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
            />
          </div>
        )}

        {/* Supported formats info - hidden on mobile to save space */}
        <div className="mt-4 text-xs text-muted-foreground hidden sm:block">
          <p className="font-medium mb-1">Supported formats:</p>
          <div className="flex flex-col sm:flex-row sm:gap-4 gap-1">
            <span>
              <span className="font-medium">Video.js:</span> MP4, WebM, OGG
            </span>
            <span>
              <span className="font-medium">MediaElement.js:</span> FLV, WMV
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}