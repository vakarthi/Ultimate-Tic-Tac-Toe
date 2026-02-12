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
  difficulty?: 'easy' | 'medium' | 'hard';
  lastMove: { boardIndex: number; cellIndex: number } | null;
}

export interface MoveHistory {
  boardIndex: number;
  cellIndex: number;
  player: Player;
}

export type GameMode = 'local' | 'cpu' | 'online';

export interface PeerData {
  type: 'MOVE' | 'SYNC' | 'RESTART';
  boardIndex?: number;
  cellIndex?: number;
  state?: GameState;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
}

export interface GameStats {
  local: {
    X: number;
    O: number;
    draws: number;
  };
  cpu: {
    easy: PlayerStats;
    medium: PlayerStats;
    hard: PlayerStats;
  };
  online: PlayerStats;
}
