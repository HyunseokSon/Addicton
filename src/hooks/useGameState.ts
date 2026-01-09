import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { AppState, Player, Team, Court, Session, PlayerState, AuditLog, Member, Gender, Rank } from '../types';
import { autoMatch, updatePriorityStatus } from '../utils/matching';
import { createInitialMembers } from '../data/initialMembers';
import { membersApi } from '../utils/api/membersApi';
import { playersApi } from '../utils/api/playersApi';
import { teamsApi } from '../utils/api/teamsApi';
import { settingsApi } from '../utils/api/settingsApi';

// Convert index to letter (0 -> A, 1 -> B, ..., 25 -> Z, 26 -> AA, etc.)
function indexToLetter(index: number): string {
  let result = '';
  let num = index;
  while (num >= 0) {
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26) - 1;
  }
  return result;
}

function createInitialCourts(count: number): Court[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `court-${i}`,
    index: i + 1,
    name: indexToLetter(i),
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
        
        // Load courtsCount from settings
        const courtsCountStr = await settingsApi.get('courts_count');
        const courtsCount = courtsCountStr ? parseInt(courtsCountStr, 10) : 4;
        console.log(`📊 Loaded courtsCount: ${courtsCount} from Supabase settings`);
        
        // Load court names from settings
        const courtNamesStr = await settingsApi.get('court_names');
        const courtNamesMap: Record<string, string> = courtNamesStr ? JSON.parse(courtNamesStr) : {};
        console.log(`📊 Loaded court names:`, courtNamesMap);
        
        // Load members
        const membersFromDb = await membersApi.getAll();
        
        // Load players
        const playersFromDb = await playersApi.getAll();
        
        // Load teams
        const teamsFromDb = await teamsApi.getAll();
        let activeTeams = teamsFromDb.filter(t => t.state === 'queued' || t.state === 'playing');
        
        // 🧹 DATA CLEANUP: Fix teams that exceed court capacity
        const playingTeams = activeTeams.filter(t => t.state === 'playing');
        if (playingTeams.length > courtsCount) {
          console.log(`🧹 CLEANUP: Found ${playingTeams.length} playing teams but only ${courtsCount} courts - fixing...`);
          
          // Keep only the first N teams (by createdAt), move rest back to queued
          const sortedPlayingTeams = [...playingTeams].sort((a, b) => 
            (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0)
          );
          const teamsToKeepPlaying = sortedPlayingTeams.slice(0, courtsCount);
          const teamsToMoveToQueued = sortedPlayingTeams.slice(courtsCount);
          
          console.log(`   Keeping ${teamsToKeepPlaying.length} playing teams, moving ${teamsToMoveToQueued.length} back to queued`);
          
          // Update teams to queued in Supabase
          for (const team of teamsToMoveToQueued) {
            await teamsApi.update(team.id, {
              state: 'queued',
              assignedCourtId: null,
              startedAt: null,
            });
            console.log(`   ✅ Moved team ${team.name} back to queued`);
            
            // Update players back to queued
            const playerUpdates = team.playerIds.map(playerId => ({
              playerId,
              updates: { state: 'queued' as const }
            }));
            await playersApi.updateBatch(playerUpdates);
          }
          
          // Refresh active teams
          activeTeams = [
            ...teamsToKeepPlaying,
            ...teamsToMoveToQueued.map(t => ({ ...t, state: 'queued' as const, assignedCourtId: null })),
            ...activeTeams.filter(t => t.state === 'queued')
          ];
          
          console.log(`✅ CLEANUP complete: ${teamsToKeepPlaying.length} playing, ${activeTeams.filter(t => t.state === 'queued').length} queued`);
        }
        
        setState((prev) => {
          // Create courts array based on loaded courtsCount
          const courtsToCreate = Math.max(courtsCount, prev.courts.length);
          let updatedCourts = prev.courts;
          
          if (courtsToCreate > prev.courts.length) {
            const additionalCourts = Array.from({ length: courtsToCreate - prev.courts.length }, (_, i) => {
              const courtId = `court-${prev.courts.length + i}`;
              return {
                id: courtId,
                index: prev.courts.length + i + 1,
                name: courtNamesMap[courtId] || indexToLetter(prev.courts.length + i),
                status: 'available' as const,
                timerMs: 0,
                currentTeamId: null,
                isPaused: false,
              };
            });
            updatedCourts = [...prev.courts, ...additionalCourts];
          } else {
            // Apply saved court names to existing courts
            updatedCourts = prev.courts.map(court => ({
              ...court,
              name: courtNamesMap[court.id] || court.name,
            }));
          }
          
          // Restore courts based on playing teams
          const restoredCourts = updatedCourts.map(court => {
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
            courtsCount,
            members: membersFromDb.length,
            players: playersFromDb.length,
            teams: activeTeams.length,
          });
          
          return {
            ...prev,
            session: prev.session ? { ...prev.session, courtsCount } : prev.session,
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
        const maxCourts = 20; // Maximum number of courts to maintain
        
        if (updates.courtsCount > prev.courts.length) {
          // Add courts up to the new count (but not more than max)
          const toAdd = Math.min(updates.courtsCount, maxCourts) - prev.courts.length;
          if (toAdd > 0) {
            const additionalCourts = Array.from({ length: toAdd }, (_, i) => ({
              id: `court-${Date.now()}-${i}`,
              index: prev.courts.length + i + 1,
              name: indexToLetter(prev.courts.length + i),
              status: 'available' as const,
              timerMs: 0,
              currentTeamId: null,
              isPaused: false,
            }));
            newCourts = [...prev.courts, ...additionalCourts];
          }
        }
        // When reducing count, keep all courts in memory (don't remove them)
        // They will be filtered out when displaying based on courtsCount
        
        // Save courtsCount to Supabase settings
        settingsApi.set('courts_count', updates.courtsCount).then(() => {
          console.log(`✅ Saved courtsCount ${updates.courtsCount} to Supabase settings`);
        }).catch((error) => {
          console.error('Failed to save courtsCount to Supabase:', error);
        });
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

  const startGame = useCallback(async (teamId: string, courtId?: string): Promise<{ success: boolean; reason?: string }> => {
    console.log(`🎮 startGame called for teamId: ${teamId}, courtId: ${courtId || 'auto'}`);
    
    try {
      let playersToUpdate: string[] = [];
      let targetCourtId: string | null = null;
      let gameStarted = false;
      let failureReason: string | undefined = undefined;
      
      // Update local state - with DOUBLE CHECK inside setState
      setState((prev) => {
        // RE-CHECK inside setState with LATEST state
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) {
          console.log('⚠️ Team not found:', teamId);
          failureReason = 'team_not_found';
          return prev;
        }
        
        // Check if team is already playing
        if (team.state === 'playing') {
          console.log('⚠️ Team is already playing:', teamId);
          failureReason = 'team_already_playing';
          return prev;
        }
        
        // ⭐ NEW: Check if any player in the team is currently playing
        const playingPlayers = team.playerIds.filter(playerId => {
          const player = prev.players.find(p => p.id === playerId);
          return player && player.state === 'playing';
        });
        
        if (playingPlayers.length > 0) {
          const playingPlayerNames = playingPlayers
            .map(playerId => prev.players.find(p => p.id === playerId)?.name)
            .filter(Boolean)
            .join(', ');
          console.log(`⚠️ Cannot start: ${playingPlayers.length} player(s) in this team are already playing: ${playingPlayerNames}`);
          failureReason = `duplicate_players:${playingPlayerNames}`;
          return prev; // NO STATE CHANGE
        }
        
        // Count current playing teams
        const playingTeamsCount = prev.teams.filter(t => t.state === 'playing').length;
        const totalCourts = prev.session?.courtsCount || 0;
        
        // CRITICAL CHECK: Don't exceed court capacity
        if (playingTeamsCount >= totalCourts) {
          console.log(`⚠️ Court capacity reached: ${playingTeamsCount}/${totalCourts} courts occupied`);
          failureReason = 'no_available_courts';
          return prev; // NO STATE CHANGE
        }
        
        // Find available court using LATEST state
        const targetCourt = courtId
          ? prev.courts.find((c) => c.id === courtId && c.status === 'available')
          : prev.courts.find((c) => c.status === 'available');
        
        if (!targetCourt || !prev.session) {
          console.log('⚠️ No available court to start game');
          console.log('   Available courts:', prev.courts.filter(c => c.status === 'available').map(c => c.name).join(', ') || 'none');
          failureReason = 'no_available_courts';
          return prev; // NO STATE CHANGE
        }
        
        console.log(`✅ Court available: ${targetCourt.name} (${targetCourt.id}), starting game... (${playingTeamsCount + 1}/${totalCourts})`);
        
        // Store for Supabase update
        playersToUpdate = team.playerIds;
        targetCourtId = targetCourt.id;
        gameStarted = true;
        
        // Update state
        const updatedTeams = prev.teams.map((t) =>
          t.id === teamId
            ? { ...t, state: 'playing' as const, assignedCourtId: targetCourt.id, startedAt: new Date() }
            : t
        );
        
        const updatedCourts = prev.courts.map((c) =>
          c.id === targetCourt.id
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
      
      console.log(`🔍 After setState: gameStarted = ${gameStarted}, targetCourtId = ${targetCourtId}, failureReason = ${failureReason}`);
      
      // If game didn't start, return early WITHOUT Supabase update
      if (!gameStarted || !targetCourtId) {
        console.log('❌ Game NOT started - returning false');
        return { success: false, reason: failureReason };
      }
      
      console.log(`✅ Local state updated, now updating Supabase...`);
      
      // Update team state in Supabase
      await teamsApi.update(teamId, {
        state: 'playing',
        assignedCourtId: targetCourtId,
        startedAt: new Date(),
      });
      console.log(`✅ Updated team ${teamId} to playing with courtId ${targetCourtId} in Supabase`);
      
      // Batch update player states to 'playing' in Supabase
      if (playersToUpdate.length > 0) {
        console.log(`📤 Batch updating ${playersToUpdate.length} players to playing state...`);
        const playerUpdates = playersToUpdate.map((playerId) => ({
          playerId,
          updates: { state: 'playing' as const }
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Batch updated ${playersToUpdate.length} players to playing state in Supabase`);
      }
      
      addAuditLog('game_started', { teamId, courtId });
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      addAuditLog('game_started', { teamId, courtId, error: String(error) });
      return { success: false, reason: 'error' };
    }
  }, [addAuditLog]);

  const startAllQueuedGames = useCallback(async () => {
    console.log('🎮 startAllQueuedGames called');
    
    let startedCount = 0;
    const updatesRef = { 
      teams: [] as { teamId: string; courtId: string }[], 
      players: [] as string[] 
    };
    
    try {
      // ⭐ Use flushSync to force synchronous setState execution
      flushSync(() => {
        setState((prev) => {
        // Get queued teams from LATEST state
        const allQueuedTeams = prev.teams
          .filter((t) => t.state === 'queued')
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        // ⭐ Filter out teams with playing players
        const queuedTeams = allQueuedTeams.filter(team => {
          const hasPlayingPlayer = team.playerIds.some(playerId => {
            const player = prev.players.find(p => p.id === playerId);
            return player && player.state === 'playing';
          });
          
          if (hasPlayingPlayer) {
            console.log(`⚠️ Skipping team ${team.id}: contains playing player(s)`);
          }
          
          return !hasPlayingPlayer;
        });
        
        // Count current playing teams
        const playingTeamsCount = prev.teams.filter(t => t.state === 'playing').length;
        const totalCourts = prev.session?.courtsCount || 0;
        const availableSlotsCount = totalCourts - playingTeamsCount;
        
        // Get available courts
        const availableCourts = prev.courts.filter((c) => c.status === 'available');
        
        console.log(`📊 Status: ${allQueuedTeams.length} total queued (${queuedTeams.length} startable), ${playingTeamsCount} playing, ${availableCourts.length} available courts, ${availableSlotsCount} free slots (max: ${totalCourts})`);
        
        // CRITICAL CHECK: Don't exceed court capacity
        if (availableSlotsCount <= 0 || availableCourts.length === 0) {
          console.log(`⚠️ Cannot start: No available slots or courts (${playingTeamsCount}/${totalCourts} occupied)`);
          return prev; // NO STATE CHANGE
        }
        
        // If no queued teams, return immediately
        if (queuedTeams.length === 0) {
          console.log('⚠️ Cannot start: No startable queued teams');
          return prev; // NO STATE CHANGE
        }
        
        // IMPORTANT: Only start as many teams as we have BOTH available courts AND available slots
        const maxTeamsToStart = Math.min(queuedTeams.length, availableCourts.length, availableSlotsCount);
        
        let updatedTeams = [...prev.teams];
        let updatedCourts = [...prev.courts];
        let updatedPlayers = [...prev.players];
        
        // Track players who are starting in THIS batch
        const startingPlayerIds = new Set<string>();
        const teamsActuallyStarted: typeof queuedTeams = [];
        
        // Try to start teams one by one, checking for player conflicts
        for (let i = 0; i < maxTeamsToStart; i++) {
          const team = queuedTeams[i];
          const court = availableCourts[i];
          
          // Check if any player in this team is already starting in THIS batch
          const hasConflict = team.playerIds.some(playerId => startingPlayerIds.has(playerId));
          
          if (hasConflict) {
            const conflictingPlayers = team.playerIds
              .filter(playerId => startingPlayerIds.has(playerId))
              .map(playerId => prev.players.find(p => p.id === playerId)?.name || playerId);
            console.log(`⚠️ Skipping team ${team.name || team.id}: player(s) already in another starting game: ${conflictingPlayers.join(', ')}`);
            continue; // Skip this team
          }
          
          // No conflict - add this team's players to the starting set
          team.playerIds.forEach(playerId => startingPlayerIds.add(playerId));
          teamsActuallyStarted.push(team);
          
          // Store for Supabase update
          updatesRef.teams.push({ teamId: team.id, courtId: court.id });
          updatesRef.players.push(...team.playerIds);
          
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
        }
        
        startedCount = teamsActuallyStarted.length; // Set count AFTER filtering
        console.log(`✅ Will start ${startedCount} teams (after conflict check)`);
        
        return {
          ...prev,
          teams: updatedTeams,
          courts: updatedCourts,
          players: updatedPlayers,
        };
        });
      });
      
      console.log(`🔍 After setState: startedCount=${startedCount}, updatesRef.teams.length=${updatesRef.teams.length}`);
      
      // If no teams were started, return early
      if (startedCount === 0) {
        console.log('❌ No teams started - returning 0');
        return 0;
      }
      
      console.log(`✅ Local state updated, now updating ${updatesRef.teams.length} teams in Supabase...`);
      
      // Batch update teams in Supabase
      if (updatesRef.teams.length > 0) {
        console.log(`🔄 Batch updating ${updatesRef.teams.length} teams...`);
        await Promise.all(
          updatesRef.teams.map(({ teamId, courtId }) =>
            teamsApi.update(teamId, {
              state: 'playing',
              assignedCourtId: courtId,
              startedAt: new Date(),
            })
          )
        );
        console.log(`✅ Batch updated ${updatesRef.teams.length} teams in Supabase`);
      }
      
      // Batch update players in Supabase
      if (updatesRef.players.length > 0) {
        const uniquePlayerIds = [...new Set(updatesRef.players)];
        console.log(`🔄 Batch updating ${uniquePlayerIds.length} unique players...`);
        await Promise.all(
          uniquePlayerIds.map((playerId) =>
            playersApi.update(playerId, { state: 'playing' })
          )
        );
        console.log(`✅ Updated ${uniquePlayerIds.length} players to playing state in Supabase`);
      }
      
      addAuditLog('batch_games_started', { count: startedCount });
      console.log(`✅ Batch start complete: returning ${startedCount}`);
      return startedCount;
    } catch (error) {
      console.error('❌ Failed to batch start games:', error);
      return 0;
    }
  }, [addAuditLog]);

  const endGame = useCallback(async (courtId: string) => {
    console.log('🎮 endGame called for courtId:', courtId);
    
    try {
      // Get current state snapshot
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
      
      // Prepare player updates BEFORE setState
      team.playerIds.forEach(playerId => {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
          const teammates = team.playerIds.filter(id => id !== playerId);
          const teammateHistory = { ...(player.teammateHistory || {}) };
          
          for (const teammateId of teammates) {
            teammateHistory[teammateId] = (teammateHistory[teammateId] || 0) + 1;
          }
          
          // ⭐ Check if player is in any other queued team
          const otherQueuedTeams = state.teams.filter(t => 
            t.id !== team.id && 
            t.state === 'queued' && 
            t.playerIds.includes(playerId)
          );
          
          // If player is in other queued teams, keep them as 'queued', otherwise 'waiting'
          const newState = otherQueuedTeams.length > 0 ? 'queued' : 'waiting';
          
          console.log(`📊 Player ${player.name}: other queued teams = ${otherQueuedTeams.length}, new state = ${newState}`);
          
          playersToUpdate.push({
            id: playerId,
            updates: {
              state: newState,
              gameCount: player.gameCount + 1,
              lastGameEndAt: now,
              teammateHistory,
            },
          });
        }
      });
      
      console.log(`🔄 Prepared to update ${playersToUpdate.length} players, delete team ${teamToDelete}`);
      
      // Update local state using prepared updates
      setState((prev) => {
        const updatedPlayers = prev.players.map((p) => {
          const update = playersToUpdate.find(u => u.id === p.id);
          if (update) {
            const teammates = team.playerIds.filter(id => id !== p.id);
            return {
              ...p,
              ...update.updates,
              recentTeammates: teammates,
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

  const endAllGames = useCallback(async () => {
    console.log('🎮 endAllGames called - ending all playing games');
    
    // Find all courts with active games
    const activeCourts = state.courts.filter(c => c.status === 'occupied' && c.currentTeamId);
    
    if (activeCourts.length === 0) {
      console.log('❌ No active games to end');
      return 0;
    }
    
    console.log(`✅ Found ${activeCourts.length} active games to end`);
    
    const allPlayersToUpdate: { id: string, updates: Partial<Player>, recentTeammates: string[] }[] = [];
    const allTeamsToDelete: string[] = [];
    const now = new Date();
    
    // Prepare updates for all active games
    for (const court of activeCourts) {
      const team = state.teams.find((t) => t.id === court.currentTeamId);
      if (!team) continue;
      
      allTeamsToDelete.push(team.id);
      
      // Prepare player updates for this team
      team.playerIds.forEach(playerId => {
        const player = state.players.find(p => p.id === playerId);
        if (player) {
          const teammates = team.playerIds.filter(id => id !== playerId);
          const teammateHistory = { ...(player.teammateHistory || {}) };
          
          for (const teammateId of teammates) {
            teammateHistory[teammateId] = (teammateHistory[teammateId] || 0) + 1;
          }
          
          // ⭐ Check if player is in any other queued team (excluding teams being deleted)
          const otherQueuedTeams = state.teams.filter(t => 
            !allTeamsToDelete.includes(t.id) && 
            t.id !== team.id && 
            t.state === 'queued' && 
            t.playerIds.includes(playerId)
          );
          
          // If player is in other queued teams, keep them as 'queued', otherwise 'waiting'
          const newState = otherQueuedTeams.length > 0 ? 'queued' : 'waiting';
          
          allPlayersToUpdate.push({
            id: playerId,
            updates: {
              state: newState,
              gameCount: player.gameCount + 1,
              lastGameEndAt: now,
              teammateHistory,
            },
            recentTeammates: teammates,
          });
        }
      });
    }
    
    console.log(`🔄 Prepared to update ${allPlayersToUpdate.length} players, delete ${allTeamsToDelete.length} teams`);
    
    try {
      // Update local state first
      setState((prev) => {
        const updatedPlayers = prev.players.map((p) => {
          const update = allPlayersToUpdate.find(u => u.id === p.id);
          if (update) {
            return {
              ...p,
              ...update.updates,
              recentTeammates: update.recentTeammates,
            };
          }
          return p;
        });
        
        // Auto-update priority status
        const priorityUpdatedPlayers = updatePriorityStatus(updatedPlayers);
        
        // Remove all finished teams
        const updatedTeams = prev.teams.filter((t) => !allTeamsToDelete.includes(t.id));
        
        // Reset all courts
        const updatedCourts = prev.courts.map((c) => {
          if (activeCourts.some(ac => ac.id === c.id)) {
            return { ...c, status: 'available' as const, currentTeamId: null, timerMs: 0, isPaused: false };
          }
          return c;
        });
        
        return {
          ...prev,
          players: priorityUpdatedPlayers,
          teams: updatedTeams,
          courts: updatedCourts,
        };
      });
      
      // Update Supabase - batch all updates
      console.log('📤 Updating Supabase with batch changes...');
      
      // Batch update players in Supabase
      if (allPlayersToUpdate.length > 0) {
        console.log(`📤 Batch updating ${allPlayersToUpdate.length} players in Supabase...`);
        const playerUpdates = allPlayersToUpdate.map(({ id, updates }) => ({
          playerId: id,
          updates,
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Batch updated ${allPlayersToUpdate.length} players in Supabase`);
      }
      
      // Batch delete teams in Supabase
      if (allTeamsToDelete.length > 0) {
        console.log(`📤 Batch deleting ${allTeamsToDelete.length} teams in Supabase...`);
        await teamsApi.deleteBatch(allTeamsToDelete);
        console.log(`✅ Batch deleted ${allTeamsToDelete.length} teams in Supabase`);
      }
      
      console.log('✅ All games ended successfully in Supabase');
      addAuditLog('batch_games_ended', { 
        gamesEnded: activeCourts.length,
        playersUpdated: allPlayersToUpdate.length,
        teamsDeleted: allTeamsToDelete.length 
      });
      
      return activeCourts.length;
    } catch (error) {
      console.error('❌ Failed to end all games:', error);
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

  const updateCourtNames = useCallback((courtUpdates: { id: string; name: string }[]) => {
    setState((prev) => ({
      ...prev,
      courts: prev.courts.map((court) => {
        const update = courtUpdates.find(u => u.id === court.id);
        return update ? { ...court, name: update.name } : court;
      }),
    }));
    
    // Save court names to Supabase settings as JSON
    const courtNamesMap: Record<string, string> = {};
    courtUpdates.forEach(({ id, name }) => {
      courtNamesMap[id] = name;
    });
    
    settingsApi.set('court_names', JSON.stringify(courtNamesMap)).then(() => {
      console.log(`✅ Saved court names to Supabase settings:`, courtNamesMap);
    }).catch((error) => {
      console.error('Failed to save court names to Supabase:', error);
    });
    
    addAuditLog('courts_renamed', { courtUpdates });
  }, [addAuditLog]);

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
      let playersToResetToWaiting: string[] = [];
      
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        
        // ⭐ Only reset players to waiting if they are NOT in any other team
        const otherTeams = prev.teams.filter(t => t.id !== teamId && (t.state === 'queued' || t.state === 'playing'));
        const playersInOtherTeams = new Set(otherTeams.flatMap(t => t.playerIds));
        
        // Find players who should be reset to waiting (only queued players not in other teams)
        playersToResetToWaiting = team.playerIds.filter(playerId => {
          const player = prev.players.find(p => p.id === playerId);
          // Only reset if player is queued AND not in another team
          return player && player.state === 'queued' && !playersInOtherTeams.has(playerId);
        });
        
        console.log(`🗑️ Deleting team ${teamId}:`, {
          totalPlayers: team.playerIds.length,
          playersToReset: playersToResetToWaiting.length,
          playersInOtherTeams: team.playerIds.filter(id => playersInOtherTeams.has(id)).length
        });
        
        const updatedPlayers = prev.players.map((p) =>
          playersToResetToWaiting.includes(p.id) ? { ...p, state: 'waiting' as const } : p
        );
        
        return {
          ...prev,
          teams: prev.teams.filter((t) => t.id !== teamId),
          players: updatedPlayers,
        };
      });
      
      // Delete team from Supabase
      await teamsApi.delete(teamId);
      
      // Update only the players that need to be reset to waiting
      if (playersToResetToWaiting.length > 0) {
        console.log(`📤 Resetting ${playersToResetToWaiting.length} players to waiting state...`);
        const playerUpdates = playersToResetToWaiting.map(playerId => ({
          playerId,
          updates: { state: 'waiting' as const }
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Reset ${playersToResetToWaiting.length} players to waiting state`);
      }
      
      console.log(`✅ Deleted team ${teamId} from Supabase`);
      addAuditLog('team_deleted', { teamId });
    } catch (error) {
      console.error('Failed to delete team from Supabase:', error);
      // Still update local state even if API fails
      setState((prev) => {
        const team = prev.teams.find((t) => t.id === teamId);
        if (!team) return prev;
        
        const otherTeams = prev.teams.filter(t => t.id !== teamId && (t.state === 'queued' || t.state === 'playing'));
        const playersInOtherTeams = new Set(otherTeams.flatMap(t => t.playerIds));
        
        const playersToResetToWaiting = team.playerIds.filter(playerId => {
          const player = prev.players.find(p => p.id === playerId);
          return player && player.state === 'queued' && !playersInOtherTeams.has(playerId);
        });
        
        const updatedPlayers = prev.players.map((p) =>
          playersToResetToWaiting.includes(p.id) ? { ...p, state: 'waiting' as const } : p
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

  const createManualTeam = useCallback(async (playerIds: string[]) => {
    console.log('🎮 createManualTeam called with playerIds:', playerIds);
    
    // Validate team size
    if (!state.session) {
      throw new Error('No session found');
    }
    
    if (playerIds.length !== state.session.teamSize) {
      throw new Error(`팀은 정확히 ${state.session.teamSize}명이어야 합니다.`);
    }
    
    // Check if all players exist
    const players = state.players.filter(p => playerIds.includes(p.id));
    if (players.length !== playerIds.length) {
      throw new Error('선택한 플레이어 중 일부를 찾을 수 없습니다.');
    }
    
    // Debug: Check gender information
    console.log('🔍 Selected players with gender info:', players.map(p => ({
      id: p.id,
      name: p.name,
      gender: p.gender,
      rank: p.rank,
      state: p.state
    })));
    
    try {
      // Calculate next team number
      const existingTeamCount = state.teams.filter(t => t.state === 'queued' || t.state === 'playing').length;
      
      // Create new team
      const newTeam: Team = {
        id: `team-${Date.now()}-${Math.random()}`,
        name: `수동 팀 ${existingTeamCount + 1}`,
        playerIds,
        state: 'queued',
        assignedCourtId: null,
        startedAt: null,
        endedAt: null,
        createdAt: new Date(),
      };
      
      console.log('📤 Saving manual team to Supabase...');
      await teamsApi.add(newTeam);
      console.log('✅ Saved manual team to Supabase');
      
      // Update player states to 'queued' (only for waiting players)
      const waitingPlayerIds = players.filter(p => p.state === 'waiting').map(p => p.id);
      
      if (waitingPlayerIds.length > 0) {
        console.log(`📤 Updating ${waitingPlayerIds.length} waiting players to queued state...`);
        const playerUpdates = waitingPlayerIds.map(playerId => ({
          playerId,
          updates: { state: 'queued' as const }
        }));
        await playersApi.updateBatch(playerUpdates);
        console.log(`✅ Updated ${waitingPlayerIds.length} players to queued state`);
      }
      
      // Update local state
      setState((prev) => {
        const updatedPlayers = prev.players.map(p => {
          if (waitingPlayerIds.includes(p.id)) {
            return { ...p, state: 'queued' as const };
          }
          return p;
        });
        
        return {
          ...prev,
          teams: [...prev.teams, newTeam],
          players: updatedPlayers,
        };
      });
      
      addAuditLog('manual_team_created', { playerIds });
      console.log('✅ Manual team created successfully');
      
      return newTeam;
    } catch (error) {
      console.error('❌ Failed to create manual team:', error);
      throw error;
    }
  }, [addAuditLog, state.session, state.players]);

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
        console.log(`📤 Adding player to Supabase with rank:`, { 
          name: player.name, 
          gender: player.gender, 
          rank: player.rank,
          memberRank: member.rank 
        });
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
      
      // Load courtsCount from settings
      const courtsCountStr = await settingsApi.get('courts_count');
      const courtsCount = courtsCountStr ? parseInt(courtsCountStr, 10) : 4;
      console.log(`📊 Loaded courtsCount: ${courtsCount} from Supabase settings`);
      
      // Load court names from settings
      const courtNamesStr = await settingsApi.get('court_names');
      const courtNamesMap: Record<string, string> = courtNamesStr ? JSON.parse(courtNamesStr) : {};
      console.log(`📊 Loaded court names:`, courtNamesMap);
      
      // Load members
      const membersFromDb = await membersApi.getAll();
      console.log(`📦 Loaded ${membersFromDb.length} members from Supabase:`, membersFromDb.map(m => ({ id: m.id, name: m.name, gender: m.gender, rank: m.rank })));
      
      // Load players
      const playersFromDb = await playersApi.getAll();
      console.log(`👥 Loaded ${playersFromDb.length} players from Supabase:`, playersFromDb.map(p => ({ id: p.id, name: p.name, state: p.state, gender: p.gender, rank: p.rank })));
      
      // Load teams
      const teamsFromDb = await teamsApi.getAll();
      console.log(`🏐 RAW teams from Supabase:`, teamsFromDb.map(t => ({ id: t.id, name: t.name, state: t.state, assignedCourtId: t.assignedCourtId, playerIds: t.playerIds })));
      
      const activeTeams = teamsFromDb.filter(t => t.state === 'queued' || t.state === 'playing');
      const finishedTeams = teamsFromDb.filter(t => t.state === 'finished');
      
      console.log(`🏐 Loaded ${activeTeams.length} active teams from Supabase (total: ${teamsFromDb.length}):`, 
        activeTeams.map(t => ({ id: t.id, name: t.name, state: t.state, assignedCourtId: t.assignedCourtId, playerCount: t.playerIds.length })));
      
      // Clean up finished teams if there are any
      if (finishedTeams.length > 0) {
        console.log(`🧹 Cleaning up ${finishedTeams.length} finished teams from Supabase...`);
        await teamsApi.deleteFinished();
        console.log(`✅ Cleaned up ${finishedTeams.length} finished teams`);
      }
      
      // Update local state with all data from Supabase
      setState((prev) => {
        // Create courts array based on loaded courtsCount
        const courtsToCreate = Math.max(courtsCount, prev.courts.length);
        let updatedCourts = prev.courts;
        
        if (courtsToCreate > prev.courts.length) {
          const additionalCourts = Array.from({ length: courtsToCreate - prev.courts.length }, (_, i) => {
            const courtId = `court-${prev.courts.length + i}`;
            return {
              id: courtId,
              index: prev.courts.length + i + 1,
              name: courtNamesMap[courtId] || indexToLetter(prev.courts.length + i),
              status: 'available' as const,
              timerMs: 0,
              currentTeamId: null,
              isPaused: false,
            };
          });
          updatedCourts = [...prev.courts, ...additionalCourts];
        } else {
          // Apply saved court names to existing courts
          updatedCourts = prev.courts.map(court => ({
            ...court,
            name: courtNamesMap[court.id] || court.name,
          }));
        }
        
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
          session: prev.session ? { ...prev.session, courtsCount } : prev.session,
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
    endAllGames,
    toggleCourtPause,
    updateCourtTimer,
    updateCourtNames,
    adjustGameCount,
    deleteTeam,
    updateTeam,
    createManualTeam,
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