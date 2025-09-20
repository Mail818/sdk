/**
 * Core type definitions for Mail818 SDK
 */

export type FieldType = 
  | 'text' 
  | 'email' 
  | 'number' 
  | 'date' 
  | 'checkbox' 
  | 'select' 
  | 'radio' 
  | 'textarea' 
  | 'hidden';

export interface FieldValidation {
  pattern?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  options?: Array<{
    value: string;
    label: string;
  }>;
  message?: string;
}

export interface FieldDefinition {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  helpText?: string;
  validation?: FieldValidation;
  defaultValue?: unknown;
}

export interface ListConfig {
  listId: string;
  name: string;
  count?: {
    exact?: number;
    range?: string;
  };
  fields: FieldDefinition[];
}

export interface Mail818Options {
  listId: string;
  apiToken: string;
  hostname?: string;
  cache?: {
    enabled: boolean;
    ttl: number;
    storage: 'localStorage' | 'sessionStorage';
  };
  offline?: {
    enabled: boolean;
    queueSubmissions: boolean;
    retryOnReconnect: boolean;
  };
  testMode?: boolean;
  mockConfig?: ListConfig;
  onConfigLoaded?: (config: ListConfig) => void;
  onSuccess?: (response: SubmissionResponse) => void;
  onError?: (error: Mail818Error) => void;
  onValidationError?: (errors: Record<string, string>) => void;
}

export interface SubmissionData {
  listId: string;
  email: string;
  fields?: Record<string, unknown>;
}

export interface SubmissionResponse {
  success: boolean;
  message?: string;
  data?: {
    count?: {
      exact?: number;
      range?: string;
    };
  };
}

export interface Mail818Error {
  error: string;
  message?: string;
  details?: Record<string, string>;
}

export type TokenPermission = 'read:list' | 'write:submissions';

/**
 * Mail818 SDK configuration
 */
export interface Mail818Config {
  apiKey: string;
  apiUrl?: string;
  testMode?: boolean;
}

/**
 * Native Forms types
 */
export interface FormConfiguration {
  id: string;
  sourceId: string;
  fieldMappings: FieldMapping[];
  validationEnabled?: boolean;
  validationRules: ValidationRule[];
  successBehavior: 'message' | 'redirect' | 'callback';
  successMessage: string;
  successRedirectUrl?: string;
  successCallbackFn?: string;
  formSelectors?: string;
  detectDelay: number;
  offlineEnabled: boolean;
  cacheTimeout: number;
  allowedOrigins: string[];
  replaceOnSuccess: boolean;
  showLoadingState: boolean;
}

export interface FieldMapping {
  htmlField: string;
  mail818Field: string;
  required: boolean;
  validation?: string;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'pattern' | 'min_length' | 'max_length' | 'custom';
  value?: string | number;
  message: string;
}