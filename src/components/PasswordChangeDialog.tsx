import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Lock } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface PasswordChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordChangeDialog({ open, onOpenChange }: PasswordChangeDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isChanging, setIsChanging] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccess('');
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('모든 필드를 입력해주세요');
      return;
    }

    if (newPassword.length < 4) {
      setError('새 비밀번호는 최소 4자 이상이어야 합니다');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 일치하지 않습니다');
      return;
    }

    setIsChanging(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d/admin-password/change`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess('비밀번호가 성공적으로 변경되었습니다');
        setTimeout(() => {
          handleClose();
        }, 1500);
      } else {
        setError(data.error || '비밀번호 변경에 실패했습니다');
      }
    } catch (err) {
      console.error('Password change error:', err);
      setError('비밀번호 변경 중 오류가 발생했습니다');
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-2">
            <Lock className="size-6 text-white" />
          </div>
          <DialogTitle className="text-center">비밀번호 변경</DialogTitle>
          <DialogDescription className="text-center">
            운영진 비밀번호를 변경합니다
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              현재 비밀번호
            </label>
            <Input
              type="password"
              placeholder="현재 비밀번호 입력"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              disabled={isChanging}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              새 비밀번호
            </label>
            <Input
              type="password"
              placeholder="새 비밀번호 입력 (최소 4자)"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              disabled={isChanging}
              className="h-10"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">
              새 비밀번호 확인
            </label>
            <Input
              type="password"
              placeholder="새 비밀번호 다시 입력"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setError('');
                setSuccess('');
              }}
              disabled={isChanging}
              className="h-10"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isChanging}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={isChanging}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              {isChanging ? '변경 중...' : '변경하기'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
