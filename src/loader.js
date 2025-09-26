/**
 * Mail818 Loader Script - collect.js
 * This lightweight script loads and initializes all Mail818 forms for an organization.
 * It uses an organization key to fetch all sources configured for the current domain.
 */

(function() {
  'use strict';

  // Configuration - use environment variables that get replaced at build time
  const CDN_BASE = import.meta.env.VITE_CDN_BASE !== undefined ? import.meta.env.VITE_CDN_BASE : 'https://cdn.mail818.com';
  const API_BASE = import.meta.env.VITE_API_BASE !== undefined ? import.meta.env.VITE_API_BASE : 'https://api.mail818.com';
  const SDK_VERSION = import.meta.env.VITE_SDK_VERSION !== undefined ? import.meta.env.VITE_SDK_VERSION : 'latest';
  const SDK_PATH = import.meta.env.VITE_SDK_PATH !== undefined ? import.meta.env.VITE_SDK_PATH : '/';

  // Find the script tag with organization key attribute
  const scriptTag = document.querySelector('script[data-mail818-id]');
  if (!scriptTag) {
    console.warn('Mail818: No script tag found with data-mail818-id attribute');
    return;
  }

  const organizationKey = scriptTag.getAttribute('data-mail818-id');
  if (!organizationKey) {
    console.error('Mail818: data-mail818-id attribute is empty');
    return;
  }

  // Validate organization key format (should be a ULID)
  if (!/^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{26}$/.test(organizationKey)) {
    console.error('Mail818: Invalid organization key format:', organizationKey);
    return;
  }

  // Check if already initialized for this organization key
  const namespace = 'mail818_' + organizationKey;
  if (window[namespace]) {
    return; // Already initialized
  }

  // Mark as initializing
  window[namespace] = { status: 'loading' };

  // Fetch all source configurations for this organization key
  // The API will determine the domain from the Referer header
  fetchSourcesConfig(organizationKey)
    .then(function(sources) {
      // Load the main SDK if not already loaded
      return loadSDK().then(function() {
        return sources;
      });
    })
    .then(function(sources) {
      // Initialize form enhancement for each source
      if (window.Mail818 && window.Mail818.enhanceForm) {
        sources.forEach(function(source) {
          const enhanceConfig = {
            type: 'native_form', // Always native_form for now
            organizationKey: organizationKey, // Pass the organization key
            sourceId: source.sourceId, // Use the new property name
            // API configuration
            apiUrl: API_BASE,
            apiEndpoint: API_BASE + '/v1/collect',
            formSelector: source.selector || 'form[data-mail818]',
            // Success behavior from source config
            successBehavior: source.successBehavior || 'message',
            successMessage: source.successMessage,
            successRedirectUrl: source.successRedirectUrl,
            successCallbackFn: source.successCallbackFn,
            // Features from source config
            offlineEnabled: source.offlineEnabled || false,
            showLoadingState: source.showLoadingState || false,
            replaceOnSuccess: source.replaceOnSuccess || false,
            // Validation - rules array determines if validation is enabled
            validationRules: source.validationRules || []
          };

          // Enhance forms matching this source's selector
          window.Mail818.enhanceForm(enhanceConfig);
        });

        window[namespace].status = 'ready';
        window[namespace].sources = sources;

        // Fire custom event
        const event = new CustomEvent('mail818:ready', {
          detail: { organizationKey, sources, domain: window.location.hostname }
        });
        document.dispatchEvent(event);
      } else {
        throw new Error('Mail818 SDK not loaded properly');
      }
    })
    .catch(function(error) {
      console.error('Mail818: Failed to initialize:', error);
      window[namespace].status = 'error';
      window[namespace].error = error.message;

      // Fire error event
      const event = new CustomEvent('mail818:error', {
        detail: { organizationKey, error: error.message }
      });
      document.dispatchEvent(event);
    });

  /**
   * Fetch all source configurations for this organization key
   * The API will use the Referer header to determine the domain
   */
  function fetchSourcesConfig(organizationKey) {
    return fetch(API_BASE + '/v1/sources/' + organizationKey + '/config', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })
    .then(function(response) {
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No sources configured for this domain');
        }
        throw new Error('Failed to fetch configuration: ' + response.status);
      }
      return response.json();
    })
    .then(function(data) {
      // Return the sources array from the response
      return data.sources || [];
    });
  }

  /**
   * Load the main Mail818 SDK
   */
  function loadSDK() {
    // Check if SDK is already loaded
    if (window.Mail818) {
      return Promise.resolve();
    }

    // Check if SDK is currently loading
    if (window.mail818SDKLoading) {
      return window.mail818SDKLoading;
    }

    // Create loading promise
    window.mail818SDKLoading = new Promise(function(resolve, reject) {
      // Load JavaScript SDK
      const script = document.createElement('script');
      script.async = true;
      script.src = CDN_BASE ? CDN_BASE + '/' + SDK_VERSION + '/mail818.min.js' : SDK_PATH + SDK_VERSION + '/mail818.min.js';

      script.onload = function() {
        // Give a small delay for the SDK to initialize
        setTimeout(function() {
          if (window.Mail818 && window.Mail818.enhanceForm) {
            resolve();
          } else {
            console.error('Mail818 SDK not properly initialized');
            reject(new Error('Mail818 SDK loaded but not available'));
          }
        }, 100); // Increased timeout
      };

      script.onerror = function() {
        reject(new Error('Failed to load Mail818 SDK'));
      };

      document.head.appendChild(script);
    });

    return window.mail818SDKLoading;
  }

})();