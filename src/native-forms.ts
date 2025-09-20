/**
 * Native Forms Module
 *
 * Enhances existing HTML forms with Mail818 functionality.
 * Provides automatic form detection, validation, and submission handling.
 */

import { OfflineQueue } from './offline-queue'
import { Validators } from './validators'
import type {
  FormConfiguration,
  ValidationRule
} from './types'

/**
 * Native form enhancement options
 */
export interface NativeFormOptions {
  /** Source ID for the native form */
  sourceId: string
  /** List ID for the source */
  listId?: string
  /** API key for authentication (optional for native forms) */
  apiKey?: string
  /** API token (alias for apiKey) */
  apiToken?: string
  /** API URL (defaults to production) */
  apiUrl?: string
  /** API endpoint for submission */
  apiEndpoint?: string
  /** CSS selector to identify forms (optional) */
  formSelector?: string
  /** Delay before detecting forms (ms) */
  detectDelay?: number
  /** Enable offline queue */
  offlineEnabled?: boolean
  /** Success behavior configuration */
  successBehavior?: 'message' | 'redirect' | 'callback'
  /** Success message to display */
  successMessage?: string
  /** Success redirect URL */
  successRedirectUrl?: string
  /** Success callback function name */
  successCallbackFn?: string
  /** Custom success callback */
  onSuccess?: (data: Record<string, unknown>) => void
  /** Custom error callback */
  onError?: (error: Error) => void
  /** Show loading state during submission */
  showLoadingState?: boolean
  /** Replace form with success message */
  replaceOnSuccess?: boolean
  /** Validation configuration (passed from API) */
  validationEnabled?: boolean
  /** Validation rules (passed from API) */
  validationRules?: ValidationRule[]
  /** Field mappings (passed from API) */
  fieldMappings?: Array<{ htmlField: string; mail818Field: string }>
  /** Allowed origins for CORS */
  allowedOrigins?: string[]
}

/**
 * Native forms enhancement class
 */
export class NativeForms {
  private offlineQueue: OfflineQueue | null = null
  private config: FormConfiguration | null = null
  private options: NativeFormOptions
  private enhancedForms: Set<HTMLFormElement> = new Set()
  // eslint-disable-next-line no-undef
  private observer: MutationObserver | null = null

  constructor(options: NativeFormOptions) {
    this.options = {
      apiUrl: 'https://api.mail818.com',
      apiEndpoint: options.apiEndpoint || `${options.apiUrl || 'https://api.mail818.com'}/v1/collect`,
      detectDelay: 1000,
      offlineEnabled: true,
      showLoadingState: true,
      replaceOnSuccess: false,
      successBehavior: 'message',
      successMessage: 'Thank you for subscribing!',
      ...options
    }

    // Use apiToken if apiKey is not provided
    if (!this.options.apiKey && this.options.apiToken) {
      this.options.apiKey = this.options.apiToken
    }

    // Set up initial configuration from options
    this.config = {
      validationEnabled: options.validationEnabled || false,
      validationRules: options.validationRules || [],
      fieldMappings: options.fieldMappings,
      successBehavior: options.successBehavior || 'message',
      successMessage: options.successMessage,
      successRedirectUrl: options.successRedirectUrl,
      successCallbackFn: options.successCallbackFn,
      replaceOnSuccess: options.replaceOnSuccess,
      formSelectors: options.formSelector
    } as FormConfiguration

    // Initialize offline queue if enabled
    if (this.options.offlineEnabled) {
      this.offlineQueue = new OfflineQueue({
        enabled: true,
        queueSubmissions: true,
        retryOnReconnect: true
      })
    }
  }

  /**
   * Initialize native forms enhancement
   */
  async init(): Promise<void> {
    try {
      // Start detecting forms after delay (no need to fetch config)
      setTimeout(() => {
        this.detectAndEnhanceForms()
        this.startObserving()
      }, this.options.detectDelay)

      // Process offline queue if available
      if (this.offlineQueue && navigator.onLine) {
        // Process any queued submissions when online
        const queuedItems = this.offlineQueue.getAll()
        for (const item of queuedItems) {
          try {
            // Submit the queued data
            await this.submitForm(item.data as Record<string, unknown>)
            this.offlineQueue.remove(item)
          } catch {
            // Keep in queue if submission fails
          }
        }
      }
    } catch (error) {
      console.error('[Mail818] Failed to initialize native forms:', error)
      this.options.onError?.(error as Error)
    }
  }


