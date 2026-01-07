import { Player, Team } from '../types/index';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash2 } from 'lucide-react';

interface QueuedPlayersPanelProps {
  players: Player[];
  teams?: Team[];
  onReturnToWaiting: (playerId: string, teamId: string) => void;
  readOnly?: boolean;
}

const STATE_LABELS: Record<string, string> = {
  waiting: '대기',
  priority: '우선대기',
  resting: '휴식',
  playing: '게임중',
  queued: '게임대기',
};

const STATE_COLORS: Record<string, string> = {
  waiting: 'bg-blue-100 text-blue-700 border-blue-200',
  priority: 'bg-purple-100 text-purple-700 border-purple-200',
  resting: 'bg-gray-100 text-gray-700 border-gray-200',
  playing: 'bg-green-100 text-green-700 border-green-200',
  queued: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function QueuedPlayersPanel({
  players,
  teams,
  onReturnToWaiting,
  readOnly = false,
}: QueuedPlayersPanelProps) {
  const queuedPlayers = players.filter((p) => p.state === 'queued');

  return (
    <div className="space-y-4 md:space-y-5">
      {/* Queued Players */}
      <div>
        <div className="flex items-center justify-between mb-2.5 md:mb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xs md:text-sm text-gray-700">대기 팀</h3>
            <Badge variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5 shadow-sm">
              {queuedPlayers.length}명
            </Badge>
          </div>
        </div>
        <div className="space-y-1.5 md:space-y-2 min-h-[100px] max-h-[50vh] md:max-h-none overflow-y-auto bg-gradient-to-br from-orange-50/30 to-orange-50/10 rounded-xl border-2 border-dashed border-orange-200 p-2.5 md:p-3">
          {queuedPlayers.length === 0 ? (
            <p className="text-[10px] md:text-xs text-center text-gray-400 py-8">게임 대기중인 참가자가 없습니다</p>
          ) : (
            queuedPlayers.map((player) => {
              const team = teams?.find(t => t.playerIds.includes(player.id));
              return (
                <div
                  key={player.id}
                  className="bg-white border border-gray-200 rounded-lg p-2 md:p-3 hover:shadow-md transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="font-medium text-sm truncate">{player.name}</span>
                        {player.gender && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0">
                            {player.gender}
                          </Badge>
                        )}
                        {player.rank && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-50 border-amber-300 text-amber-700">
                            {player.rank}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge className={`text-xs ${STATE_COLORS[player.state]}`}>
                          {STATE_LABELS[player.state]}
                        </Badge>
                        {team && (
                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-blue-50 border-blue-300 text-blue-700">
                            팀 {teams?.filter(t => t.state === 'queued').indexOf(team) + 1}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-700 font-mono">{player.gameCount}회</span>
                      <div className="flex items-center gap-1">
                        {!readOnly && team && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onReturnToWaiting(player.id, team.id)}
                            className="size-7 p-0 hover:bg-red-50"
                            title="대기로 복귀"
                          >
                            <Trash2 className="size-3 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}