import { Team, Court, Player } from '../types/index';
import { TeamCard } from './TeamCard';
import { Play, Users, X, PlayCircle, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

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
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl blur opacity-20 animate-pulse"></div>
          <Button
            onClick={onStartAllQueuedGames}
            disabled={availableCourtCount === 0}
            className="relative w-full h-14 md:h-16 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 active:scale-[0.98] border-2 border-emerald-400/50"
          >
            <div className="flex items-center justify-center gap-2.5 md:gap-3">
              <Zap className="size-5 md:size-6 fill-current animate-pulse" />
              <div className="flex flex-col items-start">
                <span className="text-sm md:text-base font-bold tracking-wide">
                  {availableCourtCount === 0 ? '사용 가능한 코트 없음' : '게임 일괄 시작'}
                </span>
                {availableCourtCount > 0 && (
                  <span className="text-[10px] md:text-xs font-normal text-emerald-100">
                    {Math.min(queuedTeams.length, availableCourtCount)}팀 동시 시작 (코트 {availableCourtCount}개 대기)
                  </span>
                )}
              </div>
              <Badge className="ml-auto bg-white/20 text-white border-white/30 text-xs md:text-sm px-2 md:px-3 py-1">
                {Math.min(queuedTeams.length, availableCourtCount)}팀
              </Badge>
            </div>
          </Button>
        </div>
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