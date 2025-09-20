<template>
  <div class="newsletter-form">
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    
    <!-- Success Message -->
    <div v-if="state.isSuccess" class="alert alert-success">
      <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
      </svg>
      {{ successMessage }}
    </div>
    
    <!-- Error Message -->
    <div v-if="state.errorMessage" class="alert alert-error">
      <svg class="icon" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
      </svg>
      {{ state.errorMessage }}
    </div>
    
    <form @submit.prevent="handleSubmit" novalidate>
      <!-- Email Field -->
      <div class="form-group">
        <label for="email">
          Email Address
          <span class="required">*</span>
        </label>
        <input
          id="email"
          v-model="formData.email"
          type="email"
          placeholder="you@example.com"
          :disabled="state.isSubmitting"
          :class="{ error: errors.email }"
          @blur="validateEmail"
          required
        />
        <span v-if="errors.email" class="error-message">
          {{ errors.email }}
        </span>
      </div>
      
      <!-- Name Field -->
      <div v-if="showNameField" class="form-group">
        <label for="name">Name</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          placeholder="John Doe"
          :disabled="state.isSubmitting"
          :class="{ error: errors.name }"
        />
        <span v-if="errors.name" class="error-message">
          {{ errors.name }}
        </span>
      </div>
      
      <!-- Message Field -->
      <div v-if="showMessageField" class="form-group">
        <label for="message">Message</label>
        <textarea
          id="message"
          v-model="formData.message"
          :rows="4"
          placeholder="Tell us what interests you..."
          :disabled="state.isSubmitting"
          :class="{ error: errors.message }"
        />
        <span v-if="errors.message" class="error-message">
          {{ errors.message }}
        </span>
      </div>
      
      <!-- Honeypot (hidden) -->
      <div style="position: absolute; left: -5000px;">
        <input
          v-model="formData.honeypot"
          type="text"
          name="honeypot"
          tabindex="-1"
          autocomplete="off"
        />
      </div>
      
      <!-- Submit Button -->
      <button
        type="submit"
        :disabled="state.isSubmitting"
        class="btn btn-primary"
      >
        <span v-if="state.isSubmitting" class="spinner"></span>
        {{ state.isSubmitting ? 'Subscribing...' : buttonText }}
      </button>
    </form>
  </div>
</template>

