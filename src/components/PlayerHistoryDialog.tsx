import { Player } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Users } from 'lucide-react';

interface PlayerHistoryDialogProps {
  player: Player;
  allPlayers: Player[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PlayerHistoryDialog({
  player,
  allPlayers,
  open,
  onOpenChange,
}: PlayerHistoryDialogProps) {
  // Get teammates with game counts
  const teammateData = Object.entries(player.teammateHistory || {})
    .map(([playerId, count]) => {
      const teammate = allPlayers.find((p) => p.id === playerId);
      return teammate ? { player: teammate, count } : null;
    })
    .filter((data): data is { player: Player; count: number } => data !== null)
    .sort((a, b) => b.count - a.count);

  // Get max count for normalization
  const maxCount = Math.max(...teammateData.map((d) => d.count), 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            {player.name}님의 팀메이트 히스토리
          </DialogTitle>
          <DialogDescription>
            {player.name}님과 함께 게임한 팀메이트들의 목록과 함께한 게임 횟수를 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {teammateData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              아직 함께 게임한 기록이 없습니다
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-muted-foreground">총 게임 수</div>
                  <div>{player.gameCount}게임</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">함께한 사람</div>
                  <div>{teammateData.length}명</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">최다 팀메이트</div>
                  <div>
                    {teammateData[0].player.name} ({teammateData[0].count}회)
                  </div>
                </div>
              </div>

              {/* Teammate List */}
              <div className="space-y-2">
                <h3 className="font-medium">팀메이트별 게임 횟수</h3>
                <div className="space-y-2">
                  {teammateData.map(({ player: teammate, count }) => {
                    const percentage = (count / maxCount) * 100;
                    return (
                      <div
                        key={teammate.id}
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span>{teammate.name}</span>
                            <span className="text-muted-foreground">
                              {count}회
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-full transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual Graph - Top teammates only */}
              {teammateData.length >= 2 && (
                <div className="space-y-2">
                  <h3 className="font-medium">관계도 (상위 {Math.min(4, teammateData.length)}명)</h3>
                  <div className="relative p-8 border rounded-lg bg-muted/20">
                    <div className="grid grid-cols-2 gap-x-32 gap-y-16 max-w-md mx-auto">
                      {/* Center - Main Player */}
                      <div className="col-span-2 flex justify-center">
                        <div className="relative">
                          <div className="w-24 h-24 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center">
                            <div className="text-center">
                              <div>{player.name}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Top Teammates */}
                      {teammateData.slice(0, 4).map(({ player: teammate, count }, index) => {
                        const positions = [
                          'col-start-1 row-start-2', // Top Left
                          'col-start-2 row-start-2', // Top Right
                          'col-start-1 row-start-3', // Bottom Left
                          'col-start-2 row-start-3', // Bottom Right
                        ];

                        return (
                          <div key={teammate.id} className={`${positions[index]} relative`}>
                            <div className="w-24 h-24 rounded-lg border-2 border-muted-foreground bg-background flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-sm">{teammate.name}</div>
                              </div>
                            </div>
                            {/* Connection line with count */}
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
                              {count}회
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Connection Lines (SVG Overlay) */}
                    <svg
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ zIndex: 0 }}
                    >
                      {teammateData.slice(0, 4).map((_, index) => {
                        // Calculate line positions based on grid layout
                        const centerX = '50%';
                        const centerY = '25%';
                        
                        const positions = [
                          { x: '20%', y: '50%' }, // Top Left
                          { x: '80%', y: '50%' }, // Top Right
                          { x: '20%', y: '75%' }, // Bottom Left
                          { x: '80%', y: '75%' }, // Bottom Right
                        ];

                        return (
                          <line
                            key={index}
                            x1={centerX}
                            y1={centerY}
                            x2={positions[index].x}
                            y2={positions[index].y}
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth="2"
                            strokeDasharray="4"
                            opacity="0.3"
                          />
                        );
                      })}
                    </svg>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}