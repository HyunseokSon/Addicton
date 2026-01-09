import { useState } from 'react';
import { Gender, Rank } from '../types/index';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddMember: (name: string, gender?: Gender, rank?: Rank) => void;
}

export function AddMemberDialog({
  open,
  onOpenChange,
  onAddMember,
}: AddMemberDialogProps) {
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender | ''>('');
  const [newRank, setNewRank] = useState<Rank | ''>('');

  const handleAdd = () => {
    if (newName.trim() && newGender && newRank) {
      onAddMember(
        newName.trim(),
        newGender || undefined,
        newRank || undefined
      );
      // Reset form
      setNewName('');
      setNewGender('');
      setNewRank('');
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setNewName('');
    setNewGender('');
    setNewRank('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>모임원 추가</DialogTitle>
          <DialogDescription>
            새로운 모임원을 등록합니다. 모든 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">이름 *</label>
            <Input
              type="text"
              placeholder="이름 입력"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">성별 *</label>
            <Select
              value={newGender}
              onValueChange={(value) => setNewGender(value as Gender)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="성별 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="남">남</SelectItem>
                <SelectItem value="여">여</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">급수 *</label>
            <Select
              value={newRank}
              onValueChange={(value) => setNewRank(value as Rank)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="급수 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
                <SelectItem value="E">E</SelectItem>
                <SelectItem value="F">F</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!newName.trim() || !newGender || !newRank}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            <UserPlus className="size-4 mr-2" />
            추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}