  /**
   * Detect and enhance forms on the page
   */
  private detectAndEnhanceForms(): void {
    const selector = this.options.formSelector ||
                    this.config?.formSelectors ||
                    'form[data-mail818], form.mail818-form'

    const forms = document.querySelectorAll<HTMLFormElement>(selector)

    forms.forEach(form => {
      if (!this.enhancedForms.has(form)) {
        this.enhanceForm(form)
      }
    })
  }

  /**
   * Start observing DOM for new forms
   */
  private startObserving(): void {
    if (!this.config?.detectDelay) return

    // eslint-disable-next-line no-undef
    this.observer = new MutationObserver(() => {
      this.detectAndEnhanceForms()
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }

  /**
   * Enhance a single form
   */
  private enhanceForm(form: HTMLFormElement): void {
    // Mark form as enhanced
    this.enhancedForms.add(form)
    form.setAttribute('data-mail818-enhanced', 'true')

    // Inject honeypot field for spam prevention
    this.injectHoneypotField(form)

    // Add submit handler that respects browser validation
    form.addEventListener('submit', async (e) => {
      // First check browser's built-in validation
      if (!form.checkValidity()) {
        // Let browser show its validation messages
        form.reportValidity()
        return // Don't prevent default, let browser handle it
      }

      // Only prevent default if browser validation passes
      e.preventDefault()
      await this.handleFormSubmit(form)
    })

    // Add client-side validation only if enabled
    if (this.config?.validationEnabled && this.config?.validationRules) {
      this.addValidation(form)
    }

    console.log('[Mail818] Form enhanced:', form)
  }

  /**
   * Inject honeypot field for spam prevention
   */
  private injectHoneypotField(form: HTMLFormElement): void {
    // Check if honeypot field already exists
    if (form.querySelector('input[name="_m818_hp"]')) {
      return
    }

    // Create honeypot field
    const honeypotField = document.createElement('input')
    honeypotField.type = 'hidden'
    honeypotField.name = '_m818_hp'
    honeypotField.value = ''
    honeypotField.style.display = 'none'
    honeypotField.tabIndex = -1
    honeypotField.setAttribute('aria-hidden', 'true')

    // Append to form
    form.appendChild(honeypotField)
  }

  /**
   * Add client-side validation to form
   */
  private addValidation(form: HTMLFormElement): void {
    if (!this.config?.validationRules) return

    this.config.validationRules.forEach(rule => {
      const field = form.elements.namedItem(rule.field) as HTMLInputElement
      if (!field) return

      // Add validation on blur
      field.addEventListener('blur', () => {
        this.validateField(field, rule)
      })

      // Add validation on input for email fields
      if (rule.type === 'email') {
        field.addEventListener('input', () => {
          this.validateField(field, rule)
        })
      }
    })
  }

  /**
   * Validate a single field
   */
  private validateField(field: HTMLInputElement, rule: ValidationRule): boolean {
    let isValid = true
    let errorMessage = ''

    switch (rule.type) {
      case 'required':
        isValid = field.value.trim() !== ''
        errorMessage = rule.message || 'This field is required'
        break

      case 'email':
        isValid = Validators.email(field.value)
        errorMessage = rule.message || 'Please enter a valid email address'
        break

      case 'pattern':
        if (rule.value && typeof rule.value === 'string') {
          const regex = new RegExp(rule.value)
          isValid = regex.test(field.value)
          errorMessage = rule.message || 'Invalid format'
        }
        break

      case 'min_length':
        if (rule.value && typeof rule.value === 'number') {
          isValid = field.value.length >= rule.value
          errorMessage = rule.message || `Minimum ${rule.value} characters required`
        }
        break

      case 'max_length':
        if (rule.value && typeof rule.value === 'number') {
          isValid = field.value.length <= rule.value
          errorMessage = rule.message || `Maximum ${rule.value} characters allowed`
        }
        break
    }

    // Update field UI
    if (isValid) {
      field.classList.remove('mail818-error')
      this.clearFieldError(field)
    } else {
      field.classList.add('mail818-error')
      this.showFieldError(field, errorMessage)
    }

    return isValid
  }

  /**
   * Show field error message
   */
  private showFieldError(field: HTMLInputElement, message: string): void {
    // Remove existing error
    this.clearFieldError(field)

    // Create error element
    const error = document.createElement('div')
    error.className = 'mail818-field-error'
    error.textContent = message
    error.style.cssText = 'color: red; font-size: 0.875rem; margin-top: 0.25rem;'

    // Insert after field
    field.parentNode?.insertBefore(error, field.nextSibling)
  }

  /**
   * Clear field error message
   */
  private clearFieldError(field: HTMLInputElement): void {
    const error = field.parentNode?.querySelector('.mail818-field-error')
    error?.remove()
  }

  /**
   * Handle form submission
   */
  private async handleFormSubmit(form: HTMLFormElement): Promise<void> {
    try {
      // Show loading state
      if (this.options.showLoadingState) {
        this.showLoadingState(form, true)
      }

      // Validate all fields
      if (!this.validateForm(form)) {
        this.showLoadingState(form, false)
        return
      }

      // Collect form data
      const formData = this.collectFormData(form)

      // Submit to API
      const response = await this.submitForm(formData)

      // Handle success
      if (response.success) {
        this.handleSuccess(form, response)
      } else {
        throw new Error(response.error || 'Submission failed')
      }
    } catch (error) {
      // Handle error
      this.handleError(form, error as Error)
    } finally {
      // Hide loading state
      if (this.options.showLoadingState) {
        this.showLoadingState(form, false)
      }
    }
  }

  /**
   * Validate entire form
   */
  private validateForm(form: HTMLFormElement): boolean {
    // First check browser's built-in validation
    if (!form.checkValidity()) {
      form.reportValidity()
      return false
    }

    // Then check our custom validation rules if enabled
    if (this.config?.validationEnabled && this.config?.validationRules) {
      let isValid = true

      this.config.validationRules.forEach(rule => {
        const field = form.elements.namedItem(rule.field) as HTMLInputElement
        if (field && !this.validateField(field, rule)) {
          isValid = false
        }
      })

      return isValid
    }

    return true
  }

  /**
   * Collect form data with field mappings
   */
  private collectFormData(form: HTMLFormElement): Record<string, unknown> {
    const formData = new FormData(form)
    const data: Record<string, unknown> = {}

    // Apply field mappings if configured
    if (this.config?.fieldMappings) {
      this.config.fieldMappings.forEach(mapping => {
        const value = formData.get(mapping.htmlField)
        if (value !== null) {
          data[mapping.mail818Field] = value
        }
      })
    } else {
      // Use raw form data
      formData.forEach((value, key) => {
        data[key] = value
      })
    }

    // Always include honeypot field for spam prevention
    const honeypotValue = formData.get('_m818_hp')
    if (honeypotValue !== null) {
      data['_m818_hp'] = honeypotValue
    }

    return data
  }

  /**
   * Submit form data to API
   */
  private async submitForm(data: Record<string, unknown>): Promise<any> {
    const url = `${this.options.apiUrl}/v1/collect`

    // Add sourceId and listId to the data
    const submissionData = {
      ...data,
      sourceId: this.options.sourceId,
      listId: this.options.listId
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(submissionData)
      })

      const result = await response.json()

      if (!response.ok && this.offlineQueue) {
        // Queue for offline processing
        this.offlineQueue.add({
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: data
        })

        return {
          success: true,
          queued: true,
          message: 'Submission queued for processing'
        }
      }

      return result
    } catch (error) {
      // Network error - queue if offline mode enabled
      if (this.offlineQueue) {
        this.offlineQueue.add({
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: data
        })

        return {
          success: true,
          queued: true,
          message: 'Submission queued for processing'
        }
      }

      throw error
    }
  }

