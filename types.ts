export type Player = 'X' | 'O';
export type Winner = Player | 'Draw' | null;

export interface SmallBoardState {
  cells: (Player | null)[];
  winner: Winner;
}

export interface GameState {
  boards: SmallBoardState[]; // 9 small boards
  macroBoard: Winner[]; // 9 cells representing the 3x3 big board
  activeBoard: number | null; // index of the board valid to play in (0-8), or null if free
  currentPlayer: Player;
  winner: Winner;
  history: MoveHistory[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'impossible';
  lastMove: { boardIndex: number; cellIndex: number } | null;
}

export interface MoveHistory {
  boardIndex: number;
  cellIndex: number;
  player: Player;
}

export type GameMode = 'local' | 'cpu' | 'online';

export interface PeerData {
  type: 'HANDSHAKE' | 'MOVE' | 'SYNC' | 'RESTART' | 'GAME_END';
  payload?: any;
  boardIndex?: number;
  cellIndex?: number;
  state?: GameState;
}

// --- NEW TYPES FOR CHESS.COM FEATURES ---

export interface GameStats {
  local: { X: number; O: number; draws: number };
  cpu: {
    easy: { wins: number; losses: number; draws: number };
    medium: { wins: number; losses: number; draws: number };
    hard: { wins: number; losses: number; draws: number };
    impossible: { wins: number; losses: number; draws: number };
  };
  online: { wins: number; losses: number; draws: number };
}

export interface PlayerProfile {
  username: string;
  joinDate: string; // ISO String
  ratings: {
    online: number;
    cpu: number;
  };
  stats: {
    wins: number;
    losses: number;
    draws: number;
  };
  detailedStats: GameStats;
}

export interface MatchRecord {
  id: string;
  date: string;
  opponentName: string;
  opponentRating: number;
  mode: GameMode;
  result: 'win' | 'loss' | 'draw';
  ratingChange: number;
  moves: number; // move count
  history: MoveHistory[]; // to allow analysis later
}

export type MoveClassification = 'brilliant' | 'best' | 'good' | 'inaccuracy' | 'blunder' | 'forced';

export interface MoveAnalysis {
  moveIndex: number;
  evaluation: number; // -100 to 100 roughly, or raw score
  classification: MoveClassification;
  bestMove?: { boardIndex: number; cellIndex: number };
}