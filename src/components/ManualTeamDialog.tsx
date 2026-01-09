import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Player, Team } from '../types';
import { Checkbox } from './ui/checkbox';
import { Users, UserCheck, UserX } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ManualTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  players: Player[];
  teams: Team[];
  teamSize: number;
  onCreateTeam: (playerIds: string[]) => Promise<void>;
}

export function ManualTeamDialog({
  open,
  onOpenChange,
  players,
  teams,
  teamSize,
  onCreateTeam,
}: ManualTeamDialogProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'waiting' | 'playing'>('waiting');

  // Debug: Log players when dialog opens
  useEffect(() => {
    if (open && players.length > 0) {
      console.log('🎭 ManualTeamDialog opened with players:', players.map(p => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        rank: p.rank,
        state: p.state
      })));
    }
  }, [open, players]);

  const handleTogglePlayer = (playerId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      } else if (prev.length < teamSize) {
        return [...prev, playerId];
      }
      return prev;
    });
  };

  const handleCreate = async () => {
    if (selectedPlayerIds.length !== teamSize) return;

    setIsCreating(true);
    try {
      await onCreateTeam(selectedPlayerIds);
      setSelectedPlayerIds([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create manual team:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setSelectedPlayerIds([]);
    onOpenChange(false);
  };

  // Sort players: waiting first, then playing
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      if (a.state === 'waiting' && b.state !== 'waiting') return -1;
      if (a.state !== 'waiting' && b.state === 'waiting') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [players]);

  // 대기중 플레이어들 (waiting, priority 상태)
  const waitingPlayers = useMemo(() => {
    return players.filter(p => p.state === 'waiting' || p.state === 'priority' || p.state === 'resting');
  }, [players]);

  // 게임중 플레이어들 (playing, queued 상태)
  const playingPlayers = useMemo(() => {
    return players.filter(p => p.state === 'playing' || p.state === 'queued');
  }, [players]);

  const hasPlayingPlayer = selectedPlayerIds.some(playerId => {
    const player = players.find(p => p.id === playerId);
    return player && player.state === 'playing';
  });

  // 플레이어 렌더링 함수
  const renderPlayerList = (playerList: Player[]) => {
    if (playerList.length === 0) {
      return (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          {activeTab === 'waiting' ? '대기 중인 플레이어가 없습니다' : '게임 중인 플레이어가 없습니다'}
        </div>
      );
    }

    return playerList.map((player) => {
      const isSelected = selectedPlayerIds.includes(player.id);
      const canSelect = isSelected || selectedPlayerIds.length < teamSize;
      const isPlaying = player.state === 'playing';
      const isQueued = player.state === 'queued';

      return (
        <div
          key={player.id}
          className={`
            flex items-center justify-between p-3 rounded-lg border transition-colors
            ${isSelected ? 'bg-primary/10 border-primary' : 'bg-card hover:bg-muted/50'}
            ${!canSelect ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => canSelect && handleTogglePlayer(player.id)}
        >
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => canSelect && handleTogglePlayer(player.id)}
              disabled={!canSelect}
            />
            <div>
              <div className="font-medium flex items-center gap-2">
                {player.name}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {player.gender && <span className="font-medium">{player.gender}</span>}
                {player.rank && <span className="font-medium">{player.rank}</span>}
                <span>게임 {player.gameCount}회</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isPlaying ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                <UserCheck className="w-3 h-3" />
                게임중
              </div>
            ) : isQueued ? (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                <Users className="w-3 h-3" />
                대기팀
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                <UserX className="w-3 h-3" />
                대기중
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            수동 팀 생성
          </DialogTitle>
          <DialogDescription>
            {teamSize}명을 선택하여 팀을 생성하세요. 게임 중인 플레이어도 선택할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selection status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm font-medium">
              선택된 플레이어: {selectedPlayerIds.length} / {teamSize}
            </div>
            {hasPlayingPlayer && (
              <div className="text-xs text-amber-600 font-medium flex items-center gap-1">
                <UserCheck className="w-3 h-3" />
                게임 중인 플레이어 포함됨 (게임 종료 후 시작 가능)
              </div>
            )}
          </div>

          {/* Tabs for waiting/playing players */}
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'waiting' | 'playing')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="waiting" className="flex items-center gap-2">
                <UserX className="w-4 h-4" />
                대기중 ({waitingPlayers.length})
              </TabsTrigger>
              <TabsTrigger value="playing" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                게임중 ({playingPlayers.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="waiting" className="mt-4">
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {renderPlayerList(waitingPlayers)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="playing" className="mt-4">
              <ScrollArea className="h-[400px] border rounded-lg">
                <div className="p-4 space-y-2">
                  {renderPlayerList(playingPlayers)}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCreating}
            >
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={selectedPlayerIds.length !== teamSize || isCreating}
            >
              {isCreating ? '생성 중...' : `팀 생성 (${selectedPlayerIds.length}/${teamSize})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}