import { useCallback } from 'react';
import { Player, Team } from '../types';

export function useDragAndDrop(
  players: Player[],
  teams: Team[],
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void,
  onUpdateTeam: (teamId: string, playerIds: string[]) => void
) {
  const swapPlayerInTeam = useCallback(
    (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;

      // Update team's player list
      const newPlayerIds = team.playerIds.map((id) =>
        id === queuedPlayerId ? waitingPlayerId : id
      );
      onUpdateTeam(teamId, newPlayerIds);

      // Update player states
      onUpdatePlayer(waitingPlayerId, { state: 'queued' });
      onUpdatePlayer(queuedPlayerId, { state: 'waiting' });
    },
    [teams, onUpdatePlayer, onUpdateTeam]
  );

  return { swapPlayerInTeam };
}
