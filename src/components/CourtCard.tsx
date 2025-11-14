import { useEffect, useState } from 'react';
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
  readOnly?: boolean;
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
  readOnly,
}: CourtCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update current time every second for accurate timer display
  useEffect(() => {
    if (court.status === 'occupied' && !court.isPaused && team?.startedAt) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [court.status, court.isPaused, team?.startedAt]);

  // Calculate elapsed time based on startedAt (more accurate than cumulative timerMs)
  const getElapsedTime = (): number => {
    if (!team?.startedAt) return 0;
    return currentTime - new Date(team.startedAt).getTime();
  };

  const teamPlayers = team ? players.filter((p) => team.playerIds.includes(p.id)) : [];

  if (court.status === 'available') {
    return (
      <div className="h-40 md:h-56 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center transition-all hover:border-gray-400 hover:shadow-sm">
        <div className="text-center">
          <div className="text-gray-500 mb-1.5 text-sm md:text-base font-medium">{court.name}</div>
          <div className="text-[10px] md:text-xs text-gray-400 bg-white px-2 py-1 rounded-full border">경기 대기중</div>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-40 md:h-56 overflow-hidden border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-white shadow-md hover:shadow-xl transition-all">
      <CardContent className="p-2.5 md:p-4 h-full flex flex-col">
        {/* Court header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="size-1.5 md:size-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-semibold text-emerald-900 text-xs md:text-sm">{court.name}</span>
          </div>
          <Badge variant="secondary" className="font-mono text-[10px] md:text-xs px-1.5 md:px-2.5 py-0.5 md:py-1 bg-white border border-emerald-200 shadow-sm">
            <Clock className="size-2.5 md:size-3 mr-0.5 md:mr-1" />
            {formatTime(getElapsedTime())}
          </Badge>
        </div>

        {/* Players grid */}
        <div className="grid grid-cols-2 gap-1 md:gap-1.5 flex-1 mb-2">
          {teamPlayers.map((player, idx) => (
            <div
              key={player.id}
              className="bg-white rounded-md md:rounded-lg p-1 md:p-1.5 border border-emerald-200 flex items-center justify-center shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-[10px] md:text-xs font-medium text-gray-900 truncate px-0.5">{player.name}</span>
            </div>
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: 4 - teamPlayers.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="bg-gray-50 rounded-md md:rounded-lg p-1 md:p-1.5 border border-dashed border-gray-300 flex items-center justify-center"
            >
              <span className="text-[9px] md:text-[10px] text-gray-400">빈 자리</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <Button
          variant="destructive"
          size="sm"
          className="w-full h-7 md:h-9 font-medium text-[10px] md:text-xs active:scale-95 transition-transform touch-manipulation shadow-sm hover:shadow-md"
          onClick={onEndGame}
          disabled={readOnly}
        >
          <StopCircle className="size-3 md:size-3.5 mr-1 md:mr-1.5" />
          경기 종료
        </Button>
      </CardContent>
    </Card>
  );
}