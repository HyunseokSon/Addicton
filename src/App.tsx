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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu';

type UserRole = 'admin' | 'member' | null;

export default function App() {
  // Clear localStorage on app start to force Supabase-only operation
  useEffect(() => {
    console.log('🗑️ Clearing all localStorage data...');
    localStorage.clear();
    console.log('✅ localStorage cleared - now using Supabase only');
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [showCourtSettings, setShowCourtSettings] = useState(false);
  const [loadingModal, setLoadingModal] = useState<{
    open: boolean;
    title: string;
    description?: string;
    status: 'loading' | 'success' | 'error';
    errorMessage?: string;
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
    toggleCourtPause,
    updateCourtTimer,
    updateCourtNames,
    adjustGameCount,
    deleteTeam,
    updateTeam,
    resetSession,
    addMember,
    updateMember,
    deleteMember,
    addMemberAsPlayer,
    addMembersAsPlayers,
    syncFromSupabase,
    resetMembers,
  } = useGameState();

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

      // Background sync without waiting
      syncFromSupabase().catch(err => console.error('Background sync failed:', err));

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

  const handleStartGame = (teamId: string, courtId?: string) => {
    const availableCourt = state.courts.find((c) => c.status === 'available');
    if (!availableCourt && !courtId) {
      toast.error('코트 부족', {
        description: '사용 가능한 코트가 없습니다.',
      });
      return;
    }

    startGame(teamId, courtId);
    toast.success('게임 시작', {
      description: '타이머가 시작되었습니다.',
    });
  };

  const handleStartAllQueuedGames = async () => {
    const availableCourts = state.courts.filter((c) => c.status === 'available');
    const queuedTeams = state.teams.filter((t) => t.state === 'queued');
    
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
      description: `${teamsToStart}개 팀의 게임을 시작하고 있습니다...`,
      status: 'loading',
    });

    try {
      await startAllQueuedGames();
      
      // Close modal and show success toast immediately
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('게임 시작 완료', {
        description: `${teamsToStart}개 팀의 게임이 시작되었습니다.`,
      });

      // Background sync without waiting
      syncFromSupabase().catch(err => console.error('Background sync failed:', err));

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
    const court = state.courts.find((c) => c.id === courtId);
    if (!court || !court.currentTeamId) return;

    const team = state.teams.find((t) => t.id === court.currentTeamId);
    if (!team) return;

    // Show loading modal
    setLoadingModal({
      open: true,
      title: '게임 종료 중',
      description: '게임을 종료하고 참가자들을 대기 상태로 전환하고 있습니다...',
      status: 'loading',
    });

    try {
      await endGame(courtId);
      
      // Close modal and show success toast immediately
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('게임 종료 완료', {
        description: '참가자들이 대기 상태로 전환되었습니다.',
      });

      // Background sync without waiting
      syncFromSupabase().catch(err => console.error('Background sync failed:', err));

    } catch (error) {
      console.error('End game failed:', error);
      setLoadingModal({
        open: true,
        title: '게임 종료 실패',
        status: 'error',
        errorMessage: '게임 종료 중 오류가 발생했습니다. 다시 시도해주세요.',
      });
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
      console.log(`📤 Updating ${queuedPlayer.name} to waiting state...`);
      await updatePlayer(queuedPlayerId, { state: 'waiting' });
      console.log('✅ Player states updated in Supabase');

      // Close modal and show success toast immediately
      setLoadingModal(prev => ({ ...prev, open: false }));
      toast.success('참가자 교체 완료', {
        description: `${waitingPlayer.name}님과 ${queuedPlayer.name}님이 교체되었습니다.`,
      });

      // Background sync without waiting
      syncFromSupabase().catch(err => console.error('Background sync failed:', err));

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

  const handleReturnToWaiting = (playerId: string, teamId: string) => {
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;

    // Remove player from team
    const newPlayerIds = team.playerIds.filter((id) => id !== playerId);
    
    if (newPlayerIds.length === 0) {
      // If team is now empty, delete the team
      deleteTeam(teamId);
    } else {
      updateTeam(teamId, newPlayerIds);
    }

    // Update player state to waiting
    updatePlayer(playerId, { state: 'waiting' });

    toast.success('대기 상태로 복귀', {
      description: '참가자가 대기 상태로 변경되었습니다.',
    });
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
    return <RoleSelection onSelectRole={setUserRole} />;
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
                    <div className="flex items-center gap-0.5 md:gap-1 bg-white rounded-lg px-1.5 md:px-2 py-1 md:py-1.5 border">
                      <button
                        onClick={() => updateSession({ courtsCount: Math.max(1, (state.session?.courtsCount || 4) - 1) })}
                        className="size-6 md:size-7 rounded hover:bg-gray-100 active:scale-95 flex items-center justify-center transition-all"
                      >
                        <span className="text-base md:text-lg">−</span>
                      </button>
                      <span className="text-[10px] md:text-xs font-medium min-w-[2.5rem] md:min-w-[3rem] text-center">
                        코트 {state.session?.courtsCount || 4}
                      </span>
                      <button
                        onClick={() => updateSession({ courtsCount: Math.min(8, (state.session?.courtsCount || 4) + 1) })}
                        className="size-6 md:size-7 rounded hover:bg-gray-100 active:scale-95 flex items-center justify-center transition-all"
                      >
                        <span className="text-base md:text-lg">+</span>
                      </button>
                    </div>
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
                <button
                  onClick={() => setShowCourtSettings(true)}
                  className="px-2 md:px-3 py-1 md:py-1.5 text-xs border rounded-lg hover:bg-gray-50 active:scale-95 transition-all"
                >
                  코트 설정
                </button>
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
                  <TabsList className="grid w-full grid-cols-2 mb-3">
                    <TabsTrigger value="waiting" className="text-xs">대기 중</TabsTrigger>
                    <TabsTrigger value="management" className="text-xs">모임원 관리</TabsTrigger>
                  </TabsList>

                  <TabsContent value="waiting">
                    <PlayerPanel
                      players={state.players}
                      onAddPlayer={addPlayer}
                      onUpdatePlayer={updatePlayer}
                      onDeletePlayer={deletePlayer}
                      onUpdatePlayerState={updatePlayerState}
                      onAdjustGameCount={adjustGameCount}
                      onRemoveAllWaiting={handleRemoveAllWaiting}
                      readOnly={!isAdmin}
                    />
                  </TabsContent>

                  <TabsContent value="management">
                    {isAdmin ? (
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
                    ) : (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        관리자 권한이 필요합니다
                      </div>
                    )}
                  </TabsContent>
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
                    게임 대기중
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
          onUpdateCourtNames={updateCourtNames}
        />

        {/* Loading Modal */}
        <LoadingModal
          open={loadingModal.open}
          onOpenChange={(open) => setLoadingModal(prev => ({ ...prev, open }))}
          title={loadingModal.title}
          description={loadingModal.description}
          status={loadingModal.status}
          errorMessage={loadingModal.errorMessage}
        />

        {/* Mobile Floating Match Button */}
        {isAdmin && (
          <button
            onClick={handleAutoMatch}
            className="md:hidden fixed bottom-6 right-6 z-50 bg-blue-600 text-white rounded-full px-6 py-4 shadow-2xl hover:bg-blue-700 active:scale-95 font-bold text-sm transition-all flex items-center gap-2"
          >
            🔵 팀 매칭
          </button>
        )}

        <Toaster />
      </div>
    </DndProvider>
  );
}