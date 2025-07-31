/**
 * Unit tests for FileDetectionService
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FileDetectionService } from '../file-detection.service';
import type { PlayerType, ValidationResult, SupportedFormats } from '../../types/core';

describe('FileDetectionService', () => {
  let service: FileDetectionService;

  beforeEach(() => {
    service = new FileDetectionService();
  });

  describe('detectFileType', () => {
    it('should detect Video.js for MP4 files', () => {
      const file = new File([''], 'test.mp4', { type: 'video/mp4' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should detect Video.js for WebM files', () => {
      const file = new File([''], 'test.webm', { type: 'video/webm' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should detect Video.js for OGG files', () => {
      const file = new File([''], 'test.ogg', { type: 'video/ogg' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should detect MediaElement.js for FLV files', () => {
      const file = new File([''], 'test.flv', { type: 'video/x-flv' });
      const result = service.detectFileType(file);
      expect(result).toBe('mediaelement');
    });

    it('should detect MediaElement.js for WMV files', () => {
      const file = new File([''], 'test.wmv', { type: 'video/x-ms-wmv' });
      const result = service.detectFileType(file);
      expect(result).toBe('mediaelement');
    });

    it('should detect by extension when MIME type is missing', () => {
      const file = new File([''], 'test.mp4', { type: '' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should detect by MIME type when extension is missing', () => {
      const file = new File([''], 'test', { type: 'video/mp4' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should default to Video.js for unknown formats', () => {
      const file = new File([''], 'test.unknown', { type: 'video/unknown' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle case-insensitive extensions', () => {
      const file = new File([''], 'test.MP4', { type: '' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle files with multiple dots in name', () => {
      const file = new File([''], 'my.video.file.mp4', { type: '' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });
  });

  describe('validateFile', () => {
    it('should validate a valid MP4 file', () => {
      const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.playerType).toBe('videojs');
      expect(result.error).toBeUndefined();
    });

    it('should validate a valid FLV file', () => {
      const file = new File(['video content'], 'test.flv', { type: 'video/x-flv' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.playerType).toBe('mediaelement');
      expect(result.error).toBeUndefined();
    });

    it('should reject empty files', () => {
      const file = new File([], 'test.mp4', { type: 'video/mp4' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File is empty or invalid');
    });

    it('should reject null/undefined files', () => {
      const result = service.validateFile(null as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File is empty or invalid');
    });

    it('should reject files that are too large', () => {
      // Create a mock file that reports a size larger than 2GB
      const largeFile = new File(['content'], 'test.mp4', { type: 'video/mp4' });
      Object.defineProperty(largeFile, 'size', { value: 3 * 1024 * 1024 * 1024 }); // 3GB
      
      const result = service.validateFile(largeFile);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File size exceeds maximum limit (2GB)');
    });

    it('should reject non-video files by MIME type', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('File does not appear to be a video file');
    });

    it('should reject unsupported video formats', () => {
      const file = new File(['content'], 'test.xyz', { type: 'video/xyz' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unsupported video format');
      expect(result.error).toContain('Supported formats:');
    });

    it('should accept files with video MIME type but no extension', () => {
      const file = new File(['content'], 'video', { type: 'video/mp4' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.playerType).toBe('videojs');
    });

    it('should accept files with known video extension but no MIME type', () => {
      const file = new File(['content'], 'test.mp4', { type: '' });
      const result = service.validateFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.playerType).toBe('videojs');
    });
  });

  describe('getSupportedFormats', () => {
    it('should return supported formats object', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats).toHaveProperty('videojs');
      expect(formats).toHaveProperty('mediaelement');
      expect(Array.isArray(formats.videojs)).toBe(true);
      expect(Array.isArray(formats.mediaelement)).toBe(true);
    });

    it('should include expected Video.js formats', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats.videojs).toContain('mp4');
      expect(formats.videojs).toContain('webm');
      expect(formats.videojs).toContain('ogg');
      expect(formats.videojs).toContain('video/mp4');
      expect(formats.videojs).toContain('video/webm');
    });

    it('should include expected MediaElement.js formats', () => {
      const formats = service.getSupportedFormats();
      
      expect(formats.mediaelement).toContain('flv');
      expect(formats.mediaelement).toContain('wmv');
      expect(formats.mediaelement).toContain('video/x-flv');
      expect(formats.mediaelement).toContain('video/x-ms-wmv');
    });

    it('should return a copy of the formats (not reference)', () => {
      const formats1 = service.getSupportedFormats();
      const formats2 = service.getSupportedFormats();
      
      expect(formats1).not.toBe(formats2);
      expect(formats1.videojs).not.toBe(formats2.videojs);
      expect(formats1.mediaelement).not.toBe(formats2.mediaelement);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle files with no extension', () => {
      const file = new File(['content'], 'videofile', { type: 'video/mp4' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle files with extension but no name', () => {
      const file = new File(['content'], '.mp4', { type: '' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle empty filename', () => {
      const file = new File(['content'], '', { type: 'video/mp4' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle filename with only dots', () => {
      const file = new File(['content'], '...', { type: 'video/mp4' });
      const result = service.detectFileType(file);
      expect(result).toBe('videojs');
    });

    it('should handle mixed case extensions correctly', () => {
      const testCases = ['MP4', 'Mp4', 'mP4', 'FLV', 'Flv', 'WMV', 'Wmv'];
      
      testCases.forEach(ext => {
        const file = new File(['content'], `test.${ext}`, { type: '' });
        const result = service.detectFileType(file);
        expect(['videojs', 'mediaelement']).toContain(result);
      });
    });

    it('should validate files with various supported extensions', () => {
      const videoJsExtensions = ['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov', 'avi', 'mkv'];
      const mediaElementExtensions = ['flv', 'wmv', 'asf', 'rm', 'rmvb', '3gp', 'f4v'];
      
      [...videoJsExtensions, ...mediaElementExtensions].forEach(ext => {
        const file = new File(['content'], `test.${ext}`, { type: '' });
        const result = service.validateFile(file);
        expect(result.isValid).toBe(true);
        expect(['videojs', 'mediaelement']).toContain(result.playerType!);
      });
    });

    it('should handle files with complex MIME types', () => {
      const mimeTypes = [
        'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
        'video/webm; codecs="vp8, vorbis"',
        'video/ogg; codecs="theora, vorbis"'
      ];
      
      mimeTypes.forEach(mimeType => {
        const file = new File(['content'], 'test', { type: mimeType });
        const result = service.detectFileType(file);
        expect(result).toBe('videojs');
      });
    });
  });
});