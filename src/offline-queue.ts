/**
 * Offline queue management for Mail818 SDK
 */

interface OfflineOptions {
  enabled: boolean;
  queueSubmissions: boolean;
  retryOnReconnect: boolean;
}

interface QueueItem {
  id: string;
  data: unknown;
  timestamp: number;
  retryCount: number;
}

export class OfflineQueue {
  private options: OfflineOptions;
  private storageKey = 'mail818_offline_queue';
  private maxRetries = 3;
  private queue: QueueItem[] = [];

  constructor(options: OfflineOptions) {
    this.options = options;
    
    if (options.enabled) {
      this.loadQueue();
    }
  }

  /**
   * Add item to queue
   */
  add(data: unknown): void {
    if (!this.options.queueSubmissions) return;

    const item: QueueItem = {
      id: this.generateULID(),
      data,
      timestamp: Date.now(),
      retryCount: 0
    };

    this.queue.push(item);
    this.saveQueue();
  }

  /**
   * Get all queued items
   */
  getAll(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Remove item from queue
   */
  remove(item: QueueItem): void {
    const index = this.queue.findIndex(i => i.id === item.id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
    }
  }

  /**
   * Increment retry count for item
   */
  incrementRetry(item: QueueItem): boolean {
    const queueItem = this.queue.find(i => i.id === item.id);
    if (queueItem) {
      queueItem.retryCount++;
      this.saveQueue();
      return queueItem.retryCount < this.maxRetries;
    }
    return false;
  }

  /**
   * Clear all queued items
   */
  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const items = JSON.parse(stored);
        // Validate and filter out old items (> 7 days)
        const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
        this.queue = items.filter((item: QueueItem) => 
          item.timestamp > cutoff && item.retryCount < this.maxRetries
        );
        // Clean up if we filtered any items
        if (this.queue.length !== items.length) {
          this.saveQueue();
        }
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      if (this.queue.length === 0) {
        localStorage.removeItem(this.storageKey);
      } else {
        localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
      }
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  /**
   * Generate ULID for queue items
   */
  private generateULID(): string {
    // Simplified ULID generation for queue items
    // In production, use a proper ULID library
    const timestamp = Date.now();
    const timestampStr = timestamp.toString(36).toUpperCase().padStart(10, '0');
    const randomStr = Math.random().toString(36).substring(2, 18).toUpperCase().padStart(16, '0');
    return (timestampStr + randomStr).substring(0, 26);
  }
}