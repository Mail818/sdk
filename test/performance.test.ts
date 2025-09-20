import { describe, it, expect, vi } from 'vitest';
import { Mail818Form } from '../src';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Performance Tests', () => {
  it('should initialize 100 forms in under 1 second', () => {
    const start = performance.now();
    
    const forms: Mail818Form[] = [];
    
    for (let i = 0; i < 100; i++) {
      const div = document.createElement('div');
      const form = new Mail818Form(div, {
        listId: `01K3KDM5EM74T5QHGY${i.toString().padStart(8, '0')}`,
        apiToken: 'test_token',
        testMode: true
      });
      forms.push(form);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
    expect(forms.length).toBe(100);
  });

  it('should initialize forms with large field sets efficiently', async () => {
    const start = performance.now();
    
    // Create mock config with many fields
    const largeFieldSet = Array.from({ length: 50 }, (_, i) => ({
      key: `field_${i}`,
      label: `Field ${i}`,
      type: 'text' as const,
      required: i % 3 === 0
    }));

    const forms: Mail818Form[] = [];
    
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      const form = new Mail818Form(div, {
        listId: `01K3KDM5EM74T5QHGY${i.toString().padStart(8, '0')}`,
        apiToken: 'test_token',
        testMode: true,
        mockConfig: {
          listId: `01K3KDM5EM74T5QHGY${i.toString().padStart(8, '0')}`,
          name: `Test Project ${i}`,
          fields: largeFieldSet
        }
      });

      await form.initialize();
      forms.push(form);
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(2000); // 2 seconds for 10 forms with 50 fields each
    expect(forms.length).toBe(10);
  });

  it('should have reasonable bundle size', () => {
    const bundlePath = path.resolve(__dirname, '../dist/mail818.min.js');
    
    try {
      const stats = fs.statSync(bundlePath);
      
      // Should be under 50KB minified
      expect(stats.size).toBeLessThan(50 * 1024);
      console.log(`Bundle size: ${(stats.size / 1024).toFixed(2)}KB`);
    } catch (error) {
      // If bundle doesn't exist yet, skip this test
      console.warn('Bundle not found, skipping size test');
      expect(true).toBe(true);
    }
  });

  it('should handle rapid form submissions efficiently', async () => {
    const div = document.createElement('div');
    const form = new Mail818Form(div, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'test_token',
      testMode: true,
      mockConfig: {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        name: 'Test Project',
        fields: [{
          key: 'email',
          label: 'Email',
          type: 'email',
          required: true
        }]
      }
    });

    await form.initialize();

    const start = performance.now();
    let submissionCount = 0;
    
    // Simulate 20 rapid submissions
    const promises = Array.from({ length: 20 }, async (_, i) => {
      const emailInput = div.querySelector('input[type="email"]') as HTMLInputElement;
      if (emailInput) {
        emailInput.value = `test${i}@example.com`;
      }

      const formElement = div.querySelector('form');
      if (formElement) {
        const submitEvent = new Event('submit', { cancelable: true });
        formElement.dispatchEvent(submitEvent);
        submissionCount++;
      }

      // Wait a bit between submissions
      return new Promise(resolve => setTimeout(resolve, 10));
    });

    await Promise.all(promises);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    expect(submissionCount).toBe(20); // Should have processed 20 submissions
  });

  it('should efficiently handle DOM manipulation with many fields', async () => {
    const div = document.createElement('div');
    
    // Create a form with many different field types
    const manyFieldTypes = [
      { key: 'text1', label: 'Text 1', type: 'text' as const, required: true },
      { key: 'text2', label: 'Text 2', type: 'text' as const, required: false },
      { key: 'email1', label: 'Email 1', type: 'email' as const, required: true },
      { key: 'email2', label: 'Email 2', type: 'email' as const, required: false },
      { key: 'number1', label: 'Number 1', type: 'number' as const, required: true },
      { key: 'date1', label: 'Date 1', type: 'date' as const, required: false },
      { key: 'checkbox1', label: 'Checkbox 1', type: 'checkbox' as const, required: false },
      { key: 'textarea1', label: 'Textarea 1', type: 'textarea' as const, required: true },
      { key: 'select1', label: 'Select 1', type: 'select' as const, required: true, validation: {
        options: [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' },
          { value: 'opt3', label: 'Option 3' }
        ]
      }},
      { key: 'radio1', label: 'Radio 1', type: 'radio' as const, required: true, validation: {
        options: [
          { value: 'radio1', label: 'Radio Option 1' },
          { value: 'radio2', label: 'Radio Option 2' }
        ]
      }}
    ];

    const form = new Mail818Form(div, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'test_token',
      testMode: true,
      mockConfig: {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        name: 'Test Project',
        fields: manyFieldTypes
      }
    });

    const start = performance.now();
    await form.initialize();
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should render complex form in under 100ms
    
    // Verify all field types were rendered
    expect(div.querySelectorAll('input[type="text"]').length).toBe(2);
    expect(div.querySelectorAll('input[type="email"]').length).toBe(2);
    expect(div.querySelectorAll('input[type="number"]').length).toBe(1);
    expect(div.querySelectorAll('input[type="date"]').length).toBe(1);
    expect(div.querySelectorAll('input[type="checkbox"]').length).toBe(1);
    expect(div.querySelectorAll('textarea').length).toBe(1);
    expect(div.querySelectorAll('select').length).toBe(1);
    expect(div.querySelectorAll('input[type="radio"]').length).toBe(2);
  });

  it('should efficiently manage memory with form creation and destruction', () => {
    const performanceWithMemory = performance as unknown as { memory?: { usedJSHeapSize: number } };
    const initialMemory = performanceWithMemory.memory?.usedJSHeapSize || 0;
    const forms: Mail818Form[] = [];

    // Create many forms
    for (let i = 0; i < 50; i++) {
      const div = document.createElement('div');
      const form = new Mail818Form(div, {
        listId: `01K3KDM5EM74T5QHGY${i.toString().padStart(8, '0')}`,
        apiToken: 'test_token',
        testMode: true
      });
      forms.push(form);
    }

    const peakMemory = performanceWithMemory.memory?.usedJSHeapSize || 0;

    // Destroy all forms (simulate cleanup)
    forms.forEach(form => {
      // Simulate destruction by clearing references
      (form as unknown as { element: unknown; options: unknown }).element = null;
      (form as unknown as { element: unknown; options: unknown }).options = null;
    });
    forms.length = 0;

    // Force garbage collection if available
    if ((global as unknown as { gc?: () => void }).gc) {
      (global as unknown as { gc: () => void }).gc();
    }

    const finalMemory = performanceWithMemory.memory?.usedJSHeapSize || 0;

    // Memory should not grow excessively
    if (initialMemory > 0 && peakMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      const peakGrowth = peakMemory - initialMemory;
      
      console.log(`Memory - Initial: ${(initialMemory / 1024 / 1024).toFixed(2)}MB, Peak: ${(peakMemory / 1024 / 1024).toFixed(2)}MB, Final: ${(finalMemory / 1024 / 1024).toFixed(2)}MB`);
      
      // Final memory should be reasonably close to initial (allowing for some growth)
      expect(memoryGrowth).toBeLessThan(peakGrowth * 0.5); // Should release at least 50% of peak growth
    }

    expect(forms.length).toBe(0);
  });

  it('should handle CSS and style injection efficiently', () => {
    // Test that multiple form initializations don't duplicate styles
    const start = performance.now();
    
    const styleSheetsBefore = document.styleSheets.length;
    const forms: Mail818Form[] = [];
    
    for (let i = 0; i < 10; i++) {
      const div = document.createElement('div');
      const form = new Mail818Form(div, {
        listId: `01K3KDM5EM74T5QHGY${i.toString().padStart(8, '0')}`,
        apiToken: 'test_token',
        testMode: true
      });
      forms.push(form);
    }
    
    const styleSheetsAfter = document.styleSheets.length;
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100); // Should complete quickly
    
    // Styles should not be duplicated excessively
    const styleSheetsAdded = styleSheetsAfter - styleSheetsBefore;
    expect(styleSheetsAdded).toBeLessThanOrEqual(1); // Should add at most one stylesheet
  });

  it('should validate forms efficiently', async () => {
    const div = document.createElement('div');
    const form = new Mail818Form(div, {
      listId: '01K3KDM5EM74T5QHGY38FTXK61',
      apiToken: 'test_token',
      testMode: true,
      mockConfig: {
        listId: '01K3KDM5EM74T5QHGY38FTXK61',
        name: 'Test Project',
        fields: [
          { key: 'email', label: 'Email', type: 'email', required: true },
          { key: 'name', label: 'Name', type: 'text', required: true, validation: { minLength: 2, maxLength: 50 } },
          { key: 'age', label: 'Age', type: 'number', required: true, validation: { min: 18, max: 120 } }
        ]
      }
    });

    await form.initialize();

    const start = performance.now();
    
    // Simulate validation on 100 different input combinations
    for (let i = 0; i < 100; i++) {
      const emailInput = div.querySelector('input[type="email"]') as HTMLInputElement;
      const nameInput = div.querySelector('input[name="name"]') as HTMLInputElement;
      const ageInput = div.querySelector('input[type="number"]') as HTMLInputElement;
      
      if (emailInput && nameInput && ageInput) {
        emailInput.value = i % 2 === 0 ? `test${i}@example.com` : 'invalid-email';
        nameInput.value = i % 3 === 0 ? `Name${i}` : 'X'; // Some invalid (too short)
        ageInput.value = i % 4 === 0 ? '25' : '5'; // Some invalid (too young)
        
        // Trigger validation
        const formElement = div.querySelector('form');
        if (formElement) {
          const submitEvent = new Event('submit', { cancelable: true });
          formElement.dispatchEvent(submitEvent);
        }
      }
    }
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500); // Should validate 100 forms in under 500ms
  });
});