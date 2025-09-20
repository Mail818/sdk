/**
 * Main Mail818Form class for form management
 */

import { ApiClient } from './api-client';
import { CacheManager } from './cache';
import { OfflineQueue } from './offline-queue';
import { Validators } from './validators';
import type { Mail818Options, ListConfig, FieldDefinition, SubmissionData } from './types';

export class Mail818Form {
  private container: HTMLElement;
  private form: HTMLFormElement;
  private options: Mail818Options;
  private apiClient: ApiClient;
  private cache?: CacheManager;
  private offlineQueue?: OfflineQueue;
  private config?: ListConfig;
  private isInitialized = false;

  constructor(selector: string | HTMLElement, options: Mail818Options) {
    // Validate required options
    if (!options.listId || !options.apiToken) {
      throw new Error('listId and apiToken are required');
    }

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

    // Find or create form element
    this.form = this.container.querySelector('form') || this.createForm();

    // Set default options
    this.options = {
      hostname: 'https://api.mail818.com',
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        storage: 'localStorage'
      },
      offline: {
        enabled: false,
        queueSubmissions: false,
        retryOnReconnect: false
      },
      ...options
    };

    // Initialize API client
    this.apiClient = new ApiClient(
      this.options.hostname || 'https://api.mail818.com',
      this.options.apiToken,
      this.options.listId
    );

    // Initialize cache if enabled
    if (this.options.cache?.enabled) {
      this.cache = new CacheManager(this.options.cache);
    }

    // Initialize offline queue if enabled
    if (this.options.offline?.enabled) {
      this.offlineQueue = new OfflineQueue(this.options.offline);
      this.setupOfflineHandlers();
    }

