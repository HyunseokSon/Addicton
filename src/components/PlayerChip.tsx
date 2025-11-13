import { Player, PlayerState } from '../types';
import { Badge } from './ui/badge';
import { Minus, Plus, Trash2, MoreVertical } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';

interface PlayerChipProps {
  player: Player;
  onUpdateState: (state: PlayerState) => void;
  onAdjustGameCount: (delta: number) => void;
  onDelete: () => void;
  compact?: boolean;
}

const stateColors: Record<PlayerState, string> = {
  waiting: 'bg-slate-100 text-slate-800 border-slate-200',
  priority: 'bg-amber-100 text-amber-800 border-amber-200',
  resting: 'bg-blue-100 text-blue-800 border-blue-200',
  playing: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  queued: 'bg-purple-100 text-purple-800 border-purple-200',
};

const stateLabels: Record<PlayerState, string> = {
  waiting: '대기',
  priority: '우선',
  resting: '휴식',
  playing: '게임중',
  queued: '대기중',
};

export function PlayerChip({
  player,
  onUpdateState,
  onAdjustGameCount,
  onDelete,
  compact = false,
}: PlayerChipProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 shadow-sm">
        <span className="text-sm font-medium">{player.name}</span>
        <Badge variant="outline" className="text-xs">
          {player.gameCount}
        </Badge>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 p-3.5 rounded-xl border bg-white hover:shadow-md hover:border-gray-300 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium truncate">{player.name}</span>
          <Badge variant="outline" className={`text-xs ${stateColors[player.state]}`}>
            {stateLabels[player.state]}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">경기 수:</span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => onAdjustGameCount(-1)}
              disabled={player.gameCount === 0}
            >
              <Minus className="size-3" />
            </Button>
            <span className="text-sm font-semibold min-w-[1.5rem] text-center">{player.gameCount}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              onClick={() => onAdjustGameCount(1)}
            >
              <Plus className="size-3" />
            </Button>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onUpdateState('waiting')}>
            대기로 변경
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdateState('priority')}>
            우선 대기로 변경
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onUpdateState('resting')}>
            휴식으로 변경
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="size-4 mr-2" />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
