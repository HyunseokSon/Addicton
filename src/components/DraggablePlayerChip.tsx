import { useDrag } from 'react-dnd';
import { Player, PlayerState } from '../types';
import { Badge } from './ui/badge';
import { GripVertical, MoreVertical, Minus, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';

interface DraggablePlayerChipProps {
  player: Player;
  teamId?: string;
  canDrag: boolean;
  onUpdateState?: (state: PlayerState) => void;
  onAdjustGameCount?: (delta: number) => void;
  onDelete?: () => void;
}

const ItemTypes = {
  WAITING_PLAYER: 'waiting_player',
  QUEUED_PLAYER: 'queued_player',
};

const stateLabels: Record<PlayerState, string> = {
  waiting: '대기',
  priority: '우선대기',
  resting: '휴식',
  queued: '게임대기중',
  playing: '게임중',
};

const stateColors: Record<PlayerState, string> = {
  waiting: 'bg-slate-100 text-slate-800 border-slate-200',
  priority: 'bg-amber-100 text-amber-800 border-amber-200',
  resting: 'bg-blue-100 text-blue-800 border-blue-200',
  queued: 'bg-purple-100 text-purple-800 border-purple-200',
  playing: 'bg-green-100 text-green-800 border-green-200',
};

export function DraggablePlayerChip({ 
  player, 
  teamId, 
  canDrag,
  onUpdateState,
  onAdjustGameCount,
  onDelete,
}: DraggablePlayerChipProps) {
  const isWaiting = player.state === 'waiting' || player.state === 'priority';
  
  const [{ isDragging }, drag] = useDrag(() => ({
    type: isWaiting ? ItemTypes.WAITING_PLAYER : ItemTypes.QUEUED_PLAYER,
    item: { playerId: player.id, teamId },
    canDrag,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player.id, teamId, canDrag, isWaiting]);

  return (
    <div
      ref={canDrag ? drag : null}
      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''} ${
        stateColors[player.state] || 'bg-white border-gray-200'
      }`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {canDrag && (
          <GripVertical className="size-4 text-gray-400 shrink-0" />
        )}
        <span className="font-medium truncate">{player.name}</span>
        <Badge variant="secondary" className="text-xs shrink-0">
          {stateLabels[player.state]}
        </Badge>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-xs bg-white/50 font-mono">
          {player.gameCount}회
        </Badge>
        {(onUpdateState || onAdjustGameCount || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpdateState && (
                <>
                  <DropdownMenuLabel>상태 변경</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onUpdateState('waiting')}>
                    대기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateState('priority')}>
                    우선대기
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdateState('resting')}>
                    휴식
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onAdjustGameCount && (
                <>
                  <DropdownMenuLabel>경기수 조정</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onAdjustGameCount(1)}>
                    <Plus className="size-4 mr-2" />
                    경기수 +1
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAdjustGameCount(-1)}>
                    <Minus className="size-4 mr-2" />
                    경기수 -1
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="size-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

export { ItemTypes };