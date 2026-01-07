import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

interface EndAllGamesConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeGamesCount: number;
  onConfirm: () => void;
}

export function EndAllGamesConfirmDialog({
  open,
  onOpenChange,
  activeGamesCount,
  onConfirm,
}: EndAllGamesConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-5 text-red-600" />
            일괄 종료 확인
          </DialogTitle>
          <DialogDescription>
            진행 중인 <span className="font-semibold text-red-700">{activeGamesCount}개</span>의 경기를 모두 종료하시겠습니까?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm font-medium text-red-900 mb-2">⚠️ 주의사항</p>
            <ul className="list-disc list-inside space-y-1 text-xs text-red-800">
              <li>모든 코트의 경기가 즉시 종료됩니다</li>
              <li>모든 참가자의 경기 횟수가 +1 증가합니다</li>
              <li>참가자들은 대기 상태로 전환됩니다</li>
              <li>이 작업은 되돌릴 수 없습니다</li>
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
            일괄 종료
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