    // Bind event handlers
    this.form.addEventListener('submit', this.handleSubmit.bind(this));
  }

  /**
   * Initialize form by loading configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Show loading state
    this.showLoading(true);

    try {
      // Load configuration (from cache or API)
      this.config = await this.loadConfig() || undefined;

      if (this.config) {
        // Render dynamic fields
        this.renderFields(this.config.fields);

        // Display count if available
        if (this.config.count) {
          this.displayCount(this.config.count);
        }

        // Fire callback
        this.options.onConfigLoaded?.(this.config);
      } else {
        // Use static form (write-only token)
        this.enhanceStaticForm();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize form:', error);
      this.showMessage('Failed to load form', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Load list configuration with caching
   */
  private async loadConfig(): Promise<ListConfig | null> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get(`config_${this.options.listId}`);
      if (cached) {
        return cached as ListConfig;
      }
    }

    // Test mode
    if (this.options.testMode && this.options.mockConfig) {
      return this.options.mockConfig;
    }

    // Fetch from API
    const config = await this.apiClient.fetchListConfig();

    // Cache the result
    if (config && this.cache) {
      await this.cache.set(`config_${this.options.listId}`, config);
    }

    return config;
  }

  /**
   * Render dynamic fields from configuration
   */
  private renderFields(fields: FieldDefinition[]): void {
    const container = this.form.querySelector('.mail818-fields') || this.form;
    
    // Clear existing fields
    container.innerHTML = '';

    fields.forEach(field => {
      const fieldElement = this.createFieldElement(field);
      container.appendChild(fieldElement);
    });

    // Enable submit button
    const submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = false;
    }
  }

  /**
   * Create field element based on definition
   */
  private createFieldElement(field: FieldDefinition): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = `mail818-field mail818-field--${field.type}`;
    wrapper.setAttribute('data-field-key', field.key);

    // Create label
    if (field.type !== 'hidden' && field.label) {
      const label = document.createElement('label');
      label.textContent = field.label;
      if (field.required) {
        label.innerHTML += ' <span class="mail818-required">*</span>';
      }
      wrapper.appendChild(label);
    }

    // Create input element
    let input: HTMLElement;

    switch (field.type) {
      case 'select':
        input = this.createSelectField(field);
        break;
      case 'radio':
        input = this.createRadioGroup(field);
        break;
      case 'checkbox':
        input = this.createCheckboxField(field);
        break;
      case 'textarea':
        input = this.createTextareaField(field);
        break;
      default:
        input = this.createInputField(field);
    }

    wrapper.appendChild(input);

    // Add help text
    if (field.helpText) {
      const help = document.createElement('small');
      help.className = 'mail818-help';
      help.textContent = field.helpText;
      wrapper.appendChild(help);
    }

    // Add error container
    const error = document.createElement('span');
    error.className = 'mail818-error';
    wrapper.appendChild(error);

    return wrapper;
  }

  /**
   * Create standard input field
   */
  private createInputField(field: FieldDefinition): HTMLInputElement {
    const input = document.createElement('input');
    input.type = field.type;
    input.name = field.key === 'email' ? 'email' : `fields[${field.key}]`;
    input.placeholder = field.placeholder || '';
    input.required = field.required;
    input.setAttribute('autocomplete', 'off');

    if (field.validation) {
      if (field.validation.minLength) input.minLength = field.validation.minLength;
      if (field.validation.maxLength) input.maxLength = field.validation.maxLength;
      if (field.validation.pattern) input.pattern = field.validation.pattern;
      if (field.validation.min !== undefined) input.min = String(field.validation.min);
      if (field.validation.max !== undefined) input.max = String(field.validation.max);
    }

    if (field.defaultValue !== undefined) {
      input.value = String(field.defaultValue);
    }

    // Add validation listeners
    input.addEventListener('blur', () => this.validateField(field, input.value));
    
    return input;
  }

  /**
   * Create select dropdown field
   */
  private createSelectField(field: FieldDefinition): HTMLSelectElement {
    const select = document.createElement('select');
    select.name = `fields[${field.key}]`;
    select.required = field.required;
    select.setAttribute('autocomplete', 'off');

    // Add placeholder option
    if (field.placeholder) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = field.placeholder;
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
    }

    // Add options
    field.validation?.options?.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      if (field.defaultValue === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    select.addEventListener('change', () => this.validateField(field, select.value));

    return select;
  }

  /**
   * Create radio button group
   */
  private createRadioGroup(field: FieldDefinition): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mail818-radio-group';

    field.validation?.options?.forEach((opt, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'mail818-radio-item';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = `fields[${field.key}]`;
      input.value = opt.value;
      input.id = `${field.key}_${index}`;
      input.required = field.required;

      if (field.defaultValue === opt.value) {
        input.checked = true;
      }

      const label = document.createElement('label');
      label.htmlFor = `${field.key}_${index}`;
      label.textContent = opt.label;

      wrapper.appendChild(input);
      wrapper.appendChild(label);
      container.appendChild(wrapper);

      input.addEventListener('change', () => this.validateField(field, input.value));
    });

    return container;
  }

  /**
   * Create checkbox field
   */
  private createCheckboxField(field: FieldDefinition): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'mail818-checkbox-wrapper';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = `fields[${field.key}]`;
    input.id = `field_${field.key}`;

    if (field.defaultValue) {
      input.checked = Boolean(field.defaultValue);
    }

    const label = document.createElement('label');
    label.htmlFor = `field_${field.key}`;
    label.textContent = field.label;

    wrapper.appendChild(input);
    wrapper.appendChild(label);

    return wrapper;
  }

  /**
   * Create textarea field
   */
  private createTextareaField(field: FieldDefinition): HTMLTextAreaElement {
    const textarea = document.createElement('textarea');
    textarea.name = `fields[${field.key}]`;
    textarea.placeholder = field.placeholder || '';
    textarea.required = field.required;
    textarea.setAttribute('autocomplete', 'off');

    if (field.validation) {
      if (field.validation.minLength) textarea.minLength = field.validation.minLength;
      if (field.validation.maxLength) textarea.maxLength = field.validation.maxLength;
    }

    if (field.defaultValue !== undefined) {
      textarea.value = String(field.defaultValue);
    }

    textarea.addEventListener('blur', () => this.validateField(field, textarea.value));

    return textarea;
  }

  /**
   * Enhance existing static form
   */
  private enhanceStaticForm(): void {
    // Add validation to existing fields
    const emailInput = this.form.querySelector('input[type="email"]');
    if (emailInput) {
      emailInput.addEventListener('blur', (e) => {
        const target = e.target as HTMLInputElement;
        if (!Validators.email(target.value)) {
          this.showFieldError(target, 'Please enter a valid email address');
        } else {
          this.clearFieldError(target);
        }
      });
    }
  }

  /**
   * Validate field value
   */
  private validateField(field: FieldDefinition, value: unknown): boolean {
    const errors = Validators.validateField(field, value);
    
    if (errors.length > 0) {
      this.showFieldError(
        this.form.querySelector(`[name="${field.key === 'email' ? 'email' : `fields[${field.key}]`}"]`) as HTMLElement,
        errors[0]
      );
      return false;
    }

    this.clearFieldError(
      this.form.querySelector(`[name="${field.key === 'email' ? 'email' : `fields[${field.key}]`}"]`) as HTMLElement
    );
    return true;
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    // Validate all fields
    if (!this.validateForm()) {
      return;
    }

    // Collect form data
    const formData = this.collectFormData();

    // Check if offline
    if (!navigator.onLine && this.offlineQueue) {
      this.offlineQueue.add(formData);
      this.showMessage('Submission saved. Will send when connection is restored.', 'warning');
      return;
    }

    // Show loading state
    this.showLoading(true);

    try {
      // Test mode
      if (this.options.testMode) {
        console.log('Test mode submission:', formData);
        this.showMessage('Test submission successful!', 'success');
        this.options.onSuccess?.({ success: true, message: 'Test success' });
        return;
      }

      // Submit to API
      const response = await this.apiClient.submitForm(formData);

      // Handle success
      this.showMessage(response.message || 'Successfully subscribed!', 'success');
      this.options.onSuccess?.(response);

      // Update count if returned
      if (response.data?.count) {
        this.displayCount(response.data.count);
      }

      // Reset form
      this.form.reset();

    } catch (error: unknown) {
      // Handle errors
      const mail818Error = error as { error?: string; message?: string; details?: Record<string, string> };
      
      if (mail818Error.error === 'validation_error' && mail818Error.details) {
        // Show field-specific errors
        this.showValidationErrors(mail818Error.details);
        this.options.onValidationError?.(mail818Error.details);
      } else if (mail818Error.error === 'duplicate_email') {
        this.showMessage(mail818Error.message || 'This email is already subscribed', 'error');
      } else {
        this.showMessage(mail818Error.message || 'Something went wrong. Please try again.', 'error');
      }

      this.options.onError?.({
        error: mail818Error.error || 'unknown_error',
        message: mail818Error.message,
        details: mail818Error.details
      });

      // Queue for offline retry if enabled
      if (this.offlineQueue && mail818Error.error !== 'validation_error' && mail818Error.error !== 'duplicate_email') {
        this.offlineQueue.add(formData);
      }
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Validate entire form
   */
  private validateForm(): boolean {
    let isValid = true;

    if (this.config) {
      // Validate dynamic fields
      this.config.fields.forEach(field => {
        const element = this.form.querySelector(`[name="${field.key === 'email' ? 'email' : `fields[${field.key}]`}"]`) as HTMLInputElement;
        if (element) {
          const value = field.type === 'checkbox' ? element.checked : element.value;
          if (!this.validateField(field, value)) {
            isValid = false;
          }
        }
      });
    } else {
      // Validate static form
      const emailInput = this.form.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput && !Validators.email(emailInput.value)) {
        this.showFieldError(emailInput, 'Please enter a valid email address');
        isValid = false;
      }
    }

    return isValid;
  }

  /**
   * Collect form data
   */
  private collectFormData(): SubmissionData {
    const formData = new FormData(this.form);
    const data: SubmissionData = {
      listId: this.options.listId,
      email: '',
      fields: {}
    };

    // Extract email
    data.email = formData.get('email') as string;

    // Extract custom fields
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('fields[') && key.endsWith(']')) {
        const fieldKey = key.slice(7, -1);
        if (!data.fields) {
          data.fields = {};
        }
        data.fields[fieldKey] = value;
      }
    }

    return data;
  }

  /**
   * Display count information
   */
  private displayCount(count: { exact?: number; range?: string }): void {
    const countElement = this.container.querySelector('.mail818-count-display');
    if (!countElement) return;

    let countText = '';
    if (count.exact !== undefined && count.range) {
      countText = `${count.exact.toLocaleString()} (${count.range})`;
    } else if (count.exact !== undefined) {
      countText = count.exact.toLocaleString();
    } else if (count.range) {
      countText = count.range;
    }

    countElement.textContent = countText;
  }

  /**
   * Show loading state
   */
  private showLoading(loading: boolean): void {
    const loadingElement = this.container.querySelector('.mail818-loading');
    const fieldsElement = this.container.querySelector('.mail818-fields');
    const submitButton = this.form.querySelector('button[type="submit"]') as HTMLButtonElement;

    if (loadingElement) {
      loadingElement.classList.toggle('mail818-hidden', !loading);
    }

    if (fieldsElement) {
      fieldsElement.classList.toggle('mail818-hidden', loading);
    }

    if (submitButton) {
      submitButton.disabled = loading;
      if (loading) {
        submitButton.setAttribute('data-original-text', submitButton.textContent || '');
        submitButton.textContent = 'Submitting...';
      } else {
        const originalText = submitButton.getAttribute('data-original-text');
        if (originalText) {
          submitButton.textContent = originalText;
        }
      }
    }
  }

  /**
   * Show message to user
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    const messageElement = this.container.querySelector('.mail818-message') || this.createMessageElement();
    
    messageElement.textContent = message;
    messageElement.className = `mail818-message mail818-message--${type}`;
    messageElement.classList.remove('mail818-hidden');

    // Auto-hide success messages
    if (type === 'success') {
      setTimeout(() => {
        messageElement.classList.add('mail818-hidden');
      }, 5000);
    }
  }

  /**
   * Show validation errors
   */
  private showValidationErrors(errors: Record<string, string>): void {
    Object.entries(errors).forEach(([field, message]) => {
      const fieldName = field.startsWith('fields.') ? `fields[${field.slice(7)}]` : field;
      const element = this.form.querySelector(`[name="${fieldName}"]`) as HTMLElement;
      if (element) {
        this.showFieldError(element, message);
      }
    });
  }

  /**
   * Show field error
   */
  private showFieldError(element: HTMLElement, message: string): void {
    const wrapper = element.closest('.mail818-field');
    if (!wrapper) return;

    wrapper.classList.add('mail818-field--error');
    const errorElement = wrapper.querySelector('.mail818-error');
    if (errorElement) {
      errorElement.textContent = message;
    }
  }

  /**
   * Clear field error
   */
  private clearFieldError(element: HTMLElement): void {
    const wrapper = element.closest('.mail818-field');
    if (!wrapper) return;

    wrapper.classList.remove('mail818-field--error');
    const errorElement = wrapper.querySelector('.mail818-error');
    if (errorElement) {
      errorElement.textContent = '';
    }
  }

  /**
   * Create form element
   */
  private createForm(): HTMLFormElement {
    const form = document.createElement('form');
    form.className = 'mail818-form';
    this.container.appendChild(form);
    return form;
  }

  /**
   * Create message element
   */
  private createMessageElement(): HTMLElement {
    const message = document.createElement('div');
    message.className = 'mail818-message mail818-hidden';
    this.container.appendChild(message);
    return message;
  }

  /**
   * Setup offline handlers
   */
  private setupOfflineHandlers(): void {
    window.addEventListener('online', () => {
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.showMessage('You appear to be offline', 'warning');
    });

    // Process any existing queued items on initialization
    this.processOfflineQueue();
  }

  /**
   * Process offline queue
   */
  private async processOfflineQueue(): Promise<void> {
    if (!this.offlineQueue || !navigator.onLine) return;

    const items = this.offlineQueue.getAll();
    for (const item of items) {
      try {
        await this.apiClient.submitForm(item.data as SubmissionData);
        this.offlineQueue.remove(item);
      } catch (error) {
        console.error('Failed to process queued submission:', error);
      }
    }
  }

  /**
   * Auto-initialize forms on page
   */
  static autoInit(options?: { selector?: string; defaultToken?: string }): void {
    const selector = options?.selector || '[data-mail818-list]';
    const forms = document.querySelectorAll(selector);

    forms.forEach(container => {
      const listId = container.getAttribute('data-mail818-list');
      const token = container.getAttribute('data-mail818-token') || options?.defaultToken;

      if (!listId || !token) {
        console.error('Mail818: Missing listId or token', container);
        return;
      }

      const form = new Mail818Form(container as HTMLElement, {
        listId,
        apiToken: token
      });

      form.initialize();
    });
  }
}

// Export for browser usage
if (typeof window !== 'undefined') {
  (window as unknown as { Mail818Form: typeof Mail818Form }).Mail818Form = Mail818Form;
}