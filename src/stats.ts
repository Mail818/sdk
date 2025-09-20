/**
 * Mail818Stats class for displaying statistics only
 */

import { ApiClient } from './api-client';
import { CacheManager } from './cache';
import type { ListConfig } from './types';

interface StatsOptions {
  listId: string;
  apiToken: string;
  hostname?: string;
  updateInterval?: number; // Auto-update interval in ms
  cache?: {
    enabled: boolean;
    ttl: number;
  };
}

export class Mail818Stats {
  private container: HTMLElement;
  private options: StatsOptions;
  private apiClient: ApiClient;
  private cache?: CacheManager;
  private updateTimer?: ReturnType<typeof setInterval>;

  constructor(selector: string | HTMLElement, options: StatsOptions) {
    // Set container element
    if (typeof selector === 'string') {
      const element = document.querySelector(selector);
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = selector;
    }

    // Set default options
    this.options = {
      hostname: 'https://api.mail818.com',
      cache: {
        enabled: true,
        ttl: 300000 // 5 minutes for stats
      },
      ...options
    };

    // Initialize API client
    this.apiClient = new ApiClient(
      this.options.hostname as string,
      this.options.apiToken,
      this.options.listId
    );

    // Initialize cache if enabled
    if (this.options.cache?.enabled) {
      this.cache = new CacheManager({
        ...this.options.cache,
        storage: 'sessionStorage' // Stats use session storage
      });
    }

    // Start auto-update if configured
    if (this.options.updateInterval) {
      this.startAutoUpdate();
    }
  }

  /**
   * Initialize and load stats
   */
  async initialize(): Promise<void> {
    await this.loadStats();
  }

  /**
   * Load and display statistics
   */
  async loadStats(): Promise<void> {
    try {
      // Show loading state
      this.showLoading(true);

      // Get config from cache or API
      let config: ListConfig | null = null;

      if (this.cache) {
        config = await this.cache.get(`stats_${this.options.listId}`) as ListConfig;
      }

      if (!config) {
        config = await this.apiClient.fetchListConfig();
        if (config && this.cache) {
          await this.cache.set(`stats_${this.options.listId}`, config);
        }
      }

      if (config?.count) {
        this.displayCount(config.count);
      } else {
        this.displayError('No data available');
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
      this.displayError('Failed to load statistics');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Display count information
   */
  private displayCount(count: { exact?: number; range?: string }): void {
    let text = '';

    if (count.exact !== undefined && count.range) {
      text = `${count.exact.toLocaleString()} subscribers (${count.range})`;
    } else if (count.exact !== undefined) {
      text = `${count.exact.toLocaleString()} subscribers`;
    } else if (count.range) {
      text = `${count.range} subscribers`;
    }

    this.container.textContent = text;
    this.container.classList.remove('mail818-stats--loading', 'mail818-stats--error');
    this.container.classList.add('mail818-stats--loaded');
  }

  /**
   * Display error message
   */
  private displayError(message: string): void {
    this.container.textContent = message;
    this.container.classList.remove('mail818-stats--loading', 'mail818-stats--loaded');
    this.container.classList.add('mail818-stats--error');
  }

  /**
   * Show loading state
   */
  private showLoading(loading: boolean): void {
    if (loading) {
      this.container.innerHTML = '<span class="mail818-loading-spinner"></span> Loading...';
      this.container.classList.add('mail818-stats--loading');
    } else {
      this.container.classList.remove('mail818-stats--loading');
    }
  }

  /**
   * Start auto-update timer
   */
  private startAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.loadStats();
    }, this.options.updateInterval);
  }

  /**
   * Stop auto-update timer
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = undefined;
    }
  }

  /**
   * Destroy instance and clean up
   */
  destroy(): void {
    this.stopAutoUpdate();
    this.cache?.clear();
  }

  /**
   * Auto-initialize all stats elements on page
   */
  static init(): void {
    const elements = document.querySelectorAll('[data-mail818-display="count-only"]');
    
    elements.forEach(element => {
      const listId = element.getAttribute('data-mail818-list');
      const token = element.getAttribute('data-mail818-token');
      const hostname = element.getAttribute('data-mail818-hostname');

      if (!listId || !token) {
        console.error('Mail818Stats: Missing listId or token', element);
        return;
      }

      const stats = new Mail818Stats(element as HTMLElement, {
        listId,
        apiToken: token,
        hostname: hostname || undefined
      });

      stats.initialize();
    });
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).Mail818Stats = Mail818Stats;
}