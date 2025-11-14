import { Member } from '../../types';
import { projectId, publicAnonKey } from '../supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d`;

export const membersApi = {
  // Get all members
  async getAll(): Promise<Member[]> {
    try {
      console.log('🔗 Fetching members from:', `${API_BASE}/members`);
      
      const response = await fetch(`${API_BASE}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to get members - HTTP', response.status, ':', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Successfully fetched members:', data.members?.length || 0);
      
      // Convert date strings back to Date objects
      return (data.members || []).map((m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      }));
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🌐 Network error - Edge Function may not be deployed:', error);
        throw new Error('서버에 연결할 수 없습니다. Edge Function이 배포되었는지 확인하세요.');
      }
      console.error('❌ Error getting members:', error);
      throw error;
    }
  },

  // Add a new member
  async add(member: Member): Promise<Member> {
    try {
      const response = await fetch(`${API_BASE}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ member }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to add member:', error);
        throw new Error(error.error || 'Failed to add member');
      }

      const data = await response.json();
      return {
        ...data.member,
        createdAt: new Date(data.member.createdAt),
      };
    } catch (error) {
      console.error('Error adding member:', error);
      throw error;
    }
  },

  // Update a member
  async update(id: string, updates: Partial<Member>): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/members/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to update member:', error);
        throw new Error(error.error || 'Failed to update member');
      }
    } catch (error) {
      console.error('Error updating member:', error);
      throw error;
    }
  },

  // Delete a member
  async delete(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/members/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to delete member:', error);
        throw new Error(error.error || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      throw error;
    }
  },

  // Batch add members
  async addBatch(members: Member[]): Promise<void> {
    try {
      const response = await fetch(`${API_BASE}/members/batch`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to batch add members:', error);
        throw new Error(error.error || 'Failed to batch add members');
      }
    } catch (error) {
      console.error('Error batch adding members:', error);
      throw error;
    }
  },

  // Delete all members
  async deleteAll(): Promise<number> {
    try {
      const response = await fetch(`${API_BASE}/members/all`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to delete all members:', error);
        throw new Error(error.error || 'Failed to delete all members');
      }

      const data = await response.json();
      return data.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting all members:', error);
      throw error;
    }
  },

  // Reset members - atomically delete all and add new ones
  async reset(members: Member[]): Promise<{ deletedCount: number; addedCount: number }> {
    try {
      const response = await fetch(`${API_BASE}/members/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ members }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to reset members:', error);
        throw new Error(error.error || 'Failed to reset members');
      }

      const data = await response.json();
      return {
        deletedCount: data.deletedCount || 0,
        addedCount: data.addedCount || 0,
      };
    } catch (error) {
      console.error('Error resetting members:', error);
      throw error;
    }
  },

  // Migrate gender values from 'male'/'female' to '남'/'녀'
  async migrateGender(): Promise<{ membersUpdated: number; playersUpdated: number }> {
    try {
      console.log('🔄 Starting gender migration...');
      
      const response = await fetch(`${API_BASE}/members/migrate-gender`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to migrate gender:', error);
        throw new Error(error.error || 'Failed to migrate gender');
      }

      const data = await response.json();
      console.log(`✅ Gender migration complete: ${data.membersUpdated} members, ${data.playersUpdated} players updated`);
      
      return {
        membersUpdated: data.membersUpdated || 0,
        playersUpdated: data.playersUpdated || 0,
      };
    } catch (error) {
      console.error('Error migrating gender:', error);
      throw error;
    }
  },
};