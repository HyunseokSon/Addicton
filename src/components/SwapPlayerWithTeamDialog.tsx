import { Player, Team } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ArrowLeftRight } from 'lucide-react';

interface SwapPlayerWithTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: Player;
  teams: Team[];
  allPlayers: Player[];
  onSwap: (teamId: string, queuedPlayerId: string) => void;
}

export function SwapPlayerWithTeamDialog({
  open,
  onOpenChange,
  currentPlayer,
  teams,
  allPlayers,
  onSwap,
}: SwapPlayerWithTeamDialogProps) {
  // Get all queued players grouped by team
  const queuedTeams = teams.filter(t => t.state === 'queued');

  const handleSwap = (teamId: string, queuedPlayerId: string) => {
    onSwap(teamId, queuedPlayerId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[600px] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{currentPlayer.name} 교체</DialogTitle>
          <DialogDescription>
            교체할 팀원을 선택해주세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {queuedTeams.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              게임 대기중인 팀이 없습니다
            </div>
          ) : (
            queuedTeams.map((team) => {
              const teamPlayers = allPlayers.filter(p => team.playerIds.includes(p.id));
              return (
                <div key={team.id} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium text-sm mb-2">{team.name}</div>
                  <div className="space-y-1.5">
                    {teamPlayers.map((player) => (
                      <Button
                        key={player.id}
                        variant="outline"
                        className="w-full justify-between h-auto py-2 px-3 hover:bg-blue-50 hover:border-blue-300"
                        onClick={() => handleSwap(team.id, player.id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{player.name}</span>
                          {player.gender && (
                            <Badge variant="outline" className="text-xs">
                              {player.gender}
                            </Badge>
                          )}
                          {player.rank && (
                            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
                              {player.rank}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {player.gameCount}회
                          </Badge>
                          <ArrowLeftRight className="size-4 text-blue-600" />
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
