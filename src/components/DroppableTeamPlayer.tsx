import { useDrag, useDrop } from 'react-dnd';
import { Player } from '../types';
import { Badge } from './ui/badge';
import { ItemTypes } from './DraggablePlayerChip';
import { Button } from './ui/button';
import { ArrowLeftRight } from 'lucide-react';
import { useState } from 'react';
import { SwapDialog } from './SwapDialog';

interface DroppableTeamPlayerProps {
  player: Player;
  allPlayers: Player[];
  teamPlayerIds?: string[];
  teamId: string;
  index: number;
  onSwap: (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => void;
  onSwapBetweenTeams?: (sourceTeamId: string, sourcePlayerId: string, targetTeamId: string, targetPlayerId: string) => void;
  onReturnToWaiting?: (playerId: string, teamId: string) => void;
}

export function DroppableTeamPlayer({
  player,
  allPlayers,
  teamPlayerIds,
  teamId,
  index,
  onSwap,
  onSwapBetweenTeams,
  onReturnToWaiting,
}: DroppableTeamPlayerProps) {
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Make queued players draggable
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.QUEUED_PLAYER,
    item: { playerId: player.id, teamId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [player.id, teamId]);

  // Accept both waiting and queued players for drop
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: [ItemTypes.WAITING_PLAYER, ItemTypes.QUEUED_PLAYER],
    drop: (item: { playerId: string; teamId?: string }) => {
      if (item.teamId && item.teamId !== teamId) {
        // Swap between two different teams (queued <-> queued)
        if (onSwapBetweenTeams) {
          onSwapBetweenTeams(item.teamId, item.playerId, teamId, player.id);
        }
      } else if (!item.teamId) {
        // Swap waiting player with queued player
        onSwap(item.playerId, teamId, player.id);
      }
    },
    canDrop: (item) => {
      // Can't drop on self
      return item.playerId !== player.id;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [player.id, teamId, onSwap, onSwapBetweenTeams]);

  const showDropIndicator = isOver && canDrop;

  // Combine drag and drop refs
  const attachRef = (el: HTMLDivElement | null) => {
    drag(el);
    drop(el);
  };

  // Get available players for swap (only waiting/priority for now)
  const getAvailablePlayers = () => {
    return allPlayers.filter(p => p.state === 'waiting' || p.state === 'priority');
  };

  const handleSwap = (targetPlayerId: string) => {
    onSwap(targetPlayerId, teamId, player.id);
  };

  return (
    <>
      <div
        ref={attachRef}
        className={`relative bg-white rounded-lg p-2.5 xl:p-4 border-2 transition-all cursor-grab active:cursor-grabbing shadow-sm min-w-0 ${
          showDropIndicator
            ? 'bg-blue-50 border-blue-400 shadow-md'
            : isDragging
            ? 'opacity-50 scale-95'
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
        }`}
      >
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 xl:gap-2 min-w-0 flex-1">
            <span className="text-sm xl:text-base">{player.name}</span>
            {player.gender && (
              <span className="text-xs xl:text-sm text-gray-500 flex-shrink-0">{player.gender}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 xl:gap-2 flex-shrink-0">
            {player.rank && (
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-2 py-0.5 text-xs">
                {player.rank}
              </Badge>
            )}
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-2 py-0.5 text-xs whitespace-nowrap">
              {player.gameCount}회
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="size-7 p-0 hover:bg-blue-50 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowSwapDialog(true);
              }}
              title="교체하기"
            >
              <ArrowLeftRight className="size-4 text-blue-600" />
            </Button>
          </div>
        </div>
        {showDropIndicator && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-blue-50/90 rounded-lg">
            <span className="text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">
              교체하기
            </span>
          </div>
        )}
      </div>
      
      <SwapDialog
        open={showSwapDialog}
        onOpenChange={setShowSwapDialog}
        currentPlayer={player}
        availablePlayers={getAvailablePlayers()}
        onSwap={handleSwap}
        title={`${player.name} 교체`}
        description="대기중인 참가자와 교체할 수 있습니다"
      />
    </>
  );
}
