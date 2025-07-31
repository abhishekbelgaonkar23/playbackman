"use client";

import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileVideo, X } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';
import type { FileUploaderProps } from '~/types';

export function FileUploader({
  onFileSelect,
  acceptedFormats,
  isLoading,
  error
}: FileUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create accept string for file input
  const acceptString = acceptedFormats.join(',');

  const handleFileSelect = useCallback((file: File) => {
    // If multiple files are selected, only process the first one
    setSelectedFileName(file.name);
    onFileSelect(file);
  }, [onFileSelect]);

  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

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
      // Filter for video files and take the first one
      const videoFiles = Array.from(files).filter(file => 
        file.type.startsWith('video/') || 
        acceptedFormats.some(format => file.name.toLowerCase().endsWith(format.replace('*', '')))
      );
      
      if (videoFiles.length > 0) {
        handleFileSelect(videoFiles[0]);
      }
    }
  }, [acceptedFormats, handleFileSelect]);

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
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200",
            isDragOver 
              ? "border-primary bg-primary/5 scale-[1.02]" 
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            isLoading && "opacity-50 pointer-events-none"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Hidden file input */}
          <Input
            ref={fileInputRef}
            type="file"
            accept={acceptString}
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isLoading}
            aria-label="Select video file"
          />

          <div className="flex flex-col items-center gap-4">
            {isDragOver ? (
              <>
                <div className="p-3 rounded-full bg-primary/10">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium text-primary">
                    Drop your video file here
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Release to upload
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-muted">
                  <FileVideo className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {selectedFileName ? 'File Selected' : 'Select or drag a video file'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedFileName || 'Supports MP4, WebM, OGG, FLV, WMV formats'}
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleBrowseClick}
                    disabled={isLoading}
                    variant="outline"
                  >
                    {isLoading ? 'Processing...' : 'Browse Files'}
                  </Button>
                  
                  {selectedFileName && (
                    <Button 
                      onClick={handleClearFile}
                      disabled={isLoading}
                      variant="ghost"
                      size="icon"
                      aria-label="Clear selected file"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Processing file...</span>
              </div>
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 p-3 rounded-md bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">
              {error.message}
            </p>
            {error.code && (
              <p className="text-xs text-destructive/80 mt-1">
                Error code: {error.code}
              </p>
            )}
          </div>
        )}

        {/* Supported formats info */}
        <div className="mt-4 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Supported formats:</p>
          <p>
            <span className="font-medium">Video.js:</span> MP4, WebM, OGG
            {' • '}
            <span className="font-medium">MediaElement.js:</span> FLV, WMV
          </p>
        </div>
      </CardContent>
    </Card>
  );
}