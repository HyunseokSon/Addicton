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
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import addictonLogo from 'figma:asset/3326f21ff08f9b7816589961d903cd0071089100.png';

export default function App() {
  const {
    state,
    updateSession,
    addPlayer,
    updatePlayer,
    deletePlayer,
    updatePlayerState,
    performAutoMatch,
    startGame,
    endGame,
    toggleCourtPause,
    updateCourtTimer,
    adjustGameCount,
    deleteTeam,
    updateTeam,
    resetSession,
    addMember,
    updateMember,
    deleteMember,
    addMemberAsPlayer,
  } = useGameState();

  const handleAutoMatch = () => {
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

    performAutoMatch();
    
    const newTeamsCount = Math.min(
      maxNewTeams,
      Math.floor(eligibleCount / (state.session?.teamSize || 4))
    );
    
    toast.success('팀 매칭 완료', {
      description: `${newTeamsCount}개 팀이 생성되었습니다.`,
    });
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

  const handleEndGame = (courtId: string) => {
    endGame(courtId);
    toast.success('게임 종료', {
      description: '참가자들이 대기 상태로 전환되습니다.',
    });
  };

  const handleSwapPlayer = (waitingPlayerId: string, teamId: string, queuedPlayerId: string) => {
    const team = state.teams.find((t) => t.id === teamId);
    if (!team) return;

    // Update team's player list
    const newPlayerIds = team.playerIds.map((id) =>
      id === queuedPlayerId ? waitingPlayerId : id
    );
    updateTeam(teamId, newPlayerIds);

    // Update player states
    updatePlayer(waitingPlayerId, { state: 'queued' });
    updatePlayer(queuedPlayerId, { state: 'waiting' });

    toast.success('참가자 교체 완료', {
      description: '대기중인 참가자와 게임 대기 참가자가 교체되었습니다.',
    });
  };

  const handleSwapBetweenTeams = (sourceTeamId: string, sourcePlayerId: string, targetTeamId: string, targetPlayerId: string) => {
    const sourceTeam = state.teams.find((t) => t.id === sourceTeamId);
    const targetTeam = state.teams.find((t) => t.id === targetTeamId);
    
    if (!sourceTeam || !targetTeam) return;

    // Update source team's player list
    const newSourcePlayerIds = sourceTeam.playerIds.map((id) =>
      id === sourcePlayerId ? targetPlayerId : id
    );
    updateTeam(sourceTeamId, newSourcePlayerIds);

    // Update target team's player list
    const newTargetPlayerIds = targetTeam.playerIds.map((id) =>
      id === targetPlayerId ? sourcePlayerId : id
    );
    updateTeam(targetTeamId, newTargetPlayerIds);

    toast.success('팀 간 참가자 교체 완료', {
      description: '두 팀의 참가자가 교체되었습니다.',
    });
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

    // Delete all waiting players asynchronously
    await Promise.all(
      waitingPlayers.map((player) => deletePlayer(player.id))
    );

    toast.success('전체 삭제 완료', {
      description: `${waitingPlayers.length}명의 참가자가 삭제되었습니다.`,
    });
  };

  if (!state.session) {
    return null;
  }

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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-3">
              <div className="flex items-center gap-2 md:gap-3">
                <img 
                  src={addictonLogo} 
                  alt="Addicton Logo" 
                  className="size-10 md:size-14 object-contain rounded-lg shadow-sm" 
                />
                <div>
                  <h1 className="text-base md:text-xl bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    {state.session?.name || '에딕턴 게임 매칭'}
                  </h1>
                  <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                    실시간 팀 매칭 시스템
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                <div className="flex items-center gap-1 bg-gray-50 rounded-lg px-2 py-1.5 border text-sm shadow-sm">
                  <button
                    onClick={() => updateSession({ courtsCount: Math.max(1, (state.session?.courtsCount || 4) - 1) })}
                    className="size-7 md:size-8 rounded bg-white border hover:bg-gray-100 active:scale-95 flex items-center justify-center transition-all touch-manipulation"
                  >
                    <span className="text-base md:text-lg">−</span>
                  </button>
                  <span className="text-[10px] md:text-xs font-semibold min-w-[2.5rem] md:min-w-[3rem] text-center">
                    코트 {state.session?.courtsCount || 4}
                  </span>
                  <button
                    onClick={() => updateSession({ courtsCount: Math.min(8, (state.session?.courtsCount || 4) + 1) })}
                    className="size-7 md:size-8 rounded bg-white border hover:bg-gray-100 active:scale-95 flex items-center justify-center transition-all touch-manipulation"
                  >
                    <span className="text-base md:text-lg">+</span>
                  </button>
                </div>
                <div className="px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200 shadow-sm">
                  <span className="text-[10px] md:text-xs font-semibold text-blue-700">4인팀</span>
                </div>
                <button
                  onClick={handleAutoMatch}
                  className="px-3 py-1.5 md:px-5 md:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 active:scale-95 font-semibold shadow-md hover:shadow-lg transition-all text-[11px] md:text-sm touch-manipulation"
                >
                  🎯 팀 매칭
                </button>
                <button
                  onClick={resetSession}
                  className="px-3 py-1.5 md:px-4 md:py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 active:scale-95 font-medium transition-all text-[11px] md:text-sm touch-manipulation"
                >
                  초기화
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-3 md:px-6 py-3 md:py-5 pb-6 md:pb-8 space-y-3 md:space-y-5">
          {/* Courts Section */}
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="px-3 md:px-5 py-2.5 md:py-3.5 border-b bg-gradient-to-r from-emerald-50/50 to-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <h2 className="font-semibold text-sm md:text-base">코트 현황</h2>
              </div>
              <span className="text-[10px] md:text-xs text-muted-foreground bg-white px-2 py-1 rounded-full border">
                {state.courts.filter(c => c.status === 'occupied').length}/{state.courts.length} 사용중
              </span>
            </div>
            <div className="p-2.5 md:p-5">
              <div className={`grid gap-2.5 md:gap-4 ${getCourtGridCols(state.session?.courtsCount || 4)}`}>
                {state.courts.map((court) => {
                  const team = court.currentTeamId
                    ? state.teams.find((t) => t.id === court.currentTeamId) || null
                    : null;
                  return (
                    <CourtCard
                      key={court.id}
                      court={court}
                      team={team}
                      players={state.players}
                      onTogglePause={() => toggleCourtPause(court.id)}
                      onEndGame={() => handleEndGame(court.id)}
                      onUpdateTimer={(deltaMs) => updateCourtTimer(court.id, deltaMs)}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Section: Participants and Queued Teams */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-5 pb-4 md:pb-6">
            {/* Left: Participant/Member Management */}
            <div className="bg-white rounded-xl border shadow-sm order-2 lg:order-1">
              <Tabs defaultValue="players" className="w-full">
                <div className="px-3 md:px-5 py-2.5 md:py-3.5 border-b bg-gradient-to-r from-blue-50/50 to-white">
                  <TabsList className="grid w-full grid-cols-2 h-9 md:h-10">
                    <TabsTrigger value="players" className="text-xs md:text-sm">참가자 관리</TabsTrigger>
                    <TabsTrigger value="members" className="text-xs md:text-sm">모임원 관리</TabsTrigger>
                  </TabsList>
                </div>
                <div className="p-3 md:p-5">
                  <TabsContent value="players" className="mt-0">
                    <PlayerPanel
                      players={state.players}
                      teams={state.teams}
                      onAddPlayer={addPlayer}
                      onUpdatePlayer={updatePlayer}
                      onUpdatePlayerState={updatePlayerState}
                      onDeletePlayer={deletePlayer}
                      onAdjustGameCount={adjustGameCount}
                      onReturnToWaiting={handleReturnToWaiting}
                      onSwapPlayer={handleSwapPlayer}
                      onDeleteAllWaitingPlayers={handleDeleteAllWaiting}
                    />
                  </TabsContent>
                  <TabsContent value="members" className="mt-0">
                    <MemberManagement
                      members={state.members}
                      players={state.players}
                      onAddMember={addMember}
                      onUpdateMember={updateMember}
                      onDeleteMember={deleteMember}
                      onAddMemberAsPlayer={addMemberAsPlayer}
                    />
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            {/* Right: Game Queue */}
            <div className="bg-white rounded-xl border shadow-sm order-1 lg:order-2">
              <div className="px-3 md:px-5 py-2.5 md:py-3.5 border-b bg-gradient-to-r from-orange-50/50 to-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-orange-500 animate-pulse"></div>
                  <h2 className="font-semibold text-sm md:text-base">게임 대기중</h2>
                </div>
                <span className="text-[10px] md:text-xs text-muted-foreground bg-white px-2 py-1 rounded-full border">
                  {state.teams.filter(t => t.state === 'queued').length}팀
                </span>
              </div>
              <div className="p-3 md:p-5">
                <MatchingArea
                  teams={state.teams}
                  courts={state.courts}
                  players={state.players}
                  onStartGame={handleStartGame}
                  onEndGame={handleEndGame}
                  onToggleCourtPause={toggleCourtPause}
                  onUpdateCourtTimer={updateCourtTimer}
                  onDeleteTeam={deleteTeam}
                  onSwapPlayer={handleSwapPlayer}
                  onSwapBetweenTeams={handleSwapBetweenTeams}
                />
              </div>
            </div>
          </div>
        </div>

        <Toaster position="bottom-right" duration={2000} />
      </div>
    </DndProvider>
  );
}