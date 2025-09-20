import './styles.css';

export { Mail818Form } from './form';
export { Mail818Stats } from './stats';
export { ApiClient } from './api-client';
export { Validators } from './validators';
export { NativeForms, initNativeForms, type NativeFormOptions } from './native-forms';
export * from './types';

// Import the type for use in this file
import type { NativeFormOptions } from './native-forms';

// Define types for window instances and enhance options
interface WindowInstances {
  nativeForms: InstanceType<typeof NativeForms> | null;
}

interface EnhanceFormOptions extends Record<string, unknown> {
  type?: string;
  sourceId?: string;
  apiKey?: string;
}

declare global {
  interface Window {
    __mail818Instances?: WindowInstances;
  }
}

// Export the enhanceForm function for module usage
export function enhanceForm(options: EnhanceFormOptions) {
  const formType = options.type || 'native_form';

  switch (formType) {
    case 'native_form':
      if (typeof window !== 'undefined') {
        const instances = window.__mail818Instances || { nativeForms: null };
        if (!instances.nativeForms) {
          instances.nativeForms = new NativeForms(options as NativeFormOptions);
          instances.nativeForms.init();
          window.__mail818Instances = instances;
        }
      }
      break;
    default:
      console.warn(`Unknown form type: ${formType}, defaulting to native_form`);
      if (typeof window !== 'undefined') {
        const instances = window.__mail818Instances || { nativeForms: null };
        if (!instances.nativeForms) {
          instances.nativeForms = new NativeForms(options as NativeFormOptions);
          instances.nativeForms.init();
          window.__mail818Instances = instances;
        }
      }
  }
}

// Import classes for browser globals
import { Mail818Form } from './form';
import { Mail818Stats } from './stats';
import { NativeForms, initNativeForms } from './native-forms';

// Extend Window interface for browser globals
declare global {
  interface Window {
    Mail818Form: typeof Mail818Form;
    Mail818Stats: typeof Mail818Stats;
    Mail818NativeForms: typeof NativeForms;
    Mail818: {
      Form: typeof Mail818Form;
      Stats: typeof Mail818Stats;
      NativeForms: typeof NativeForms;
      initNativeForms: typeof initNativeForms;
      enhanceForm: typeof enhanceForm;
    };
  }
}

// Browser global exports
if (typeof window !== 'undefined') {
  window.Mail818Form = Mail818Form;
  window.Mail818Stats = Mail818Stats;
  window.Mail818NativeForms = NativeForms;

  // Use the exported enhanceForm function
  window.Mail818 = {
    Form: Mail818Form,
    Stats: Mail818Stats,
    NativeForms: NativeForms,
    initNativeForms,
    enhanceForm
  };
}