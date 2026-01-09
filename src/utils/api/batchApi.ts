import { Member, Player, Team } from '../../types';
import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  
  const converted: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    const value = obj[key];
    
    // Handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      converted[camelKey] = toCamelCase(value);
    } else if (Array.isArray(value)) {
      converted[camelKey] = value.map(toCamelCase);
    } else {
      converted[camelKey] = value;
    }
  }
  return converted;
};

// Helper to convert Date strings
const parseDates = (obj: any): any => {
  if (!obj) return obj;
  
  const dateFields = ['created_at', 'updated_at', 'last_game_end_at', 'started_at', 'ended_at', 'createdAt', 'updatedAt', 'lastGameEndAt', 'startedAt', 'endedAt'];
  
  for (const field of dateFields) {
    if (obj[field]) {
      obj[field] = new Date(obj[field]);
    }
  }
  
  return obj;
};

export const batchApi = {
  // ⚡ Get all data at once
  async getAllData(): Promise<{
    members: Member[];
    players: Player[];
    teams: Team[];
    settings: Record<string, string>;
  }> {
    try {
      console.log('⚡ Fetching all data in one request from:', `${API_BASE}/all-data`);
      const startTime = performance.now();
      
      const response = await fetch(`${API_BASE}/all-data`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to fetch all data: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      const duration = performance.now() - startTime;
      
      // Convert snake_case to camelCase and parse dates
      const members = data.members.map((m: any) => parseDates(toCamelCase(m)));
      const players = data.players.map((p: any) => parseDates(toCamelCase(p)));
      const teams = data.teams.map((t: any) => parseDates(toCamelCase(t)));
      
      console.log(`⚡ Batch loaded all data in ${duration.toFixed(0)}ms:`, {
        members: members.length,
        players: players.length,
        teams: teams.length,
        settings: Object.keys(data.settings).length,
      });

      return {
        members,
        players,
        teams,
        settings: data.settings,
      };
    } catch (error) {
      console.error('❌ Error fetching all data:', error);
      throw error;
    }
  },
};
