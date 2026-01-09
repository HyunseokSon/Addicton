import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

// Helper to convert camelCase to snake_case
const toSnakeCase = (obj: any): any => {
  const converted: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    converted[snakeKey] = obj[key];
  }
  return converted;
};

export interface PlayerData {
  id: string;
  name: string;
  state: 'waiting' | 'priority' | 'resting' | 'playing' | 'queued';
  gender?: '남' | '여';
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
    
    // Convert snake_case to camelCase and parse dates
    return (data || []).map((player: any) => ({
      id: player.id,
      name: player.name,
      state: player.state,
      gender: player.gender,
      rank: player.rank,
      gameCount: player.game_count ?? 0,
      lastGameEndAt: player.last_game_end_at ? new Date(player.last_game_end_at) : null,
      teammateHistory: player.teammate_history || {},
      recentTeammates: player.recent_teammates || [],
      createdAt: new Date(player.created_at),
    }));
  },

  async add(player: PlayerData): Promise<void> {
    // Only send fields that exist in the DB (exclude createdAt - it's auto-generated)
    const dbPlayer: any = {
      id: player.id,
      name: player.name,
      state: player.state,
      game_count: player.gameCount,
      last_game_end_at: player.lastGameEndAt?.toISOString() || null,
      teammate_history: player.teammateHistory || {},
      recent_teammates: player.recentTeammates || [],
    };
    
    // Add optional fields only if they exist
    if (player.gender) dbPlayer.gender = player.gender;
    if (player.rank) dbPlayer.rank = player.rank;
    
    console.log('📤 playersApi.add - Sending to server:', {
      name: dbPlayer.name,
      gender: dbPlayer.gender,
      rank: dbPlayer.rank,
      hasGender: !!player.gender,
      hasRank: !!player.rank,
    });
    
    const response = await fetch(`${API_BASE}/players`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbPlayer),
    });

    if (!response.ok) {
      throw new Error(`Failed to add player: ${response.statusText}`);
    }
  },

  async addBatch(players: PlayerData[]): Promise<void> {
    // Only send fields that exist in the DB (exclude createdAt - it's auto-generated)
    const playersForDb = players.map(p => {
      const dbPlayer: any = {
        id: p.id,
        name: p.name,
        state: p.state,
        game_count: p.gameCount,
        last_game_end_at: p.lastGameEndAt?.toISOString() || null,
        teammate_history: p.teammateHistory || {},
        recent_teammates: p.recentTeammates || [],
      };
      
      // Add optional fields only if they exist
      if (p.gender) dbPlayer.gender = p.gender;
      if (p.rank) dbPlayer.rank = p.rank;
      
      return dbPlayer;
    });
    
    const response = await fetch(`${API_BASE}/players/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ players: playersForDb }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to batch add players: ${response.statusText} - ${error}`);
    }
  },

  async update(playerId: string, updates: Partial<PlayerData>): Promise<void> {
    // Only send fields that exist in the DB
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
    if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
    if (updates.gameCount !== undefined) dbUpdates.game_count = updates.gameCount;
    if (updates.lastGameEndAt !== undefined) dbUpdates.last_game_end_at = updates.lastGameEndAt?.toISOString() || null;
    if (updates.teammateHistory !== undefined) dbUpdates.teammate_history = updates.teammateHistory;
    if (updates.recentTeammates !== undefined) dbUpdates.recent_teammates = updates.recentTeammates;
    
    const response = await fetch(`${API_BASE}/players/${playerId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbUpdates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update player: ${response.statusText}`);
    }
  },

  async updateBatch(playerUpdates: Array<{ playerId: string; updates: Partial<PlayerData> }>): Promise<void> {
    // Convert updates to DB format
    const playerUpdatesForDb = playerUpdates.map(({ playerId, updates }) => {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.state !== undefined) dbUpdates.state = updates.state;
      if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
      if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
      if (updates.gameCount !== undefined) dbUpdates.game_count = updates.gameCount;
      if (updates.lastGameEndAt !== undefined) dbUpdates.last_game_end_at = updates.lastGameEndAt?.toISOString() || null;
      if (updates.teammateHistory !== undefined) dbUpdates.teammate_history = updates.teammateHistory;
      if (updates.recentTeammates !== undefined) dbUpdates.recent_teammates = updates.recentTeammates;
      
      return {
        playerId,
        updates: dbUpdates,
      };
    });
    
    const response = await fetch(`${API_BASE}/players/batch-update`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerUpdates: playerUpdatesForDb }),
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