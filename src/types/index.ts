export type PlayerState = 'waiting' | 'priority' | 'resting' | 'playing' | 'queued';
export type Gender = '남' | '여';
export type Rank = 'S' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface Member {
  id: string;
  name: string;
  gender?: Gender;
  rank?: Rank;
  createdAt: Date;
}

export interface Player {
  id: string;
  name: string;
  state: PlayerState;
  gender?: Gender;
  rank?: Rank;
  gameCount: number;
  lastGameEndAt: Date | null;
  createdAt: Date;
  recentTeammates?: string[]; // Recent teammates to avoid pairing again
  teammateHistory?: Record<string, number>; // Track how many times played with each teammate
}

export interface Team {
  id: string;
  name: string;
  playerIds: string[];
  state: 'queued' | 'playing' | 'finished';
  assignedCourtId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
}

export interface Court {
  id: string;
  index: number;
  name: string;
  status: 'available' | 'occupied';
  timerMs: number;
  currentTeamId: string | null;
  isPaused: boolean;
}

export interface Session {
  id: string;
  name: string;
  date: string;
  courtsCount: number;
  teamSize: number;
  gameDurationMin: number;
  autoSeatNext: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
}

export interface AppState {
  session: Session | null;
  members: Member[];
  players: Player[];
  teams: Team[];
  courts: Court[];
  auditLogs: AuditLog[];
}