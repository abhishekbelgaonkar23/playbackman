/**
 * Privacy and Security Service
 * Ensures client-side only operation and proper resource cleanup
 */

export interface PrivacySecurityConfig {
  enableOfflineMode: boolean;
  maxFileSize: number; // in bytes
  enableMemoryLeakDetection: boolean;
  enableNetworkMonitoring: boolean;
}

export interface ObjectUrlTracker {
  url: string;
  fileName: string;
  createdAt: number;
  isRevoked: boolean;
}

export interface PrivacySecurityMetrics {
  activeObjectUrls: number;
  totalObjectUrlsCreated: number;
  totalObjectUrlsRevoked: number;
  memoryLeaksDetected: number;
  networkRequestsBlocked: number;
}

export class PrivacySecurityService {
  private static instance: PrivacySecurityService;
  private objectUrlTracker = new Map<string, ObjectUrlTracker>();
  private config: PrivacySecurityConfig;
  private metrics: PrivacySecurityMetrics;
  private networkMonitor: ((request: any) => void) | null = null;

  private constructor(config: Partial<PrivacySecurityConfig> = {}) {
    this.config = {
      enableOfflineMode: true,
      maxFileSize: 2 * 1024 * 1024 * 1024, // 2GB
      enableMemoryLeakDetection: true,
      enableNetworkMonitoring: true,
      ...config
    };

    this.metrics = {
      activeObjectUrls: 0,
      totalObjectUrlsCreated: 0,
      totalObjectUrlsRevoked: 0,
      memoryLeaksDetected: 0,
      networkRequestsBlocked: 0
    };

    this.initializeNetworkMonitoring();
    this.initializeMemoryLeakDetection();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: Partial<PrivacySecurityConfig>): PrivacySecurityService {
    if (!PrivacySecurityService.instance) {
      PrivacySecurityService.instance = new PrivacySecurityService(config);
    }
    return PrivacySecurityService.instance;
  }

  /**
   * Creates a secure Object URL for local file playback
   * Tracks the URL for proper cleanup
   */
  public createSecureObjectUrl(file: File): string {
    // Validate file before creating URL
    if (!this.validateFileForPrivacy(file)) {
      throw new Error('File validation failed for privacy/security reasons');
    }

    // Create Object URL
    const url = URL.createObjectURL(file);
    
    // Track the URL
    const tracker: ObjectUrlTracker = {
      url,
      fileName: file.name,
      createdAt: Date.now(),
      isRevoked: false
    };
    
    this.objectUrlTracker.set(url, tracker);
    this.metrics.activeObjectUrls++;
    this.metrics.totalObjectUrlsCreated++;

    console.log(`[Privacy] Created Object URL for ${file.name}`, {
      url: url.substring(0, 50) + '...',
      size: file.size,
      type: file.type
    });

    return url;
  }

  /**
   * Safely revokes an Object URL and removes tracking
   */
  public revokeSecureObjectUrl(url: string): void {
    const tracker = this.objectUrlTracker.get(url);
    
    if (tracker && !tracker.isRevoked) {
      try {
        URL.revokeObjectURL(url);
        tracker.isRevoked = true;
        this.metrics.activeObjectUrls--;
        this.metrics.totalObjectUrlsRevoked++;
        
        console.log(`[Privacy] Revoked Object URL for ${tracker.fileName}`, {
          url: url.substring(0, 50) + '...',
          lifespan: Date.now() - tracker.createdAt
        });
      } catch (error) {
        console.warn('[Privacy] Error revoking Object URL:', error);
      }
    }

    // Remove from tracking
    this.objectUrlTracker.delete(url);
  }

  /**
   * Revokes all tracked Object URLs (cleanup on app close)
   */
  public revokeAllObjectUrls(): void {
    console.log('[Privacy] Revoking all Object URLs for cleanup');
    
    for (const [url, tracker] of this.objectUrlTracker.entries()) {
      if (!tracker.isRevoked) {
        this.revokeSecureObjectUrl(url);
      }
    }
    
    this.objectUrlTracker.clear();
    this.metrics.activeObjectUrls = 0;
  }

  /**
   * Validates file for privacy and security concerns
   */
  private validateFileForPrivacy(file: File): boolean {
    // Check file size
    if (file.size > this.config.maxFileSize) {
      console.warn('[Privacy] File too large:', file.size);
      return false;
    }

    // Check if file is actually a local file (not from network)
    if (file.name.startsWith('http://') || file.name.startsWith('https://')) {
      console.warn('[Privacy] File appears to be from network source');
      return false;
    }

    // Ensure file has proper video MIME type or extension
    const isVideo = file.type.startsWith('video/') || 
                   this.hasVideoExtension(file.name);
    
    if (!isVideo) {
      console.warn('[Privacy] File does not appear to be a video file');
      return false;
    }

    return true;
  }

  /**
   * Checks if filename has video extension
   */
  private hasVideoExtension(filename: string): boolean {
    const videoExtensions = [
      'mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov', 'avi', 'mkv',
      'flv', 'wmv', 'asf', 'rm', 'rmvb', '3gp', 'f4v'
    ];
    
    const extension = filename.split('.').pop()?.toLowerCase();
    return extension ? videoExtensions.includes(extension) : false;
  }

