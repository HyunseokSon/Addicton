import { useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { TopBar } from './TopBar';
import { PlayerPanel } from './PlayerPanel';
import { MatchingPanel } from './MatchingPanel';
import { StatsPanel } from './StatsPanel';
import type { AppState, Player, Team, Court, AuditLog } from '../App';

interface GameManagerProps {
  appState: AppState;
  setAppState: React.Dispatch<React.SetStateAction<AppState>>;
  onResetSession: () => void;
}

export function GameManager({ appState, setAppState, onResetSession }: GameManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('all');
  const [cockFilter, setCockFilter] = useState<string>('all');

  const addAuditLog = useCallback((type: string, payload: any) => {
    const log: AuditLog = {
      id: crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now()
    };
    setAppState(prev => ({
      ...prev,
      auditLogs: [...prev.auditLogs, log]
    }));
  }, [setAppState]);

  const addPlayer = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Check for duplicate names
    const existingNames = appState.players.filter(p => p.name.startsWith(trimmedName));
    let finalName = trimmedName;
    if (existingNames.length > 0) {
      finalName = `${trimmedName}(${existingNames.length + 1})`;
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name: finalName,
      state: 'waiting',
      gameCount: 0,
      cockCount: 0,
      createdAt: Date.now()
    };

    setAppState(prev => ({
      ...prev,
      players: [...prev.players, player]
    }));
    addAuditLog('player_added', { player });
  }, [appState.players, setAppState, addAuditLog]);

  const updatePlayer = useCallback((playerId: string, updates: Partial<Player>) => {
    setAppState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === playerId ? { ...p, ...updates } : p)
    }));
    addAuditLog('player_updated', { playerId, updates });
  }, [setAppState, addAuditLog]);

  const deletePlayer = useCallback((playerId: string) => {
    if (!confirm('참가자를 삭제하시겠습니까?')) return;

    setAppState(prev => ({
      ...prev,
      players: prev.players.filter(p => p.id !== playerId),
      teams: prev.teams.map(team => ({
        ...team,
        playerIds: team.playerIds.filter(id => id !== playerId)
      }))
    }));
    addAuditLog('player_deleted', { playerId });
  }, [setAppState, addAuditLog]);

  const autoMatchTeams = useCallback(() => {
    const { session, players } = appState;
    if (!session) return;

    // Get eligible players
    const eligible = players.filter(p => 
      (p.state === 'waiting' || p.state === 'priority') && 
      p.state !== 'resting' && 
      p.state !== 'in-game' && 
      p.state !== 'queued'
    );

    // Sort: priority first, then by game count, then by last game end time
    eligible.sort((a, b) => {
      if (a.state === 'priority' && b.state !== 'priority') return -1;
      if (a.state !== 'priority' && b.state === 'priority') return 1;
      if (a.gameCount !== b.gameCount) return a.gameCount - b.gameCount;
      return (a.lastGameEndAt || 0) - (b.lastGameEndAt || 0);
    });

    const newTeams: Team[] = [];
    const teamSize = session.teamSize;

    while (eligible.length >= teamSize) {
      const teamPlayers = eligible.splice(0, teamSize);
      const team: Team = {
        id: crypto.randomUUID(),
        name: `팀 ${appState.teams.length + newTeams.length + 1}`,
        playerIds: teamPlayers.map(p => p.id),
        state: 'queued'
      };
      newTeams.push(team);

      // Update player states
      teamPlayers.forEach(p => {
        p.state = 'queued';
      });
    }

    if (newTeams.length === 0) {
      alert('매칭 가능한 인원이 부족합니다.');
      return;
    }

    setAppState(prev => ({
      ...prev,
      players: prev.players.map(p => {
        const updated = eligible.find(e => e.id === p.id);
        return updated || p;
      }),
      teams: [...prev.teams, ...newTeams]
    }));

    addAuditLog('teams_matched', { teams: newTeams });
    alert(`${newTeams.length}개 팀이 매칭되었습니다.`);
  }, [appState, setAppState, addAuditLog]);

  const startGame = useCallback((teamId: string) => {
    const { session, teams, courts } = appState;
    if (!session) return;

    const team = teams.find(t => t.id === teamId);
    if (!team || team.state !== 'queued') return;

    const availableCourt = courts.find(c => c.status === 'available');
    if (!availableCourt) {
      alert('사용 가능한 코트가 없습니다.');
      return;
    }

    setAppState(prev => ({
      ...prev,
      teams: prev.teams.map(t => 
        t.id === teamId 
          ? { ...t, state: 'in-game' as const, courtId: availableCourt.id, startedAt: Date.now() }
          : t
      ),
      courts: prev.courts.map(c =>
        c.id === availableCourt.id
          ? { ...c, status: 'in-use' as const, teamId, timerStart: Date.now(), isPaused: false }
          : c
      ),
      players: prev.players.map(p =>
        team.playerIds.includes(p.id)
          ? { ...p, state: 'in-game' as const }
          : p
      )
    }));

    addAuditLog('game_started', { teamId, courtId: availableCourt.id });
  }, [appState, setAppState, addAuditLog]);

  const endGame = useCallback((courtId: string) => {
    const { courts, teams, players } = appState;
    
    const court = courts.find(c => c.id === courtId);
    if (!court || !court.teamId) return;

    const team = teams.find(t => t.id === court.teamId);
    if (!team) return;

    if (!confirm('게임을 종료하시겠습니까?')) return;

    setAppState(prev => ({
      ...prev,
      teams: prev.teams.map(t =>
        t.id === team.id
          ? { ...t, state: 'completed' as const, endedAt: Date.now() }
          : t
      ),
      courts: prev.courts.map(c =>
        c.id === courtId
          ? { ...c, status: 'available' as const, teamId: undefined, timerStart: undefined, isPaused: undefined, pausedTime: undefined }
          : c
      ),
      players: prev.players.map(p =>
        team.playerIds.includes(p.id)
          ? { ...p, state: 'waiting' as const, gameCount: p.gameCount + 1, lastGameEndAt: Date.now() }
          : p
      )
    }));

    addAuditLog('game_ended', { teamId: team.id, courtId });
  }, [appState, setAppState, addAuditLog]);

  const toggleCourtTimer = useCallback((courtId: string) => {
    setAppState(prev => ({
      ...prev,
      courts: prev.courts.map(c => {
        if (c.id === courtId && c.status === 'in-use') {
          if (c.isPaused) {
            // Resume
            const pausedDuration = c.pausedTime || 0;
            return {
              ...c,
              isPaused: false,
              timerStart: Date.now() - pausedDuration,
              pausedTime: undefined
            };
          } else {
            // Pause
            const elapsed = c.timerStart ? Date.now() - c.timerStart : 0;
            return {
              ...c,
              isPaused: true,
              pausedTime: elapsed
            };
          }
        }
        return c;
      })
    }));
  }, [setAppState]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <TopBar
          session={appState.session!}
          onAutoMatch={autoMatchTeams}
          onResetSession={onResetSession}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          stateFilter={stateFilter}
          onStateFilterChange={setStateFilter}
          cockFilter={cockFilter}
          onCockFilterChange={setCockFilter}
        />

        <div className="container mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <PlayerPanel
              players={appState.players}
              searchQuery={searchQuery}
              stateFilter={stateFilter}
              cockFilter={cockFilter}
              onAddPlayer={addPlayer}
              onUpdatePlayer={updatePlayer}
              onDeletePlayer={deletePlayer}
            />
          </div>

          <div className="lg:col-span-9">
            <MatchingPanel
              session={appState.session!}
              players={appState.players}
              teams={appState.teams}
              courts={appState.courts}
              onUpdatePlayer={updatePlayer}
              onStartGame={startGame}
              onEndGame={endGame}
              onToggleTimer={toggleCourtTimer}
            />
          </div>
        </div>

        <StatsPanel
          players={appState.players}
          courts={appState.courts}
          teams={appState.teams}
        />
      </div>
    </DndProvider>
  );
}
