import { useState } from 'react';
import { useDrag } from 'react-dnd';
import { Player, PlayerState, Gender, Rank } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { UserPlus, Edit2, Trash2, Check, X, GripVertical, Plus, Minus, ChevronDown, Info } from 'lucide-react';
import { ItemTypes } from './DraggablePlayerChip';
import { PlayerHistoryDialog } from './PlayerHistoryDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface PlayerPanelProps {
  players: Player[];
  onAddPlayer: (name: string) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onUpdatePlayerState: (id: string, state: PlayerState) => void;
  onDeletePlayer: (id: string) => void;
  onAdjustGameCount: (id: string, delta: number) => void;
  onReturnToWaiting: (playerId: string, teamId: string) => void;
}

const STATE_LABELS: Record<PlayerState, string> = {
  waiting: '대기',
  priority: '우선대기',
  resting: '휴식',
  playing: '게임중',
  queued: '게임대기',
};

const STATE_COLORS: Record<PlayerState, string> = {
  waiting: 'bg-blue-100 text-blue-700 border-blue-200',
  priority: 'bg-purple-100 text-purple-700 border-purple-200',
  resting: 'bg-gray-100 text-gray-700 border-gray-200',
  playing: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  queued: 'bg-orange-100 text-orange-700 border-orange-200',
};

export function PlayerPanel({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onUpdatePlayerState,
  onDeletePlayer,
  onAdjustGameCount,
  onReturnToWaiting,
}: PlayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleAdd = () => {
    if (editingName.trim()) {
      onAddPlayer(editingName.trim());
      setEditingName('');
    }
  };

  const handleStartEdit = (player: Player) => {
    setEditingId(player.id);
    setEditingName(player.name);
  };

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      onUpdatePlayer(editingId, { name: editingName.trim() });
      setEditingId(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const getNextState = (current: PlayerState): PlayerState => {
    const cycle: PlayerState[] = ['waiting', 'priority', 'resting'];
    const currentIndex = cycle.indexOf(current);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  // Filter players by state
  const waitingPlayers = players.filter((p) => p.state === 'waiting' || p.state === 'priority');
  const restingPlayers = players.filter((p) => p.state === 'resting');
  const playingPlayers = players.filter((p) => p.state === 'playing');
  const queuedPlayers = players.filter((p) => p.state === 'queued');

  return (
    <div className="space-y-6">
      {/* Waiting Players */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm text-gray-700">대기 중</h3>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            {waitingPlayers.length}명
          </Badge>
        </div>
        <div className="space-y-2 min-h-[100px] bg-blue-50/30 rounded-lg border-2 border-dashed border-blue-200 p-3">
          {waitingPlayers.length === 0 ? (
            <p className="text-xs text-center text-gray-400 py-6">대기중인 참가자가 없습니다</p>
          ) : (
            waitingPlayers.map((player) => (
              <WaitingPlayerCard
                key={player.id}
                player={player}
                allPlayers={players}
                editingId={editingId}
                editingName={editingName}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onEditNameChange={setEditingName}
                onUpdatePlayerState={onUpdatePlayerState}
                onDeletePlayer={onDeletePlayer}
                onAdjustGameCount={onAdjustGameCount}
                onUpdatePlayer={onUpdatePlayer}
                getNextState={getNextState}
              />
            ))
          )}
        </div>
      </div>

      {/* Resting Players */}
      {restingPlayers.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">휴식 중</h3>
            <Badge variant="secondary" className="text-xs px-2 py-0.5">
              {restingPlayers.length}명
            </Badge>
          </div>
          <div className="space-y-2 bg-gray-50/50 rounded-lg border border-gray-200 p-3">
            {restingPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{player.name}</span>
                    <div className="flex items-center gap-1">
                      <Badge className={`text-xs px-2 py-0.5 ${STATE_COLORS[player.state]}`}>
                        {STATE_LABELS[player.state]}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="size-7 p-0 hover:bg-gray-100"
                          >
                            <ChevronDown className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'waiting')}>
                            <span className="text-xs">대기</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'priority')}>
                            <span className="text-xs">우선대기</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'resting')}>
                            <span className="text-xs">휴식</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAdjustGameCount(player.id, -1)}
                      disabled={player.gameCount <= 0}
                      className="size-7 p-0 hover:bg-red-50"
                      title="게임 수 감소"
                    >
                      <Minus className="size-3.5" />
                    </Button>
                    <span className="text-xs text-gray-700 mx-1 font-mono min-w-[32px] text-center">{player.gameCount}회</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onAdjustGameCount(player.id, 1)}
                      className="size-7 p-0 hover:bg-green-50"
                      title="게임 수 증가"
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface WaitingPlayerCardProps {
  player: Player;
  allPlayers: Player[];
  editingId: string | null;
  editingName: string;
  onStartEdit: (player: Player) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditNameChange: (name: string) => void;
  onUpdatePlayerState: (id: string, state: PlayerState) => void;
  onDeletePlayer: (id: string) => void;
  onAdjustGameCount: (id: string, delta: number) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  getNextState: (current: PlayerState) => PlayerState;
}

function WaitingPlayerCard({
  player,
  allPlayers,
  editingId,
  editingName,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditNameChange,
  onUpdatePlayerState,
  onDeletePlayer,
  onAdjustGameCount,
  onUpdatePlayer,
  getNextState,
}: WaitingPlayerCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  
  // Make waiting players draggable
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.WAITING_PLAYER,
    item: { playerId: player.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player.id]);

  return (
    <div
      ref={drag}
      className={`bg-white border border-gray-200 rounded-lg p-2 md:p-3 hover:shadow-md transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
    >
      {editingId === player.id ? (
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={editingName}
            onChange={(e) => onEditNameChange(e.target.value)}
            className="flex-1 h-8 text-sm"
            autoFocus
          />
          <Button size="sm" variant="ghost" onClick={onSaveEdit} className="size-7 p-0 shrink-0">
            <Check className="size-4 text-green-600" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onCancelEdit} className="size-7 p-0 shrink-0">
            <X className="size-4 text-red-600" />
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <GripVertical className="size-4 text-gray-400 shrink-0" />
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 hover:bg-gray-100"
                  >
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'waiting')}>
                    <span className="text-xs">대기</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'priority')}>
                    <span className="text-xs">우선대기</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onUpdatePlayerState(player.id, 'resting')}>
                    <span className="text-xs">휴식</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAdjustGameCount(player.id, -1)}
                disabled={player.gameCount <= 0}
                className="size-6 p-0 hover:bg-red-50"
                title="게임 수 감소"
              >
                <Minus className="size-3" />
              </Button>
              <span className="text-xs text-gray-700 mx-1 font-mono min-w-[28px] text-center">{player.gameCount}회</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onAdjustGameCount(player.id, 1)}
                className="size-6 p-0 hover:bg-green-50"
                title="게임 수 증가"
              >
                <Plus className="size-3" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowHistory(true)}
                className="size-7 p-0 hover:bg-purple-50"
                title="팀메이트 히스토리"
                disabled={player.gameCount === 0}
              >
                <Info className="size-3 text-purple-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onStartEdit(player)}
                className="size-7 p-0 hover:bg-blue-50"
              >
                <Edit2 className="size-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDeletePlayer(player.id)}
                className="size-7 p-0 hover:bg-red-50"
              >
                <Trash2 className="size-3 text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <PlayerHistoryDialog
        player={player}
        allPlayers={allPlayers}
        open={showHistory}
        onOpenChange={setShowHistory}
      />
    </div>
  );
}