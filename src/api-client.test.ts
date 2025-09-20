import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from './api-client';

describe('ApiClient', () => {
  let client: ApiClient;
  let mockFetch: vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    
    client = new ApiClient(
      'https://api.mail818.com',
      'mail818_test_token',
      '01K3KDM5EM74T5QHGY38FTXK61'
    );
  });

  it('should fetch list configuration', async () => {
    const mockConfig = {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      name: 'Test List',
      fields: []
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const config = await client.fetchListConfig();
    
    expect(config).toEqual(mockConfig);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mail818.com/v1/lists/01K3KDM5EM74T5QHGY38FTXK61/',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mail818_test_token'
        })
      })
    );
  });

  it('should handle 403 for read permission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403
    });

    const config = await client.fetchListConfig();
    expect(config).toBeNull();
  });

  it('should submit form data', async () => {
    const mockResponse = {
      success: true,
      message: 'Subscribed'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const response = await client.submitForm({
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      email: 'test@example.com'
    });

    expect(response).toEqual(mockResponse);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.mail818.com/v1/collect',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test@example.com')
      })
    );
  });
});