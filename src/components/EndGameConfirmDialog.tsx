import { Player, Team } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Award } from 'lucide-react';

interface EndGameConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team | null;
  players: Player[];
  courtName: string;
  onConfirm: () => void;
}

export function EndGameConfirmDialog({
  open,
  onOpenChange,
  team,
  players,
  courtName,
  onConfirm,
}: EndGameConfirmDialogProps) {
  const teamPlayers = team ? players.filter((p) => team.playerIds.includes(p.id)) : [];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-emerald-600" />
            경기 종료 확인
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-emerald-700">{courtName}</span> 코트의 경기를 종료하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Award className="size-4" />
            <span>팀원 정보 ({teamPlayers.length}명)</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {teamPlayers.map((player) => (
              <div
                key={player.id}
                className="bg-gradient-to-r from-emerald-50 to-white rounded-lg p-3 border border-emerald-200 flex items-center justify-between hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-gray-900">{player.name}</span>
                  <div className="flex items-center gap-1.5">
                    {player.gender && (
                      <Badge variant="outline" className="text-xs px-2 py-0 h-5">
                        {player.gender === 'male' ? '남' : '여'}
                      </Badge>
                    )}
                    {player.rank && (
                      <Badge className="text-xs px-2 py-0 h-5 bg-amber-100 border-amber-300 text-amber-700 hover:bg-amber-200">
                        {player.rank}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                      {player.gameCount}경기
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <p className="font-medium mb-1">종료 시 변경사항:</p>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              <li>모든 팀원의 경기 횟수가 <strong>+1</strong> 증가합니다</li>
              <li>팀원들은 <strong>대기 상태</strong>로 전환됩니다</li>
              <li>코트가 <strong>사용 가능</strong> 상태로 변경됩니다</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-none"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1 sm:flex-none"
          >
            경기 종료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}