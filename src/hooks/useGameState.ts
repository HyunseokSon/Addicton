import { useState, useEffect, useCallback } from 'react';
import { AppState, Player, Team, Court, Session, PlayerState, AuditLog, Member, Gender, Rank } from '../types';
import { autoMatch, updatePriorityStatus } from '../utils/matching';
import { createInitialMembers } from '../data/initialMembers';
import { membersApi } from '../utils/api/membersApi';
import { playersApi } from '../utils/api/playersApi';
import { teamsApi } from '../utils/api/teamsApi';

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

  // Load members from Supabase on initial mount
  useEffect(() => {
    const loadMembersFromSupabase = async () => {
      try {
        console.log('🔄 Loading members from Supabase...');
        const membersFromDb = await membersApi.getAll();
        
        if (membersFromDb && membersFromDb.length > 0) {
          console.log('✅ Loaded members from Supabase:', membersFromDb.length);
          setState((prev) => ({
            ...prev,
            members: membersFromDb,
          }));
        } else {
          console.log('ℹ️ No members found in Supabase, using local data');
        }
      } catch (error) {
        console.error('⚠️ Failed to load members from Supabase:', error);
        // Continue using local/initial members
      }
    };

    const loadPlayersFromSupabase = async () => {
      try {
        console.log('🔄 Loading players from Supabase...');
        const playersFromDb = await playersApi.getAll();
        
        if (playersFromDb && playersFromDb.length > 0) {
          console.log('✅ Loaded players from Supabase:', playersFromDb.length);
          setState((prev) => ({
            ...prev,
            players: playersFromDb,
          }));
        } else {
          console.log('ℹ️ No players found in Supabase');
        }
      } catch (error) {
        console.error('⚠️ Failed to load players from Supabase:', error);
        // Continue using local players
      }
    };

    loadMembersFromSupabase();
    loadPlayersFromSupabase();
  }, []); // Run only once on mount

  // Load teams from Supabase on initial mount
  useEffect(() => {
    const loadTeamsFromSupabase = async () => {
      try {
        console.log('🔄 Loading teams from Supabase...');
        const teamsFromDb = await teamsApi.getAll();
        
        // Only load queued and playing teams (not finished)
        const activeTeams = teamsFromDb.filter(t => t.state === 'queued' || t.state === 'playing');
        
        if (activeTeams.length > 0) {
          console.log('✅ Loaded teams from Supabase:', activeTeams.length);
          setState((prev) => {
            // Restore courts based on playing teams
            const restoredCourts = prev.courts.map(court => {
              // Find if any team is playing on this court
              const playingTeam = activeTeams.find(
                t => t.state === 'playing' && t.assignedCourtId === court.id
              );
              
              if (playingTeam) {
                return {
                  ...court,
                  status: 'occupied' as const,
                  currentTeamId: playingTeam.id,
                  timerMs: 0, // Not used anymore, timer calculated from startedAt
                  isPaused: false,
                };
              }
              
              return court;
            });
            
            // Update player states based on teams
            const teamPlayerIds = new Set(activeTeams.flatMap(t => t.playerIds));
            const restoredPlayers = prev.players.map(player => {
              if (!teamPlayerIds.has(player.id)) return player;
              
              const playerTeam = activeTeams.find(t => t.playerIds.includes(player.id));
              if (!playerTeam) return player;
              
              return {
                ...player,
                state: playerTeam.state === 'playing' ? 'playing' as const : 'queued' as const,
              };
            });
            
            return {
              ...prev,
              teams: activeTeams,
              courts: restoredCourts,
              players: restoredPlayers,
            };
          });
        } else {
          console.log('ℹ️ No active teams found in Supabase');
        }
      } catch (error) {
        console.error('⚠️ Failed to load teams from Supabase:', error);
        // Continue using local teams
      }
    };

    loadTeamsFromSupabase();
  }, []); // Run only once on mount

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

  const addPlayer = useCallback(async (name: string) => {
    const player: Player = {
      id: `player-${Date.now()}-${Math.random()}`,
      name,
      state: 'waiting',
      gameCount: 0,
      lastGameEndAt: null,
      createdAt: new Date(),
    };
    
    try {
      // Save to Supabase first
      await playersApi.add(player);
      
      // Update local state
      setState((prev) => {
        // Check for duplicate names
        const existing = prev.players.filter((p) => p.name.startsWith(name));
        const finalName = existing.length > 0 ? `${name}(${existing.length + 1})` : name;
        
        const finalPlayer: Player = { ...player, name: finalName };
        
        return {
          ...prev,
          players: [...prev.players, finalPlayer],
        };
      });
      addAuditLog('player_added', { name });
    } catch (error) {
      console.error('Failed to add player to Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => {
        const existing = prev.players.filter((p) => p.name.startsWith(name));
        const finalName = existing.length > 0 ? `${name}(${existing.length + 1})` : name;
        const finalPlayer: Player = { ...player, name: finalName };
        return {
          ...prev,
          players: [...prev.players, finalPlayer],
        };
      });
      addAuditLog('player_added', { name });
    }
  }, [addAuditLog]);

  const updatePlayer = useCallback(async (playerId: string, updates: Partial<Player>) => {
    try {
      // Update in Supabase first
      await playersApi.update(playerId, updates);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, ...updates } : p
        ),
      }));
      addAuditLog('player_updated', { playerId, updates });
    } catch (error) {
      console.error('Failed to update player in Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId ? { ...p, ...updates } : p
        ),
      }));
      addAuditLog('player_updated', { playerId, updates });
    }
  }, [addAuditLog]);

  const deletePlayer = useCallback(async (playerId: string) => {
    try {
      // Delete from Supabase first
      await playersApi.delete(playerId);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
        teams: prev.teams.map((t) => ({
          ...t,
          playerIds: t.playerIds.filter((id) => id !== playerId),
        })),
      }));
      addAuditLog('player_deleted', { playerId });
    } catch (error) {
      console.error('Failed to delete player from Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => p.id !== playerId),
        teams: prev.teams.map((t) => ({
          ...t,
          playerIds: t.playerIds.filter((id) => id !== playerId),
        })),
      }));
      addAuditLog('player_deleted', { playerId });
    }
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

  const performAutoMatch = useCallback(async () => {
    try {
      const newTeamsToCreate: Team[] = [];
      const playersToUpdate: string[] = [];
      
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
        
        // Store teams to be created in Supabase
        newTeamsToCreate.push(...newTeams);
        
        // Update player states to 'queued'
        const queuedPlayerIds = new Set(newTeams.flatMap((t) => t.playerIds));
        const updatedPlayers = prev.players.map((p) => {
          if (queuedPlayerIds.has(p.id)) {
            playersToUpdate.push(p.id);
            return { ...p, state: 'queued' as const };
          }
          return p;
        });
        
        return {
          ...prev,
          players: updatedPlayers,
          teams: [...prev.teams, ...newTeams],
        };
      });
      
      // Save new teams to Supabase
      if (newTeamsToCreate.length > 0) {
        await teamsApi.addBatch(newTeamsToCreate);
        console.log(`✅ Created ${newTeamsToCreate.length} teams in Supabase`);
      }
      
      // Update player states in Supabase
      if (playersToUpdate.length > 0) {
        await Promise.all(
          playersToUpdate.map((playerId) => 
            playersApi.update(playerId, { state: 'queued' })
          )
        );
        console.log(`✅ Updated ${playersToUpdate.length} players to queued state in Supabase`);
      }
      
      addAuditLog('auto_match_performed', {});
    } catch (error) {
      console.error('Failed to save teams to Supabase:', error);
      addAuditLog('auto_match_performed', {});
    }
  }, [addAuditLog]);

  const startGame = useCallback(async (teamId: string, courtId?: string) => {
    try {
      let playersToUpdate: string[] = [];
      
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        
        // Find available court
        let targetCourt = courtId
          ? prev.courts.find((c) => c.id === courtId)
          : prev.courts.find((c) => c.status === 'available');
        
        if (!targetCourt || !prev.session) return prev;
        
        // Store player IDs to update in Supabase
        playersToUpdate = team.playerIds;
        
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
      
      // Update team state in Supabase
      const targetCourt = courtId || state.courts.find((c) => c.status === 'available')?.id;
      await teamsApi.update(teamId, {
        state: 'playing',
        assignedCourtId: targetCourt,
        startedAt: new Date(),
      });
      console.log(`✅ Updated team ${teamId} to playing in Supabase`);
      
      // Update player states to 'playing' in Supabase
      if (playersToUpdate.length > 0) {
        await Promise.all(
          playersToUpdate.map((playerId) => 
            playersApi.update(playerId, { state: 'playing' })
          )
        );
        console.log(`✅ Updated ${playersToUpdate.length} players to playing state in Supabase`);
      }
      
      addAuditLog('game_started', { teamId, courtId });
    } catch (error) {
      console.error('Failed to update team in Supabase:', error);
      addAuditLog('game_started', { teamId, courtId });
    }
  }, [addAuditLog, state.courts]);

  const endGame = useCallback(async (courtId: string) => {
    const playersToUpdate: { id: string, updates: Partial<Player> }[] = [];
    let teamToDelete: string | null = null;
    
    setState((prev) => {
      const court = prev.courts.find((c) => c.id === courtId);
      if (!court || !court.currentTeamId) return prev;
      
      const team = prev.teams.find((t) => t.id === court.currentTeamId);
      if (!team) return prev;
      
      // Store team ID to delete from Supabase
      teamToDelete = team.id;
      
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
          
          const playerUpdates = {
            state: 'waiting' as const,
            gameCount: p.gameCount + 1,
            lastGameEndAt: now,
            recentTeammates: teammates,
            teammateHistory,
          };
          
          // Store player updates to sync with Supabase (including state change)
          playersToUpdate.push({
            id: p.id,
            updates: {
              state: 'waiting',
              gameCount: p.gameCount + 1,
              lastGameEndAt: now,
              teammateHistory,
            },
          });
          
          return {
            ...p,
            ...playerUpdates,
          };
        }
        return p;
      });
      
      // Remove finished team from teams array
      const updatedTeams = prev.teams.filter((t) => t.id !== team.id);
      
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
    
    // Delete team from Supabase
    if (teamToDelete) {
      try {
        await teamsApi.delete(teamToDelete);
        console.log(`✅ Deleted team ${teamToDelete} from Supabase`);
      } catch (error) {
        console.error('Failed to delete team from Supabase:', error);
      }
    }
    
    // Update all players' game counts, state, and teammate history in Supabase
    try {
      for (const { id, updates } of playersToUpdate) {
        await playersApi.update(id, updates);
      }
      console.log(`✅ Updated ${playersToUpdate.length} players' game data and state in Supabase`);
    } catch (error) {
      console.error('Failed to update players in Supabase:', error);
    }
    
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

  const adjustGameCount = useCallback(async (playerId: string, delta: number) => {
    let newGameCount = 0;
    
    setState((prev) => {
      const player = prev.players.find(p => p.id === playerId);
      if (!player) return prev;
      
      newGameCount = Math.max(0, player.gameCount + delta);
      
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.id === playerId
            ? { ...p, gameCount: newGameCount }
            : p
        ),
      };
    });
    
    // Update game count in Supabase
    try {
      await playersApi.update(playerId, { gameCount: newGameCount });
      console.log(`✅ Updated player ${playerId} game count to ${newGameCount} in Supabase`);
    } catch (error) {
      console.error('Failed to update game count in Supabase:', error);
    }
    
    addAuditLog('game_count_adjusted', { playerId, delta });
  }, [addAuditLog]);

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      // Delete from Supabase first
      await teamsApi.delete(teamId);
      
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
      console.log(`✅ Deleted team ${teamId} from Supabase`);
      addAuditLog('team_deleted', { teamId });
    } catch (error) {
      console.error('Failed to delete team from Supabase:', error);
      // Still update local state even if API fails
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
    }
  }, [addAuditLog]);

  const updateTeam = useCallback(async (teamId: string, playerIds: string[]) => {
    try {
      // Update in Supabase first
      await teamsApi.update(teamId, { playerIds });
      
      setState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, playerIds } : t
        ),
      }));
      console.log(`✅ Updated team ${teamId} in Supabase`);
      addAuditLog('team_updated', { teamId, playerIds });
    } catch (error) {
      console.error('Failed to update team in Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        teams: prev.teams.map((t) =>
          t.id === teamId ? { ...t, playerIds } : t
        ),
      }));
      addAuditLog('team_updated', { teamId, playerIds });
    }
  }, [addAuditLog]);

  const resetSession = useCallback(async () => {
    try {
      // Reset game counts in Supabase
      await playersApi.resetGameCounts();
      
      // Update local state
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
    } catch (error) {
      console.error('Failed to reset game counts in Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
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
    }
  }, [addAuditLog]);

  // Member management functions with Supabase sync
  const addMember = useCallback(async (name: string, gender?: Gender, rank?: Rank) => {
    const member: Member = {
      id: `member-${Date.now()}-${Math.random()}`,
      name,
      gender,
      rank,
      createdAt: new Date(),
    };

    try {
      // Save to Supabase first
      await membersApi.add(member);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        members: [...prev.members, member],
      }));
      addAuditLog('member_added', { name, gender, rank });
    } catch (error) {
      console.error('Failed to add member to Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        members: [...prev.members, member],
      }));
      addAuditLog('member_added', { name, gender, rank });
    }
  }, [addAuditLog]);

  const updateMember = useCallback(async (memberId: string, updates: Partial<Member>) => {
    try {
      // Save to Supabase first
      await membersApi.update(memberId, updates);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, ...updates } : m
        ),
      }));
      addAuditLog('member_updated', { memberId, updates });
    } catch (error) {
      console.error('Failed to update member in Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.id === memberId ? { ...m, ...updates } : m
        ),
      }));
      addAuditLog('member_updated', { memberId, updates });
    }
  }, [addAuditLog]);

  const deleteMember = useCallback(async (memberId: string) => {
    try {
      // Delete from Supabase first
      await membersApi.delete(memberId);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
      }));
      addAuditLog('member_deleted', { memberId });
    } catch (error) {
      console.error('Failed to delete member from Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.id !== memberId),
      }));
      addAuditLog('member_deleted', { memberId });
    }
  }, [addAuditLog]);

  const addMemberAsPlayer = useCallback(async (memberId: string) => {
    try {
      const member = state.members.find((m) => m.id === memberId);
      if (!member) return;
      
      // Check for duplicate names
      const existing = state.players.filter((p) => p.name.startsWith(member.name));
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
      
      // Save to Supabase first
      await playersApi.add(player);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        players: [...prev.players, player],
      }));
      addAuditLog('member_added_as_player', { memberId });
    } catch (error) {
      console.error('Failed to add player to Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => {
        const member = prev.members.find((m) => m.id === memberId);
        if (!member) return prev;
        
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
    }
  }, [addAuditLog, state.members, state.players]);

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