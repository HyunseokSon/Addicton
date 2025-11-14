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
    
    // Parse dates
    return data.map((team: any) => ({
      ...team,
      startedAt: team.startedAt ? new Date(team.startedAt) : null,
      endedAt: team.endedAt ? new Date(team.endedAt) : null,
    }));
  },

  async add(team: TeamData): Promise<void> {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(team),
    });

    if (!response.ok) {
      throw new Error(`Failed to add team: ${response.statusText}`);
    }
  },

  async addBatch(teams: TeamData[]): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ teams }),
    });

    if (!response.ok) {
      throw new Error(`Failed to add teams: ${response.statusText}`);
    }
  },

  async update(teamId: string, updates: Partial<TeamData>): Promise<void> {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
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