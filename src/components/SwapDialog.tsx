import { Player } from '../types';
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

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlayer: Player;
  availablePlayers: Player[];
  onSwap: (targetPlayerId: string) => void;
  title?: string;
  description?: string;
}

export function SwapDialog({
  open,
  onOpenChange,
  currentPlayer,
  availablePlayers,
  onSwap,
  title = '교체할 사람 선택',
  description = '교체할 참가자를 선택해주세요',
}: SwapDialogProps) {
  const handleSwap = (targetPlayerId: string) => {
    onSwap(targetPlayerId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {availablePlayers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              교체 가능한 참가자가 없습니다
            </div>
          ) : (
            availablePlayers.map((player) => (
              <Button
                key={player.id}
                variant="outline"
                className="w-full justify-between h-auto py-3 px-4 hover:bg-blue-50 hover:border-blue-300"
                onClick={() => handleSwap(player.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{player.name}</span>
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
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
