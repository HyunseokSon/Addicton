import { useGameState } from './hooks/useGameState';
import { TopBar } from './components/TopBar';
import { PlayerPanel } from './components/PlayerPanel';
import { MemberManagement } from './components/MemberManagement';
import { MatchingArea } from './components/MatchingArea';
import { Statistics } from './components/Statistics';
import { DragDropProvider } from './components/DragDropProvider';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { CourtCard } from './components/CourtCard';
import { CourtSettingsDialog } from './components/CourtSettingsDialog';
import { EndAllGamesConfirmDialog } from './components/EndAllGamesConfirmDialog';
import { QueuedPlayersPanel } from './components/QueuedPlayersPanel';
import { RestingPlayersPanel } from './components/RestingPlayersPanel';
import { ManualTeamDialog } from './components/ManualTeamDialog';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { RefreshCw, LogOut, KeyRound, Settings, RotateCcw } from 'lucide-react';
import addictonLogo from 'figma:asset/3326f21ff08f9b7816589961d903cd0071089100.png';
import { useState, useEffect } from 'react';
import { RoleSelection } from './components/RoleSelection';
import { PasswordChangeDialog } from './components/PasswordChangeDialog';
import { LoadingModal } from './components/LoadingModal';
import { projectId, publicAnonKey } from './utils/supabase/info';
import type { PlayerState } from './types/index';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

type UserRole = 'admin' | 'member' | null;

