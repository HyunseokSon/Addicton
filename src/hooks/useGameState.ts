import { useState, useEffect, useCallback } from 'react';
import { AppState, Player, Team, Court, Session, PlayerState, AuditLog, Member, Gender, Rank } from '../types';
import { autoMatch, updatePriorityStatus } from '../utils/matching';
import { createInitialMembers } from '../data/initialMembers';
import { membersApi } from '../utils/api/membersApi';
import { playersApi } from '../utils/api/playersApi';
import { teamsApi } from '../utils/api/teamsApi';

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
    console.log('🔍 Initializing state from Supabase only...');
    
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
    
    // Start with empty state - will be populated from Supabase
    return {
      session: defaultSession,
      members: [],
      players: [],
      teams: [],
      courts: createInitialCourts(4),
      auditLogs: [],
    };
  });

  // Load ALL data from Supabase on initial mount
  useEffect(() => {
    const loadFromSupabase = async () => {
      try {
        console.log('🔄 Loading all data from Supabase...');
        
        // Load members
        const membersFromDb = await membersApi.getAll();
        
        // Load players
        const playersFromDb = await playersApi.getAll();
        
        // Load teams
        const teamsFromDb = await teamsApi.getAll();
        const activeTeams = teamsFromDb.filter(t => t.state === 'queued' || t.state === 'playing');
        
        setState((prev) => {
          // Restore courts based on playing teams
          const restoredCourts = prev.courts.map(court => {
            const playingTeam = activeTeams.find(
              t => t.state === 'playing' && t.assignedCourtId === court.id
            );
            
            if (playingTeam) {
              return {
                ...court,
                status: 'occupied' as const,
                currentTeamId: playingTeam.id,
                timerMs: 0,
                isPaused: false,
              };
            }
            
            return {
              ...court,
              status: 'available' as const,
              currentTeamId: null,
              timerMs: 0,
              isPaused: false,
            };
          });
          
          // Update player states based on teams
          const teamPlayerIds = new Set(activeTeams.flatMap(t => t.playerIds));
          const restoredPlayers = playersFromDb.map(player => {
            if (!teamPlayerIds.has(player.id)) return player;
            
            const playerTeam = activeTeams.find(t => t.playerIds.includes(player.id));
            if (!playerTeam) return player;
            
            return {
              ...player,
              state: playerTeam.state === 'playing' ? 'playing' as const : 'queued' as const,
            };
          });
          
          console.log('✅ Data loaded from Supabase:', {
            members: membersFromDb.length,
            players: playersFromDb.length,
            teams: activeTeams.length,
          });
          
          return {
            ...prev,
            members: membersFromDb,
            players: restoredPlayers,
            teams: activeTeams,
            courts: restoredCourts,
          };
        });
      } catch (error) {
        console.error('⚠️ Failed to load data from Supabase:', error);
      }
    };

    loadFromSupabase();
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
      addAuditLog('player_deleted', { playerId, error: String(error) });
    }
  }, [addAuditLog]);

  const deletePlayers = useCallback(async (playerIds: string[]) => {
    try {
      console.log(`📤 Batch deleting ${playerIds.length} players from Supabase`);
      
      // Batch delete from Supabase first
      const deletedCount = await playersApi.deleteBatch(playerIds);
      
      console.log(`✅ Batch deleted ${deletedCount} players from Supabase`);
      
      // Update local state
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => !playerIds.includes(p.id)),
        teams: prev.teams.map((t) => ({
          ...t,
          playerIds: t.playerIds.filter((id) => !playerIds.includes(id)),
        })),
      }));
      
      addAuditLog('players_batch_deleted', { count: deletedCount });
      return deletedCount;
    } catch (error) {
      console.error('❌ Failed to batch delete players from Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => ({
        ...prev,
        players: prev.players.filter((p) => !playerIds.includes(p.id)),
        teams: prev.teams.map((t) => ({
          ...t,
          playerIds: t.playerIds.filter((id) => !playerIds.includes(id)),
        })),
      }));
      addAuditLog('players_batch_deleted', { count: 0, error: String(error) });
      throw error;
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
      // First, calculate what teams to create OUTSIDE of setState
      let newTeamsToCreate: Team[] = [];
      let playersToUpdate: string[] = [];
      
      // Get current state to calculate teams
      const currentState = state;
      
      if (!currentState.session) {
        console.log('⚠️ No session found');
        return;
      }
      
      console.log('🎯 Auto Match Started');
      console.log('  Total players:', currentState.players.length);
      console.log('  Player states:', currentState.players.reduce((acc, p) => {
        acc[p.state] = (acc[p.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      // Calculate max teams based on total courts AND current queued teams
      const totalCourts = currentState.session.courtsCount;
      const currentQueuedTeams = currentState.teams.filter(t => t.state === 'queued').length;
      const playingTeams = currentState.teams.filter(t => t.state === 'playing').length;
      
      console.log('  Total courts:', totalCourts);
      console.log('  Queued teams:', currentQueuedTeams);
      console.log('  Playing teams:', playingTeams);
      
      // 최대 대기 팀 수 = 총 코트 수
      // 새로 생성 가능한 팀 수 = 총 코트 수 - 현재 대기 팀 수
      const maxNewTeams = Math.max(0, totalCourts - currentQueuedTeams);
      
      console.log('  Max new teams to create:', maxNewTeams);
      
      // If no room for new teams, don't create any
      if (maxNewTeams === 0) {
        console.log('  ⚠️ No room for new teams - already have', currentQueuedTeams, 'queued teams (max:', totalCourts, ')');
        return;
      }
      
      const { teams: newTeams } = autoMatch(currentState.players, currentState.session.teamSize, maxNewTeams);
      
      console.log('  ✅ Created', newTeams.length, 'new teams');
      console.log('  Teams:', newTeams.map((t, i) => ({
        team: i + 1,
        players: t.playerIds.length,
        playerNames: currentState.players.filter(p => t.playerIds.includes(p.id)).map(p => p.name)
      })));
      
      // Store teams to be created
      newTeamsToCreate = newTeams;
      playersToUpdate = newTeams.flatMap((t) => t.playerIds);
      
      // Save new teams to Supabase FIRST
      if (newTeamsToCreate.length > 0) {
        console.log(`📤 Saving ${newTeamsToCreate.length} teams to Supabase...`);
        await teamsApi.addBatch(newTeamsToCreate);
        console.log(`✅ Saved ${newTeamsToCreate.length} teams to Supabase`);
      }
      
      // Update player states in Supabase using BATCH UPDATE
      if (playersToUpdate.length > 0) {
        console.log(`📤 Batch updating ${playersToUpdate.length} players to queued state...`);
        const playerUpdates = playersToUpdate.map((playerId) => ({
          playerId,
          updates: { state: 'queued' as const }
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Batch updated ${playersToUpdate.length} players to queued state in Supabase`);
      }
      
      // NOW update local state
      setState((prev) => {
        // Update player states to 'queued'
        const queuedPlayerIds = new Set(playersToUpdate);
        const updatedPlayers = prev.players.map((p) => {
          if (queuedPlayerIds.has(p.id)) {
            return { ...p, state: 'queued' as const };
          }
          return p;
        });
        
        return {
          ...prev,
          players: updatedPlayers,
          teams: [...prev.teams, ...newTeamsToCreate],
        };
      });
      
      addAuditLog('auto_match_performed', {});
    } catch (error) {
      console.error('❌ Failed to perform auto match:', error);
      addAuditLog('auto_match_performed', { error: String(error) });
      throw error;
    }
  }, [addAuditLog, state]);

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

  const startAllQueuedGames = useCallback(async () => {
    console.log('🎮 startAllQueuedGames called');
    
    // Get current state to determine what needs to be updated
    const queuedTeams = state.teams.filter((t) => t.state === 'queued');
    const availableCourts = state.courts.filter((c) => c.status === 'available');
    
    console.log(`Found ${queuedTeams.length} queued teams and ${availableCourts.length} available courts`);
    
    if (queuedTeams.length === 0 || availableCourts.length === 0) {
      console.log('No teams or courts available, returning');
      return 0;
    }
    
    // Match teams to courts
    const teamsToStart = queuedTeams.slice(0, availableCourts.length);
    const teamsToUpdate: { teamId: string; courtId: string }[] = [];
    const playersToUpdate: string[] = [];
    
    teamsToStart.forEach((team, index) => {
      const court = availableCourts[index];
      teamsToUpdate.push({ teamId: team.id, courtId: court.id });
      playersToUpdate.push(...team.playerIds);
    });
    
    console.log(`Prepared to start ${teamsToUpdate.length} teams`);
    
    try {
      // Update local state first
      setState((prev) => {
        let updatedTeams = [...prev.teams];
        let updatedCourts = [...prev.courts];
        let updatedPlayers = [...prev.players];
        
        teamsToStart.forEach((team, index) => {
          const court = availableCourts[index];
          
          // Update team
          updatedTeams = updatedTeams.map((t) =>
            t.id === team.id
              ? { ...t, state: 'playing' as const, assignedCourtId: court.id, startedAt: new Date() }
              : t
          );
          
          // Update court
          updatedCourts = updatedCourts.map((c) =>
            c.id === court.id
              ? { ...c, status: 'occupied' as const, currentTeamId: team.id, timerMs: 0 }
              : c
          );
          
          // Update players
          updatedPlayers = updatedPlayers.map((p) =>
            team.playerIds.includes(p.id) ? { ...p, state: 'playing' as const } : p
          );
        });
        
        return {
          ...prev,
          teams: updatedTeams,
          courts: updatedCourts,
          players: updatedPlayers,
        };
      });
      
      console.log('✅ Local state updated');
      
      // Batch update teams in Supabase
      if (teamsToUpdate.length > 0) {
        console.log(`🔄 Updating ${teamsToUpdate.length} teams in Supabase...`);
        await Promise.all(
          teamsToUpdate.map(({ teamId, courtId }) =>
            teamsApi.update(teamId, {
              state: 'playing',
              assignedCourtId: courtId,
              startedAt: new Date(),
            })
          )
        );
        console.log(`✅ Batch started ${teamsToUpdate.length} teams in Supabase`);
      }
      
      // Batch update players in Supabase
      if (playersToUpdate.length > 0) {
        const uniquePlayerIds = [...new Set(playersToUpdate)];
        await Promise.all(
          uniquePlayerIds.map((playerId) =>
            playersApi.update(playerId, { state: 'playing' })
          )
        );
        console.log(`✅ Updated ${uniquePlayerIds.length} players to playing state in Supabase`);
      }
      
      addAuditLog('batch_games_started', { count: teamsToUpdate.length });
      return teamsToUpdate.length;
    } catch (error) {
      console.error('Failed to batch start games:', error);
      return 0;
    }
  }, [addAuditLog, state.teams, state.courts]);

  const endGame = useCallback(async (courtId: string) => {
    console.log('🎮 endGame called for courtId:', courtId);
    
    // Get current state to find team and players
    const court = state.courts.find((c) => c.id === courtId);
    if (!court || !court.currentTeamId) {
      console.log('❌ Court not found or no team:', { court, courtId });
      return;
    }
    
    const team = state.teams.find((t) => t.id === court.currentTeamId);
    if (!team) {
      console.log('❌ Team not found:', court.currentTeamId);
      return;
    }
    
    console.log(`✅ Found team ${team.id} with ${team.playerIds.length} players`);
    
    const teamToDelete = team.id;
    const playersToUpdate: { id: string, updates: Partial<Player> }[] = [];
    const now = new Date();
    
    // Prepare player updates
    team.playerIds.forEach(playerId => {
      const player = state.players.find(p => p.id === playerId);
      if (player) {
        const teammates = team.playerIds.filter(id => id !== playerId);
        const teammateHistory = { ...(player.teammateHistory || {}) };
        
        for (const teammateId of teammates) {
          teammateHistory[teammateId] = (teammateHistory[teammateId] || 0) + 1;
        }
        
        playersToUpdate.push({
          id: playerId,
          updates: {
            state: 'waiting',
            gameCount: player.gameCount + 1,
            lastGameEndAt: now,
            teammateHistory,
          },
        });
      }
    });
    
    console.log(`🔄 Prepared to update ${playersToUpdate.length} players, delete team ${teamToDelete}`);
    
    try {
      // Update local state first
      setState((prev) => {
        const updatedPlayers = prev.players.map((p) => {
          const update = playersToUpdate.find(u => u.id === p.id);
          if (update) {
            const teammates = team.playerIds.filter(id => id !== p.id);
            return {
              ...p,
              state: 'waiting' as const,
              gameCount: p.gameCount + 1,
              lastGameEndAt: now,
              recentTeammates: teammates,
              teammateHistory: update.updates.teammateHistory,
            };
          }
          return p;
        });
        
        // Auto-update priority status
        const priorityUpdatedPlayers = updatePriorityStatus(updatedPlayers);
        
        // Remove finished team from teams array
        const updatedTeams = prev.teams.filter((t) => t.id !== teamToDelete);
        
        const updatedCourts = prev.courts.map((c) =>
          c.id === courtId
            ? { ...c, status: 'available' as const, currentTeamId: null, timerMs: 0, isPaused: false }
            : c
        );
        
        return {
          ...prev,
          players: priorityUpdatedPlayers,
          teams: updatedTeams,
          courts: updatedCourts,
        };
      });
      
      console.log('✅ Local state updated, now syncing to Supabase...');
      
      // Delete team from Supabase
      await teamsApi.delete(teamToDelete);
      console.log(`✅ Deleted team ${teamToDelete} from Supabase`);
      
      // Update all players' game counts, state, and teammate history in Supabase using BATCH UPDATE
      if (playersToUpdate.length > 0) {
        console.log(`📤 Batch updating ${playersToUpdate.length} players' game data and state in Supabase...`);
        const playerUpdates = playersToUpdate.map(({ id, updates }) => ({
          playerId: id,
          updates: updates,
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Batch updated ${playersToUpdate.length} players' game data and state in Supabase`);
      }
      
      addAuditLog('game_ended', { courtId });
      console.log('✅ endGame completed');
    } catch (error) {
      console.error('❌ Failed to end game:', error);
      throw error;
    }
  }, [addAuditLog, state.courts, state.teams, state.players]);

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
      let playersToUpdate: string[] = [];
      
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        
        playersToUpdate = team.playerIds;
        
        const updatedPlayers = prev.players.map((p) =>
          team.playerIds.includes(p.id) ? { ...p, state: 'waiting' as const } : p
        );
        
        return {
          ...prev,
          teams: prev.teams.filter((t) => t.id !== teamId),
          players: updatedPlayers,
        };
      });
      
      // Delete team from Supabase
      await teamsApi.delete(teamId);
      
      // Update all affected players in Supabase
      await Promise.all(
        playersToUpdate.map(playerId => 
          playersApi.update(playerId, { state: 'waiting' })
        )
      );
      
      console.log(`✅ Deleted team ${teamId} and updated ${playersToUpdate.length} players in Supabase`);
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
    console.log('🔄 Starting session reset...');
    
    try {
      // 1. Get all playing teams to end their games
      const playingTeams = state.teams.filter((t) => t.state === 'playing');
      console.log(`Found ${playingTeams.length} playing teams to end`);
      
      // 2. Get all queued teams to delete
      const queuedTeams = state.teams.filter((t) => t.state === 'queued');
      console.log(`Found ${queuedTeams.length} queued teams to delete`);
      
      // 3. Get all players to reset (NOT delete, just reset their stats)
      const allPlayers = state.players;
      console.log(`Found ${allPlayers.length} players to reset game stats`);
      
      // 4. Delete ALL teams (playing + queued) from Supabase
      const allTeamIds = [...playingTeams, ...queuedTeams].map(t => t.id);
      if (allTeamIds.length > 0) {
        await Promise.all(allTeamIds.map(teamId => teamsApi.delete(teamId)));
        console.log(`✅ Deleted ${allTeamIds.length} teams from Supabase`);
      }
      
      // 5. Reset ALL players' game stats in Supabase (keep players, just reset stats)
      if (allPlayers.length > 0) {
        console.log(`📤 Batch resetting ${allPlayers.length} players' game stats in Supabase...`);
        const playerUpdates = allPlayers.map((player) => ({
          playerId: player.id,
          updates: {
            state: 'waiting' as const,
            gameCount: 0,
            lastGameEndAt: null,
            recentTeammates: [],
            teammateHistory: {},
          }
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Batch reset ${allPlayers.length} players' game stats in Supabase`);
      }
      
      // 6. Update local state - KEEP players, just reset their stats
      setState((prev) => {
        return {
          ...prev,
          players: prev.players.map(p => ({
            ...p,
            state: 'waiting' as const,
            gameCount: 0,
            lastGameEndAt: null,
            recentTeammates: [],
            teammateHistory: {},
          })),
          teams: [], // Clear all teams
          courts: prev.courts.map((c) => ({
            ...c,
            status: 'available' as const,
            currentTeamId: null,
            timerMs: 0,
            isPaused: false,
          })),
          auditLogs: [],
        };
      });
      
      console.log('✅ Session reset complete - games ended, teams deleted, players kept but stats reset');
      addAuditLog('session_reset', {
        playingTeamsEnded: playingTeams.length,
        queuedTeamsDeleted: queuedTeams.length,
        playersReset: allPlayers.length,
      });
    } catch (error) {
      console.error('❌ Failed to reset session:', error);
      throw error;
    }
  }, [addAuditLog, state.teams, state.players]);

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
    const member = state.members.find(m => m.id === memberId);
    if (member) {
      // Check if member already registered with exact name match
      const existingPlayer = state.players.find(p => p.name === member.name);
      if (!existingPlayer) {
        // Create unique name if duplicate exists
        const existing = state.players.filter((p) => p.name === member.name || p.name.startsWith(`${member.name}(`));
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
        
        // Save to Supabase FIRST
        console.log(`📤 Adding player to Supabase:`, player.name);
        await playersApi.add(player);
        console.log(`✅ Added player to Supabase:`, player.name);
        
        // Then update local state
        setState((prev) => {
          return {
            ...prev,
            players: [...prev.players, player],
          };
        });
        addAuditLog('member_added_as_player', { memberId });
      }
    }
  }, [addAuditLog, state.members, state.players]);

  const addMembersAsPlayers = useCallback(async (memberIds: string[]) => {
    try {
      const newPlayers: Player[] = [];
      
      // First, get current state to check for duplicates
      const currentPlayers = state.players;
      
      memberIds.forEach(memberId => {
        const member = state.members.find(m => m.id === memberId);
        if (member) {
          // Check if member already registered with exact name match
          const existingPlayer = currentPlayers.find(p => p.name === member.name);
          const alreadyInNewPlayers = newPlayers.find(p => p.name === member.name);
          
          if (!existingPlayer && !alreadyInNewPlayers) {
            // Create unique name if duplicate exists
            const existing = [...currentPlayers, ...newPlayers].filter((p) => 
              p.name === member.name || p.name.startsWith(`${member.name}(`)
            );
            const finalName = existing.length > 0 ? `${member.name}(${existing.length + 1})` : member.name;
            
            const player: Player = {
              id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${memberId}`,
              name: finalName,
              state: 'waiting',
              gender: member.gender,
              rank: member.rank,
              gameCount: 0,
              lastGameEndAt: null,
              createdAt: new Date(),
            };
            
            newPlayers.push(player);
          }
        }
      });
      
      // Batch save to Supabase FIRST using batch API
      if (newPlayers.length > 0) {
        console.log(`📤 Batch saving ${newPlayers.length} players to Supabase:`, newPlayers.map(p => p.name));
        
        // Use batch API for better performance
        await playersApi.addBatch(newPlayers);
        
        console.log(`✅ Batch added ${newPlayers.length} players to Supabase`);
        
        // Then update local state
        setState((prev) => ({
          ...prev,
          players: [...prev.players, ...newPlayers],
        }));
      }
      
      addAuditLog('batch_members_added_as_players', { count: newPlayers.length });
      return newPlayers.length;
    } catch (error) {
      console.error('❌ Failed to batch add players to Supabase:', error);
      addAuditLog('batch_members_added_as_players', { count: 0, error: String(error) });
      throw error; // Re-throw to handle in UI
    }
  }, [addAuditLog, state.members, state.players]);

  const syncFromSupabase = useCallback(async () => {
    try {
      console.log('🔄 Manual sync from Supabase...');
      
      // Load members
      const membersFromDb = await membersApi.getAll();
      console.log(`📦 Loaded ${membersFromDb.length} members from Supabase`);
      
      // Load players
      const playersFromDb = await playersApi.getAll();
      console.log(`👥 Loaded ${playersFromDb.length} players from Supabase:`, playersFromDb.map(p => ({ id: p.id, name: p.name, state: p.state })));
      
      // Load teams
      const teamsFromDb = await teamsApi.getAll();
      console.log(`🏐 RAW teams from Supabase:`, teamsFromDb.map(t => ({ id: t.id, name: t.name, state: t.state, playerIds: t.playerIds })));
      
      const activeTeams = teamsFromDb.filter(t => t.state === 'queued' || t.state === 'playing');
      const finishedTeams = teamsFromDb.filter(t => t.state === 'finished');
      
      console.log(`🏐 Loaded ${activeTeams.length} active teams from Supabase (total: ${teamsFromDb.length}):`, 
        activeTeams.map(t => ({ id: t.id, name: t.name, state: t.state, playerCount: t.playerIds.length })));
      
      // Clean up finished teams if there are any
      if (finishedTeams.length > 0) {
        console.log(`🧹 Cleaning up ${finishedTeams.length} finished teams from Supabase...`);
        await teamsApi.deleteFinished();
        console.log(`✅ Cleaned up ${finishedTeams.length} finished teams`);
      }
      
      // Update local state with all data from Supabase
      setState((prev) => {
        // Rebuild courts based on teams data
        let updatedCourts = [...prev.courts];
        
        // First, reset all courts to available
        updatedCourts = updatedCourts.map(court => ({
          ...court,
          status: 'available' as const,
          currentTeamId: null,
          timerMs: 0,
        }));
        
        // Then, assign playing teams to courts
        activeTeams.forEach(team => {
          if (team.state === 'playing' && team.assignedCourtId) {
            const courtIndex = updatedCourts.findIndex(c => c.id === team.assignedCourtId);
            if (courtIndex !== -1) {
              updatedCourts[courtIndex] = {
                ...updatedCourts[courtIndex],
                status: 'occupied' as const,
                currentTeamId: team.id,
              };
            }
          }
        });
        
        // Sync player states with team data
        // Build a map of player IDs to their team state
        const playerTeamStateMap = new Map<string, 'queued' | 'playing'>();
        activeTeams.forEach(team => {
          team.playerIds.forEach(playerId => {
            playerTeamStateMap.set(playerId, team.state);
          });
        });
        
        // Update player states based on team data
        const syncedPlayers = playersFromDb.map(player => {
          const teamState = playerTeamStateMap.get(player.id);
          if (teamState) {
            // Player is in an active team, sync their state
            return { ...player, state: teamState };
          } else if (player.state === 'queued' || player.state === 'playing') {
            // Player thinks they're in a team but they're not - reset to waiting
            console.log(`⚠️ Player ${player.name} (${player.id}) has state '${player.state}' but no team found. Resetting to 'waiting'`);
            return { ...player, state: 'waiting' as const };
          }
          // Player state is waiting/priority/resting - keep as is
          return player;
        });
        
        return {
          ...prev,
          members: membersFromDb,
          players: syncedPlayers,
          teams: activeTeams,
          courts: updatedCourts,
        };
      });
      
      console.log('✅ Sync from Supabase complete');
      return true;
    } catch (error) {
      console.error('⚠️ Failed to sync from Supabase:', error);
      return false;
    }
  }, []);

  const resetMembers = useCallback(async () => {
    console.log('🔄 Starting members reset...');
    
    try {
      // 1. Delete all existing players from Supabase
      const allPlayerIds = state.players.map(p => p.id);
      if (allPlayerIds.length > 0) {
        await deletePlayers(allPlayerIds);
        console.log(`✅ Deleted ${allPlayerIds.length} players from Supabase`);
      }
      
      // 2. Create new initial members (70 people)
      const newMembers = createInitialMembers();
      console.log(`📤 Resetting members in Supabase (${newMembers.length} new members)...`);
      
      // 3. Atomic reset: delete all old members and add new ones
      const { deletedCount, addedCount } = await membersApi.reset(newMembers);
      console.log(`✅ Reset complete: deleted ${deletedCount} members, added ${addedCount} members`);
      
      // 4. Update local state
      setState((prev) => ({
        ...prev,
        members: newMembers,
        players: [], // Clear all players
      }));
      
      console.log('✅ Members reset complete - 70 new members added, all players cleared');
      addAuditLog('members_reset', {
        deletedMembers: deletedCount,
        deletedPlayers: allPlayerIds.length,
        addedMembers: addedCount,
      });
      
      return addedCount;
    } catch (error) {
      console.error('❌ Failed to reset members:', error);
      throw error;
    }
  }, [addAuditLog, state.players, deletePlayers]);

  return {
    state,
    createSession,
    updateSession,
    addPlayer,
    updatePlayer,
    deletePlayer,
    deletePlayers,
    updatePlayerState,
    performAutoMatch,
    startGame,
    startAllQueuedGames,
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
    addMembersAsPlayers,
    syncFromSupabase,
    resetMembers,
  };
}