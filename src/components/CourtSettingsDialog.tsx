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

interface CourtSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courts: Court[];
  onUpdateCourtNames: (courts: { id: string; name: string }[]) => void;
}

export function CourtSettingsDialog({
  open,
  onOpenChange,
  courts,
  onUpdateCourtNames,
}: CourtSettingsDialogProps) {
  const [courtNames, setCourtNames] = useState<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    courts.forEach(court => {
      names[court.id] = court.name;
    });
    return names;
  });

  const handleSave = () => {
    const updates = courts.map(court => ({
      id: court.id,
      name: courtNames[court.id] || court.name,
    }));
    onUpdateCourtNames(updates);
    onOpenChange(false);
  };

  const handleCancel = () => {
    // Reset to original names
    const names: Record<string, string> = {};
    courts.forEach(court => {
      names[court.id] = court.name;
    });
    setCourtNames(names);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>코트 번호 설정</DialogTitle>
          <DialogDescription>
            각 코트의 번호나 이름을 입력하세요
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {courts.slice(0, courts.length).filter((_, idx) => idx < 20).map((court, index) => (
            <div key={court.id} className="space-y-2">
              <Label htmlFor={`court-${court.id}`}>
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

        <div className="flex justify-end gap-2">
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