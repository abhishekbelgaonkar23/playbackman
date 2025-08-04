/**
 * Thumbnail generation service for video files
 * Generates thumbnails and extracts video metadata
 */

export interface VideoMetadata {
  duration: number;
  thumbnail: string;
  width?: number;
  height?: number;
}

class ThumbnailService {
  /**
   * Generate thumbnail and extract metadata from video file
   */
  async generateThumbnail(file: File): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      video.preload = 'metadata';
      video.muted = true;
      
      video.onloadedmetadata = () => {
        // Set canvas dimensions
        canvas.width = 320;
        canvas.height = (video.videoHeight / video.videoWidth) * 320;
        
        // Seek to 10% of video duration for thumbnail
        video.currentTime = video.duration * 0.1;
      };
      
      video.onseeked = () => {
        try {
          // Draw video frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to data URL
          const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
          
          resolve({
            duration: video.duration,
            thumbnail,
            width: video.videoWidth,
            height: video.videoHeight
          });
          
          // Cleanup
          URL.revokeObjectURL(video.src);
        } catch (error) {
          reject(error);
        }
      };
      
      video.onerror = () => {
        reject(new Error('Failed to load video for thumbnail generation'));
      };
      
      // Create object URL and load video
      const url = URL.createObjectURL(file);
      video.src = url;
    });
  }

  /**
   * Format duration in MM:SS or HH:MM:SS format
   */
  formatDuration(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Format file size in human readable format
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}

export const thumbnailService = new ThumbnailService();