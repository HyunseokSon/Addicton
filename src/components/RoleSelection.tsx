import { Users, Shield, Lock, ArrowLeft } from 'lucide-react';
import addictonLogo from 'figma:asset/3326f21ff08f9b7816589961d903cd0071089100.png';
import { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface RoleSelectionProps {
  onSelectRole: (role: 'admin' | 'member') => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleAdminClick = () => {
    setShowPasswordInput(true);
    setPassword('');
    setError('');
  };

  const handleBack = () => {
    setShowPasswordInput(false);
    setPassword('');
    setError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      setError('비밀번호를 입력해주세요');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-41b22d2d/admin-password/verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({ password }),
        }
      );

      const data = await response.json();

      if (data.valid) {
        onSelectRole('admin');
      } else {
        setError('비밀번호가 올바르지 않습니다');
        setPassword('');
      }
    } catch (err) {
      console.error('Password verification error:', err);
      setError('비밀번호 확인 중 오류가 발생했습니다');
    } finally {
      setIsVerifying(false);
    }
  };

  if (showPasswordInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="size-4 mr-2" />
            뒤로 가기
          </Button>

          {/* Password Input Card */}
          <div className="bg-white rounded-2xl border-2 border-blue-200 shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4">
                <Lock className="size-8 text-white" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                운영진 인증
              </h2>
              <p className="text-sm text-muted-foreground">
                운영진 비밀번호를 입력해주세요
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  className="h-12 text-center text-lg"
                  autoFocus
                  disabled={isVerifying}
                />
                {error && (
                  <p className="text-sm text-red-600 mt-2 text-center">{error}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold"
                disabled={isVerifying}
              >
                {isVerifying ? '확인 중...' : '입장하기'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo and Title */}
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            에딕턴 게임 매칭
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            실시간 팀 매칭 시스템
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Admin Card */}
          <button
            onClick={handleAdminClick}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8 hover:border-blue-500 hover:shadow-2xl transition-all duration-300 active:scale-95 text-left"
          >
            <div className="absolute top-4 right-4 size-10 md:size-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Shield className="size-5 md:size-6 text-white" />
            </div>
            
            <div className="mt-8 md:mt-12">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                운영진
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                모든 기능을 사용할 수 있습니다
              </p>
              
              <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  <span>참가자 등록/삭제</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  <span>팀 매칭 및 관리</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  <span>게임 시작/종료</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-blue-500" />
                  <span>모임원 관리</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t">
              <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-700">
                운영진으로 입장 →
              </span>
            </div>
          </button>

          {/* Member Card */}
          <button
            onClick={() => onSelectRole('member')}
            className="group relative bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8 hover:border-emerald-500 hover:shadow-2xl transition-all duration-300 active:scale-95 text-left"
          >
            <div className="absolute top-4 right-4 size-10 md:size-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="size-5 md:size-6 text-white" />
            </div>
            
            <div className="mt-8 md:mt-12">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                회원
              </h2>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                게임 현황을 확인할 수 있습니다
              </p>
              
              <ul className="space-y-2 text-xs md:text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>코트 현황 조회</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>대기 팀 확인</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>참가자 명단 조회</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-emerald-500" />
                  <span>실시간 동기화</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t">
              <span className="text-sm font-semibold text-emerald-600 group-hover:text-emerald-700">
                회원으로 입장 →
              </span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs md:text-sm text-muted-foreground mt-6 md:mt-8">
          역할을 선택하여 게임 매칭 시스템에 접속하세요
        </p>
      </div>
    </div>
  );
}