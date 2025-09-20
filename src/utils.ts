/**
 * Utility functions for Mail818 SDK
 */

/**
 * Generate a ULID
 * In production, use a proper ULID library like @ulid/ulid
 */
export function generateULID(): string {
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  const TIME_MAX = Math.pow(2, 48) - 1;
  const RANDOM_LEN = 16;

  const now = Date.now();
  if (now > TIME_MAX) {
    throw new Error('ULID timestamp too large');
  }

  // Encode timestamp (10 chars)
  let timestamp = '';
  let time = now;
  for (let i = 9; i >= 0; i--) {
    const mod = time % 32;
    timestamp = ENCODING[mod] + timestamp;
    time = Math.floor(time / 32);
  }

  // Generate random component (16 chars)
  let random = '';
  for (let i = 0; i < RANDOM_LEN; i++) {
    random += ENCODING[Math.floor(Math.random() * 32)];
  }

  return timestamp + random;
}

/**
 * Debounce function execution
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>) {
    const context = this;

    if (timeout !== null) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(context, args);
      timeout = null;
    }, wait);
  };
}

/**
 * Throttle function execution
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return function (this: unknown, ...args: Parameters<T>) {
    const context = this;

    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Deep merge objects
 */
export function deepMerge<T extends Record<string, unknown>>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
}

/**
 * Check if value is plain object
 */
function isObject(item: unknown): item is Record<string, unknown> {
  return !!item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Create element with attributes
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes?: Record<string, string>,
  children?: (HTMLElement | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        (element as Record<string, unknown>)[key] = value;
      }
    });
  }

  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }

  return element;
}

/**
 * Parse form data to object
 */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const object: Record<string, unknown> = {};

  formData.forEach((value, key) => {
    // Handle nested field names like fields[firstName]
    if (key.includes('[') && key.includes(']')) {
      const matches = key.match(/^([^\[]+)\[([^\]]+)\]$/);
      if (matches) {
        const [, parent, child] = matches;
        if (!object[parent]) {
          object[parent] = {};
        }
        (object[parent] as Record<string, unknown>)[child] = value;
      }
    } else {
      // Handle multiple values for same key (like checkboxes)
      if (object[key]) {
        if (Array.isArray(object[key])) {
          (object[key] as unknown[]).push(value);
        } else {
          object[key] = [object[key], value];
        }
      } else {
        object[key] = value;
      }
    }
  });

  return object;
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

/**
 * Set cookie with options
 */
export function setCookie(
  name: string,
  value: string,
  options: {
    expires?: Date;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  } = {}
): void {
  let cookie = `${name}=${value}`;

  if (options.expires) {
    cookie += `; expires=${options.expires.toUTCString()}`;
  }
  if (options.path) {
    cookie += `; path=${options.path}`;
  }
  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }
  if (options.secure) {
    cookie += '; secure';
  }
  if (options.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }

  document.cookie = cookie;
}

/**
 * Check if browser supports required features
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (!window.fetch) missing.push('fetch');
  if (!window.Promise) missing.push('Promise');
  if (!window.localStorage) missing.push('localStorage');
  if (!window.FormData) missing.push('FormData');

  return {
    supported: missing.length === 0,
    missing
  };
}