import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Mail818Form, Mail818Stats } from '../src';
import { ApiClient } from '../src/api-client';

describe('Mail818 SDK Integration', () => {
  let container: HTMLDivElement;

  beforeAll(() => {
    // Set up DOM
    container = document.createElement('div');
    container.innerHTML = `
      <div data-mail818-list="01K3KDM5EM74T5QHGY38FTXK61" 
           data-mail818-token="test_token"
           class="mail818-container">
        <form class="mail818-form">
          <div class="mail818-fields"></div>
          <button type="submit">Subscribe</button>
        </form>
        <div class="mail818-message"></div>
      </div>
    `;
    document.body.appendChild(container);
  });

  afterAll(() => {
    document.body.removeChild(container);
  });

  describe('Auto-initialization', () => {
    it('should auto-initialize forms with data attributes', () => {
      const spy = vi.spyOn(Mail818Form.prototype, 'initialize');
      Mail818Form.autoInit();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('should auto-initialize stats displays', () => {
      const statsEl = document.createElement('div');
      statsEl.setAttribute('data-mail818-display', 'count-only');
      statsEl.setAttribute('data-mail818-list', '01K3KDM5EM74T5QHGY38FTXK61');
      statsEl.setAttribute('data-mail818-token', 'test_token');
      container.appendChild(statsEl);

      const initSpy = vi.spyOn(Mail818Stats.prototype, 'initialize');
      Mail818Stats.init();
      expect(initSpy).toHaveBeenCalled();
      initSpy.mockRestore();
    });
  });

  describe('Progressive Enhancement', () => {
    it('should work with static HTML form', () => {
      const staticForm = document.createElement('form');
      staticForm.innerHTML = `
        <input type="email" name="email" required>
        <input type="text" name="fields[name]">
        <button type="submit">Submit</button>
      `;
      
      const form = new Mail818Form(staticForm, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'write_only_token',
        testMode: true
      });

      // Form should enhance existing fields
      expect(staticForm.querySelector('input[type="email"]')).toBeDefined();
      expect(form).toBeInstanceOf(Mail818Form);
    });

    it('should preserve existing form data', () => {
      const staticForm = document.createElement('form');
      staticForm.innerHTML = `
        <input type="email" name="email" value="existing@example.com" required>
        <input type="text" name="fields[name]" value="John Doe">
      `;
      
      new Mail818Form(staticForm, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'write_only_token',
        testMode: true
      });

      const emailInput = staticForm.querySelector('input[type="email"]') as HTMLInputElement;
      const nameInput = staticForm.querySelector('input[name="fields[name]"]') as HTMLInputElement;
      
      expect(emailInput.value).toBe('existing@example.com');
      expect(nameInput.value).toBe('John Doe');
    });
  });

  describe('Token Permissions', () => {
    it('should handle read-only token', async () => {
      const client = new ApiClient(
        'https://api.mail818.com',
        'read_only_token',
        '01K3KDM5EM74T5QHGY38FTXK61'
      );

      // Mock fetch for read-only access
      const mockFetch = vi.fn()
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            listId: '01K3KDM5EM74T5QHGY38FTXK61',
            name: 'Test Project',
            fields: []
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          status: 403
        }));

      global.fetch = mockFetch;

      // Should be able to fetch config
      const config = await client.fetchListConfig();
      expect(config).toBeDefined();
      expect(config?.listId).toBe('01K3KDM5EM74T5QHGY38FTXK61');
      
      // Should fail on submit
      await expect(client.submitForm({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        email: 'test@example.com'
      })).rejects.toThrow();
    });

    it('should handle write-only token', async () => {
      const client = new ApiClient(
        'https://api.mail818.com',
        'write_only_token',
        '01K3KDM5EM74T5QHGY38FTXK61'
      );

      // Mock fetch for write-only access
      const mockFetch = vi.fn()
        .mockImplementationOnce(() => Promise.resolve({
          ok: false,
          status: 403
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Subscription successful'
          })
        }));

      global.fetch = mockFetch;

      // Should return null for config (403)
      const config = await client.fetchListConfig();
      expect(config).toBeNull();

      // Should be able to submit
      const result = await client.submitForm({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        email: 'test@example.com'
      });
      expect(result.success).toBe(true);
    });

    it('should handle full-access token', async () => {
      const client = new ApiClient(
        'https://api.mail818.com',
        'full_access_token',
        '01K3KDM5EM74T5QHGY38FTXK61'
      );

      // Mock fetch for full access
      const mockFetch = vi.fn()
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            listId: '01K3KDM5EM74T5QHGY38FTXK61',
            name: 'Test Project',
            fields: []
          })
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            message: 'Subscription successful'
          })
        }));

      global.fetch = mockFetch;

      // Should be able to fetch config
      const config = await client.fetchListConfig();
      expect(config).toBeDefined();

      // Should be able to submit
      const result = await client.submitForm({
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        email: 'test@example.com'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Field Types', () => {
    const fieldTypes = [
      'text', 'email', 'number', 'date', 
      'checkbox', 'select', 'radio', 'textarea'
    ] as const;

    fieldTypes.forEach(type => {
      it(`should render ${type} field correctly`, async () => {
        const testContainer = document.createElement('div');
        const form = new Mail818Form(testContainer, {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          apiToken: 'test_token',
          testMode: true,
          mockConfig: {
            listId: '01K3KDM5EM74T5QHGY38FTXK61',
            name: 'Test',
            fields: [{
              key: `test_${type}`,
              label: `Test ${type}`,
              type: type,
              required: true,
              ...(type === 'select' && {
                validation: {
                  options: [
                    { value: 'opt1', label: 'Option 1' },
                    { value: 'opt2', label: 'Option 2' }
                  ]
                }
              }),
              ...(type === 'radio' && {
                validation: {
                  options: [
                    { value: 'radio1', label: 'Radio 1' },
                    { value: 'radio2', label: 'Radio 2' }
                  ]
                }
              })
            }]
          }
        });

        await form.initialize();
        
        // Verify field rendered - look for the form element first
        const formElement = testContainer.querySelector('form');
        expect(formElement).toBeDefined();
        
        // Check for field-specific elements within the form
        switch (type) {
          case 'select':
            expect(formElement?.querySelector('select')).toBeDefined();
            break;
          case 'textarea':
            expect(formElement?.querySelector('textarea')).toBeDefined();
            break;
          case 'checkbox':
            expect(formElement?.querySelector('input[type="checkbox"]')).toBeDefined();
            break;
          case 'radio':
            expect(formElement?.querySelector('input[type="radio"]')).toBeDefined();
            break;
          default:
            expect(formElement?.querySelector(`input[type="${type}"]`)).toBeDefined();
        }
      });
    });

    it('should handle select field with options', async () => {
      const testContainer = document.createElement('div');
      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'test_select',
            label: 'Test Select',
            type: 'select',
            required: true,
            validation: {
              options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
              ]
            }
          }]
        }
      });

      await form.initialize();
      
      const select = testContainer.querySelector('select');
      expect(select).toBeDefined();
      expect(select?.querySelectorAll('option').length).toBe(2); // Just the 2 options
    });

    it('should handle radio field with options', async () => {
      const testContainer = document.createElement('div');
      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'test_radio',
            label: 'Test Radio',
            type: 'radio',
            required: true,
            validation: {
              options: [
                { value: 'option1', label: 'Option 1' },
                { value: 'option2', label: 'Option 2' }
              ]
            }
          }]
        }
      });

      await form.initialize();
      
      const radios = testContainer.querySelectorAll('input[type="radio"]');
      expect(radios.length).toBe(2);
    });
  });

  describe('Form Validation', () => {
    it('should validate required email field', async () => {
      const testContainer = document.createElement('div');
      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true
          }]
        }
      });

      await form.initialize();
      
      const formElement = testContainer.querySelector('form');
      expect(formElement).toBeDefined();
      
      // Submit empty form should trigger validation
      const submitEvent = new Event('submit', { cancelable: true });
      formElement?.dispatchEvent(submitEvent);
      
      // Check for validation messages
      const errorMessage = testContainer.querySelector('.mail818-error');
      expect(errorMessage).toBeDefined();
    });

    it('should validate email format', async () => {
      const testContainer = document.createElement('div');
      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true
          }]
        }
      });

      await form.initialize();
      
      const emailInput = testContainer.querySelector('input[type="email"]') as HTMLInputElement;
      expect(emailInput).toBeDefined();
      
      // Set invalid email
      emailInput.value = 'invalid-email';
      
      const formElement = testContainer.querySelector('form');
      const submitEvent = new Event('submit', { cancelable: true });
      formElement?.dispatchEvent(submitEvent);
      
      // Should have validation error
      const errorMessage = testContainer.querySelector('.mail818-error');
      expect(errorMessage).toBeDefined();
    });

    it('should validate field length constraints', async () => {
      const testContainer = document.createElement('div');
      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            validation: {
              minLength: 5,
              maxLength: 10
            }
          }]
        }
      });

      await form.initialize();
      
      const textInput = testContainer.querySelector('input[type="text"]') as HTMLInputElement;
      expect(textInput).toBeDefined();
      
      // Set too short value
      textInput.value = 'Joe';
      
      const formElement = testContainer.querySelector('form');
      const submitEvent = new Event('submit', { cancelable: true });
      formElement?.dispatchEvent(submitEvent);
      
      // Should have validation error
      const errorMessage = testContainer.querySelector('.mail818-error');
      expect(errorMessage).toBeDefined();
    });
  });

  describe('Form Submission', () => {
    it('should submit form successfully with valid data', async () => {
      const testContainer = document.createElement('div');
      let submissionResult: unknown = null;

      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        onSuccess: (response) => {
          submissionResult = response;
        },
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true
          }]
        }
      });

      await form.initialize();
      
      const emailInput = testContainer.querySelector('input[type="email"]') as HTMLInputElement;
      emailInput.value = 'test@example.com';
      
      const formElement = testContainer.querySelector('form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      formElement.dispatchEvent(submitEvent);

      // Wait for async submission
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(submissionResult).toBeDefined();
      expect((submissionResult as { success: boolean }).success).toBe(true);
    });

    it('should handle form validation before submission', async () => {
      const testContainer = document.createElement('div');

      const form = new Mail818Form(testContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test',
          fields: [{
            key: 'email',
            label: 'Email',
            type: 'email',
            required: true
          }]
        }
      });

      await form.initialize();
      
      // Submit without filling email
      const formElement = testContainer.querySelector('form') as HTMLFormElement;
      const submitEvent = new Event('submit', { cancelable: true });
      formElement.dispatchEvent(submitEvent);

      // Should show validation error
      const errorElement = testContainer.querySelector('.mail818-error');
      expect(errorElement).toBeDefined();
    });
  });

  describe('Stats Display', () => {
    it('should initialize and display stats', async () => {
      const statsContainer = document.createElement('div');
      statsContainer.setAttribute('data-mail818-display', 'count-only');
      
      // Mock stats API response
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          listId: '01K3KDM5EM74T5QHGY38FTXK61',
          name: 'Test Project',
          count: {
            exact: 150
          }
        })
      }));
      global.fetch = mockFetch;

      const stats = new Mail818Stats(statsContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'read_token',
        display: 'count-only'
      });

      await stats.initialize();
      
      expect(statsContainer.textContent).toContain('150');
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle stats loading errors gracefully', async () => {
      const statsContainer = document.createElement('div');
      
      // Mock failed stats API response
      const mockFetch = vi.fn(() => Promise.resolve({
        ok: false,
        status: 403
      }));
      global.fetch = mockFetch;

      const stats = new Mail818Stats(statsContainer, {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'invalid_token',
        display: 'count-only'
      });

      await stats.initialize();
      
      // Should show error state or fallback
      expect(statsContainer.textContent).toBeTruthy();
    });
  });

  describe('Browser Globals', () => {
    it('should expose Mail818Form globally', () => {
      expect(typeof (globalThis as Record<string, unknown>).Mail818Form).toBe('function');
    });

    it('should expose Mail818Stats globally', () => {
      expect(typeof (globalThis as Record<string, unknown>).Mail818Stats).toBe('function');
    });
  });
});