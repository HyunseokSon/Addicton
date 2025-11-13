import { Player, Team } from '../types';

// Fisher-Yates shuffle algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate player skill score based on rank and gender
function calculatePlayerScore(player: Player): number {
  // Rank scoring (S is highest)
  const rankScores: Record<string, number> = {
    'S': 7,
    'A': 6,
    'B': 5,
    'C': 4,
    'D': 3,
    'E': 2,
    'F': 1,
  };
  
  const baseScore = player.rank ? rankScores[player.rank] : 3.5; // Default to middle
  
  // Gender multiplier
  const genderMultiplier = player.gender === '남' ? 1.2 : player.gender === '녀' ? 0.9 : 1.0;
  
  return baseScore * genderMultiplier;
}

// Balance teams by distributing players in a snake draft pattern
function balanceTeams(players: Player[], teamSize: number, numTeams: number): Player[][] {
  // Sort by score to group similar skilled players
  const sortedByScore = [...players].sort((a, b) => {
    return calculatePlayerScore(b) - calculatePlayerScore(a);
  });

  // Group similar skilled players into teams
  const teams: Player[][] = [];
  
  for (let i = 0; i < numTeams; i++) {
    const team: Player[] = [];
    for (let j = 0; j < teamSize; j++) {
      const playerIndex = i * teamSize + j;
      if (playerIndex < sortedByScore.length) {
        team.push(sortedByScore[playerIndex]);
      }
    }
    if (team.length === teamSize) {
      teams.push(team);
    }
  }
  
  return teams;
}

export function autoMatch(
  players: Player[],
  teamSize: number,
  maxTeams?: number
): { teams: Team[]; remainingPlayerIds: string[] } {
  // Filter eligible players (waiting or priority only, NOT resting/playing/queued)
  const eligible = players.filter(
    (p) => p.state === 'waiting' || p.state === 'priority'
  );

  // Sort by:
  // 1. State priority (priority first)
  // 2. Game count ascending
  // 3. Last game end time (longer rest first)
  const sorted = [...eligible].sort((a, b) => {
    if (a.state === 'priority' && b.state !== 'priority') return -1;
    if (a.state !== 'priority' && b.state === 'priority') return 1;
    
    if (a.gameCount !== b.gameCount) return a.gameCount - b.gameCount;
    
    if (a.lastGameEndAt && b.lastGameEndAt) {
      return a.lastGameEndAt.getTime() - b.lastGameEndAt.getTime();
    }
    if (a.lastGameEndAt) return 1;
    if (b.lastGameEndAt) return -1;
    return 0;
  });

  // Calculate how many teams we can make
  const possibleTeams = Math.floor(sorted.length / teamSize);
  const numTeams = maxTeams !== undefined ? Math.min(possibleTeams, maxTeams) : possibleTeams;
  
  if (numTeams === 0) {
    return { teams: [], remainingPlayerIds: sorted.map(p => p.id) };
  }

  // Get players for matching (numTeams * teamSize)
  const playersToMatch = sorted.slice(0, numTeams * teamSize);
  const remaining = sorted.slice(numTeams * teamSize);

  // Balance teams using snake draft
  const balancedTeams = balanceTeams(playersToMatch, teamSize, numTeams);

  // Try to optimize teams to avoid recent teammates
  const optimizedTeams = optimizeTeammates(balancedTeams);

  // Create team objects
  const teams: Team[] = optimizedTeams.map((teamPlayers, idx) => ({
    id: `team-${Date.now()}-${Math.random()}-${idx}`,
    name: `팀 ${idx + 1}`,
    playerIds: teamPlayers.map((p) => p.id),
    state: 'queued',
    assignedCourtId: null,
    startedAt: null,
    endedAt: null,
  }));

  return {
    teams,
    remainingPlayerIds: remaining.map(p => p.id)
  };
}

// Try to swap players between teams to reduce recent teammate overlap
function optimizeTeammates(teams: Player[][]): Player[][] {
  const optimized = teams.map(t => [...t]);
  const maxAttempts = 20;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let madeSwap = false;
    
    // For each team, check if we can reduce overlap by swapping with another team
    for (let i = 0; i < optimized.length; i++) {
      const team = optimized[i];
      
      // Count overlaps in current team
      const currentOverlap = countTeamOverlap(team);
      
      if (currentOverlap <= 2) continue; // Good enough
      
      // Try swapping with other teams
      for (let j = i + 1; j < optimized.length; j++) {
        const otherTeam = optimized[j];
        
        // Try swapping each pair of players
        for (let pi = 0; pi < team.length; pi++) {
          for (let pj = 0; pj < otherTeam.length; pj++) {
            // Temporarily swap
            const temp = team[pi];
            team[pi] = otherTeam[pj];
            otherTeam[pj] = temp;
            
            const newOverlap1 = countTeamOverlap(team);
            const newOverlap2 = countTeamOverlap(otherTeam);
            
            // If swap improves things, keep it
            if (newOverlap1 + newOverlap2 < currentOverlap + countTeamOverlap(otherTeam)) {
              madeSwap = true;
            } else {
              // Swap back
              otherTeam[pj] = team[pi];
              team[pi] = temp;
            }
          }
        }
      }
    }
    
    if (!madeSwap) break; // No more improvements possible
  }
  
  return optimized;
}

// Count how many pairs of players in a team have played together before
function countTeamOverlap(team: Player[]): number {
  let count = 0;
  for (let i = 0; i < team.length; i++) {
    const player = team[i];
    if (!player.teammateHistory) continue;
    
    for (let j = i + 1; j < team.length; j++) {
      if (player.teammateHistory[team[j].id]) {
        count++;
      }
    }
  }
  return count;
}

export function updatePriorityStatus(players: Player[]): Player[] {
  const gameCounts = players
    .filter((p) => p.state !== 'resting')
    .map((p) => p.gameCount);
  
  if (gameCounts.length === 0) return players;
  
  const minCount = Math.min(...gameCounts);
  
  return players.map((p) => {
    if (p.state === 'resting' || p.state === 'playing' || p.state === 'queued') {
      return p;
    }
    
    // Auto-set priority for players with minimum game count
    if (p.gameCount === minCount && p.gameCount > 0) {
      return { ...p, state: 'priority' as const };
    }
    
    return p;
  });
}