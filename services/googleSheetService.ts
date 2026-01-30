
import { AppData } from '../types';
import { GSHEET_API_URL } from '../constants';

export const syncService = {
  async fetchAllData(): Promise<AppData | null> {
    if (!GSHEET_API_URL) return null;
    
    const controller = new AbortController();
    // Increased timeout to 120s for slow cold starts
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch(GSHEET_API_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      return await response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('Fetch operation timed out (120s limit reached).');
      } else {
        console.error('Error fetching data from cloud:', error);
      }
      return null;
    }
  },

  async saveData(action: string, payload: any): Promise<{success: boolean, data?: any, error?: string}> {
    if (!GSHEET_API_URL) {
      console.warn('Sync ignored: GSHEET_API_URL is not configured.');
      return { success: true };
    }
    
    console.log(`Cloud Sync Initiated: [${action}]`, { 
      hasPhoto: !!payload.photoData, 
      hasFile: !!payload.fileData 
    });
    
    const controller = new AbortController();
    // Save operations get more time due to file uploads
    const timeoutId = setTimeout(() => controller.abort(), 180000);

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
        console.error('Server returned non-JSON response:', responseText);
        throw new Error(`Server side error or script timeout. Check Apps Script logs.`);
      }

      if (result.status === 'error') {
        console.error('Server returned explicit error:', result.message);
        return { success: false, error: result.message };
      }
      
      return { success: true, data: result.data };
    } catch (error: any) {
      const message = error.name === 'AbortError' ? 'Request timed out after 3 minutes' : (error instanceof Error ? error.message : 'Network error');
      console.error(`Cloud Sync Failed: [${action}]`, message);
      return { success: false, error: message };
    }
  }
};
