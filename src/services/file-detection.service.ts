/**
 * File Detection Service
 * Handles video file format detection and validation for player selection
 */

import type { 
  FileDetectionService as IFileDetectionService, 
  PlayerType, 
  ValidationResult, 
  SupportedFormats 
} from '../types/core';

export class FileDetectionService implements IFileDetectionService {
  // Supported formats mapping
  private static readonly SUPPORTED_FORMATS: SupportedFormats = {
    videojs: [
      // Extensions
      'mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov', 'avi', 'mkv',
      // MIME types
      'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 
      'video/x-msvideo', 'video/x-matroska'
    ],
    mediaelement: [
      // Extensions  
      'flv', 'wmv', 'asf', 'rm', 'rmvb', '3gp', 'f4v',
      // MIME types
      'video/x-flv', 'video/x-ms-wmv', 'video/x-ms-asf', 
      'application/vnd.rn-realmedia', 'video/3gpp', 'video/x-f4v'
    ]
  };

  /**
   * Detects the appropriate player type for a given file
   * @param file - The video file to analyze
   * @returns The recommended player type
   */
  detectFileType(file: File): PlayerType {
    const extension = this.extractFileExtension(file.name);
    const mimeType = file.type;

    // Check Video.js formats first (preferred for modern formats)
    if (this.isFormatSupported(extension, mimeType, 'videojs')) {
      return 'videojs';
    }

    // Fall back to MediaElement.js for legacy formats
    if (this.isFormatSupported(extension, mimeType, 'mediaelement')) {
      return 'mediaelement';
    }

    // Default to Video.js for unknown formats (better HTML5 support)
    return 'videojs';
  }

  /**
   * Validates a file and returns detailed validation result
   * @param file - The file to validate
   * @returns Validation result with player type and error information
   */
  validateFile(file: File): ValidationResult {
    // Check if file exists and has content
    if (!file || file.size === 0) {
      return {
        isValid: false,
        error: 'File is empty or invalid'
      };
    }

    // Check file size (optional limit - 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: 'File size exceeds maximum limit (2GB)'
      };
    }

    const extension = this.extractFileExtension(file.name);
    const mimeType = file.type;

    // Check if it's a video file by MIME type
    if (mimeType && !mimeType.startsWith('video/') && !this.isKnownVideoExtension(extension)) {
      return {
        isValid: false,
        error: 'File does not appear to be a video file'
      };
    }

    // Determine player type
    const playerType = this.detectFileType(file);

    // Check if format is supported
    if (!this.isFormatSupported(extension, mimeType, 'videojs') && 
        !this.isFormatSupported(extension, mimeType, 'mediaelement')) {
      return {
        isValid: false,
        error: `Unsupported video format: ${extension || mimeType}. Supported formats: ${this.getSupportedFormatsString()}`,
        playerType
      };
    }

    return {
      isValid: true,
      playerType
    };
  }

  /**
   * Returns the supported formats configuration
   * @returns Object containing supported formats for each player
   */
  getSupportedFormats(): SupportedFormats {
    return {
      videojs: [...FileDetectionService.SUPPORTED_FORMATS.videojs],
      mediaelement: [...FileDetectionService.SUPPORTED_FORMATS.mediaelement]
    };
  }

  /**
   * Extracts file extension from filename
   * @param filename - The filename to process
   * @returns Lowercase file extension without dot
   */
  private extractFileExtension(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return '';
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }

    return filename.substring(lastDotIndex + 1).toLowerCase();
  }

  /**
   * Checks if a format is supported by a specific player
   * @param extension - File extension
   * @param mimeType - MIME type
   * @param playerType - Player to check against
   * @returns True if format is supported
   */
  private isFormatSupported(extension: string, mimeType: string, playerType: PlayerType): boolean {
    const supportedFormats = FileDetectionService.SUPPORTED_FORMATS[playerType];
    
    // Check extension
    if (extension && supportedFormats.includes(extension)) {
      return true;
    }

    // Check MIME type
    if (mimeType && supportedFormats.includes(mimeType)) {
      return true;
    }

    return false;
  }

  /**
   * Checks if extension is a known video extension
   * @param extension - File extension to check
   * @returns True if it's a known video extension
   */
  private isKnownVideoExtension(extension: string): boolean {
    const allVideoExtensions = [
      ...FileDetectionService.SUPPORTED_FORMATS.videojs,
      ...FileDetectionService.SUPPORTED_FORMATS.mediaelement
    ].filter(format => !format.includes('/'));

    return allVideoExtensions.includes(extension);
  }

  /**
   * Returns a formatted string of supported formats for error messages
   * @returns Formatted string of supported formats
   */
  private getSupportedFormatsString(): string {
    const videoJsFormats = FileDetectionService.SUPPORTED_FORMATS.videojs
      .filter(format => !format.includes('/'))
      .join(', ');
    const mediaElementFormats = FileDetectionService.SUPPORTED_FORMATS.mediaelement
      .filter(format => !format.includes('/'))
      .join(', ');

    return `Video.js: ${videoJsFormats}; MediaElement.js: ${mediaElementFormats}`;
  }
}

// Export singleton instance
export const fileDetectionService = new FileDetectionService();