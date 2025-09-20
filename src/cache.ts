/**
 * Cache management for Mail818 SDK
 */

interface CacheOptions {
  enabled: boolean;
  ttl: number; // Time to live in milliseconds
  storage: 'localStorage' | 'sessionStorage';
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
  etag?: string;
}

export class CacheManager {
  private options: CacheOptions;
  private storage: Storage;
  private prefix = 'mail818_';

  constructor(options: CacheOptions) {
    this.options = options;
    this.storage = options.storage === 'sessionStorage' 
      ? window.sessionStorage 
      : window.localStorage;
    
    // Clean expired entries on initialization
    this.cleanExpired();
  }

  /**
   * Get cached value if valid
   */
  async get(key: string): Promise<unknown | null> {
    if (!this.options.enabled) return null;

    try {
      const item = this.storage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry = JSON.parse(item);
      
      // Check if expired
      if (Date.now() - entry.timestamp > this.options.ttl) {
        this.storage.removeItem(this.prefix + key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  /**
   * Set cache value
   */
  async set(key: string, value: unknown, etag?: string): Promise<void> {
    if (!this.options.enabled) return;

    try {
      const entry: CacheEntry = {
        data: value,
        timestamp: Date.now(),
        etag
      };

      this.storage.setItem(this.prefix + key, JSON.stringify(entry));
    } catch (error) {
      console.error('Cache write error:', error);
      // If storage is full, try clearing old entries
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanExpired();
        // Try once more
        try {
          const entry: CacheEntry = {
            data: value,
            timestamp: Date.now(),
            etag
          };
          this.storage.setItem(this.prefix + key, JSON.stringify(entry));
        } catch {
          // Give up if still failing
        }
      }
    }
  }

  /**
   * Get ETag for cached item
   */
  getETag(key: string): string | null {
    try {
      const item = this.storage.getItem(this.prefix + key);
      if (!item) return null;

      const entry: CacheEntry = JSON.parse(item);
      return entry.etag || null;
    } catch {
      return null;
    }
  }

  /**
   * Clear specific cache entry
   */
  remove(key: string): void {
    this.storage.removeItem(this.prefix + key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    keys.forEach(key => this.storage.removeItem(key));
  }

  /**
   * Clean expired entries
   */
  private cleanExpired(): void {
    const now = Date.now();
    const keys: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key);
      }
    }

    keys.forEach(key => {
      try {
        const item = this.storage.getItem(key);
        if (item) {
          const entry: CacheEntry = JSON.parse(item);
          if (now - entry.timestamp > this.options.ttl) {
            this.storage.removeItem(key);
          }
        }
      } catch {
        // Remove corrupted entries
        this.storage.removeItem(key);
      }
    });
  }

  /**
   * Get cache size in bytes
   */
  getSize(): number {
    let size = 0;
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        const value = this.storage.getItem(key);
        if (value) {
          size += key.length + value.length;
        }
      }
    }
    return size;
  }
}