/**
 * API client for Mail818 backend communication
 */

import type { ListConfig, SubmissionData, SubmissionResponse, Mail818Error } from './types';

export class ApiClient {
  private hostname: string;
  private apiToken: string;
  private listId: string;

  constructor(hostname: string, apiToken: string, listId: string) {
    this.hostname = hostname;
    this.apiToken = apiToken;
    this.listId = listId;
  }

  /**
   * Fetch list configuration including fields
   */
  async fetchListConfig(): Promise<ListConfig | null> {
    try {
      const response = await fetch(
        `${this.hostname}/v1/lists/${this.listId}/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status === 403) {
        // Token doesn't have read permission
        console.warn('Token does not have read:list permission');
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch list config: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching list config:', error);
      return null;
    }
  }

  /**
   * Submit form data to API
   */
  async submitForm(data: SubmissionData): Promise<SubmissionResponse> {
    const response = await fetch(
      `${this.hostname}/v1/collect`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw result as Mail818Error;
    }

    return result as SubmissionResponse;
  }

  /**
   * Check if token has specific permission
   */
  async checkPermission(permission: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.hostname}/v1/auth/check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ permission })
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}