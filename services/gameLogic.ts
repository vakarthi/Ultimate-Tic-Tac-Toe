import { GameState, Player, Winner, MoveHistory } from '../types';
import { WINNING_PATTERNS, INITIAL_GAME_STATE } from '../constants';

/**
 * Checks if a set of 9 cells has a winner.
 */
export const checkBoardWinner = (cells: (Player | Winner | null)[]): Winner => {
  for (const pattern of WINNING_PATTERNS) {
    const [a, b, c] = pattern;
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) {
      return cells[a] as Winner;
    }
  }
  if (cells.every(c => c !== null)) {
    return 'Draw';
  }
  return null;
};

/**
 * Validates a move.
 */
export const isMoveValid = (state: GameState, boardIndex: number, cellIndex: number): boolean => {
  if (state.winner) return false;
  
  // Must play in active board if specified
  if (state.activeBoard !== null && state.activeBoard !== boardIndex) {
    return false;
  }

  const targetBoard = state.boards[boardIndex];
  
  // Cannot play in a full or won small board unless the activeBoard rule forced us here
  if (targetBoard.winner !== null) return false;
  if (targetBoard.cells[cellIndex] !== null) return false;

  return true;
};

/**
 * Executes a move and returns new state.
 */
export const makeMove = (state: GameState, boardIndex: number, cellIndex: number): GameState => {
  // Deep copy for immutability
  const newBoards = state.boards.map(b => ({ ...b, cells: [...b.cells] }));
  const newMacroBoard = [...state.macroBoard];
  
  const currentBoard = newBoards[boardIndex];
  currentBoard.cells[cellIndex] = state.currentPlayer;

  // Check for small board win
  const smallBoardWinner = checkBoardWinner(currentBoard.cells);
  if (smallBoardWinner) {
    currentBoard.winner = smallBoardWinner;
    newMacroBoard[boardIndex] = smallBoardWinner;
  }

  // Check for global win
  const globalWinner = checkBoardWinner(newMacroBoard);

  // Determine next active board
  // Next player is sent to 'cellIndex' board.
  let nextActiveBoard: number | null = cellIndex;

  // If the target board is already won or full, next player can play anywhere
  if (newBoards[nextActiveBoard].winner !== null || newBoards[nextActiveBoard].cells.every(c => c !== null)) {
    nextActiveBoard = null;
  }

  return {
    boards: newBoards,
    macroBoard: newMacroBoard,
    activeBoard: nextActiveBoard,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner: globalWinner,
    history: [...state.history, { boardIndex, cellIndex, player: state.currentPlayer }],
    difficulty: state.difficulty,
    lastMove: { boardIndex, cellIndex }
  };
};

export const getAvailableMoves = (state: GameState): { boardIndex: number; cellIndex: number }[] => {
  const moves: { boardIndex: number; cellIndex: number }[] = [];
  
  const boardsToCheck = state.activeBoard !== null ? [state.activeBoard] : [0, 1, 2, 3, 4, 5, 6, 7, 8];

  for (const bIdx of boardsToCheck) {
    const board = state.boards[bIdx];
    if (board.winner !== null) continue;

    for (let cIdx = 0; cIdx < 9; cIdx++) {
      if (board.cells[cIdx] === null) {
        moves.push({ boardIndex: bIdx, cellIndex: cIdx });
      }
    }
  }
  return moves;
};

/**
 * Reconstructs the game state from a list of moves.
 * Useful for Undo/Redo functionality.
 */
export const reconstructGameState = (moves: MoveHistory[], initialDifficulty?: 'easy' | 'medium' | 'hard'): GameState => {
  let currentState: GameState = { ...INITIAL_GAME_STATE, difficulty: initialDifficulty };
  
  for (const move of moves) {
    currentState = makeMove(currentState, move.boardIndex, move.cellIndex);
  }
  
  return currentState;
};
