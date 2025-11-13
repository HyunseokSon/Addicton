import { useEffect } from 'react';
import { Court, Team, Player } from '../types/index';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, StopCircle } from 'lucide-react';

interface CourtCardProps {
  court: Court;
  team: Team | null;
  players: Player[];
  onTogglePause: () => void;
  onEndGame: () => void;
  onUpdateTimer: (deltaMs: number) => void;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function CourtCard({
  court,
  team,
  players,
  onTogglePause,
  onEndGame,
  onUpdateTimer,
}: CourtCardProps) {
  useEffect(() => {
    if (court.status === 'occupied' && !court.isPaused) {
      const interval = setInterval(() => {
        onUpdateTimer(1000);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [court.status, court.isPaused, onUpdateTimer]);

  const teamPlayers = team ? players.filter((p) => team.playerIds.includes(p.id)) : [];

  if (court.status === 'available') {
    return (
      <div className="h-48 md:h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center transition-all hover:border-gray-400">
        <div className="text-center">
          <div className="text-gray-400 mb-1 text-sm md:text-base">{court.name}</div>
          <div className="text-xs text-gray-400">경기 대기중</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-48 md:h-64 overflow-hidden border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-3 md:p-4 h-full flex flex-col">
        {/* Court header */}
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-semibold text-emerald-900 text-sm md:text-base">{court.name}</span>
          </div>
          <Badge variant="secondary" className="font-mono text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1 bg-white border border-gray-200">
            <Clock className="size-3 md:size-3.5 mr-1 md:mr-1.5" />
            {formatTime(court.timerMs)}
          </Badge>
        </div>

        {/* Players grid */}
        <div className="grid grid-cols-2 gap-1.5 md:gap-2 flex-1 mb-2 md:mb-3">
          {teamPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="bg-white rounded-lg p-1.5 md:p-2 border border-emerald-200 flex items-center justify-center shadow-sm"
            >
              <span className="text-xs md:text-sm font-medium text-gray-900 truncate">{player.name}</span>
            </div>
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: 4 - teamPlayers.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="bg-gray-50 rounded-lg p-1.5 md:p-2 border border-dashed border-gray-300 flex items-center justify-center"
            >
              <span className="text-xs text-gray-400">빈 자리</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-8 md:h-9 font-medium text-xs md:text-sm"
          onClick={onEndGame}
        >
          <StopCircle className="size-3.5 md:size-4 mr-1.5 md:mr-2" />
          경기 종료
        </Button>
      </CardContent>
    </Card>
  );
}