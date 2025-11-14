import { Team, Court, Player } from '../types/index';
import { TeamCard } from './TeamCard';
import { Play, Users, X, PlayCircle } from 'lucide-react';
import { Button } from './ui/button';

interface MatchingAreaProps {
  teams: Team[];
  courts: Court[];
  players: Player[];
  onStartGame: (teamId: string, courtId?: string) => void;
  onStartAllQueuedGames: () => void;
  onEndGame: (courtId: string) => void;
  onToggleCourtPause: (courtId: string) => void;
  onUpdateCourtTimer: (courtId: string, deltaMs: number) => void;
  onDeleteTeam: (teamId: string) => void;
  onSwapPlayer?: (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => void;
  onSwapBetweenTeams: (sourceTeamId: string, sourcePlayerId: string, targetTeamId: string, targetPlayerId: string) => void;
  readOnly?: boolean;
}

export function MatchingArea({
  teams,
  courts,
  players,
  onStartGame,
  onStartAllQueuedGames,
  onDeleteTeam,
  onSwapPlayer,
  onSwapBetweenTeams,
  readOnly,
}: MatchingAreaProps) {
  const queuedTeams = teams.filter((t) => t.state === 'queued');
  const availableCourtCount = courts.filter((c) => c.status === 'available').length;
  const canStartAll = queuedTeams.length > 0 && availableCourtCount > 0 && !readOnly;

  return (
    <div className="space-y-4">
      {/* Batch Start Button */}
      {queuedTeams.length > 0 && !readOnly && (
        <Button
          onClick={onStartAllQueuedGames}
          disabled={availableCourtCount === 0}
          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircle className="size-5 mr-2" />
          {availableCourtCount === 0 
            ? '사용 가능한 코트 없음'
            : `일괄 시작 (${Math.min(queuedTeams.length, availableCourtCount)}팀)`
          }
        </Button>
      )}

      {queuedTeams.length === 0 ? (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border-2 border-dashed border-orange-200 p-8 text-center">
          <Users className="size-12 mx-auto mb-3 text-orange-300" />
          <p className="text-gray-500">팀 매칭 버튼을 눌러 팀을 생성하세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queuedTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              players={players}
              onStartGame={() => onStartGame(team.id)}
              onDeleteTeam={() => onDeleteTeam(team.id)}
              onSwapPlayer={onSwapPlayer}
              onSwapBetweenTeams={onSwapBetweenTeams}
              availableCourtCount={availableCourtCount}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      
      {availableCourtCount === 0 && queuedTeams.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800 text-center">
            ⚠️ 사용 가능한 코트가 없습니다. 경기를 종료해주세요.
          </p>
        </div>
      )}
    </div>
  );
}