  /**
   * Handle successful submission
   */
  private handleSuccess(form: HTMLFormElement, response: any): void {
    // Call custom success callback
    this.options.onSuccess?.(response)

    // Handle success behavior from config
    if (this.config?.successBehavior === 'redirect' && this.config.successRedirectUrl) {
      window.location.href = this.config.successRedirectUrl
      return
    }

    if (this.config?.successBehavior === 'callback' && this.config.successCallbackFn) {
      // Call global function if exists
      const fn = (window as any)[this.config.successCallbackFn]
      if (typeof fn === 'function') {
        fn(response)
      }
    }

    // Show success message
    const message = this.config?.successMessage || 'Thank you for subscribing!'

    if (this.options.replaceOnSuccess || this.config?.replaceOnSuccess) {
      this.replaceFormWithMessage(form, message, 'success')
    } else {
      this.showFormMessage(form, message, 'success')
      form.reset()
    }
  }

  /**
   * Handle submission error
   */
  private handleError(form: HTMLFormElement, error: Error): void {
    console.error('[Mail818] Form submission error:', error)

    // Call custom error callback
    this.options.onError?.(error)

    // Show error message
    const message = error.message || 'An error occurred. Please try again.'
    this.showFormMessage(form, message, 'error')
  }

  /**
   * Show loading state on form
   */
  private showLoadingState(form: HTMLFormElement, loading: boolean): void {
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLButtonElement

    if (submitButton) {
      submitButton.disabled = loading

      if (loading) {
        submitButton.setAttribute('data-original-text', submitButton.textContent || '')
        submitButton.textContent = 'Submitting...'
        submitButton.classList.add('mail818-loading')
      } else {
        const originalText = submitButton.getAttribute('data-original-text')
        if (originalText) {
          submitButton.textContent = originalText
        }
        submitButton.classList.remove('mail818-loading')
      }
    }

    // Toggle form disabled state
    const inputs = form.querySelectorAll('input, textarea, select')
    inputs.forEach(input => {
      (input as HTMLInputElement).disabled = loading
    })
  }