<script>
/**
 * Vue 3 Composition API Example for Mail818 SDK
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { Mail818Client, Mail818ValidationError, Mail818RateLimitError } from '@mail818/sdk'

export default {
  name: 'Mail818Form',
  
  props: {
    apiKey: {
      type: String,
      required: true
    },
    projectId: {
      type: String,
      required: true
    },
    title: {
      type: String,
      default: 'Subscribe to Our Newsletter'
    },
    description: {
      type: String,
      default: 'Get the latest updates delivered to your inbox.'
    },
    buttonText: {
      type: String,
      default: 'Subscribe'
    },
    successMessage: {
      type: String,
      default: 'Thank you for subscribing! Check your email for confirmation.'
    },
    showNameField: {
      type: Boolean,
      default: true
    },
    showMessageField: {
      type: Boolean,
      default: true
    },
    resetOnSuccess: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: Object,
      default: () => ({})
    }
  },
  
  emits: ['success', 'error'],
  
  setup(props, { emit }) {
    // Initialize Mail818 client
    const client = new Mail818Client(props.apiKey, {
      projectId: props.projectId
    })
    
    // Form data
    const formData = reactive({
      email: '',
      name: '',
      message: '',
      honeypot: ''
    })
    
    // Form state
    const state = reactive({
      isSubmitting: false,
      isSuccess: false,
      errorMessage: ''
    })
    
    // Validation errors
    const errors = reactive({
      email: '',
      name: '',
      message: ''
    })
    
    // Validate email field
    const validateEmail = () => {
      errors.email = ''
      
      if (!formData.email) {
        errors.email = 'Email is required'
        return false
      }
      
      // Use Mail818's built-in email validation
      if (!client.isValidEmail || !client.isValidEmail(formData.email)) {
        // Fallback regex if method not available
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          errors.email = 'Please enter a valid email address'
          return false
        }
      }
      
      return true
    }
    
    // Validate all fields
    const validateForm = () => {
      let isValid = validateEmail()
      
      // Validate name
      if (props.showNameField && formData.name.length > 100) {
        errors.name = 'Name must be less than 100 characters'
        isValid = false
      }
      
      // Validate message
      if (props.showMessageField && formData.message.length > 500) {
        errors.message = 'Message must be less than 500 characters'
        isValid = false
      }
      
      return isValid
    }
    
    // Handle form submission
    const handleSubmit = async () => {
      // Clear previous messages
      state.errorMessage = ''
      state.isSuccess = false
      
      // Validate form
      if (!validateForm()) {
        return
      }
      
      // Check honeypot
      if (formData.honeypot) {
        console.warn('Honeypot field filled - potential spam')
        return
      }
      
      state.isSubmitting = true
      
      try {
        // Prepare submission data
        const submission = {
          email: formData.email.trim(),
          name: props.showNameField && formData.name ? formData.name.trim() : undefined,
          message: props.showMessageField && formData.message ? formData.message.trim() : undefined,
          metadata: {
            ...props.metadata,
            source: 'vue-component',
            page: window.location.pathname,
            timestamp: new Date().toISOString()
          }
        }
        
        // Submit to Mail818
        const response = await client.submit(submission)
        
        if (response.success) {
          state.isSuccess = true
          emit('success', response)
          
          // Reset form if configured
          if (props.resetOnSuccess) {
            resetForm()
          }
          
          // Hide success message after 5 seconds
          setTimeout(() => {
            state.isSuccess = false
          }, 5000)
          
          // Track analytics if available
          if (window.gtag) {
            window.gtag('event', 'newsletter_signup', {
              event_category: 'engagement',
              event_label: 'vue-form'
            })
          }
        } else {
          state.errorMessage = response.message || 'Submission failed. Please try again.'
          emit('error', response)
        }
      } catch (error) {
        // Handle specific error types
        if (error instanceof Mail818ValidationError) {
          errors[error.field || 'email'] = error.message
          state.errorMessage = `Validation error: ${error.message}`
        } else if (error instanceof Mail818RateLimitError) {
          state.errorMessage = `Too many attempts. Please try again in ${error.retryAfter} seconds.`
        } else if (error.code === 'NETWORK_ERROR') {
          state.errorMessage = 'Network error. Please check your connection and try again.'
        } else {
          state.errorMessage = error.message || 'An unexpected error occurred.'
        }
        
        emit('error', error)
        console.error('Mail818 submission error:', error)
      } finally {
        state.isSubmitting = false
      }
    }
    
    // Reset form
    const resetForm = () => {
      formData.email = ''
      formData.name = ''
      formData.message = ''
      formData.honeypot = ''
      errors.email = ''
      errors.name = ''
      errors.message = ''
    }
    
    // Clear error message when user starts typing
    const clearError = (field) => {
      errors[field] = ''
      if (state.errorMessage) {
        state.errorMessage = ''
      }
    }
    
    return {
      formData,
      state,
      errors,
      handleSubmit,
      validateEmail,
      resetForm,
      clearError
    }
  }
}
</script>

<style scoped>
.newsletter-form {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

p {
  margin: 0 0 1.5rem;
  color: #6b7280;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #ef4444;
}

input,
textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  transition: border-color 0.15s;
}

input:focus,
textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

input.error,
textarea.error {
  border-color: #ef4444;
}

input:disabled,
textarea:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.error-message {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #ef4444;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #2563eb;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  border: 2px solid #ffffff30;
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.alert {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.alert .icon {
  width: 1.25rem;
  height: 1.25rem;
  margin-right: 0.5rem;
  flex-shrink: 0;
}

.alert-success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #a7f3d0;
}

.alert-error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}
</style>