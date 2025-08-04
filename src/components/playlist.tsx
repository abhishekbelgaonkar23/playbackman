"use client";

import React, { useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Play, X, GripVertical, Clock, FileVideo } from 'lucide-react';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';
import { CompactFileUploader } from './compact-file-uploader';
import { thumbnailService } from '~/services/thumbnail.service';
import { useIsMobile, useIsLandscape } from '~/hooks/use-responsive';
import { cn } from '~/lib/utils';
import type { PlaylistProps, PlaylistItem, AppError } from '~/types';

export function Playlist({
  playlist,
  currentIndex,
  onReorder,
  onSelect,
  onRemove,
  onFileSelect,
  acceptedFormats,
  isLoading,
  error,
  className
}: PlaylistProps) {
  const isMobile = useIsMobile();
  const isLandscape = useIsLandscape();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragEnd = useCallback((result: DropResult) => {
    setDraggedIndex(null);
    
    if (!result.destination) return;

    const items = Array.from(playlist);
    const [reorderedItem] = items.splice(result.source.index, 1);
    if (reorderedItem) {
      items.splice(result.destination.index, 0, reorderedItem);
    }

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    onReorder(updatedItems);
  }, [playlist, onReorder]);

  const handleDragStart = useCallback((start: any) => {
    setDraggedIndex(start.source.index);
  }, []);

  // Always show the playlist component to allow file uploads

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <FileVideo className="w-5 h-5" />
            Playlist
            {playlist.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {playlist.length}
              </Badge>
            )}
          </h3>
        </div>



        {/* Playlist Items */}
        {playlist.length > 0 ? (
          <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
            <Droppable droppableId="playlist">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={cn(
                    "space-y-2 transition-colors duration-200",
                    snapshot.isDraggingOver && "bg-muted/30 rounded-lg p-2"
                  )}
                >
                {playlist.map((item, index) => (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "group relative bg-card border rounded-lg transition-all duration-200",
                          "hover:shadow-md hover:border-primary/20",
                          snapshot.isDragging && "shadow-lg rotate-1 scale-105",
                          draggedIndex === index && "opacity-50",
                          currentIndex === index && "ring-2 ring-primary bg-primary/5"
                        )}
                      >
                        <div className="flex items-center p-3 gap-3">
                          {/* Drag Handle */}
                          <div
                            {...provided.dragHandleProps}
                            className={cn(
                              "flex-shrink-0 p-1 rounded cursor-grab active:cursor-grabbing",
                              "text-muted-foreground hover:text-foreground transition-colors",
                              "touch-manipulation" // Better touch support
                            )}
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Position Badge */}
                          <div className="flex-shrink-0">
                            <Badge 
                              variant={currentIndex === index ? "default" : "outline"}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono"
                            >
                              {index + 1}
                            </Badge>
                          </div>

                          {/* Thumbnail */}
                          <div className="flex-shrink-0 relative">
                            {item.fileInfo.thumbnail ? (
                              <div className="relative">
                                <img
                                  src={item.fileInfo.thumbnail}
                                  alt={`${item.fileInfo.name} thumbnail`}
                                  className="w-16 h-12 sm:w-20 sm:h-14 object-cover rounded border bg-muted"
                                />
                                {currentIndex === index && (
                                  <div className="absolute inset-0 bg-primary/20 rounded flex items-center justify-center">
                                    <Play className="w-4 h-4 text-primary fill-current" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-16 h-12 sm:w-20 sm:h-14 bg-muted rounded border flex items-center justify-center">
                                <FileVideo className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* File Info */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2">
                              <p 
                                className="font-medium text-sm truncate" 
                                title={item.fileInfo.name}
                              >
                                {item.fileInfo.name}
                              </p>
                              {currentIndex === index && (
                                <Badge variant="default" className="text-xs px-2 py-0">
                                  Playing
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {item.fileInfo.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{thumbnailService.formatDuration(item.fileInfo.duration)}</span>
                                </div>
                              )}
                              <span>{thumbnailService.formatFileSize(item.fileInfo.size)}</span>
                              <span className="uppercase">{item.fileInfo.extension}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex-shrink-0 flex items-center gap-1">
                            {currentIndex !== index && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onSelect(index)}
                                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Play this video"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                            
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemove(index)}
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              title="Remove from playlist"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium mb-1">No videos in playlist</p>
            <p className="text-xs">Add videos using the uploader above</p>
          </div>
        )}

        {/* Playlist Stats */}
        {playlist.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {playlist.length} video{playlist.length !== 1 ? 's' : ''} in playlist
              </span>
              <span>
                Total: {thumbnailService.formatFileSize(
                  playlist.reduce((total, item) => total + item.fileInfo.size, 0)
                )}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}