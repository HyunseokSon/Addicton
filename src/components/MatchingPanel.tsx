import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Users, Clock } from 'lucide-react';
import { TeamCard } from './TeamCard';
import { CourtCard } from './CourtCard';
import type { Session, Player, Team, Court } from '../App';

interface MatchingPanelProps {
  session: Session;
  players: Player[];
  teams: Team[];
  courts: Court[];
  onUpdatePlayer: (playerId: string, updates: Partial<Player>) => void;
  onStartGame: (teamId: string) => void;
  onEndGame: (courtId: string) => void;
  onToggleTimer: (courtId: string) => void;
}

export function MatchingPanel({
  session,
  players,
  teams,
  courts,
  onUpdatePlayer,
  onStartGame,
  onEndGame,
  onToggleTimer
}: MatchingPanelProps) {
  const queuedTeams = teams.filter(t => t.state === 'queued');
  const activeTeams = teams.filter(t => t.state === 'in-game');

  const waitingPlayers = players.filter(p => p.state === 'waiting');
  const priorityPlayers = players.filter(p => p.state === 'priority');

  return (
    <div className="space-y-4">
      {/* Waiting Pool */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            대기 풀
            <Badge variant="secondary">
              {waitingPlayers.length + priorityPlayers.length}명
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {priorityPlayers.length > 0 && (
              <div>
                <p className="text-xs text-orange-600 mb-2">우선 대기</p>
                <div className="flex flex-wrap gap-2">
                  {priorityPlayers.map(player => (
                    <Badge key={player.id} className="bg-orange-100 text-orange-800">
                      {player.name} ({player.gameCount}경기)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {waitingPlayers.length > 0 && (
              <div>
                <p className="text-xs text-gray-600 mb-2">일반 대기</p>
                <div className="flex flex-wrap gap-2">
                  {waitingPlayers.map(player => (
                    <Badge key={player.id} variant="secondary">
                      {player.name} ({player.gameCount}경기)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {waitingPlayers.length === 0 && priorityPlayers.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                대기 중인 참가자가 없습니다
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Queue */}
      {queuedTeams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="size-5" />
              게임 대기 중
              <Badge variant="secondary">{queuedTeams.length}팀</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {queuedTeams.map(team => (
                <TeamCard
                  key={team.id}
                  team={team}
                  players={players}
                  onStartGame={onStartGame}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Courts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            코트
            <Badge variant="secondary">
              {courts.filter(c => c.status === 'in-use').length}/{courts.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courts.map(court => {
              const team = court.teamId ? teams.find(t => t.id === court.teamId) : undefined;
              return (
                <CourtCard
                  key={court.id}
                  court={court}
                  team={team}
                  players={players}
                  gameDuration={session.gameDuration}
                  onEndGame={onEndGame}
                  onToggleTimer={onToggleTimer}
                />
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
