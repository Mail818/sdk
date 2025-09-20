import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Mail818Stats } from './stats';

describe('Mail818Stats', () => {
  let container: HTMLElement;
  let mockFetch: vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    container = document.createElement('div');
    container.className = 'mail818-stats';
    document.body.appendChild(container);
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  it('should initialize stats display', () => {
    const stats = new Mail818Stats(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token'
    });
    expect(stats).toBeDefined();
  });

  it('should display exact count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        name: 'Test',
        count: { exact: 1234 }
      })
    });

    const stats = new Mail818Stats(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token',
      cache: { enabled: false, ttl: 0 } // Disable cache for test
    });

    await stats.initialize();
    
    expect(container.textContent).toContain('1,234');
  });

  it('should display range count', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        name: 'Test',
        count: { range: '2K+' }
      })
    });

    const stats = new Mail818Stats(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token',
      cache: { enabled: false, ttl: 0 } // Disable cache for test
    });

    await stats.initialize();
    
    expect(container.textContent).toContain('2K+');
  });

  it('should auto-update on interval', async () => {
    vi.useFakeTimers();

    let callCount = 0;
    mockFetch.mockImplementation(() => {
      callCount++;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          count: { exact: 100 }
        })
      });
    });

    const stats = new Mail818Stats(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token',
      updateInterval: 5000,
      cache: { enabled: false, ttl: 0 } // Disable cache for test
    });

    await stats.initialize();
    const initialCallCount = callCount;

    // Advance time to trigger auto-update
    vi.advanceTimersByTime(5000);
    await vi.runOnlyPendingTimersAsync();

    expect(callCount).toBeGreaterThan(initialCallCount);
    
    // Clean up
    stats.stopAutoUpdate();
    vi.useRealTimers();
  });

  it('should handle errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const stats = new Mail818Stats(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token',
      cache: { enabled: false, ttl: 0 } // Disable cache for test
    });

    await stats.initialize();
    
    expect(container.textContent).toContain('No data available');
    expect(container.classList.contains('mail818-stats--error')).toBe(true);
  });

  it('should auto-initialize from data attributes', () => {
    const element = document.createElement('div');
    element.setAttribute('data-mail818-display', 'count-only');
    element.setAttribute('data-mail818-list', '01K3KDM5EM74T5QHGY38FTXK61');
    element.setAttribute('data-mail818-token', 'mail818_test_token');
    document.body.appendChild(element);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        count: { exact: 999 }
      })
    });

    // Test that init method calls are created but don't wait for async initialization
    const querySelectorAllSpy = vi.spyOn(document, 'querySelectorAll');
    
    Mail818Stats.init();
    
    expect(querySelectorAllSpy).toHaveBeenCalledWith('[data-mail818-display="count-only"]');
    
    document.body.removeChild(element);
    querySelectorAllSpy.mockRestore();
  });
});