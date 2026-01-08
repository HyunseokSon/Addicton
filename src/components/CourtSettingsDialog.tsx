import { useState } from 'react';
import { Court } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Building2, AlertCircle } from 'lucide-react';

interface CourtSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courts: Court[];
  currentCourtCount: number;
  activeCourtCount: number;
  onUpdateCourtNames: (courts: { id: string; name: string }[]) => void;
  onUpdateCourtCount: (count: number) => void;
}

export function CourtSettingsDialog({
  open,
  onOpenChange,
  courts,
  currentCourtCount,
  activeCourtCount,
  onUpdateCourtNames,
  onUpdateCourtCount,
}: CourtSettingsDialogProps) {
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    courts.forEach(court => {
      names[court.id] = court.name;
    });
    return names;
  });
  const [courtCount, setCourtCount] = useState(currentCourtCount.toString());
  const [error, setError] = useState('');

  const handleSave = () => {
    // Validate court count
    const newCount = parseInt(courtCount, 10);
    if (isNaN(newCount) || newCount < 1 || newCount > 8) {
      setError('코트는 최소 1개, 최대 8개까지 설정할 수 있습니다.');
      return;
    }

    // Check for active games
    if (newCount < activeCourtCount) {
      setError(`현재 ${activeCourtCount}개의 코트에서 경기가 진행 중입니다. 먼저 경기를 종료해주세요.`);
      return;
    }

    // Update court count if changed
    if (newCount !== currentCourtCount) {
      onUpdateCourtCount(newCount);
    }

    // Update court names
    const updates = courts.slice(0, newCount).map(court => ({
      id: court.id,
      name: courtNames[court.id] || court.name,
    }));
    onUpdateCourtNames(updates);
    
    setError('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original names and count
    const names: Record<string, string> = {};
    courts.forEach(court => {
      names[court.id] = court.name;
    });
    setCourtNames(names);
    setCourtCount(currentCourtCount.toString());
    setError('');
    onOpenChange(false);
  };

  const handleCourtCountChange = (value: string) => {
    setCourtCount(value);
    setError(''); // Clear error when user types
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      handleCancel();
    } else {
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="size-5 text-blue-600" />
            코트 설정
          </DialogTitle>
          <DialogDescription>
            코트 개수와 각 코트의 번호를 설정하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Court Count Section */}
          <div className="space-y-3 pb-4 border-b">
            <div className="space-y-2">
              <Label htmlFor="court-count-input" className="text-sm font-semibold">
                코트 개수 (1-8)
              </Label>
              <input
                id="court-count-input"
                type="number"
                min="1"
                max="8"
                value={courtCount}
                onChange={(e) => handleCourtCountChange(e.target.value)}
                className="w-full text-lg font-semibold text-center bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-blue-900">현재 상태</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white rounded px-2 py-1.5">
                  <p className="text-gray-500 mb-0.5">현재 코트 수</p>
                  <p className="font-semibold text-gray-900">{currentCourtCount}개</p>
                </div>
                <div className="bg-white rounded px-2 py-1.5">
                  <p className="text-gray-500 mb-0.5">진행중인 경기</p>
                  <p className="font-semibold text-gray-900">{activeCourtCount}개</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="size-4 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Court Names Section */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">코트 번호 설정</Label>
            <div className="space-y-3">
              {courts.slice(0, parseInt(courtCount) || currentCourtCount).map((court, index) => (
                <div key={court.id} className="space-y-1.5">
                  <Label htmlFor={`court-${court.id}`} className="text-xs text-gray-600">
                    코트 {index + 1}
                  </Label>
                  <Input
                    id={`court-${court.id}`}
                    value={courtNames[court.id] || ''}
                    onChange={(e) => setCourtNames(prev => ({
                      ...prev,
                      [court.id]: e.target.value,
                    }))}
                    placeholder={`예: A, B, 중앙 등`}
                    className="font-medium"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button variant="outline" onClick={handleCancel}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}