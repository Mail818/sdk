# Mail818 SDK API Reference

## Table of Contents
- [Mail818Form](#mail818form)
- [Mail818Stats](#mail818stats)
- [ApiClient](#apiclient)
- [Types](#types)
- [Field Types](#field-types)
- [Examples](#examples)

## Mail818Form

The main class for creating and managing email collection forms.

### Constructor

```typescript
new Mail818Form(selector: string | HTMLElement, options: Mail818Options)
```

**Parameters:**
- `selector` - CSS selector string or HTMLElement to contain the form
- `options` - Configuration options for the form

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| projectId | string | Yes | Your project ID (ULID format, 26 characters) |
| apiToken | string | Yes | API token with appropriate permissions |
| hostname | string | No | API endpoint (default: https://api.mail818.com) |
| cache | CacheOptions | No | Cache configuration |
| offline | OfflineOptions | No | Offline queue configuration |
| testMode | boolean | No | Enable test mode (skips API calls) |
| mockConfig | ProjectConfig | No | Mock configuration for testing |
| onConfigLoaded | function | No | Callback when project config is loaded |
| onSuccess | function | No | Success callback |
| onError | function | No | Error callback |
| onValidationError | function | No | Validation error callback |

#### Cache Options

```typescript
interface CacheOptions {
  enabled: boolean;        // Enable/disable caching
  ttl: number;            // Time to live in milliseconds
  storage: 'localStorage' | 'sessionStorage';
}
```

#### Offline Options

```typescript
interface OfflineOptions {
  enabled: boolean;           // Enable offline support
  queueSubmissions: boolean;  // Queue submissions when offline
  retryOnReconnect: boolean; // Retry queued submissions when back online
}
```

### Methods

#### initialize()

```typescript
async initialize(): Promise<void>
```

Initialize the form by loading configuration and rendering fields. This method:
- Fetches project configuration from the API
- Renders form fields based on the configuration
- Sets up form validation and submission handlers
- Applies styling and event listeners

**Example:**
```javascript
const form = new Mail818Form('#newsletter-form', {
  projectId: '01K3KDM5EM74T5QHGY38FTXK61',
  apiToken: 'your_api_token'
});

await form.initialize();
```

#### submit()

```typescript
async submit(data?: Record<string, unknown>): Promise<SubmissionResponse>
```

Programmatically submit the form with optional data override.

**Example:**
```javascript
const result = await form.submit({
  email: 'user@example.com',
  fields: { name: 'John Doe' }
});
```

#### validate()

```typescript
validate(): { isValid: boolean; errors: Record<string, string> }
```

Validate the current form data without submitting.

#### reset()

```typescript
reset(): void
```

Reset the form to its initial state, clearing all field values and error messages.

#### destroy()

```typescript
destroy(): void
```

Clean up the form instance, removing event listeners and DOM elements.

### Static Methods

#### autoInit()

```typescript
static autoInit(options?: { 
  selector?: string; 
  defaultToken?: string 
}): void
```

Auto-initialize all forms on the page that have `data-mail818-*` attributes.

**HTML Attributes:**
- `data-mail818-project` - Project ID
- `data-mail818-token` - API token
- `data-mail818-hostname` - Custom API hostname (optional)

**Example:**
```html
<div data-mail818-project="01K3KDM5EM74T5QHGY38FTXK61" 
     data-mail818-token="your_api_token">
  <form class="mail818-form">
    <div class="mail818-fields"></div>
    <button type="submit">Subscribe</button>
  </form>
  <div class="mail818-message"></div>
</div>

<script>
  Mail818Form.autoInit();
</script>
```

## Mail818Stats

Class for displaying project statistics and subscription counts.

### Constructor

```typescript
new Mail818Stats(selector: string | HTMLElement, options: StatsOptions)
```

### Options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| projectId | string | Yes | Your project ID |
| apiToken | string | Yes | API token with read permissions |
| hostname | string | No | API endpoint |
| display | 'count-only' \| 'with-label' | No | Display format (default: 'count-only') |
| refreshInterval | number | No | Auto-refresh interval in milliseconds |
| formatNumber | function | No | Custom number formatting function |

### Methods

#### initialize()

```typescript
async initialize(): Promise<void>
```

Load and display statistics.

#### refresh()

```typescript
async refresh(): Promise<void>
```

Manually refresh the displayed statistics.

#### stopAutoUpdate()

```typescript
stopAutoUpdate(): void
```

Stop automatic updates.

#### destroy()

```typescript
destroy(): void
```

Clean up and remove instance.

### Static Methods

#### init()

```typescript
static init(options?: { selector?: string }): void
```

Auto-initialize all stats displays with `data-mail818-display` attribute.

**Example:**
```html
<div data-mail818-display="count-only"
     data-mail818-project="01K3KDM5EM74T5QHGY38FTXK61"
     data-mail818-token="read_only_token">
</div>

<script>
  Mail818Stats.init();
</script>
```

## ApiClient

Low-level API client for direct API interactions.

### Constructor

```typescript
new ApiClient(hostname: string, apiToken: string, projectId: string)
```

### Methods

#### fetchProjectConfig()

```typescript
async fetchProjectConfig(): Promise<ProjectConfig | null>
```

Fetch project configuration. Returns `null` if unauthorized.

#### submitForm()

```typescript
async submitForm(data: SubmissionData): Promise<SubmissionResponse>
```

Submit form data to the API.

#### fetchStats()

```typescript
async fetchStats(): Promise<{ count: { exact?: number; range?: string } }>
```

Fetch project statistics.

## Types

### ProjectConfig

```typescript
interface ProjectConfig {
  projectId: string;
  name: string;
  count?: {
    exact?: number;
    range?: string;
  };
  fields: FieldDefinition[];
}
```

### FieldDefinition

```typescript
interface FieldDefinition {
  key: string;           // Field identifier
  label: string;         // Display label
  type: FieldType;       // Field type
  required: boolean;     // Whether field is required
  placeholder?: string;  // Placeholder text
  helpText?: string;     // Help text
  validation?: FieldValidation;
  defaultValue?: unknown;
}
```

### FieldValidation

```typescript
interface FieldValidation {
  pattern?: string;      // Regex pattern
  min?: number;         // Minimum value (for number/date)
  max?: number;         // Maximum value (for number/date)
  minLength?: number;   // Minimum length (for text)
  maxLength?: number;   // Maximum length (for text)
  options?: Array<{     // Options for select/radio
    value: string;
    label: string;
  }>;
  message?: string;     // Custom validation message
}
```

### SubmissionData

```typescript
interface SubmissionData {
  projectId: string;
  email: string;
  fields?: Record<string, unknown>;
}
```

### SubmissionResponse

```typescript
interface SubmissionResponse {
  success: boolean;
  message?: string;
  data?: {
    count?: {
      exact?: number;
      range?: string;
    };
  };
}
```

## Field Types

The SDK supports the following field types:

| Type | HTML Element | Description |
|------|-------------|-------------|
| `text` | `<input type="text">` | Single-line text input |
| `email` | `<input type="email">` | Email address input with validation |
| `number` | `<input type="number">` | Numeric input |
| `date` | `<input type="date">` | Date picker |
| `checkbox` | `<input type="checkbox">` | Single checkbox |
| `select` | `<select>` | Dropdown selection |
| `radio` | `<input type="radio">` | Radio button group |
| `textarea` | `<textarea>` | Multi-line text input |
| `hidden` | `<input type="hidden">` | Hidden field |

### Field Type Examples

#### Text Field
```javascript
{
  key: 'full_name',
  label: 'Full Name',
  type: 'text',
  required: true,
  placeholder: 'Enter your full name',
  validation: {
    minLength: 2,
    maxLength: 50
  }
}
```

#### Email Field
```javascript
{
  key: 'email',
  label: 'Email Address',
  type: 'email',
  required: true,
  placeholder: 'Enter your email'
}
```

#### Select Field
```javascript
{
  key: 'country',
  label: 'Country',
  type: 'select',
  required: true,
  validation: {
    options: [
      { value: 'us', label: 'United States' },
      { value: 'uk', label: 'United Kingdom' },
      { value: 'ca', label: 'Canada' }
    ]
  }
}
```

#### Radio Field
```javascript
{
  key: 'subscription_type',
  label: 'Subscription Type',
  type: 'radio',
  required: true,
  validation: {
    options: [
      { value: 'weekly', label: 'Weekly Newsletter' },
      { value: 'monthly', label: 'Monthly Newsletter' }
    ]
  }
}
```

## Examples

### Basic Form

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@mail818/sdk/dist/mail818.min.css">
</head>
<body>
  <div id="newsletter-form"></div>
  
  <script src="https://cdn.jsdelivr.net/npm/@mail818/sdk/dist/mail818.min.js"></script>
  <script>
    const form = new Mail818Form('#newsletter-form', {
      projectId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'your_api_token'
    });
    
    form.initialize();
  </script>
</body>
</html>
```

### Auto-initialization

```html
<div data-mail818-project="01K3KDM5EM74T5QHGY38FTXK61" 
     data-mail818-token="your_api_token">
  <form class="mail818-form">
    <div class="mail818-fields"></div>
    <button type="submit">Subscribe</button>
  </form>
  <div class="mail818-message"></div>
</div>

<script>
  // Auto-initialize all forms
  Mail818Form.autoInit();
</script>
```

### Progressive Enhancement

```html
<!-- Static HTML form -->
<form id="existing-form">
  <input type="email" name="email" required>
  <input type="text" name="fields[name]" placeholder="Your name">
  <button type="submit">Subscribe</button>
</form>

<script>
  // Enhance existing form
  const form = new Mail818Form('#existing-form', {
    projectId: '01K3KDM5EM74T5QHGY38FTXK61',
    apiToken: 'your_api_token'
  });
  
  form.initialize();
</script>
```

### With Callbacks

```javascript
const form = new Mail818Form('#newsletter', {
  projectId: '01K3KDM5EM74T5QHGY38FTXK61',
  apiToken: 'your_api_token',
  onSuccess: (response) => {
    console.log('Subscription successful!', response);
    // Custom success handling
  },
  onError: (error) => {
    console.error('Submission failed:', error);
    // Custom error handling
  },
  onValidationError: (errors) => {
    console.log('Validation errors:', errors);
    // Custom validation error handling
  }
});

form.initialize();
```

### Caching and Offline Support

```javascript
const form = new Mail818Form('#newsletter', {
  projectId: '01K3KDM5EM74T5QHGY38FTXK61',
  apiToken: 'your_api_token',
  cache: {
    enabled: true,
    ttl: 60000,  // 1 minute
    storage: 'localStorage'
  },
  offline: {
    enabled: true,
    queueSubmissions: true,
    retryOnReconnect: true
  }
});

form.initialize();
```

### Stats Display

```html
<p>Join <span data-mail818-display="count-only"
              data-mail818-project="01K3KDM5EM74T5QHGY38FTXK61"
              data-mail818-token="read_only_token">
    --
  </span> subscribers!</p>

<script>
  Mail818Stats.init();
</script>
```

### React Integration

```jsx
import { useEffect, useRef } from 'react';
import { Mail818Form } from '@mail818/sdk';

function NewsletterForm() {
  const formRef = useRef(null);
  const mail818Ref = useRef(null);

  useEffect(() => {
    if (formRef.current && !mail818Ref.current) {
      mail818Ref.current = new Mail818Form(formRef.current, {
        projectId: '01K3KDM5EM74T5QHGY38FTXK61',
        apiToken: 'your_api_token',
        onSuccess: (response) => {
          console.log('Success:', response);
        }
      });
      
      mail818Ref.current.initialize();
    }

    return () => {
      if (mail818Ref.current) {
        mail818Ref.current.destroy();
      }
    };
  }, []);

  return <div ref={formRef} />;
}
```

### Vue Integration

```vue
<template>
  <div ref="formContainer"></div>
</template>

<script>
import { Mail818Form } from '@mail818/sdk';

export default {
  mounted() {
    this.form = new Mail818Form(this.$refs.formContainer, {
      projectId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'your_api_token'
    });
    
    this.form.initialize();
  },
  
  beforeUnmount() {
    if (this.form) {
      this.form.destroy();
    }
  }
};
</script>
```

## Error Handling

The SDK provides comprehensive error handling through callbacks and return values:

```javascript
const form = new Mail818Form('#form', {
  projectId: '01K3KDM5EM74T5QHGY38FTXK61',
  apiToken: 'your_api_token',
  onError: (error) => {
    switch (error.error) {
      case 'network_error':
        // Handle network issues
        break;
      case 'validation_error':
        // Handle validation failures
        break;
      case 'rate_limit_exceeded':
        // Handle rate limiting
        break;
      default:
        // Handle other errors
    }
  }
});
```

## Browser Support

The SDK supports all modern browsers:
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

For older browsers, include polyfills for:
- fetch API
- Promise
- Object.assign
- Array.from

## Security Considerations

- Use appropriate API tokens with minimal required permissions
- Read-only tokens for stats display
- Write-only tokens for form submissions
- Never expose full-access tokens in client-side code
- Implement CSRF protection in your backend
- Validate all data server-side regardless of client validation

## Performance Tips

1. **Caching**: Enable caching to reduce API calls for project configuration
2. **Lazy Loading**: Initialize forms only when needed (e.g., on scroll into view)
3. **Bundle Size**: Use tree-shaking to include only needed components
4. **Offline Support**: Queue submissions when offline for better user experience
5. **Validation**: Use client-side validation to reduce server load

## Migration Guide

### From v0.x to v1.x

1. Update constructor parameters:
   ```javascript
   // Old
   new Mail818Form('#form', 'project_id', 'api_token');
   
   // New
   new Mail818Form('#form', {
     projectId: 'project_id',
     apiToken: 'api_token'
   });
   ```

2. Callback changes:
   ```javascript
   // Old
   form.onSuccess = (response) => { ... };
   
   // New
   const form = new Mail818Form('#form', {
     onSuccess: (response) => { ... }
   });
   ```

3. Method renames:
   - `init()` → `initialize()`
   - `cleanup()` → `destroy()`

## Support

For support and questions:
- Documentation: https://docs.mail818.com
- Issues: https://github.com/mail818/sdk/issues
- Email: support@mail818.com