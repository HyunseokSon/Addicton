import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

export interface PlayerData {
  id: string;
  name: string;
  state: 'waiting' | 'priority' | 'resting' | 'playing' | 'queued';
  gender?: '남' | '녀';
  rank?: 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  gameCount: number;
  lastGameEndAt: Date | null;
  teammateHistory?: Record<string, number>;
  recentTeammates?: string[];
  createdAt: Date;
}

export const playersApi = {
  async getAll(): Promise<PlayerData[]> {
    const response = await fetch(`${API_BASE}/players`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch players: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Parse dates
    return data.map((player: any) => ({
      ...player,
      lastGameEndAt: player.lastGameEndAt ? new Date(player.lastGameEndAt) : null,
      createdAt: new Date(player.createdAt),
    }));
  },

  async add(player: PlayerData): Promise<void> {
    const response = await fetch(`${API_BASE}/players`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(player),
    });

    if (!response.ok) {
      throw new Error(`Failed to add player: ${response.statusText}`);
    }
  },

  async addBatch(players: PlayerData[]): Promise<void> {
    const response = await fetch(`${API_BASE}/players/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ players }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to batch add players: ${response.statusText} - ${error}`);
    }
  },

  async update(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    const response = await fetch(`${API_BASE}/players/${playerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update player: ${response.statusText}`);
    }
  },

  async updateBatch(playerUpdates: Array<{ playerId: string; updates: Partial<PlayerData> }>): Promise<void> {
    const response = await fetch(`${API_BASE}/players/batch-update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerUpdates }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to batch update players: ${response.statusText} - ${error}`);
    }
  },

  async delete(playerId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/players/${playerId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete player: ${response.statusText}`);
    }
  },

  async deleteBatch(playerIds: string[]): Promise<number> {
    const response = await fetch(`${API_BASE}/players/batch-delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerIds }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to batch delete players: ${response.statusText} - ${error}`);
    }

    const result = await response.json();
    return result.count || 0;
  },

  async resetGameCounts(): Promise<void> {
    const response = await fetch(`${API_BASE}/players/reset-game-counts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to reset game counts: ${response.statusText}`);
    }
  },
};