export default function App() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCourtSettings, setShowCourtSettings] = useState(false);
  const [showEndAllGamesDialog, setShowEndAllGamesDialog] = useState(false);
  const [showManualTeamDialog, setShowManualTeamDialog] = useState(false);
  const [loadingModal, setLoadingModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    status: 'loading' | 'success' | 'error';
    errorMessage?: string;
    onClose?: () => void;
  }>({
    open: false,
    title: '',
    status: 'loading',
  });
  
  const {
    state,
    updateSession,
    addPlayer,
    updatePlayer,
    deletePlayer,
    deletePlayers,
    updatePlayerState,
    performAutoMatch,
    startGame,
    startAllQueuedGames,
    endGame,
    endAllGames,
    toggleCourtPause,
    updateCourtTimer,
    updateCourtNames,
    adjustGameCount,
    deleteTeam,
    updateTeam,
    createManualTeam,
    resetSession,
    addMember,
    updateMember,
    deleteMember,
    addMemberAsPlayer,
    addMembersAsPlayers,
    syncFromSupabase,
    resetMembers,
  } = useGameState();

  // Clear localStorage on app start to force Supabase-only operation
  useEffect(() => {
    console.log('🗑️ Clearing all localStorage data...');
    localStorage.clear();
    console.log('✅ localStorage cleared - now using Supabase only');
  }, []);

  // Periodic sync every 2 minutes to keep data fresh
  useEffect(() => {
    // Only sync after role selection (when user is on the main app screen)
    // No sync needed on RoleSelection screen
    if (!userRole) return;

    // Sync every 2 minutes (120 seconds)
    const SYNC_INTERVAL = 120000; // 2 minutes
    
    console.log(`⏰ Setting up periodic sync (every ${SYNC_INTERVAL / 1000} seconds)...`);
    const intervalId = setInterval(async () => {
      console.log('🔄 Periodic sync triggered...');
      try {
        await syncFromSupabase();
        console.log('✅ Periodic sync completed');
      } catch (error) {
        console.error('⚠️ Periodic sync failed:', error);
      }
    }, SYNC_INTERVAL);

    return () => {
      console.log('🛑 Clearing periodic sync interval');
      clearInterval(intervalId);
    };
  }, [userRole, syncFromSupabase]);

  // Sync when page becomes visible again (user returns to tab)
  useEffect(() => {
    // Only sync when user is on the main app screen
    if (!userRole) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ Page became visible, syncing data...');
        
        // Show loading modal
        setLoadingModal({
          open: true,
          title: '데이터 동기화 중',
          description: '최신 상태를 가져오고 있습니다...',
          status: 'loading',
        });
        
        try {
          await syncFromSupabase();
          console.log('✅ Visibility sync completed');
          
          // Close modal without toast (silent sync)
          setLoadingModal(prev => ({ ...prev, open: false }));
        } catch (error) {
          console.error('⚠️ Visibility sync failed:', error);
          
          // Show error modal
          setLoadingModal({
            open: true,
            title: '동기화 실패',
            status: 'error',
            errorMessage: '데이터를 가져오는 중 오류가 발생했습니다. 새로고침 버튼을 눌러 다시 시도해주세요.',
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userRole, syncFromSupabase]);

  const handleAutoMatch = async () => {
    const eligibleCount = state.players.filter(
      (p) => (p.state === 'waiting' || p.state === 'priority')
    ).length;

    if (eligibleCount < (state.session?.teamSize || 4)) {
      toast.error('매칭 실패', {
        description: `최소 ${state.session?.teamSize || 4}명의 대기 참가자가 필요합니다.`,
      });
      return;
    }

    const totalCourts = state.session?.courtsCount || 4;
    const currentQueuedTeams = state.teams.filter((t) => t.state === 'queued').length;
    const maxNewTeams = Math.max(0, totalCourts - currentQueuedTeams);

    if (maxNewTeams === 0) {
      toast.error('매칭 불가', {
        description: '게임 대기중인 팀이 이미 코트 수만큼 있습니다. 먼저 게임을 시작해주세요.',
      });
      return;
    }

    const newTeamsCount = Math.min(
      maxNewTeams,
      Math.floor(eligibleCount / (state.session?.teamSize || 4))
    );

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '팀 매칭 중',
      description: `${newTeamsCount}개 팀을 생성하고 있습니다...`,
      status: 'loading',
    });

    try {
      await performAutoMatch();
      
      // Close modal and show success toast immediately
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('팀 매칭 완료', {
        description: `${newTeamsCount}개 팀이 생성되었습니다.`,
      });

    } catch (error) {
      console.error('Auto match failed:', error);
      setLoadingModal({
        open: true,
        title: '팀 매칭 실패',
        status: 'error',
        errorMessage: '매칭 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleStartGame = async (teamId: string, courtId?: string) => {
    // Pre-check for available courts
    const availableCourt = state.courts.find((c) => c.status === 'available');
    if (!availableCourt && !courtId) {
      toast.error('코트 부족', {
        description: '사용 가능한 코트가 없습니다.',
      });
      return;
    }

    // Call startGame - it will handle all validation and state updates
    const result = await startGame(teamId, courtId);
    
    // Show success message only if game actually started
    if (result.success) {
      toast.success('게임 시작', {
        description: '타이머가 시작되었습니다.',
      });
    } else {
      // Show specific error message based on failure reason
      if (result.reason?.startsWith('duplicate_players:')) {
        const playerNames = result.reason.split(':')[1];
        toast.error('게임 시작 실패', {
          description: `이미 게임 중인 참가자가 포함되어 있습니다: ${playerNames}`,
        });
      } else if (result.reason === 'no_available_courts') {
        toast.error('게임 시작 실패', {
          description: '사용 가능한 코트가 없습니다.',
        });
      } else if (result.reason === 'team_already_playing') {
        toast.error('게임 시작 실패', {
          description: '이미 게임이 진행 중인 팀입니다.',
        });
      } else {
        toast.error('게임 시작 실패', {
          description: '게임을 시작할 수 없습니다.',
        });
      }
    }
  };

  const handleStartAllQueuedGames = async () => {
    const availableCourts = state.courts.filter((c) => c.status === 'available');
    const queuedTeams = state.teams
      .filter((t) => t.state === 'queued')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); // Sort by priority (oldest first)
    
    if (availableCourts.length === 0) {
      toast.error('코트 부족', {
        description: '사용 가능한 코트가 없습니다.',
      });
      return;
    }

    const teamsToStart = Math.min(queuedTeams.length, availableCourts.length);

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '게임 일괄 시작 중',
      description: `최대 ${teamsToStart}개 팀의 게임을 시작하고 있습니다...`,
      status: 'loading',
    });

    try {
      const startedCount = await startAllQueuedGames();
      
      // Close modal and show appropriate message
      setLoadingModal(prev => ({ ...prev, open: false }));
      
      if (startedCount === 0) {
        toast.warning('게임 시작 불가', {
          description: '시작할 수 있는 팀이 없습니다.',
        });
      } else {
        const skippedCount = queuedTeams.length - startedCount;
        
        if (skippedCount > 0) {
          toast.success('게임 시작 완료', {
            description: `${startedCount}개 팀의 게임이 시작되었습니다. ${skippedCount}개 팀은 중복 플레이어로 인해 건너뛰었습니다.`,
          });
        } else {
          toast.success('게임 시작 완료', {
            description: `${startedCount}개 팀의 게임이 시작되었습니다.`,
          });
        }
      }

    } catch (error) {
      console.error('Start all games failed:', error);
      setLoadingModal({
        open: true,
        title: '게임 시작 실패',
        status: 'error',
        errorMessage: '게임 시작 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleEndGame = async (courtId: string) => {
    console.log('🎮 handleEndGame called for court:', courtId);
    
    // Show loading modal immediately
    setLoadingModal({
      open: true,
      title: '게임 종료 중',
      description: '게임을 종료하고 참가자들을 대기 상태로 전환하고 있습니다...',
      status: 'loading',
    });

    try {
      // Skip sync before ending game - rely on periodic sync (every 1 minute)
      // This reduces processing time by ~300-500ms
      console.log('📤 Calling endGame directly (no pre-sync needed)...');
      await endGame(courtId);
      console.log('✅ endGame completed');
      
      // Close modal and show success toast immediately
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('게임 종료 완료', {
        description: '참가자들이 대기 상태로 전환되었습니다.',
      });

    } catch (error) {
      console.error('❌ End game failed:', error);
      setLoadingModal({
        open: true,
        title: '데이터 동기화 필요',
        status: 'error',
        errorMessage: '데이터베이스 업데이트 중 오류가 발생했습니다. 페이지를 새로고침하여 최신 상태를 불러옵니다.',
        onClose: () => {
          window.location.reload();
        }
      });
      
      // Auto reload after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  const handleEndAllGames = async () => {
    console.log('🎮 handleEndAllGames called');
    const activeCourts = state.courts.filter((c) => c.status === 'occupied');
    
    console.log(`📊 Active courts count: ${activeCourts.length}`, activeCourts.map(c => ({ id: c.id, teamId: c.currentTeamId })));
    
    if (activeCourts.length === 0) {
      console.log('❌ No active games to end');
      toast.error('종료 실패', {
        description: '진행중인 게임이 없습니다.',
      });
      return;
    }

    // Show loading modal
    console.log('🔄 Showing loading modal...');
    setLoadingModal({
      open: true,
      title: '모든 게임 종료 중',
      description: `${activeCourts.length}개의 게임을 종료하고 있습니다...`,
      status: 'loading',
    });

    try {
      console.log('📤 Calling endAllGames()...');
      const endedCount = await endAllGames();
      console.log(`✅ endAllGames completed, ended ${endedCount} games`);
      
      // Close modal and show success toast immediately
      console.log('✅ Closing loading modal and showing success toast');
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('모든 게임 종료 완료', {
        description: `${endedCount}개의 게임이 종료되었습니다.`,
      });

    } catch (error) {
      console.error('❌ End all games failed:', error);
      setLoadingModal({
        open: true,
        title: '데이터 동기화 필요',
        status: 'error',
        errorMessage: '데이터베이스 업데이트 중 오류가 발생했습니다. 페이지를 새로고침하여 최신 상태를 불러옵니다.',
        onClose: () => {
          window.location.reload();
        }
      });
      
      // Auto reload after 3 seconds
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  };

  const handleSwapPlayer = async (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => {
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;

    const waitingPlayer = state.players.find((p) => p.id === waitingPlayerId);
    const queuedPlayer = state.players.find((p) => p.id === queuedPlayerId);
    if (!waitingPlayer || !queuedPlayer) return;

    console.log('🔄 Starting player swap:', {
      waiting: { id: waitingPlayerId, name: waitingPlayer.name, currentState: waitingPlayer.state },
      queued: { id: queuedPlayerId, name: queuedPlayer.name, currentState: queuedPlayer.state },
      team: teamId
    });

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '참가자 교체 중',
      description: `${waitingPlayer.name}님과 ${queuedPlayer.name}님을 교체하고 있습니다...`,
      status: 'loading',
    });

    try {
      // Update team's player list
      const newPlayerIds = team.playerIds.map((id) =>
        id === queuedPlayerId ? waitingPlayerId : id
      );
      await updateTeam(teamId, newPlayerIds);
      console.log('✅ Team updated with new player IDs:', newPlayerIds);

      // Update player states
      console.log(`📤 Updating ${waitingPlayer.name} to queued state...`);
      await updatePlayer(waitingPlayerId, { state: 'queued' });
      
      // ⭐ Check if queued player is in any other team before changing to waiting
      const otherTeams = state.teams.filter(t => 
        t.id !== teamId && 
        (t.state === 'queued' || t.state === 'playing') && 
        t.playerIds.includes(queuedPlayerId)
      );
      
      if (otherTeams.length === 0) {
        // Only update to waiting if not in other teams
        console.log(`📤 Updating ${queuedPlayer.name} to waiting state...`);
        await updatePlayer(queuedPlayerId, { state: 'waiting' });
      } else {
        console.log(`⚠️ ${queuedPlayer.name} is in ${otherTeams.length} other team(s), keeping queued state`);
      }
      console.log('✅ Player states updated in Supabase')
      
      // Sync from Supabase to get the latest data
      await syncFromSupabase();
      
      // Close modal and show success toast
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('참가자 교체 완료', {
        description: `${waitingPlayer.name}님과 ${queuedPlayer.name}님이 교체되었습니다.`,
      });

    } catch (error) {
      console.error('Swap player failed:', error);
      setLoadingModal({
        open: true,
        title: '참가자 교체 실패',
        status: 'error',
        errorMessage: '교체 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleUpdatePlayerState = async (playerId: string, newState: PlayerState) => {
    try {
      await updatePlayerState([playerId], newState);
      toast.success('상태 변경 완료', {
        description: `참가자 상태가 변경되었습니다.`,
      });
    } catch (error) {
      console.error('Update player state failed:', error);
      toast.error('상태 변경 실패', {
        description: '상태 변경 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleSwapBetweenTeams = (dragTeamId: string, dragPlayerId: string, dropTeamId: string, dropPlayerId: string) => {
    const dragTeam = state.teams.find((t) => t.id === dragTeamId);
    const dropTeam = state.teams.find((t) => t.id === dropTeamId);
    if (!dragTeam || !dropTeam) return;

    // Find the positions of both players in their respective teams
    const dragPlayerIndex = dragTeam.playerIds.indexOf(dragPlayerId);
    const dropPlayerIndex = dropTeam.playerIds.indexOf(dropPlayerId);

    // Swap the players
    const newDragPlayerIds = [...dragTeam.playerIds];
    const newDropPlayerIds = [...dropTeam.playerIds];
    newDragPlayerIds[dragPlayerIndex] = dropPlayerId;
    newDropPlayerIds[dropPlayerIndex] = dragPlayerId;

    updateTeam(dragTeamId, newDragPlayerIds);
    updateTeam(dropTeamId, newDropPlayerIds);
  };

  const handleReturnToWaiting = async (playerId: string, teamId: string) => {
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;

    // Remove player from team
    const newPlayerIds = team.playerIds.filter((id) => id !== playerId);
    
    if (newPlayerIds.length === 0) {
      // If team is now empty, delete the team (which handles player state properly)
      await deleteTeam(teamId);
    } else {
      await updateTeam(teamId, newPlayerIds);
      
      // ⭐ Only update player state if they are NOT in any other team
      const otherTeams = state.teams.filter(t => t.id !== teamId && (t.state === 'queued' || t.state === 'playing'));
      const isInOtherTeam = otherTeams.some(t => t.playerIds.includes(playerId));
      
      if (!isInOtherTeam) {
        const player = state.players.find(p => p.id === playerId);
        // Only update to waiting if player is currently queued (not playing)
        if (player && player.state === 'queued') {
          await updatePlayer(playerId, { state: 'waiting' });
        }
      }
    }

    toast.success('대기 상태로 복귀', {
      description: '참가자가 팀에서 제거되었습니다.',
    });
  };

  const handleCreateManualTeam = async (playerIds: string[]) => {
    try {
      await createManualTeam(playerIds);
      
      const playerNames = playerIds
        .map(id => state.players.find(p => p.id === id)?.name)
        .filter(Boolean)
        .join(', ');
      
      toast.success('수동 팀 생성 완료', {
        description: `${playerNames} 팀이 생성되었습니다.`,
      });
    } catch (error) {
      console.error('Manual team creation failed:', error);
      toast.error('팀 생성 실패', {
        description: error instanceof Error ? error.message : '팀 생성 중 오류가 발생했습니다.',
      });
      throw error;
    }
  };

  const handleDeleteAllWaiting = async () => {
    const waitingPlayers = state.players.filter((p) => p.state === 'waiting');
    
    if (waitingPlayers.length === 0) {
      toast.error('삭제 실패', {
        description: '대기중인 참가자가 없습니다.',
      });
      return;
    }

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '참가자 삭제 중',
      description: `${waitingPlayers.length}명의 참가자를 삭제하고 있습니다...`,
      status: 'loading',
    });

    try {
      // Use batch delete API
      const playerIds = waitingPlayers.map((p) => p.id);
      const deletedCount = await deletePlayers(playerIds);
      
      // Show success and sync data
      setLoadingModal({
        open: true,
        title: '참가자 삭제 중',
        description: `${deletedCount}명의 참가자가 삭제되었습니다. 데이터를 새로고침합니다...`,
        status: 'loading',
      });

      // Auto sync to reflect changes
      await syncFromSupabase();

      // Close modal and show success toast
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('전체 삭제 완료', {
        description: `${deletedCount}명의 참가자가 삭제되었습니다.`,
      });

    } catch (error) {
      console.error('Batch delete failed:', error);
      setLoadingModal({
        open: true,
        title: '삭제 실패',
        status: 'error',
        errorMessage: '삭제 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleRemoveAllWaiting = async () => {
    const waitingPlayers = state.players.filter((p) => p.state === 'waiting' || p.state === 'priority');
    
    if (waitingPlayers.length === 0) {
      toast.error('미참가 전환 실패', {
        description: '대기중인 참가자가 없습니다.',
      });
      return;
    }

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '미참가 전환 중',
      description: `${waitingPlayers.length}명의 참가자를 미참가 상태로 전환하고 있습니다...`,
      status: 'loading',
    });

    try {
      // Use batch delete API to remove from players table
      const playerIds = waitingPlayers.map((p) => p.id);
      const deletedCount = await deletePlayers(playerIds);
      
      // Show success and sync data
      setLoadingModal({
        open: true,
        title: '미참가 전환 중',
        description: `${deletedCount}명의 참가자가 미참가 상태로 전환되었습니다. 데이터를 새로고침합니다...`,
        status: 'loading',
      });

      // Auto sync to reflect changes
      await syncFromSupabase();

      // Close modal and show success toast
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('미참가 전환 완료', {
        description: `${deletedCount}명의 참가자가 미참가 상태로 전환되었습니다.`,
      });

    } catch (error) {
      console.error('Batch remove failed:', error);
      setLoadingModal({
        open: true,
        title: '미참가 전환 실패',
        status: 'error',
        errorMessage: '전환 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
    }
  };

  const handleCourtCountChange = (newCount: number) => {
    // Validate input range
    if (newCount < 1 || newCount > 8) {
      toast.error('코트 수 설정 오류', {
        description: '코트는 최소 1개, 최대 8개까지 설정할 수 있습니다.',
      });
      return;
    }

    // Check for active games
    const activeCourtCount = state.courts.filter(c => c.status === 'occupied').length;
    if (newCount < activeCourtCount) {
      toast.error('코트 수 변경 불가', {
        description: `현재 ${activeCourtCount}개의 코트에서 경기가 진행 중입니다. 먼저 경기를 종료해주세요.`,
      });
      return;
    }

    updateSession({ courtsCount: newCount });
    toast.success('코트 수 변경', {
      description: `코트가 ${newCount}개로 설정되었습니다.`,
    });
  };

  const handleSyncFromSupabase = async () => {
    setIsSyncing(true);
    await syncFromSupabase();
    setIsSyncing(false);
    toast.success('동기화 완료', {
      description: 'Supabase에서 최신 데이터를 가져왔습니다.',
    });
  };

  const handleResetSession = async () => {
    // Show loading modal
    setLoadingModal({
      open: true,
      title: '초기화 중',
      description: '진행중인 게임을 종료하고 모든 데이터를 초기화하고 있습니다...',
      status: 'loading',
    });

    try {
      await resetSession();
      
      // Update loading modal with sync message
      setLoadingModal({
        open: true,
        title: '초기화 중',
        description: '초기화가 완료되었습니다. 데이터를 새로고침합니다...',
        status: 'loading',
      });

      // Auto sync to reflect changes
      await syncFromSupabase();

      // Close modal and show success toast
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('초기화 완료', {
        description: '모든 게임과 팀이 초기화되었습니다.',
      });

    } catch (error) {
      console.error('Reset session failed:', error);
      setLoadingModal({
        open: true,
        title: '초기화 실패',
        status: 'error',
        errorMessage: '초기화 중 오류가 생했습니다. 다시 시도해주세요.',
      });
    }
  };

  if (!state.session) {
    return null;
  }

  // Show role selection screen if no role is selected
  if (!userRole) {
    return (
      <RoleSelection 
        onSelectRole={setUserRole} 
        onLoginSuccess={async () => {
          console.log('🔐 Login successful, syncing from Supabase...');
          
          // Show loading modal during initial sync
          setLoadingModal({
            open: true,
            title: '데이터 로딩 중',
            description: '최신 데이터를 가져오고 있습니다...',
            status: 'loading',
          });
          
          try {
            await syncFromSupabase();
            console.log('✅ Sync completed after login');
            
            // Close modal without toast (silent sync)
            setLoadingModal(prev => ({ ...prev, open: false }));
          } catch (error) {
            console.error('⚠️ Sync failed after login:', error);
            
            // Show error modal
            setLoadingModal({
              open: true,
              title: '데이터 로딩 실패',
              status: 'error',
              errorMessage: '데이터를 가져오는 중 오류가 발생했습니다. 새로고침 버튼을 눌러 다시 시도해주세요.',
            });
          }
        }} 
      />
    );
  }

  const isAdmin = userRole === 'admin';

  // Determine grid columns based on court count
  const getCourtGridCols = (count: number) => {
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-4';
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        {/* Header */}
        <header className="bg-white/90 backdrop-blur-sm border-b shadow-sm sticky top-0 z-50">
          <div className="container mx-auto px-3 md:px-6 py-2.5 md:py-3.5">
            <div className="flex items-center justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <div>
                  <h1 className="text-sm md:text-base lg:text-xl font-bold text-gray-900">
                    {state.session?.name || '에딕턴 게임 매칭'}
                  </h1>
                  <p className="hidden md:block text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    실시간 팀 매칭 시스템
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                {isAdmin && (
                  <>
                    <button
                      onClick={handleAutoMatch}
                      className="hidden md:inline-flex px-2 md:px-4 py-1 md:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 font-medium text-[10px] md:text-xs transition-all items-center"
                    >
                      🔵 팀 매칭
                    </button>
                  </>
                )}
                
                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 md:p-2 border rounded-lg hover:bg-gray-50 active:scale-95 transition-all">
                      <Settings className="size-4 md:size-4.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {isAdmin && (
                      <>
                        <DropdownMenuItem onClick={handleResetSession}>
                          <RotateCcw className="size-4 mr-2" />
                          초기화
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setShowPasswordChange(true)}>
                          <KeyRound className="size-4 mr-2" />
                          비밀번호 변경
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem onClick={handleSyncFromSupabase} disabled={isSyncing}>
                      <RefreshCw className={`size-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                      새로고침
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setUserRole(null)} className="text-red-600">
                      <LogOut className="size-4 mr-2" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content - New Layout: Court on top, two columns below */}
        <main className="container mx-auto px-3 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6">
          
          {/* Court Section - Full Width */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                코트 현황
              </h2>
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowCourtSettings(true)}
                    className="px-2 md:px-3 py-1 md:py-1.5 text-xs border rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    코트 설정
                  </button>
                  <button
                    onClick={() => setShowEndAllGamesDialog(true)}
                    disabled={state.courts.filter(c => c.status === 'occupied').length === 0}
                    className="px-2 md:px-3 py-1 md:py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    일괄 종료
                  </button>
                </div>
              )}
            </div>
            <div className={`grid ${getCourtGridCols(state.session?.courtsCount || 4)} gap-3`}>
              {state.courts.slice(0, state.session?.courtsCount || 4).map((court) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  team={state.teams.find((t) => t.id === court.currentTeamId)}
                  players={state.players}
                  onEndGame={() => handleEndGame(court.id)}
                  onPauseToggle={() => toggleCourtPause(court.id)}
                  onTimerUpdate={(deltaMs) => updateCourtTimer(court.id, deltaMs)}
                  readOnly={!isAdmin}
                />
              ))}
            </div>
          </div>

          {/* Two Column Layout Below */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            
            {/* Left Column - Waiting Players */}
            <div className="space-y-4 md:space-y-6">
              {/* Player Panel */}
              <div>
                <Tabs defaultValue="waiting" className="w-full">
                  <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-4' : 'grid-cols-3'} mb-3`}>
                    <TabsTrigger value="waiting" className="text-xs">대기중</TabsTrigger>
                    <TabsTrigger value="queued" className="text-xs">대기 팀</TabsTrigger>
                    <TabsTrigger value="resting" className="text-xs">휴식중</TabsTrigger>
                    {isAdmin && <TabsTrigger value="management" className="text-xs">참가자 등록</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="waiting">
                    <PlayerPanel
                      players={state.players}
                      teams={state.teams}
                      onAddPlayer={addPlayer}
                      onUpdatePlayer={updatePlayer}
                      onDeletePlayer={deletePlayer}
                      onUpdatePlayerState={handleUpdatePlayerState}
                      onAdjustGameCount={adjustGameCount}
                      onReturnToWaiting={handleReturnToWaiting}
                      onRemoveAllWaiting={handleRemoveAllWaiting}
                      readOnly={!isAdmin}
                    />
                  </TabsContent>

                  <TabsContent value="queued">
                    <QueuedPlayersPanel
                      players={state.players}
                      teams={state.teams}
                      onReturnToWaiting={handleReturnToWaiting}
                      readOnly={!isAdmin}
                    />
                  </TabsContent>

                  <TabsContent value="resting">
                    <RestingPlayersPanel
                      players={state.players}
                      onUpdatePlayerState={handleUpdatePlayerState}
                      onAdjustGameCount={adjustGameCount}
                      onDeletePlayer={deletePlayer}
                      readOnly={!isAdmin}
                    />
                  </TabsContent>

                  {isAdmin && (
                    <TabsContent value="management">
                      <MemberManagement
                        members={state.members}
                        players={state.players}
                        onAddMember={addMember}
                        onUpdateMember={updateMember}
                        onDeleteMember={deleteMember}
                        onAddMemberAsPlayer={addMemberAsPlayer}
                        addMembersAsPlayers={addMembersAsPlayers}
                        syncFromSupabase={syncFromSupabase}
                        resetMembers={resetMembers}
                        setLoadingModal={setLoadingModal}
                      />
                    </TabsContent>
                  )}
                </Tabs>
              </div>
            </div>

            {/* Right Column - Queued Teams */}
            <div className="space-y-4 md:space-y-6">
              {/* Matching Area */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                    대기 팀
                  </h2>
                  <button className="text-xs text-gray-500">이력 사용중</button>
                </div>
                <MatchingArea
                  teams={state.teams.filter((t) => t.state === 'queued')}
                  players={state.players}
                  onStartGame={handleStartGame}
                  onStartAllGames={handleStartAllQueuedGames}
                  onSwapPlayer={handleSwapPlayer}
                  onSwapBetweenTeams={handleSwapBetweenTeams}
                  onReturnToWaiting={handleReturnToWaiting}
                  onDeleteTeam={deleteTeam}
                  onCreateManualTeam={() => setShowManualTeamDialog(true)}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          </div>
        </main>

        {/* Password Change Dialog */}
        <PasswordChangeDialog
          open={showPasswordChange}
          onOpenChange={setShowPasswordChange}
        />

        {/* Court Settings Dialog */}
        <CourtSettingsDialog
          open={showCourtSettings}
          onOpenChange={setShowCourtSettings}
          courts={state.courts}
          currentCourtCount={state.session?.courtsCount || 4}
          activeCourtCount={state.courts.filter(c => c.status === 'occupied').length}
          onUpdateCourtNames={updateCourtNames}
          onUpdateCourtCount={handleCourtCountChange}
        />

        {/* End All Games Confirm Dialog */}
        <EndAllGamesConfirmDialog
          open={showEndAllGamesDialog}
          onOpenChange={setShowEndAllGamesDialog}
          activeGamesCount={state.courts.filter(c => c.status === 'occupied').length}
          onConfirm={handleEndAllGames}
        />

        {/* Manual Team Dialog */}
        <ManualTeamDialog
          open={showManualTeamDialog}
          onOpenChange={setShowManualTeamDialog}
          players={state.players}
          teams={state.teams}
          teamSize={state.session?.teamSize || 4}
          onCreateTeam={handleCreateManualTeam}
        />

        {/* Loading Modal */}
        <LoadingModal
          open={loadingModal.open}
          onOpenChange={(open) => setLoadingModal(prev => ({ ...prev, open }))}
          title={loadingModal.title}
          description={loadingModal.description}
          status={loadingModal.status}
          errorMessage={loadingModal.errorMessage}
          onClose={loadingModal.onClose}
        />

        {/* Mobile Floating Action Buttons */}
        {isAdmin && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
            <div className="flex gap-3 pointer-events-auto">
              <button
                onClick={handleAutoMatch}
                className="flex-1 bg-blue-600 text-white rounded-xl px-4 py-4 shadow-2xl hover:bg-blue-700 active:scale-95 font-bold text-sm transition-all flex items-center justify-center gap-2"
              >
                🔵 팀 매칭
              </button>
              <button
                onClick={handleStartAllQueuedGames}
                disabled={state.teams.filter((t) => t.state === 'queued').length === 0}
                className="flex-1 bg-emerald-600 text-white rounded-xl px-4 py-4 shadow-2xl hover:bg-emerald-700 active:scale-95 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ⚡일괄 시작
              </button>
            </div>
          </div>
        )}

        {/* Member Floating Refresh Button - Always visible on all screen sizes */}
        {!isAdmin && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
            <div className="pointer-events-auto max-w-md mx-auto">
              <button
                onClick={handleSyncFromSupabase}
                disabled={isSyncing}
                className="w-full bg-blue-600 text-white rounded-xl px-6 py-4 shadow-2xl hover:bg-blue-700 active:scale-95 font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`size-5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? '새로고침 중...' : '🔄 새로고침'}
              </button>
            </div>
          </div>
        )}

        <Toaster />
      </div>
    </DndProvider>
  );
}