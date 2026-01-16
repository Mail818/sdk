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
  SuccessPosition,
  ValidationRule
} from './types'

/**
 * SVG icon for success messages (checkmark in circle)
 */
const SUCCESS_ICON_SVG = `<svg class="mail818-message-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
</svg>`

/**
 * SVG icon for error messages (X in circle)
 */
const ERROR_ICON_SVG = `<svg class="mail818-message-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
</svg>`

/**
 * Native form enhancement options
 */
export interface NativeFormOptions {
  /** Organization key (ID) */
  organizationKey?: string
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
  /** @deprecated Use successPosition instead */
  replaceOnSuccess?: boolean
  /** Position of success message: 'replace', 'below-form', 'above-form', 'below-input' */
  successPosition?: SuccessPosition
  /** Whether to auto-remove the message after a delay */
  autoRemove?: boolean
  /** Delay in ms before auto-removing (default 5000) */
  autoRemoveDelay?: number
  /** Whether to show an icon in the message */
  showIcon?: boolean
  /** Validation rules (passed from API) - empty array means no validation */
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
    // Handle legacy replaceOnSuccess option
    const defaultPosition: SuccessPosition = options.replaceOnSuccess
      ? 'replace'
      : (options.successPosition || 'below-form')

    this.options = {
      apiUrl: 'https://api.mail818.com',
      apiEndpoint: options.apiEndpoint ||
        `${options.apiUrl || 'https://api.mail818.com'}/v1/collect`,
      detectDelay: 1000,
      offlineEnabled: true,
      showLoadingState: true,
      successPosition: defaultPosition,
      autoRemove: true,
      autoRemoveDelay: 5000,
      showIcon: true,
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
      validationRules: options.validationRules || [],
      fieldMappings: options.fieldMappings,
      successBehavior: options.successBehavior || 'message',
      successMessage: options.successMessage,
      successRedirectUrl: options.successRedirectUrl,
      successCallbackFn: options.successCallbackFn,
      successPosition: defaultPosition,
      autoRemove: options.autoRemove !== false,
      autoRemoveDelay: options.autoRemoveDelay || 5000,
      showIcon: options.showIcon !== false,
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

    console.log('[Mail818 NativeForms] Looking for forms with selector:', selector)
    const forms = document.querySelectorAll<HTMLFormElement>(selector)
    console.log('[Mail818 NativeForms] Found forms:', forms.length)

    forms.forEach((form, index) => {
      if (!this.enhancedForms.has(form)) {
        console.log(`[Mail818 NativeForms] Enhancing form ${index}:`, form)
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

    // Add client-side validation if rules are provided
    if (this.config?.validationRules && this.config.validationRules.length > 0) {
      this.addValidation(form)
    }
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
      // Validate all fields FIRST
      if (!this.validateForm(form)) {
        return
      }

      // Collect form data BEFORE disabling fields
      const formData = this.collectFormData(form)

      // Show loading state AFTER collecting data
      if (this.options.showLoadingState) {
        this.showLoadingState(form, true)
      }

      // Submit to API
      const response = await this.submitForm(formData)
      console.log('[Mail818 NativeForms] API Response:', response)

      // Handle success
      if (response.success) {
        this.handleSuccess(form, response)
      } else {
        console.log('[Mail818 NativeForms] API returned error:', response.error)
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

    // Then check our custom validation rules if any
    if (this.config?.validationRules && this.config.validationRules.length > 0) {
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

    // For native forms, only add sourceId to the data
    // The API will determine the organization and list from the source
    const submissionData = {
      ...data,
      sourceId: this.options.sourceId
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
  private handleSuccess(form: HTMLFormElement, response: unknown): void {
    console.log('[Mail818 NativeForms] handleSuccess called with config:',
      this.config)

    // Call custom success callback
    this.options.onSuccess?.(response as Record<string, unknown>)

    // Handle success behavior from config
    if (this.config?.successBehavior === 'redirect' &&
        this.config.successRedirectUrl) {
      window.location.href = this.config.successRedirectUrl
      return
    }

    if (this.config?.successBehavior === 'callback' &&
        this.config.successCallbackFn) {
      // Call global function if exists
      const fn = (window as unknown as Record<string, unknown>)[
        this.config.successCallbackFn
      ]
      if (typeof fn === 'function') {
        fn(response)
      }
    }

    // Show success message
    const message = this.config?.successMessage || 'Thank you for subscribing!'

    // Determine position (handle legacy replaceOnSuccess)
    const position: SuccessPosition = this.config?.successPosition ||
      this.options.successPosition ||
      (this.options.replaceOnSuccess ? 'replace' : 'below-form')

    this.showMessage(form, message, 'success', position)

    // Reset form if not replacing
    if (position !== 'replace') {
      form.reset()
    }
  }

  /**
   * Handle submission error
   */
  private handleError(form: HTMLFormElement, error: Error): void {
    console.error('[Mail818] Form submission error:', error.message)

    // Call custom error callback
    this.options.onError?.(error)

    // Show error message - errors always show below-form, never replace
    const message = error.message || 'An error occurred. Please try again.'
    console.log('[Mail818 NativeForms] Showing error message:', message)
    this.showMessage(form, message, 'error', 'below-form')
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
   * Show message based on position configuration
   */
  private showMessage(
    form: HTMLFormElement,
    message: string,
    type: 'success' | 'error',
    position: SuccessPosition
  ): void {
    // Remove any existing messages
    this.removeExistingMessages(form)

    // Get configuration
    const showIcon = this.config?.showIcon ?? this.options.showIcon ?? true
    const autoRemove = this.config?.autoRemove ?? this.options.autoRemove ?? true
    const autoRemoveDelay = this.config?.autoRemoveDelay ??
      this.options.autoRemoveDelay ?? 5000

    // Create message element
    const messageEl = document.createElement('div')
    messageEl.className = `mail818-message mail818-message-${type}`
    messageEl.setAttribute('role', 'alert')
    messageEl.setAttribute('aria-live', 'polite')

    // Build inner HTML
    const iconHtml = showIcon
      ? (type === 'success' ? SUCCESS_ICON_SVG : ERROR_ICON_SVG)
      : ''
    messageEl.innerHTML = `${iconHtml}<span class="mail818-message-text">${this.escapeHtml(message)}</span>`

    // Position the message
    if (position === 'replace') {
      // Add special class for replace mode
      messageEl.classList.add('mail818-message-replaced')
      form.parentNode?.replaceChild(messageEl, form)
    } else {
      this.insertMessage(form, messageEl, position)
    }

    // Auto-remove if enabled (not for replace mode)
    if (autoRemove && position !== 'replace' && autoRemoveDelay > 0) {
      setTimeout(() => {
        messageEl.classList.add('mail818-message-fade-out')
        setTimeout(() => {
          messageEl.remove()
        }, 300) // Match CSS transition duration
      }, autoRemoveDelay)
    }
  }

  /**
   * Insert message element at the specified position
   */
  private insertMessage(
    form: HTMLFormElement,
    messageEl: HTMLElement,
    position: SuccessPosition
  ): void {
    switch (position) {
      case 'below-form':
        // Insert after the form
        form.parentNode?.insertBefore(messageEl, form.nextSibling)
        break

      case 'above-form':
        // Insert before the form
        form.parentNode?.insertBefore(messageEl, form)
        break

      case 'below-input': {
        // Find the email input or last input and insert after it
        const emailInput = form.querySelector('input[type="email"]')
        const lastInput = emailInput ||
          form.querySelector('input:last-of-type, textarea:last-of-type')
        if (lastInput) {
          // Insert after the input's parent (in case it's wrapped)
          const targetParent = lastInput.parentElement
          if (targetParent && targetParent !== form) {
            targetParent.parentNode?.insertBefore(
              messageEl, targetParent.nextSibling
            )
          } else {
            lastInput.parentNode?.insertBefore(messageEl, lastInput.nextSibling)
          }
        } else {
          // Fallback to below-form
          form.parentNode?.insertBefore(messageEl, form.nextSibling)
        }
        break
      }

      default:
        // Default to below-form
        form.parentNode?.insertBefore(messageEl, form.nextSibling)
    }
  }

  /**
   * Remove any existing message elements
   */
  private removeExistingMessages(form: HTMLFormElement): void {
    // Remove messages inside the form
    form.querySelectorAll('.mail818-message').forEach(el => el.remove())

    // Remove messages near the form (siblings)
    const parent = form.parentNode
    if (parent) {
      parent.querySelectorAll('.mail818-message').forEach(el => el.remove())
    }

    // Remove any replaced form messages
    document.querySelectorAll('.mail818-message-replaced').forEach(el => {
      el.remove()
    })
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
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