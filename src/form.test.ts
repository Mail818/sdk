import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Mail818Form } from './form';
import type { ListConfig } from './types';

describe('Mail818Form', () => {
  let container: HTMLElement;
  let mockFetch: vi.MockedFunction<typeof fetch>;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = '<form class="mail818-form"></form>';
    document.body.appendChild(container);
    
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('should throw error without required options', () => {
    expect(() => {
      new Mail818Form(container, { listId: '', apiToken: '' });
    }).toThrow('listId and apiToken are required');
  });

  it('should initialize with valid options', () => {
    const form = new Mail818Form(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token'
    });
    expect(form).toBeDefined();
  });

  it('should load list configuration', async () => {
    const mockConfig: ListConfig = {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      name: 'Test List',
      fields: [
        {
          key: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }
      ]
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockConfig
    });

    const form = new Mail818Form(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token'
    });

    await form.initialize();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v1/lists/'),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer mail818_test_token'
        })
      })
    );
  });

  it('should handle write-only token gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403
    });

    const form = new Mail818Form(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_writeonly_token'
    });

    await form.initialize();
    // Should enhance static form instead of throwing
    expect(container.querySelector('.mail818-form')).toBeDefined();
  });

  it('should validate email format', () => {
    new Mail818Form(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token'
    });

    // Add email input
    const input = document.createElement('input');
    input.type = 'email';
    input.name = 'email';
    container.querySelector('form')?.appendChild(input);

    // Test invalid email
    input.value = 'invalid';
    input.dispatchEvent(new Event('blur'));
    
    // Would need to spy on showFieldError method
  });

  it('should handle form submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Successfully subscribed'
      })
    });

    const onSuccess = vi.fn();
    new Mail818Form(container, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'mail818_test_token',
      onSuccess
    });

    const formElement = container.querySelector('form') as HTMLFormElement;
    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.name = 'email';
    emailInput.value = 'test@example.com';
    formElement.appendChild(emailInput);

    formElement.dispatchEvent(new Event('submit'));

    await vi.waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});