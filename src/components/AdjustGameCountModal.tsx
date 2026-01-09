import { useState } from 'react';
import { Player } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Plus, Minus } from 'lucide-react';
import { Badge } from './ui/badge';

interface AdjustGameCountModalProps {
  player: Player | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (playerId: string, newGameCount: number) => void;
}

export function AdjustGameCountModal({
  player,
  open,
  onOpenChange,
  onConfirm,
}: AdjustGameCountModalProps) {
  const [tempGameCount, setTempGameCount] = useState(0);

  // Update temp game count when player changes
  if (player && tempGameCount !== player.gameCount && !open) {
    setTempGameCount(player.gameCount);
  }

  if (!player) return null;

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempGameCount(player.gameCount);
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    onConfirm(player.id, tempGameCount);
    onOpenChange(false);
  };

  const increment = () => {
    setTempGameCount((prev) => prev + 1);
  };

  const decrement = () => {
    setTempGameCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>경기수 조정</DialogTitle>
          <DialogDescription>
            참가자의 경기수를 조정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="font-medium text-lg">{player.name}</span>
              {player.gender && (
                <Badge variant="outline" className="text-xs">
                  {player.gender}
                </Badge>
              )}
              {player.rank && (
                <Badge variant="outline" className="text-xs">
                  {player.rank}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrement}
                disabled={tempGameCount === 0}
                className="h-12 w-12 rounded-full"
              >
                <Minus className="h-5 w-5" />
              </Button>

              <div className="flex flex-col items-center gap-1 min-w-[100px]">
                <span className="text-sm text-gray-500">현재 경기수</span>
                <span className="text-4xl font-bold text-blue-600">
                  {tempGameCount}
                </span>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={increment}
                className="h-12 w-12 rounded-full"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>

            {player.gameCount !== tempGameCount && (
              <div className="text-sm text-gray-500">
                {player.gameCount} → {tempGameCount} 
                <span className="ml-2 font-medium text-blue-600">
                  ({tempGameCount > player.gameCount ? '+' : ''}
                  {tempGameCount - player.gameCount})
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm}>
            확인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
