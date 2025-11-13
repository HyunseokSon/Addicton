import { Team, Player } from '../types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Play, X } from 'lucide-react';
import { DroppableTeamPlayer } from './DroppableTeamPlayer';

interface TeamCardProps {
  team: Team;
  players: Player[];
  onStartGame?: () => void;
  onDeleteTeam?: () => void;
  onSwapPlayer?: (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => void;
  onSwapBetweenTeams?: (sourceTeamId: string, sourcePlayerId: string, targetTeamId: string, targetPlayerId: string) => void;
  availableCourtCount?: number;
}

export function TeamCard({ team, players, onStartGame, onDeleteTeam, onSwapPlayer, onSwapBetweenTeams, availableCourtCount }: TeamCardProps) {
  const teamPlayers = players.filter((p) => team.playerIds.includes(p.id));
  
  const handleSwap = (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => {
    if (onSwapPlayer) {
      onSwapPlayer(waitingPlayerId, teamId, queuedPlayerId);
    }
  };

  return (
    <Card className="overflow-hidden border shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-4 md:p-5">
        {/* Team header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div>
            <span className="font-semibold">{team.name}</span>
          </div>
          <div className="flex gap-2">
            {team.state === 'queued' && onStartGame && (
              <Button 
                size="sm" 
                onClick={onStartGame} 
                disabled={availableCourtCount === 0}
                className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
              >
                <Play className="size-4 mr-1.5" />
                게임 시작
              </Button>
            )}
            {onDeleteTeam && (
              <Button
                size="sm"
                variant="ghost"
                className="size-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all"
                onClick={onDeleteTeam}
              >
                <X className="size-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Players section */}
        {teamPlayers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            팀원이 없습니다
          </div>
        ) : teamPlayers.length === 4 ? (
          // 4 players: Show 2x2 grid with connection lines
          <div className="relative px-4 xl:px-8 py-4 xl:py-6">
            {/* Player cards grid */}
            <div className="grid grid-cols-2 gap-x-12 gap-y-16 xl:gap-x-20 xl:gap-y-20 relative mx-auto" style={{ width: 'fit-content' }}>
              {teamPlayers.map((player, idx) => (
                <div key={player.id} className="relative" style={{ zIndex: 10 }}>
                  <DroppableTeamPlayer
                    player={player}
                    allPlayers={players}
                    teamPlayerIds={team.playerIds}
                    teamId={team.id}
                    index={idx}
                    onSwap={handleSwap}
                    onSwapBetweenTeams={onSwapBetweenTeams}
                  />
                </div>
              ))}
              
              {/* SVG for all connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {/* Horizontal lines */}
                <line x1="20%" y1="18%" x2="80%" y2="18%" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="20%" y1="82%" x2="80%" y2="82%" stroke="#94a3b8" strokeWidth="2.5" />
                
                {/* Vertical lines */}
                <line x1="20%" y1="18%" x2="20%" y2="82%" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="80%" y1="18%" x2="80%" y2="82%" stroke="#94a3b8" strokeWidth="2.5" />
                
                {/* Diagonal lines */}
                <line x1="20%" y1="18%" x2="80%" y2="82%" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="80%" y1="18%" x2="20%" y2="82%" stroke="#94a3b8" strokeWidth="2.5" />
              </svg>
              
              {/* Connection badges */}
              {(() => {
                const [p0, p1, p2, p3] = teamPlayers;
                return (
                  <>
                    {/* Top horizontal: P0 ↔ P1 */}
                    <div className="absolute" style={{ left: '50%', top: '10%', transform: 'translateX(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p0.teammateHistory?.[p1.id] || 0)}
                      </Badge>
                    </div>

                    {/* Bottom horizontal: P2 ↔ P3 */}
                    <div className="absolute" style={{ left: '50%', bottom: '10%', transform: 'translateX(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p2.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Left vertical: P0 ↕ P2 */}
                    <div className="absolute" style={{ left: '12%', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p0.teammateHistory?.[p2.id] || 0)}
                      </Badge>
                    </div>

                    {/* Right vertical: P1 ↕ P3 */}
                    <div className="absolute" style={{ right: '12%', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p1.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Diagonal P0-P3 badge (top-left to bottom-right) - positioned above the line */}
                    <div className="absolute left-[calc(50%-28px)] xl:left-[calc(50%-45px)] top-[28%]" style={{ zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p0.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Diagonal P1-P2 badge (top-right to bottom-left) - positioned above the line */}
                    <div className="absolute left-[calc(50%+28px)] xl:left-[calc(50%+45px)] top-[28%] -translate-x-full" style={{ zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-200 text-slate-700 text-xs xl:text-sm px-2 xl:px-2.5 py-0.5 xl:py-1 h-5 xl:h-6">
                        {(p1.teammateHistory?.[p2.id] || 0)}
                      </Badge>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        ) : (
          // Less than 4 players: Show simple list
          <div className="space-y-1.5 md:space-y-2">
            {teamPlayers.map((player, idx) => (
              <DroppableTeamPlayer
                key={player.id}
                player={player}
                allPlayers={players}
                teamPlayerIds={team.playerIds}
                teamId={team.id}
                index={idx}
                onSwap={handleSwap}
                onSwapBetweenTeams={onSwapBetweenTeams}
              />
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: 4 - teamPlayers.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="bg-gray-50 rounded p-1.5 md:p-2 flex items-center justify-center border border-dashed min-h-[2.5rem] md:min-h-[3rem]"
              >
                <span className="text-xs text-gray-400">빈 자리</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}