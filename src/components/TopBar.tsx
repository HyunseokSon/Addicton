import { Session } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Settings, RefreshCw, Play, Plus, Minus } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Label } from './ui/label';
import { useState } from 'react';
import { Badge } from './ui/badge';

interface TopBarProps {
  session: Session;
  onUpdateSession: (updates: Partial<Session>) => void;
  onPerformAutoMatch: () => void;
  onResetSession: () => void;
}

export function TopBar({
  session,
  onUpdateSession,
  onPerformAutoMatch,
  onResetSession,
}: TopBarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameDuration, setGameDuration] = useState(session.gameDurationMin);

  const handleSaveSettings = () => {
    onUpdateSession({
      gameDurationMin: gameDuration,
    });
    setIsSettingsOpen(false);
  };

  const handleCourtChange = (delta: number) => {
    const newCount = Math.max(1, Math.min(20, session.courtsCount + delta));
    onUpdateSession({ courtsCount: newCount });
  };

  return (
    <div className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
              <span className="text-xl">🏸</span>
            </div>
            <div>
              <h1 className="font-semibold">에딕턴 게임 매칭</h1>
              <p className="text-sm text-muted-foreground">{session.date}</p>
            </div>
          </div>

          {/* Center: Court Controls */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">코트</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleCourtChange(-1)}
                disabled={session.courtsCount <= 1}
              >
                <Minus className="size-3" />
              </Button>
              <Badge variant="secondary" className="text-base px-4 py-1.5 min-w-[3rem] justify-center">
                {session.courtsCount}
              </Badge>
              <Button
                variant="outline"
                size="icon"
                className="size-8"
                onClick={() => handleCourtChange(1)}
                disabled={session.courtsCount >= 20}
              >
                <Plus className="size-3" />
              </Button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button onClick={onPerformAutoMatch} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Play className="size-4" />
              팀 매칭
            </Button>
            
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <Settings className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>게임 설정</DialogTitle>
                  <DialogDescription>
                    게임 시간을 조정하세요
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration-setting">게임 시간 (분)</Label>
                    <Input
                      id="duration-setting"
                      type="number"
                      min="5"
                      max="60"
                      value={gameDuration}
                      onChange={(e) => setGameDuration(parseInt(e.target.value) || 15)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                    취소
                  </Button>
                  <Button onClick={handleSaveSettings}>저장</Button>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon">
                  <RefreshCw className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>세션 초기화</AlertDialogTitle>
                  <AlertDialogDescription>
                    모든 팀 매칭과 게임 기록이 초기화됩니다. 참가자 정보는 유지되며, 게임 횟수는 0으로 리셋됩니다. 계속하시겠습니까?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={onResetSession}>
                    초기화
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </div>
  );
}