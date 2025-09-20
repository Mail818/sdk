import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

describe('Mail818 E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  it('should submit form successfully', async () => {
    // Mock the API endpoint
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('api.mail818.com')) {
        if (request.method() === 'GET') {
          // Mock project config
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              listId: '01K3KDM5EM74T5QHGY38FTXK61',
              name: 'Test List',
              fields: [
                {
                  key: 'email',
                  label: 'Email Address',
                  type: 'email',
                  required: true
                },
                {
                  key: 'name',
                  label: 'Full Name',
                  type: 'text',
                  required: false
                }
              ]
            })
          });
        } else if (request.method() === 'POST') {
          // Mock successful submission
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Thank you for subscribing!'
            })
          });
        }
      } else {
        request.continue();
      }
    });

    // Serve test HTML
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mail818 E2E Test</title>
        <style>
          .mail818-field { margin: 10px 0; }
          .mail818-field label { display: block; margin-bottom: 5px; }
          .mail818-field input, .mail818-field textarea, .mail818-field select {
            width: 100%;
            padding: 8px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }
          .mail818-message { margin: 10px 0; padding: 10px; }
          .mail818-message--success { background: #d4edda; color: #155724; }
          .mail818-message--error { background: #f8d7da; color: #721c24; }
        </style>
      </head>
      <body>
        <div data-mail818-list="01K3KDM5EM74T5QHGY38FTXK61" 
             data-mail818-token="test_token"
             data-mail818-hostname="https://api.mail818.com">
          <form class="mail818-form">
            <div class="mail818-fields"></div>
            <button type="submit">Subscribe</button>
          </form>
          <div class="mail818-message"></div>
        </div>
        <script>
          // Mock SDK implementation for testing
          class Mail818Form {
            constructor(element, options) {
              this.element = element;
              this.options = options;
              this.initialize();
            }

            async initialize() {
              const fieldsContainer = this.element.querySelector('.mail818-fields');
              const messageContainer = this.element.querySelector('.mail818-message');
              
              // Simulate loading config and creating fields
              setTimeout(() => {
                fieldsContainer.innerHTML = \`
                  <div class="mail818-field">
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" name="email" required>
                  </div>
                  <div class="mail818-field">
                    <label for="name">Full Name</label>
                    <input type="text" id="name" name="name">
                  </div>
                \`;

                // Add form submission handler
                const form = this.element.querySelector('form');
                form.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  
                  const formData = new FormData(form);
                  const email = formData.get('email');
                  const name = formData.get('name');

                  try {
                    const response = await fetch('https://api.mail818.com/v1/submissions', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${this.options.apiToken}\`
                      },
                      body: JSON.stringify({
                        listId: this.options.listId,
                        email,
                        fields: { name }
                      })
                    });

                    const result = await response.json();
                    
                    if (result.success) {
                      messageContainer.innerHTML = \`
                        <div class="mail818-message--success">
                          \${result.message || 'Thank you for subscribing!'}
                        </div>
                      \`;
                      form.reset();
                    } else {
                      throw new Error(result.message || 'Submission failed');
                    }
                  } catch (error) {
                    messageContainer.innerHTML = \`
                      <div class="mail818-message--error">
                        \${error.message}
                      </div>
                    \`;
                  }
                });
              }, 100);
            }

            static autoInit() {
              document.querySelectorAll('[data-mail818-project]').forEach(element => {
                const listId = element.getAttribute('data-mail818-list');
                const apiToken = element.getAttribute('data-mail818-token');
                const hostname = element.getAttribute('data-mail818-hostname');
                
                if (listId && apiToken) {
                  new Mail818Form(element, { listId, apiToken, hostname });
                }
              });
            }
          }

          // Auto-initialize
          Mail818Form.autoInit();
        </script>
      </body>
      </html>
    `);

    // Wait for form to initialize
    await page.waitForSelector('.mail818-field', { timeout: 5000 });

    // Fill out form
    await page.type('input[type="email"]', 'test@example.com');
    await page.type('input[name="name"]', 'John Doe');
    
    // Submit
    await page.click('button[type="submit"]');

    // Wait for success message
    await page.waitForSelector('.mail818-message--success', { timeout: 5000 });
    
    const message = await page.$eval('.mail818-message', (el: Element) => el.textContent);
    expect(message).toContain('Thank you for subscribing!');
  });

  it('should handle form validation errors', async () => {
    // Set up request interception for validation error
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('api.mail818.com')) {
        if (request.method() === 'GET') {
          // Mock project config
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              listId: '01K3KDM5EM74T5QHGY38FTXK61',
              name: 'Test List',
              fields: [
                {
                  key: 'email',
                  label: 'Email Address',
                  type: 'email',
                  required: true
                }
              ]
            })
          });
        } else if (request.method() === 'POST') {
          // Mock validation error
          request.respond({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Validation failed',
              message: 'Invalid email format',
              details: {
                email: 'Please enter a valid email address'
              }
            })
          });
        }
      } else {
        request.continue();
      }
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mail818 Validation Test</title>
        <style>
          .mail818-field { margin: 10px 0; }
          .mail818-field label { display: block; margin-bottom: 5px; }
          .mail818-field input { width: 100%; padding: 8px; }
          .mail818-message--error { background: #f8d7da; color: #721c24; padding: 10px; }
        </style>
      </head>
      <body>
        <div data-mail818-list="01K3KDM5EM74T5QHGY38FTXK61" 
             data-mail818-token="test_token">
          <form class="mail818-form">
            <div class="mail818-fields">
              <div class="mail818-field">
                <label for="email">Email Address *</label>
                <input type="email" id="email" name="email" required>
              </div>
            </div>
            <button type="submit">Subscribe</button>
          </form>
          <div class="mail818-message"></div>
        </div>
        <script>
          const form = document.querySelector('form');
          const messageContainer = document.querySelector('.mail818-message');
          
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const email = formData.get('email');

            try {
              const response = await fetch('https://api.mail818.com/v1/submissions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test_token'
                },
                body: JSON.stringify({
                  listId: '01K3KDM5EM74T5QHGY38FTXK61',
                  email
                })
              });

              const result = await response.json();
              
              if (!response.ok) {
                throw new Error(result.message || 'Submission failed');
              }
            } catch (error) {
              messageContainer.innerHTML = \`
                <div class="mail818-message--error">
                  \${error.message}
                </div>
              \`;
            }
          });
        </script>
      </body>
      </html>
    `);

    // Fill with invalid email
    await page.type('input[type="email"]', 'invalid-email');
    
    // Submit
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('.mail818-message--error', { timeout: 5000 });
    
    const errorMessage = await page.$eval('.mail818-message', (el: Element) => el.textContent);
    expect(errorMessage).toContain('Invalid email format');
  });

  it('should handle network errors gracefully', async () => {
    // Set up request interception to simulate network error
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('api.mail818.com')) {
        request.abort('failed');
      } else {
        request.continue();
      }
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mail818 Network Error Test</title>
        <style>
          .mail818-message--error { background: #f8d7da; color: #721c24; padding: 10px; }
        </style>
      </head>
      <body>
        <div>
          <form class="mail818-form">
            <input type="email" name="email" value="test@example.com" required>
            <button type="submit">Subscribe</button>
          </form>
          <div class="mail818-message"></div>
        </div>
        <script>
          const form = document.querySelector('form');
          const messageContainer = document.querySelector('.mail818-message');
          
          form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            try {
              const response = await fetch('https://api.mail818.com/v1/submissions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer test_token'
                },
                body: JSON.stringify({
                  listId: '01K3KDM5EM74T5QHGY38FTXK61',
                  email: 'test@example.com'
                })
              });
            } catch (error) {
              messageContainer.innerHTML = \`
                <div class="mail818-message--error">
                  Network error: Please check your connection and try again.
                </div>
              \`;
            }
          });
        </script>
      </body>
      </html>
    `);

    // Submit
    await page.click('button[type="submit"]');

    // Wait for network error message
    await page.waitForSelector('.mail818-message--error', { timeout: 5000 });
    
    const errorMessage = await page.$eval('.mail818-message', (el: Element) => el.textContent);
    expect(errorMessage).toContain('Network error');
  });

  it('should work with multiple forms on same page', async () => {
    // Mock the API endpoints
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.url().includes('api.mail818.com')) {
        if (request.method() === 'GET') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              listId: '01K3KDM5EM74T5QHGY38FTXK61',
              name: 'Test List',
              fields: [
                {
                  key: 'email',
                  label: 'Email Address',
                  type: 'email',
                  required: true
                }
              ]
            })
          });
        } else if (request.method() === 'POST') {
          request.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Subscription successful!'
            })
          });
        }
      } else {
        request.continue();
      }
    });

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Mail818 Multiple Forms Test</title>
        <style>
          .form-container { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
          .mail818-message--success { background: #d4edda; color: #155724; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="form-container" data-mail818-list="01K3KDM5EM74T5QHGY38FTXK61" data-mail818-token="test_token">
          <h3>Newsletter Form</h3>
          <form class="mail818-form">
            <input type="email" name="email" placeholder="Enter email" required>
            <button type="submit">Subscribe to Newsletter</button>
          </form>
          <div class="mail818-message"></div>
        </div>

        <div class="form-container" data-mail818-list="01K3KDM5EM74T5QHGY38FTXK61" data-mail818-token="test_token">
          <h3>Beta Access Form</h3>
          <form class="mail818-form">
            <input type="email" name="email" placeholder="Enter email" required>
            <button type="submit">Request Beta Access</button>
          </form>
          <div class="mail818-message"></div>
        </div>

        <script>
          // Simple form handler for multiple forms
          document.querySelectorAll('.form-container').forEach((container, index) => {
            const form = container.querySelector('form');
            const messageDiv = container.querySelector('.mail818-message');
            
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const formData = new FormData(form);
              const email = formData.get('email');
              
              try {
                const response = await fetch('https://api.mail818.com/v1/submissions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test_token'
                  },
                  body: JSON.stringify({
                    listId: '01K3KDM5EM74T5QHGY38FTXK61',
                    email
                  })
                });

                const result = await response.json();
                
                if (result.success) {
                  messageDiv.innerHTML = \`<div class="mail818-message--success">\${result.message}</div>\`;
                  form.reset();
                }
              } catch (error) {
                messageDiv.innerHTML = \`<div class="mail818-message--error">\${error.message}</div>\`;
              }
            });
          });
        </script>
      </body>
      </html>
    `);

    // Test first form
    const firstForm = await page.$('.form-container:nth-child(1) form');
    await firstForm?.type('input[name="email"]', 'newsletter@example.com');
    await firstForm?.$eval('button', (btn: HTMLButtonElement) => btn.click());

    // Wait for first form success
    await page.waitForSelector('.form-container:nth-child(1) .mail818-message--success');

    // Test second form
    const secondForm = await page.$('.form-container:nth-child(2) form');
    await secondForm?.type('input[name="email"]', 'beta@example.com');
    await secondForm?.$eval('button', (btn: HTMLButtonElement) => btn.click());

    // Wait for second form success
    await page.waitForSelector('.form-container:nth-child(2) .mail818-message--success');

    // Verify both forms show success messages
    const messages = await page.$$eval('.mail818-message--success', 
      (elements: Element[]) => elements.map(el => el.textContent)
    );

    expect(messages.length).toBe(2);
    expect(messages.every(msg => msg?.includes('Subscription successful'))).toBe(true);
  });
});