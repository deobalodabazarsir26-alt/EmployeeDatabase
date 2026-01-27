
import { AppData } from '../types';
import { GSHEET_API_URL } from '../constants';

export const syncService = {
  async fetchAllData(): Promise<AppData | null> {
    if (!GSHEET_API_URL) return null;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout for fetches

    try {
      const response = await fetch(GSHEET_API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching data from cloud:', error);
      return null;
    }
  },

  async saveData(action: string, payload: any): Promise<{success: boolean, error?: string}> {
    if (!GSHEET_API_URL) return { success: true };
    
    try {
      const response = await fetch(GSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Use text/plain to avoid CORS preflight issues with GAS
        body: JSON.stringify({ action, payload }),
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const result = await response.json();
      if (result.status === 'error') {
        return { success: false, error: result.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving to cloud:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }
};
