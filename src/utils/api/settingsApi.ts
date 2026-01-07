import { projectId, publicAnonKey } from '../supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

export const settingsApi = {
  async get(key: string): Promise<string | null> {
    const response = await fetch(`${BASE_URL}/settings/${key}`, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      console.error(`Failed to get setting ${key}:`, await response.text());
      return null;
    }

    const data = await response.json();
    return data.value;
  },

  async set(key: string, value: string | number): Promise<boolean> {
    const response = await fetch(`${BASE_URL}/settings/${key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ value }),
    });

    if (!response.ok) {
      console.error(`Failed to set setting ${key}:`, await response.text());
      return false;
    }

    return true;
  },
};