  /**
   * Show message on form
   */
  private showFormMessage(form: HTMLFormElement, message: string, type: 'success' | 'error'): void {
    // Remove existing message
    const existing = form.querySelector('.mail818-form-message')
    existing?.remove()

    // Create message element
    const messageEl = document.createElement('div')
    messageEl.className = `mail818-form-message mail818-${type}`
    messageEl.textContent = message
    messageEl.style.cssText = `
      padding: 1rem;
      margin: 1rem 0;
      border-radius: 0.25rem;
      background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      text-align: center;
    `

    // Insert at top of form
    form.insertBefore(messageEl, form.firstChild)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageEl.remove()
    }, 5000)
  }

  /**
   * Replace form with message
   */
  private replaceFormWithMessage(form: HTMLFormElement, message: string, type: 'success' | 'error'): void {
    const messageEl = document.createElement('div')
    messageEl.className = `mail818-form-replaced mail818-${type}`
    messageEl.innerHTML = `
      <div style="
        padding: 2rem;
        text-align: center;
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 0.25rem;
      ">
        <div style="font-size: 2rem; margin-bottom: 1rem;">
          ${type === 'success' ? '✓' : '✗'}
        </div>
        <div>${message}</div>
      </div>
    `

    form.parentNode?.replaceChild(messageEl, form)
  }

  /**
   * Destroy native forms enhancement
   */
  destroy(): void {
    // Stop observing
    this.observer?.disconnect()

    // Remove enhancements from forms
    this.enhancedForms.forEach(form => {
      form.removeAttribute('data-mail818-enhanced')
    })

    this.enhancedForms.clear()
  }
}

/**
 * Initialize native forms with options
 */
export function initNativeForms(options: NativeFormOptions): NativeForms {
  const nativeForms = new NativeForms(options)
  nativeForms.init()
  return nativeForms
}