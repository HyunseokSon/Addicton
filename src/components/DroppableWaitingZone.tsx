import { useDrop } from 'react-dnd';
import { ItemTypes } from './DraggablePlayerChip';
import { Users, ArrowDown } from 'lucide-react';

interface DroppableWaitingZoneProps {
  onReturnToWaiting: (playerId: string, teamId: string) => void;
}

export function DroppableWaitingZone({ onReturnToWaiting }: DroppableWaitingZoneProps) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ItemTypes.QUEUED_PLAYER,
    drop: (item: { playerId: string; teamId?: string }) => {
      if (item.teamId) {
        onReturnToWaiting(item.playerId, item.teamId);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [onReturnToWaiting]);

  const showDropIndicator = isOver && canDrop;

  return (
    <div
      ref={drop}
      className={`p-4 rounded-lg border-2 border-dashed transition-all ${
        showDropIndicator
          ? 'bg-green-50 border-green-400 shadow-lg'
          : 'bg-gray-50 border-gray-300'
      }`}
    >
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {showDropIndicator ? (
          <>
            <ArrowDown className="size-4 text-green-600 animate-bounce" />
            <span className="text-green-600 font-medium">대기 상태로 복귀</span>
          </>
        ) : (
          <>
            <Users className="size-4" />
            <span>게임 대기 참가자를 여기에 드롭하여 대기 상태로 변경</span>
          </>
        )}
      </div>
    </div>
  );
}
