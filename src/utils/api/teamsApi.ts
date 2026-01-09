import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

export interface TeamData {
  id: string;
  name: string;
  playerIds: string[];
  state: 'queued' | 'playing' | 'finished';
  assignedCourtId?: string | null;
  startedAt?: Date | null;
  endedAt?: Date | null;
  createdAt?: Date;
}

export const teamsApi = {
  async getAll(): Promise<TeamData[]> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Convert snake_case to camelCase and parse dates
    return (data || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      playerIds: team.player_ids || [],
      state: team.state,
      assignedCourtId: team.assigned_court_id || null,
      startedAt: team.started_at ? new Date(team.started_at) : null,
      endedAt: team.ended_at ? new Date(team.ended_at) : null,
      createdAt: team.created_at ? new Date(team.created_at) : new Date(),
    }));
  },

  async add(team: TeamData): Promise<void> {
    // Only send fields that exist in the DB
    const dbTeam = {
      id: team.id,
      name: team.name,
      player_ids: team.playerIds,
      state: team.state,
      started_at: team.startedAt?.toISOString() || null,
      ended_at: team.endedAt?.toISOString() || null,
    };
    
    console.log('📤 Sending team to API:', dbTeam);
    
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbTeam),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API error response:', errorText);
      throw new Error(`Failed to add team: ${response.statusText}`);
    }
  },

  async addBatch(teams: TeamData[]): Promise<void> {
    // Only send fields that exist in the DB
    const teamsForDb = teams.map(t => ({
      id: t.id,
      name: t.name,
      player_ids: t.playerIds,
      state: t.state,
      started_at: t.startedAt?.toISOString() || null,
      ended_at: t.endedAt?.toISOString() || null,
    }));
    
    const response = await fetch(`${API_BASE}/teams/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teams: teamsForDb }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add teams: ${response.statusText}`);
    }
  },

  async update(teamId: string, updates: Partial<TeamData>): Promise<void> {
    // Only send fields that exist in the DB
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.playerIds !== undefined) dbUpdates.player_ids = updates.playerIds;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.assignedCourtId !== undefined) dbUpdates.assigned_court_id = updates.assignedCourtId;
    if (updates.startedAt !== undefined) dbUpdates.started_at = updates.startedAt?.toISOString() || null;
    if (updates.endedAt !== undefined) dbUpdates.ended_at = updates.endedAt?.toISOString() || null;
    
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dbUpdates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update team: ${response.statusText}`);
    }
  },

  async delete(teamId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete team: ${response.statusText}`);
    }
  },

  async deleteBatch(teamIds: string[]): Promise<number> {
    const response = await fetch(`${API_BASE}/teams/batch-delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teamIds }),
    });

    if (!response.ok) {
      throw new Error(`Failed to batch delete teams: ${response.statusText}`);
    }

    const result = await response.json();
    return result.count || 0;
  },

  async deleteFinished(): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/finished`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete finished teams: ${response.statusText}`);
    }
  },

  async deleteAll(): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/all`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to delete all teams: ${response.statusText}`);
    }
  },
};