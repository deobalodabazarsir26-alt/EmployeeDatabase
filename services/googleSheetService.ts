
import { AppData } from '../types';
import { GSHEET_API_URL } from '../constants';

export const syncService = {
  async fetchAllData(): Promise<AppData | null> {
    if (!GSHEET_API_URL) return null;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(GSHEET_API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      console.error('Error fetching data from cloud:', error);
      return null;
    }
  },

  async saveData(action: string, payload: any): Promise<{success: boolean, error?: string}> {
    if (!GSHEET_API_URL) {
      console.warn('Sync ignored: GSHEET_API_URL is not configured.');
      return { success: true };
    }
    
    console.log(`Cloud Sync Initiated: [${action}]`, payload);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(GSHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Invalid response from server: ${responseText.substring(0, 100)}`);
      }

      if (result.status === 'error') {
        return { success: false, error: result.message };
      }
      
      console.log(`Cloud Sync Success: [${action}]`);
      return { success: true };
    } catch (error: any) {
      const message = error.name === 'AbortError' ? 'Request timed out (60s)' : (error instanceof Error ? error.message : 'Network error');
      console.error(`Cloud Sync Failed: [${action}]`, message);
      return { success: false, error: message };
    }
  }
};
