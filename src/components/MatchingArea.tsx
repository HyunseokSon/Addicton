import { Team, Court, Player } from '../types/index';
import { TeamCard } from './TeamCard';
import { Play, Users, X, PlayCircle, Zap } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface MatchingAreaProps {
  teams: Team[];
  players: Player[];
  onStartGame: (teamId: string, courtId?: string) => void;
  onStartAllGames: () => void;
  onDeleteTeam: (teamId: string) => void;
  onSwapPlayer?: (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => void;
  onSwapBetweenTeams: (dragTeamId: string, dragPlayerId: string, dropTeamId: string, dropPlayerId: string) => void;
  onReturnToWaiting: (playerId: string, teamId: string) => void;
  isAdmin?: boolean;
}

export function MatchingArea({
  teams,
  players,
  onStartGame,
  onStartAllGames,
  onDeleteTeam,
  onSwapPlayer,
  onSwapBetweenTeams,
  onReturnToWaiting,
  isAdmin,
}: MatchingAreaProps) {
  const queuedTeams = teams || [];

  return (
    <div className="space-y-4">
      {/* Batch Start Button */}
      {queuedTeams.length > 0 && isAdmin && (
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-xl blur opacity-20 animate-pulse"></div>
          <Button
            onClick={onStartAllGames}
            className="relative w-full h-14 md:h-16 bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500 hover:from-emerald-600 hover:via-emerald-700 hover:to-emerald-600 text-white shadow-lg hover:shadow-xl transition-all active:scale-[0.98] border-2 border-emerald-400/50"
          >
            <div className="flex items-center justify-center gap-2.5 md:gap-3">
              <Zap className="size-5 md:size-6 fill-current animate-pulse" />
              <div className="flex flex-col items-start">
                <span className="text-sm md:text-base font-bold tracking-wide">
                  게임 일괄 시작
                </span>
                <span className="text-[10px] md:text-xs font-normal text-emerald-100">
                  {queuedTeams.length}팀 동시 시작
                </span>
              </div>
              <Badge className="ml-auto bg-white/20 text-white border-white/30 text-xs md:text-sm px-2 md:px-3 py-1">
                {queuedTeams.length}팀
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
              onReturnToWaiting={onReturnToWaiting}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}