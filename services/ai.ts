import { GameState, Player } from '../types';
import { getAvailableMoves, makeMove, checkBoardWinner } from './gameLogic';

type Difficulty = 'easy' | 'medium' | 'hard';

export const getBestMove = (state: GameState, difficulty: Difficulty = 'medium'): { boardIndex: number; cellIndex: number } | null => {
  const moves = getAvailableMoves(state);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const aiPlayer = state.currentPlayer;
  const opponent = aiPlayer === 'X' ? 'O' : 'X';

  // INTERMEDIATE: Win if possible, Block if necessary
  if (difficulty === 'medium') {
    // 1. Can we win a small board now?
    for (const move of moves) {
      const simulatedState = makeMove(state, move.boardIndex, move.cellIndex);
      if (simulatedState.boards[move.boardIndex].winner === aiPlayer) {
        return move;
      }
    }

    // 2. Must we block opponent from winning a small board?
    // We check this by seeing if the opponent could win a cell if we don't block it.
    // However, in Ultimate TTT, blocking is tricky because we might not be playing in the same board next.
    // So "Blocking" in medium mode usually refers to blocking a win within the *current* active board(s).
    for (const move of moves) {
        // Pretend opponent plays here
        const board = state.boards[move.boardIndex];
        const cellsClone = [...board.cells];
        cellsClone[move.cellIndex] = opponent;
        if (checkBoardWinner(cellsClone) === opponent) {
            return move; // Block this spot
        }
    }

    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ADVANCED: Heuristic Evaluation
  if (difficulty === 'hard') {
    let bestScore = -Infinity;
    let bestMove = moves[0];

    // Simple depth-1 search with strong heuristics
    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const score = evaluateState(nextState, aiPlayer, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return bestMove;
  }

  return moves[0];
};

/**
 * Heuristic evaluation of a state from the perspective of 'player'.
 * 'lastMove' helps in evaluating the consequence of the move (where we sent the opponent).
 */
const evaluateState = (state: GameState, player: Player, lastMove: { boardIndex: number, cellIndex: number }): number => {
  const opponent = player === 'X' ? 'O' : 'X';
  
  if (state.winner === player) return 100000;
  if (state.winner === opponent) return -100000;

  let score = 0;

  // 1. Did we win a small board?
  const boardPlayed = state.boards[lastMove.boardIndex];
  if (boardPlayed.winner === player) score += 5000;
  
  // 2. Evaluate Global Board Position (Center > Corners > Edges)
  const center = 4;
  const corners = [0, 2, 6, 8];
  if (lastMove.boardIndex === center) score += 200;
  else if (corners.includes(lastMove.boardIndex)) score += 100;

  // 3. Evaluate Local Board Position
  if (lastMove.cellIndex === center) score += 50;
  else if (corners.includes(lastMove.cellIndex)) score += 30;

  // 4. PENALTY: Where did we send the opponent?
  const sentTo = state.activeBoard; 
  if (sentTo !== null) {
    const targetBoard = state.boards[sentTo];
    
    // Danger: Sent opponent to a board they can win immediately
    // We scan the target board for winning moves for the opponent
    for (let i = 0; i < 9; i++) {
        if (targetBoard.cells[i] === null) {
            const testCells = [...targetBoard.cells];
            testCells[i] = opponent;
            if (checkBoardWinner(testCells) === opponent) {
                score -= 5000; // HUGE penalty for giving away a board
                break;
            }
        }
    }

    // Danger: Sent opponent to a board where they can win the GAME
    // This is implicit if they win the board, but extra weight if that board makes a line
    // Checking "Two in a row" on macro board is expensive, simplified here.
  } else {
    // We gave them a free move. BAD.
    score -= 3000;
  }

  return score;
};