/**
 * Field validation utilities for Mail818 SDK
 */

import type { FieldDefinition } from './types';

export class Validators {
  /**
   * Validate email format
   */
  static email(value: string): boolean {
    if (!value) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Check if value is required and present
   */
  static required(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  /**
   * Validate against regex pattern
   */
  static pattern(value: string, pattern: string): boolean {
    if (!value) return true; // Empty is valid unless required
    try {
      return new RegExp(pattern).test(value);
    } catch {
      console.error(`Invalid regex pattern: ${pattern}`);
      return false;
    }
  }

  /**
   * Validate minimum length
   */
  static minLength(value: string, min: number): boolean {
    if (!value) return true; // Empty is valid unless required
    return value.length >= min;
  }

  /**
   * Validate maximum length
   */
  static maxLength(value: string, max: number): boolean {
    if (!value) return true; // Empty is valid unless required
    return value.length <= max;
  }

  /**
   * Validate minimum numeric value
   */
  static min(value: number | string, min: number): boolean {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return false;
    return num >= min;
  }

  /**
   * Validate maximum numeric value
   */
  static max(value: number | string, max: number): boolean {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return false;
    return num <= max;
  }

  /**
   * Validate field based on its definition
   */
  static validateField(field: FieldDefinition, value: unknown): string[] {
    const errors: string[] = [];

    // Check required
    if (field.required && !this.required(value)) {
      errors.push(field.validation?.message || `${field.label} is required`);
      return errors; // No point checking other validations
    }

    // Skip other validations if empty and not required
    if (!field.required && !this.required(value)) {
      return errors;
    }

    const stringValue = String(value);

    // Type-specific validation
    switch (field.type) {
      case 'email':
        if (!this.email(stringValue)) {
          errors.push(field.validation?.message || 'Please enter a valid email address');
        }
        break;

      case 'number':
        const numValue = parseFloat(stringValue);
        if (isNaN(numValue)) {
          errors.push(field.validation?.message || 'Please enter a valid number');
        } else {
          if (field.validation?.min !== undefined && !this.min(numValue, field.validation.min)) {
            errors.push(`Minimum value is ${field.validation.min}`);
          }
          if (field.validation?.max !== undefined && !this.max(numValue, field.validation.max)) {
            errors.push(`Maximum value is ${field.validation.max}`);
          }
        }
        break;

      case 'text':
      case 'textarea':
        if (field.validation?.pattern && !this.pattern(stringValue, field.validation.pattern)) {
          errors.push(field.validation.message || 'Invalid format');
        }
        if (field.validation?.minLength && !this.minLength(stringValue, field.validation.minLength)) {
          errors.push(`Minimum length is ${field.validation.minLength} characters`);
        }
        if (field.validation?.maxLength && !this.maxLength(stringValue, field.validation.maxLength)) {
          errors.push(`Maximum length is ${field.validation.maxLength} characters`);
        }
        break;

      case 'select':
      case 'radio':
        if (field.validation?.options) {
          const validValues = field.validation.options.map(opt => opt.value);
          if (!validValues.includes(stringValue)) {
            errors.push(field.validation.message || 'Please select a valid option');
          }
        }
        break;

      case 'date':
        const date = new Date(stringValue);
        if (isNaN(date.getTime())) {
          errors.push(field.validation?.message || 'Please enter a valid date');
        }
        break;
    }

    return errors;
  }

  /**
   * Check for common disposable email domains
   */
  static isDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'tempmail.com',
      'throwaway.email',
      'guerrillamail.com',
      'mailinator.com',
      '10minutemail.com',
      'trashmail.com'
      // Add more as needed
    ];

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    return disposableDomains.some(d => domain === d || domain.endsWith(`.${d}`));
  }

  /**
   * Validate ULID format
   */
  static isValidULID(value: string): boolean {
    return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
  }
}