/**
 * React Component Example for Mail818 SDK
 * 
 * This example shows how to integrate Mail818 into a React application
 * with proper TypeScript typing, error handling, and loading states.
 */

import React, { useState, FormEvent } from 'react'
import { 
  Mail818Client, 
  Mail818ValidationError,
  Mail818RateLimitError,
  Mail818NetworkError,
  type EmailSubmission 
} from '@mail818/sdk'

// Initialize client (you can also do this in a context provider)
const client = new Mail818Client(process.env.REACT_APP_MAIL818_API_KEY!, {
  listId: process.env.REACT_APP_MAIL818_LIST_ID!
})

interface FormData {
  email: string
  name: string
  message: string
}

interface FormErrors {
  email?: string
  name?: string
  message?: string
}

export const NewsletterForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    message: ''
  })
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!client.isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    if (formData.name && formData.name.length > 100) {
      newErrors.name = 'Name must be less than 100 characters'
    }
    
    if (formData.message && formData.message.length > 500) {
      newErrors.message = 'Message must be less than 500 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }
    
    setIsSubmitting(true)
    setErrorMessage('')
    setIsSuccess(false)
    
    try {
      const submission: EmailSubmission = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        message: formData.message.trim() || undefined,
        metadata: {
          source: 'react-app',
          page: window.location.pathname,
          userAgent: navigator.userAgent
        }
      }
      
      const response = await client.submit(submission)
      
      if (response.success) {
        setIsSuccess(true)
        setFormData({ email: '', name: '', message: '' })
        
        // Optional: Track analytics
        const windowWithGtag = window as unknown as {
          gtag?: (event: string, action: string, params: { event_category: string }) => void
        };
        if (windowWithGtag.gtag) {
          windowWithGtag.gtag('event', 'newsletter_signup', {
            event_category: 'engagement'
          });
        }
      } else {
        setErrorMessage(response.message || 'Submission failed')
      }
    } catch (error) {
      if (error instanceof Mail818ValidationError) {
        setErrors({ [error.field || 'email']: error.message })
      } else if (error instanceof Mail818RateLimitError) {
        setErrorMessage(`Too many attempts. Please try again in ${error.retryAfter} seconds.`)
      } else if (error instanceof Mail818NetworkError) {
        setErrorMessage('Network error. Please check your connection.')
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.')
        console.error('Mail818 error:', error)
      }
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
  }
  
  return (
    <div className="newsletter-form">
      <h3>Subscribe to Our Newsletter</h3>
      <p>Get the latest updates and exclusive content.</p>
      
      {isSuccess && (
        <div className="alert alert-success">
          ✅ Thank you for subscribing! Check your email for confirmation.
        </div>
      )}
      
      {errorMessage && (
        <div className="alert alert-error">
          ❌ {errorMessage}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">
            Email Address <span className="required">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            disabled={isSubmitting}
            className={errors.email ? 'error' : ''}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <span id="email-error" className="error-message">
              {errors.email}
            </span>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="name">Name (optional)</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="John Doe"
            disabled={isSubmitting}
            className={errors.name ? 'error' : ''}
          />
          {errors.name && (
            <span className="error-message">{errors.name}</span>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message (optional)</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Tell us what interests you..."
            disabled={isSubmitting}
            rows={4}
            className={errors.message ? 'error' : ''}
          />
          {errors.message && (
            <span className="error-message">{errors.message}</span>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? (
            <>
              <span className="spinner" /> Subscribing...
            </>
          ) : (
            'Subscribe'
          )}
        </button>
      </form>
    </div>
  )
}

// Example with custom hook
export const useMail818 = (apiKey?: string, listId?: string) => {
  const [client] = useState(() => new Mail818Client(apiKey, { listId }))
  
  const submitEmail = async (email: string, additionalData?: Partial<EmailSubmission>) => {
    try {
      const response = await client.submit({
        email,
        ...additionalData
      })
      return { success: true, data: response }
    } catch (error) {
      return { success: false, error }
    }
  }
  
  return {
    client,
    submitEmail,
    generateId: () => client.generateId()
  }
}