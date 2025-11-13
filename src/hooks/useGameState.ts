import { useState, useEffect, useCallback } from 'react';
import { AppState, Player, Team, Court, Session, PlayerState, AuditLog, Member, Gender, Rank } from '../types';
import { autoMatch, updatePriorityStatus } from '../utils/matching';
import { createInitialMembers } from '../data/initialMembers';

const STORAGE_KEY = 'addiction-game-matching-state';

function createInitialCourts(count: number): Court[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `court-${i}`,
    index: i + 1,
    name: `코트 ${i + 1}`,
    status: 'available' as const,
    timerMs: 0,
    currentTeamId: null,
    isPaused: false,
  }));
}

export function useGameState() {
  const [state, setState] = useState<AppState>(() => {
    console.log('🔍 Initializing state, checking localStorage...');
    const saved = localStorage.getItem(STORAGE_KEY);
    console.log('📦 localStorage raw data:', saved ? `Found (${saved.length} chars)` : 'NULL or EMPTY');
    
    // Get initial members data
    const initialMembers = createInitialMembers();
    
    if (saved) {
      try {
        console.log('📂 Loading state from localStorage...');
        const parsed = JSON.parse(saved);
        // Parse dates
        if (parsed.session) {
          parsed.session.createdAt = new Date(parsed.session.createdAt);
          // Ensure teamSize is at least 4
          if (!parsed.session.teamSize || parsed.session.teamSize < 4) {
            parsed.session.teamSize = 4;
          }
        }
        
        // Ensure players array exists
        if (!parsed.players || !Array.isArray(parsed.players)) {
          console.warn('⚠️ Players array missing or invalid, initializing empty array');
          parsed.players = [];
        }
        
        parsed.players = parsed.players.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          lastGameEndAt: p.lastGameEndAt ? new Date(p.lastGameEndAt) : null,
        }));
        
        // Ensure teams array exists
        if (!parsed.teams || !Array.isArray(parsed.teams)) {
          console.warn('⚠️ Teams array missing or invalid, initializing empty array');
          parsed.teams = [];
        }
        
        parsed.teams = parsed.teams.map((t: any) => ({
          ...t,
          startedAt: t.startedAt ? new Date(t.startedAt) : null,
          endedAt: t.endedAt ? new Date(t.endedAt) : null,
        }));
        
        // Ensure auditLogs array exists
        if (!parsed.auditLogs || !Array.isArray(parsed.auditLogs)) {
          parsed.auditLogs = [];
        }
        
        parsed.auditLogs = parsed.auditLogs.map((l: any) => ({
          ...l,
          timestamp: new Date(l.timestamp),
        }));
        
        // Deduplicate courts - ensure unique IDs
        const seenCourtIds = new Set<string>();
        const uniqueCourts: Court[] = [];
        
        if (parsed.courts && Array.isArray(parsed.courts)) {
          parsed.courts.forEach((court: Court, index: number) => {
            if (!seenCourtIds.has(court.id)) {
              seenCourtIds.add(court.id);
              uniqueCourts.push(court);
            }
          });
          
          // If we have fewer unique courts than expected, recreate them
          if (parsed.session && uniqueCourts.length < parsed.session.courtsCount) {
            parsed.courts = createInitialCourts(parsed.session.courtsCount);
          } else {
            parsed.courts = uniqueCourts;
          }
        } else {
          // If courts are missing, recreate them
          parsed.courts = parsed.session ? createInitialCourts(parsed.session.courtsCount) : createInitialCourts(4);
        }
        
        // Parse members
        if (parsed.members && Array.isArray(parsed.members)) {
          parsed.members = parsed.members.map((m: any) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
          console.log('✅ Using members from localStorage:', parsed.members.length);
        } else {
          parsed.members = initialMembers;
          console.log('✅ Using initial members (localStorage had no members):', initialMembers.length);
        }
        
        console.log('✅ State loaded from localStorage:', {
          players: parsed.players.length,
          members: parsed.members.length,
          teams: parsed.teams.length,
        });
        
        return parsed;
      } catch (error) {
        console.error('🚨 Error loading state from localStorage:', error);
        // Fallback to default state
        return {
          session: {
            id: `session-${Date.now()}`,
            name: '에딕턴 게임 매칭',
            date: new Date().toISOString().split('T')[0],
            courtsCount: 4,
            teamSize: 4,
            gameDurationMin: 15,
            autoSeatNext: true,
            createdAt: new Date(),
          },
          members: initialMembers,
          players: [],
          teams: [],
          courts: createInitialCourts(4),
          auditLogs: [],
        };
      }
    }
    
    // Create default session
    const defaultSession: Session = {
      id: `session-${Date.now()}`,
      name: '에딕턴 게임 매칭',
      date: new Date().toISOString().split('T')[0],
      courtsCount: 4,
      teamSize: 4,
      gameDurationMin: 15,
      autoSeatNext: true,
      createdAt: new Date(),
    };
    
    return {
      session: defaultSession,
      members: initialMembers,
      players: [],
      teams: [],
      courts: createInitialCourts(4),
      auditLogs: [],
    };
  });

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Debug: log player count on save
    console.log('💾 State saved to localStorage:', {
      players: state.players.length,
      members: state.members.length,
      teams: state.teams.length,
    });
  }, [state]);

  const addAuditLog = useCallback((type: string, payload: any) => {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.random()}`,
      type,
      payload,
      timestamp: new Date(),
    };
    setState((prev) => ({
      ...prev,
      auditLogs: [...prev.auditLogs, log],
    }));
  }, []);

  const createSession = useCallback((name: string, date: string, courtsCount: number) => {
    const session: Session = {
      id: `session-${Date.now()}`,
      name,
      date,
      courtsCount,
      teamSize: 4,
      gameDurationMin: 15,
      autoSeatNext: true,
      createdAt: new Date(),
    };
    setState({
      session,
      players: [],
      teams: [],
      courts: createInitialCourts(courtsCount),
      auditLogs: [],
    });
    addAuditLog('session_created', { sessionId: session.id });
  }, [addAuditLog]);

  const updateSession = useCallback((updates: Partial<Session>) => {
    setState((prev) => {
      if (!prev.session) return prev;
      const newSession = { ...prev.session, ...updates };
      
      // Adjust courts if count changed
      let newCourts = prev.courts;
      if (updates.courtsCount !== undefined && updates.courtsCount !== prev.session.courtsCount) {
        if (updates.courtsCount > prev.courts.length) {
          // Add courts with unique IDs
          const toAdd = updates.courtsCount - prev.courts.length;
          const additionalCourts = Array.from({ length: toAdd }, (_, i) => ({
            id: `court-${Date.now()}-${i}`,
            index: prev.courts.length + i + 1,
            name: `코트 ${prev.courts.length + i + 1}`,
            status: 'available' as const,
            timerMs: 0,
            currentTeamId: null,
            isPaused: false,
          }));
          newCourts = [...prev.courts, ...additionalCourts];
        } else {
          // Remove courts - prioritize keeping occupied courts
          const occupiedCourts = prev.courts.filter(c => c.status === 'occupied');
          const availableCourts = prev.courts.filter(c => c.status === 'available');
          
          // If we have more occupied courts than the new count, keep all occupied courts anyway
          // (we can't remove courts that are in use)
          if (occupiedCourts.length >= updates.courtsCount) {
            newCourts = occupiedCourts;
          } else {
            // Keep all occupied courts and fill remaining slots with available courts
            const remainingSlots = updates.courtsCount - occupiedCourts.length;
            newCourts = [...occupiedCourts, ...availableCourts.slice(0, remainingSlots)];
          }
          
          // Re-index courts to maintain proper numbering
          newCourts = newCourts.map((court, idx) => ({
            ...court,
            index: idx + 1,
            name: `코트 ${idx + 1}`,
          }));
        }
      }
      
      return {
        ...prev,
        session: newSession,
        courts: newCourts,
      };
    });
    addAuditLog('session_updated', { updates });
  }, [addAuditLog]);

  const addPlayer = useCallback((name: string) => {
    setState((prev) => {
      // Check for duplicate names
      const existing = prev.players.filter((p) => p.name.startsWith(name));
      const finalName = existing.length > 0 ? `${name}(${existing.length + 1})` : name;
      
      const player: Player = {
        id: `player-${Date.now()}-${Math.random()}`,
        name: finalName,
        state: 'waiting',
        gameCount: 0,
        lastGameEndAt: null,
        createdAt: new Date(),
      };
      
      return {
        ...prev,
        players: [...prev.players, player],
      };
    });
    addAuditLog('player_added', { name });
  }, [addAuditLog]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId ? { ...p, ...updates } : p
      ),
    }));
    addAuditLog('player_updated', { playerId, updates });
  }, [addAuditLog]);

  const deletePlayer = useCallback((playerId: string) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.filter((p) => p.id !== playerId),
      teams: prev.teams.map((t) => ({
        ...t,
        playerIds: t.playerIds.filter((id) => id !== playerId),
      })),
    }));
    addAuditLog('player_deleted', { playerId });
  }, [addAuditLog]);

  const updatePlayerState = useCallback((playerIds: string[], newState: PlayerState) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        playerIds.includes(p.id) ? { ...p, state: newState } : p
      ),
    }));
    addAuditLog('player_state_updated', { playerIds, newState });
  }, [addAuditLog]);

  const performAutoMatch = useCallback(() => {
    setState((prev) => {
      if (!prev.session) return prev;
      
      // Calculate max teams based on total courts AND current queued teams
      const totalCourts = prev.session.courtsCount;
      const currentQueuedTeams = prev.teams.filter(t => t.state === 'queued').length;
      const maxNewTeams = Math.max(0, totalCourts - currentQueuedTeams);
      
      // If no room for new teams, don't create any
      if (maxNewTeams === 0) {
        return prev;
      }
      
      const { teams: newTeams } = autoMatch(prev.players, prev.session.teamSize, maxNewTeams);
      
      // Update player states to 'queued'
      const queuedPlayerIds = new Set(newTeams.flatMap((t) => t.playerIds));
      const updatedPlayers = prev.players.map((p) =>
        queuedPlayerIds.has(p.id) ? { ...p, state: 'queued' as const } : p
      );
      
      return {
        ...prev,
        players: updatedPlayers,
        teams: [...prev.teams, ...newTeams],
      };
    });
    addAuditLog('auto_match_performed', {});
  }, [addAuditLog]);

  const startGame = useCallback((teamId: string, courtId?: string) => {
    setState((prev) => {
      const team = prev.teams.find((t) => t.id === teamId);
      if (!team) return prev;
      
      // Find available court
      let targetCourt = courtId
        ? prev.courts.find((c) => c.id === courtId)
        : prev.courts.find((c) => c.status === 'available');
      
      if (!targetCourt || !prev.session) return prev;
      
      const updatedTeams = prev.teams.map((t) =>
        t.id === teamId
          ? { ...t, state: 'playing' as const, assignedCourtId: targetCourt!.id, startedAt: new Date() }
          : t
      );
      
      const updatedCourts = prev.courts.map((c) =>
        c.id === targetCourt!.id
          ? { ...c, status: 'occupied' as const, currentTeamId: teamId, timerMs: 0 }
          : c
      );
      
      const updatedPlayers = prev.players.map((p) =>
        team.playerIds.includes(p.id) ? { ...p, state: 'playing' as const } : p
      );
      
      return {
        ...prev,
        teams: updatedTeams,
        courts: updatedCourts,
        players: updatedPlayers,
      };
    });
    addAuditLog('game_started', { teamId, courtId });
  }, [addAuditLog]);

  const endGame = useCallback((courtId: string) => {
    setState((prev) => {
      const court = prev.courts.find((c) => c.id === courtId);
      if (!court || !court.currentTeamId) return prev;
      
      const team = prev.teams.find((t) => t.id === court.currentTeamId);
      if (!team) return prev;
      
      const now = new Date();
      
      const updatedPlayers = prev.players.map((p) => {
        if (team.playerIds.includes(p.id)) {
          // Track recent teammates (keep last game's teammates)
          const teammates = team.playerIds.filter(id => id !== p.id);
          
          // Update teammate history
          const teammateHistory = { ...(p.teammateHistory || {}) };
          for (const teammateId of teammates) {
            teammateHistory[teammateId] = (teammateHistory[teammateId] || 0) + 1;
          }
          
          return {
            ...p,
            state: 'waiting' as const,
            gameCount: p.gameCount + 1,
            lastGameEndAt: now,
            recentTeammates: teammates,
            teammateHistory,
          };
        }
        return p;
      });
      
      const updatedTeams = prev.teams.map((t) =>
        t.id === team.id ? { ...t, state: 'finished' as const, endedAt: now } : t
      );
      
      const updatedCourts = prev.courts.map((c) =>
        c.id === courtId
          ? { ...c, status: 'available' as const, currentTeamId: null, timerMs: 0, isPaused: false }
          : c
      );
      
      // Auto-update priority status
      const priorityUpdatedPlayers = updatePriorityStatus(updatedPlayers);
      
      return {
        ...prev,
        players: priorityUpdatedPlayers,
        teams: updatedTeams,
        courts: updatedCourts,
      };
    });
    addAuditLog('game_ended', { courtId });
  }, [addAuditLog]);

  const toggleCourtPause = useCallback((courtId: string) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.id === courtId ? { ...c, isPaused: !c.isPaused } : c
      ),
    }));
  }, []);

  const updateCourtTimer = useCallback((courtId: string, deltaMs: number) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((c) =>
        c.id === courtId && !c.isPaused
          ? { ...c, timerMs: c.timerMs + deltaMs }
          : c
      ),
    }));
  }, []);

  const adjustGameCount = useCallback((playerId: string, delta: number) => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === playerId
          ? { ...p, gameCount: Math.max(0, p.gameCount + delta) }
          : p
      ),
    }));
    addAuditLog('game_count_adjusted', { playerId, delta });
  }, [addAuditLog]);

  const deleteTeam = useCallback((teamId: string) => {
    setState((prev) => {
      const team = prev.teams.find((t) => t.id === teamId);
      if (!team) return prev;
      
      const updatedPlayers = prev.players.map((p) =>
        team.playerIds.includes(p.id) ? { ...p, state: 'waiting' as const } : p
      );
      
      return {
        ...prev,
        teams: prev.teams.filter((t) => t.id !== teamId),
        players: updatedPlayers,
      };
    });
    addAuditLog('team_deleted', { teamId });
  }, [addAuditLog]);

  const updateTeam = useCallback((teamId: string, playerIds: string[]) => {
    setState((prev) => ({
      ...prev,
      teams: prev.teams.map((t) =>
        t.id === teamId ? { ...t, playerIds } : t
      ),
    }));
    addAuditLog('team_updated', { teamId, playerIds });
  }, [addAuditLog]);

  const resetSession = useCallback(() => {
    setState((prev) => ({
      ...prev,
      // Keep players and members, but reset their game counts and states
      players: prev.players.map((p) => ({
        ...p,
        state: 'waiting' as const,
        gameCount: 0,
        lastGameEndAt: null,
        teammateHistory: {},
        recentTeammates: undefined,
      })),
      teams: [],
      courts: prev.session ? createInitialCourts(prev.session.courtsCount) : [],
      auditLogs: [],
    }));
    addAuditLog('session_reset', {});
  }, [addAuditLog]);

  // Member management functions
  const addMember = useCallback((name: string, gender?: Gender, rank?: Rank) => {
    setState((prev) => {
      const member: Member = {
        id: `member-${Date.now()}-${Math.random()}`,
        name,
        gender,
        rank,
        createdAt: new Date(),
      };
      
      return {
        ...prev,
        members: [...prev.members, member],
      };
    });
    addAuditLog('member_added', { name, gender, rank });
  }, [addAuditLog]);

  const updateMember = useCallback((memberId: string, updates: Partial<Member>) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.map((m) =>
        m.id === memberId ? { ...m, ...updates } : m
      ),
    }));
    addAuditLog('member_updated', { memberId, updates });
  }, [addAuditLog]);

  const deleteMember = useCallback((memberId: string) => {
    setState((prev) => ({
      ...prev,
      members: prev.members.filter((m) => m.id !== memberId),
    }));
    addAuditLog('member_deleted', { memberId });
  }, [addAuditLog]);

  const addMemberAsPlayer = useCallback((memberId: string) => {
    setState((prev) => {
      const member = prev.members.find((m) => m.id === memberId);
      if (!member) return prev;
      
      // Check for duplicate names
      const existing = prev.players.filter((p) => p.name.startsWith(member.name));
      const finalName = existing.length > 0 ? `${member.name}(${existing.length + 1})` : member.name;
      
      const player: Player = {
        id: `player-${Date.now()}-${Math.random()}`,
        name: finalName,
        state: 'waiting',
        gender: member.gender,
        rank: member.rank,
        gameCount: 0,
        lastGameEndAt: null,
        createdAt: new Date(),
      };
      
      return {
        ...prev,
        players: [...prev.players, player],
      };
    });
    addAuditLog('member_added_as_player', { memberId });
  }, [addAuditLog]);

  return {
    state,
    createSession,
    updateSession,
    addPlayer,
    updatePlayer,
    deletePlayer,
    updatePlayerState,
    performAutoMatch,
    startGame,
    endGame,
    toggleCourtPause,
    updateCourtTimer,
    adjustGameCount,
    deleteTeam,
    updateTeam,
    resetSession,
    addMember,
    updateMember,
    deleteMember,
    addMemberAsPlayer,
  };
}