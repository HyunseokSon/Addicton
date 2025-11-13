import { Player, Court } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Clock, Activity, TrendingUp } from 'lucide-react';

interface StatisticsProps {
  players: Player[];
  courts: Court[];
}

export function Statistics({ players, courts }: StatisticsProps) {
  const totalPlayers = players.length;
  const waitingPlayers = players.filter((p) => p.state === 'waiting').length;
  const priorityPlayers = players.filter((p) => p.state === 'priority').length;
  const restingPlayers = players.filter((p) => p.state === 'resting').length;
  const playingPlayers = players.filter((p) => p.state === 'playing').length;
  const queuedPlayers = players.filter((p) => p.state === 'queued').length;

  const totalGames = players.reduce((sum, p) => sum + p.gameCount, 0);
  const avgGames = totalPlayers > 0 ? (totalGames / totalPlayers).toFixed(1) : '0';

  const occupiedCourts = courts.filter((c) => c.status === 'occupied').length;
  const courtUtilization =
    courts.length > 0 ? ((occupiedCourts / courts.length) * 100).toFixed(0) : '0';

  const stats = [
    {
      title: '총 참가자',
      value: totalPlayers,
      description: `대기 ${waitingPlayers} · 우선 ${priorityPlayers} · 휴식 ${restingPlayers}`,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: '평균 경기수',
      value: avgGames,
      description: `총 ${totalGames}경기 진행됨`,
      icon: Activity,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      title: '코트 가동률',
      value: `${courtUtilization}%`,
      description: `${occupiedCourts}/${courts.length} 코트 사용중`,
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: '대기 현황',
      value: queuedPlayers,
      description: `${playingPlayers}명 게임 중`,
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow border-0">
          <div className={`h-1 bg-gradient-to-r ${stat.color}`} />
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">{stat.title}</CardTitle>
              <div className={`size-10 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`size-5 ${stat.iconColor}`} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
