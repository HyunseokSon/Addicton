import { Player, PlayerState } from '../types';
import { Badge } from './ui/badge';
import { MoreVertical, Plus, Minus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

interface RestingPlayersPanelProps {
  players: Player[];
  onUpdatePlayerState: (id: string, state: PlayerState) => void;
  onAdjustGameCount: (id: string, delta: number) => void;
  onDeletePlayer: (id: string) => void;
  readOnly?: boolean;
}

export function RestingPlayersPanel({
  players,
  onUpdatePlayerState,
  onAdjustGameCount,
  onDeletePlayer,
  readOnly,
}: RestingPlayersPanelProps) {
  const restingPlayers = players
    .filter((p) => p.state === 'resting')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5 md:mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-xs md:text-sm text-gray-700">휴식 중</h3>
          <Badge variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5 shadow-sm bg-blue-100 text-blue-700">
            {restingPlayers.length}명
          </Badge>
        </div>
      </div>
      
      <div className="space-y-1.5 md:space-y-2 min-h-[200px] max-h-[60vh] overflow-y-auto bg-gradient-to-br from-blue-50/30 to-blue-50/10 rounded-xl border-2 border-dashed border-blue-200 p-2.5 md:p-3">
        {restingPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <p className="text-xs md:text-sm mb-1">😴 휴식중인 참가자가 없습니다</p>
            <p className="text-[10px] md:text-xs text-gray-300">참가자 메뉴에서 휴식 상태로 변경할 수 있습니다</p>
          </div>
        ) : (
          restingPlayers.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border bg-white hover:shadow-md transition-all bg-blue-50/50 border-blue-200"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium text-xs md:text-sm truncate">{player.name}</span>
                <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 border-blue-200">
                  휴식중
                </Badge>
                <span className="text-[10px] md:text-xs text-gray-500">
                  {player.gameCount}경기
                </span>
                {player.gender && (
                  <Badge variant="outline" className="text-[10px]">
                    {player.gender}
                  </Badge>
                )}
                {player.rank && (
                  <Badge variant="outline" className="text-[10px]">
                    {player.rank}
                  </Badge>
                )}
              </div>

              {!readOnly && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-gray-100"
                    >
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'waiting')}>
                      <span className="text-xs">대기</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'priority')}>
                      <span className="text-xs">우선대기</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuLabel>경기수 조정</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onAdjustGameCount(player.id, 1)}>
                      <Plus className="size-4 mr-2" />
                      경기수 +1
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAdjustGameCount(player.id, -1)}>
                      <Minus className="size-4 mr-2" />
                      경기수 -1
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      onClick={() => onDeletePlayer(player.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="size-4 mr-2" />
                      미참가 처리
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}