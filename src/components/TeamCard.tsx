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
  readOnly?: boolean;
  isAdmin?: boolean;
  onReturnToWaiting?: (playerId: string, teamId: string) => void;
}

export function TeamCard({ team, players, onStartGame, onDeleteTeam, onSwapPlayer, onSwapBetweenTeams, availableCourtCount, readOnly, isAdmin, onReturnToWaiting }: TeamCardProps) {
  const teamPlayers = players.filter((p) => team.playerIds.includes(p.id));
  
  // Check if any player in the team is currently playing
  const hasPlayingPlayer = teamPlayers.some(p => p.state === 'playing');
  
  const handleSwap = (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => {
    if (onSwapPlayer) {
      onSwapPlayer(waitingPlayerId, teamId, queuedPlayerId);
    }
  };

  return (
    <Card className={`overflow-hidden border-2 shadow-md hover:shadow-lg transition-all ${hasPlayingPlayer ? 'border-amber-400 bg-amber-50/30' : ''}`}>
      <CardContent className="p-3 md:p-4">
        {/* Team header */}
        <div className="flex items-center justify-between mb-3 md:mb-4 pb-2 md:pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${hasPlayingPlayer ? 'bg-amber-500' : 'bg-orange-500'} animate-pulse`}></div>
            <span className="font-semibold text-sm md:text-base">{team.name}</span>
            {hasPlayingPlayer && (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                게임중 포함
              </Badge>
            )}
          </div>
          <div className="flex gap-1.5 md:gap-2">
            {!readOnly && isAdmin && team.state === 'queued' && onStartGame && (
              <Button 
                size="sm" 
                onClick={onStartGame} 
                disabled={availableCourtCount === 0 || hasPlayingPlayer}
                className="h-8 md:h-9 px-3 md:px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-sm hover:shadow-md active:scale-95 transition-all text-[10px] md:text-xs touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasPlayingPlayer ? '게임 중인 플레이어가 포함되어 있어 시작할 수 없습니다' : ''}
              >
                <Play className="size-3 md:size-3.5 mr-1 md:mr-1.5" />
                게임 시작
              </Button>
            )}
            {!readOnly && isAdmin && onDeleteTeam && (
              <Button
                size="sm"
                variant="ghost"
                className="size-8 md:size-9 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 active:scale-95 transition-all touch-manipulation"
                onClick={onDeleteTeam}
              >
                <X className="size-4 md:size-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Players section */}
        {teamPlayers.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-muted-foreground text-xs md:text-sm">
            팀원이 없습니다
          </div>
        ) : teamPlayers.length === 4 ? (
          // 4 players: Show 2x2 grid with connection lines
          <div className="relative px-2 md:px-4 xl:px-8 py-3 md:py-4 xl:py-6">
            {/* Player cards grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-12 md:gap-x-12 md:gap-y-16 xl:gap-x-20 xl:gap-y-20 relative mx-auto" style={{ width: 'fit-content' }}>
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
                    readOnly={readOnly}
                    isAdmin={isAdmin}
                    onReturnToWaiting={onReturnToWaiting}
                  />
                </div>
              ))}
              
              {/* SVG for all connection lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                {/* Horizontal lines */}
                <line x1="20%" y1="18%" x2="80%" y2="18%" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="20%" y1="82%" x2="80%" y2="82%" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Vertical lines */}
                <line x1="20%" y1="18%" x2="20%" y2="82%" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="80%" y1="18%" x2="80%" y2="82%" stroke="#cbd5e1" strokeWidth="2" />
                
                {/* Diagonal lines */}
                <line x1="20%" y1="18%" x2="80%" y2="82%" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="80%" y1="18%" x2="20%" y2="82%" stroke="#cbd5e1" strokeWidth="2" />
              </svg>
              
              {/* Connection badges */}
              {(() => {
                const [p0, p1, p2, p3] = teamPlayers;
                return (
                  <>
                    {/* Top horizontal: P0 ↔ P1 */}
                    <div className="absolute" style={{ left: '50%', top: '10%', transform: 'translateX(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
                        {(p0.teammateHistory?.[p1.id] || 0)}
                      </Badge>
                    </div>

                    {/* Bottom horizontal: P2 ↔ P3 */}
                    <div className="absolute" style={{ left: '50%', bottom: '10%', transform: 'translateX(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
                        {(p2.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Left vertical: P0 ↕ P2 */}
                    <div className="absolute" style={{ left: '12%', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
                        {(p0.teammateHistory?.[p2.id] || 0)}
                      </Badge>
                    </div>

                    {/* Right vertical: P1 ↕ P3 */}
                    <div className="absolute" style={{ right: '12%', top: '50%', transform: 'translateY(-50%)', zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
                        {(p1.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Diagonal P0-P3 badge */}
                    <div className="absolute left-[calc(50%-20px)] md:left-[calc(50%-28px)] xl:left-[calc(50%-45px)] top-[28%]" style={{ zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
                        {(p0.teammateHistory?.[p3.id] || 0)}
                      </Badge>
                    </div>

                    {/* Diagonal P1-P2 badge */}
                    <div className="absolute left-[calc(50%+20px)] md:left-[calc(50%+28px)] xl:left-[calc(50%+45px)] top-[28%] -translate-x-full" style={{ zIndex: 5 }}>
                      <Badge variant="secondary" className="bg-slate-100 border border-slate-300 text-slate-700 text-[9px] md:text-xs px-1.5 md:px-2 py-0.5 h-4 md:h-5 shadow-sm">
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
                readOnly={readOnly}
                isAdmin={isAdmin}
                onReturnToWaiting={onReturnToWaiting}
              />
            ))}
            {/* Fill empty slots */}
            {Array.from({ length: 4 - teamPlayers.length }).map((_, idx) => (
              <div
                key={`empty-${idx}`}
                className="bg-gray-50 rounded-lg p-2 md:p-2.5 flex items-center justify-center border border-dashed min-h-[2rem] md:min-h-[2.5rem]"
              >
                <span className="text-[10px] md:text-xs text-gray-400">빈 자리</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}