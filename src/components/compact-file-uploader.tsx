"use client";

import React, { useCallback, useState, useRef } from 'react';
import { Upload, Plus, X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { useIsMobile, useIsTouchDevice } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import type { FileUploaderProps } from '~/types';

export function CompactFileUploader({
  onFileSelect,
  acceptedFormats,
  isLoading,
  error,
  multiple = true
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isMobile = useIsMobile();
  const isTouchDevice = useIsTouchDevice();

  const acceptString = acceptedFormats.join(',');

  const handleFileSelect = useCallback((files: File | File[]) => {
    const fileArray = Array.isArray(files) ? files : [files];
    setSelectedCount(fileArray.length);
    onFileSelect(files);
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

  const handleClear = useCallback(() => {
    setSelectedCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="relative">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer",
          "hover:border-primary/50 hover:bg-primary/5",
          isDragOver 
            ? "border-primary bg-primary/10 scale-[1.02]" 
            : "border-muted-foreground/25",
          isLoading && "pointer-events-none opacity-50",
          "p-4"
        )}
        {...(!isTouchDevice && {
          onDragEnter: handleDragEnter,
          onDragLeave: handleDragLeave,
          onDragOver: handleDragOver,
          onDrop: handleDrop
        })}
        onClick={handleBrowseClick}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
          aria-label="Add video files to playlist"
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              isDragOver ? "bg-primary text-primary-foreground" : "bg-muted"
            )}>
              {isDragOver ? (
                <Upload className="w-5 h-5" />
              ) : (
                <Plus className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-sm">
                {isDragOver ? 'Drop videos here' : 'Add videos to playlist'}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedCount > 0 ? (
                  `${selectedCount} file${selectedCount !== 1 ? 's' : ''} selected`
                ) : (
                  isTouchDevice ? 'Tap to select' : 'Click or drag files'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="h-8 w-8 p-0"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="text-xs px-3"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
            >
              {isLoading ? 'Adding...' : 'Browse'}
            </Button>
          </div>
        </div>
      </div>

      {/* Supported formats - compact version */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        Supports: MP4, WebM, OGG, FLV, WMV
      </div>
    </div>
  );
}