  /**
   * Initializes network monitoring to ensure no data leaves the client
   */
  private initializeNetworkMonitoring(): void {
    if (!this.config.enableNetworkMonitoring || typeof window === 'undefined') {
      return;
    }

    // Monitor fetch requests
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const url = args[0] as string;
      
      // Allow CDN requests for player libraries and styles
      const allowedDomains = [
        'vjs.zencdn.net',
        'cdn.jsdelivr.net',
        'unpkg.com'
      ];
      
      const isAllowed = allowedDomains.some(domain => 
        url.includes(domain) || url.startsWith('/')
      );
      
      if (!isAllowed && !url.startsWith('blob:')) {
        console.warn('[Privacy] Blocked network request:', url);
        this.metrics.networkRequestsBlocked++;
        return Promise.reject(new Error('Network request blocked for privacy'));
      }
      
      return originalFetch.apply(window, args);
    };

    // Monitor XMLHttpRequest
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      const allowedDomains = [
        'vjs.zencdn.net',
        'cdn.jsdelivr.net',
        'unpkg.com'
      ];
      
      const isAllowed = allowedDomains.some(domain => 
        url.includes(domain) || url.startsWith('/')
      );
      
      if (!isAllowed && !url.startsWith('blob:')) {
        console.warn('[Privacy] Blocked XMLHttpRequest:', url);
        throw new Error('XMLHttpRequest blocked for privacy');
      }
      
      return originalXHROpen.apply(this, [method, url, ...args]);
    };
  }

  /**
   * Initializes memory leak detection
   */
  private initializeMemoryLeakDetection(): void {
    if (!this.config.enableMemoryLeakDetection || typeof window === 'undefined') {
      return;
    }

    // Check for memory leaks every 30 seconds
    setInterval(() => {
      this.detectMemoryLeaks();
    }, 30000);

    // Check on page unload
    window.addEventListener('beforeunload', () => {
      this.performCleanupCheck();
    });

    // Check on visibility change (tab switch)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performCleanupCheck();
      }
    });
  }

  /**
   * Detects potential memory leaks
   */
  private detectMemoryLeaks(): void {
    const activeUrls = this.metrics.activeObjectUrls;
    const trackedUrls = this.objectUrlTracker.size;
    
    if (activeUrls !== trackedUrls) {
      console.warn('[Privacy] Memory leak detected: URL tracking mismatch', {
        activeUrls,
        trackedUrls
      });
      this.metrics.memoryLeaksDetected++;
    }

    // Check for old URLs that should have been revoked
    const now = Date.now();
    const oldUrls = Array.from(this.objectUrlTracker.values())
      .filter(tracker => !tracker.isRevoked && (now - tracker.createdAt) > 300000); // 5 minutes
    
    if (oldUrls.length > 0) {
      console.warn('[Privacy] Found old Object URLs that may be leaking memory:', oldUrls.length);
      this.metrics.memoryLeaksDetected += oldUrls.length;
    }
  }

  /**
   * Performs cleanup check and cleanup if needed
   */
  private performCleanupCheck(): void {
    console.log('[Privacy] Performing cleanup check');
    
    if (this.metrics.activeObjectUrls > 0) {
      console.log('[Privacy] Cleaning up remaining Object URLs');
      this.revokeAllObjectUrls();
    }
  }

  /**
   * Verifies that the application is running in client-side only mode
   */
  public verifyClientSideOnly(): boolean {
    const checks = {
      hasWindow: typeof window !== 'undefined',
      hasDocument: typeof document !== 'undefined',
      hasLocalStorage: typeof localStorage !== 'undefined',
      hasFileAPI: typeof File !== 'undefined' && typeof FileReader !== 'undefined',
      hasObjectURL: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function',
      noServerSideRendering: typeof process === 'undefined' || !process.env?.NODE_ENV
    };

    const allPassed = Object.values(checks).every(check => check);
    
    console.log('[Privacy] Client-side verification:', checks);
    
    return allPassed;
  }

  /**
   * Ensures the application works offline
   */
  public verifyOfflineCapability(): boolean {
    if (!this.config.enableOfflineMode) {
      return true;
    }

    const checks = {
      hasServiceWorker: 'serviceWorker' in navigator,
      hasCache: 'caches' in window,
      hasOfflineStorage: typeof localStorage !== 'undefined',
      canCreateObjectUrls: typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    };

    const offlineReady = checks.canCreateObjectUrls; // Minimum requirement
    
    console.log('[Privacy] Offline capability verification:', checks);
    
    return offlineReady;
  }

  /**
   * Gets current privacy and security metrics
   */
  public getMetrics(): PrivacySecurityMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets current configuration
   */
  public getConfig(): PrivacySecurityConfig {
    return { ...this.config };
  }

  /**
   * Updates configuration
   */
  public updateConfig(newConfig: Partial<PrivacySecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Resets all metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      activeObjectUrls: 0,
      totalObjectUrlsCreated: 0,
      totalObjectUrlsRevoked: 0,
      memoryLeaksDetected: 0,
      networkRequestsBlocked: 0
    };
  }
}

// Export singleton instance
export const privacySecurityService = PrivacySecurityService.getInstance();