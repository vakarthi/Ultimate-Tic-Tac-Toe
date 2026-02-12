import { GameState } from './types';

export const WINNING_PATTERNS = [
  [0, 1, 2], // Rows
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // Cols
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // Diagonals
  [2, 4, 6]
];

export const INITIAL_GAME_STATE: GameState = {
  boards: Array(9).fill(null).map(() => ({
    cells: Array(9).fill(null),
    winner: null
  })),
  macroBoard: Array(9).fill(null),
  activeBoard: null, // Start with free move
  currentPlayer: 'X',
  winner: null,
  history: [],
  lastMove: null
};

// Colors for reuse if needed, though mostly using Tailwind classes
export const COLORS = {
  X: '#38bdf8', // Sky 400
  O: '#fb7185', // Rose 400
  slate: '#1e293b'
};
