import { GameState, Player, MoveClassification } from '../types';
import { getAvailableMoves, makeMove, checkBoardWinner } from './gameLogic';
import { WINNING_PATTERNS } from '../constants';

type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';

const TIME_LIMIT_MS = 1500;
const MAX_DEPTH_IMPOSSIBLE = 12;
const WIN_SCORE = 10000000; // Ensure terminal wins always trump heuristics

// --- STRATEGIC WEIGHTS ---
const W = {
  // Micro Board (Small board internal)
  LINE_2: 10,
  LINE_1: 1,
  BLOCK_OPP_2: 15,
  
  // Board Capture Status (Base values)
  // Reduced relative to Macro threats to prioritize global structure
  BOARD_WON: 150,       
  BOARD_LOST: -150,
  
  // Macro Strategy (The Big Game) - PRIORITIZED
  // 2 boards in a row on the global grid is a massive threat
  MACRO_WIN_THREAT: 5000, 
  MACRO_BLOCK_THREAT: 6000, // Blocking opponent is slightly more urgent
  MACRO_LINE_1: 200,      // Creating potential lines
  
  // Position Value (Multipliers)
  MACRO_CENTER: 5.0,    // Critical
  MACRO_CORNER: 3.0,    // Strong
  MACRO_EDGE: 1.0,      // Weakest

  // Penalties
  GIVE_FREE_MOVE: -5000,   // Giving opponent free move usually loses the game
  SEND_TO_WINNABLE: -4000, // Sending opponent to a board they can win
};

// Helper to get weight multiplier for a board index
const getMacroWeight = (idx: number) => {
    // 4 is center
    if (idx === 4) return W.MACRO_CENTER;
    // 0,2,6,8 are corners
    if (idx === 0 || idx === 2 || idx === 6 || idx === 8) return W.MACRO_CORNER;
    return W.MACRO_EDGE;
};

export const getBestMove = (state: GameState, difficulty: Difficulty = 'medium'): { boardIndex: number; cellIndex: number, score?: number } | null => {
  const moves = getAvailableMoves(state);
  if (moves.length === 0) return null;

  // EASY: Random
  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const aiPlayer = state.currentPlayer;
  const opponent = aiPlayer === 'X' ? 'O' : 'X';

  // INTERMEDIATE: Win local, Block local
  if (difficulty === 'medium') {
    for (const move of moves) {
      const simulatedState = makeMove(state, move.boardIndex, move.cellIndex);
      if (simulatedState.boards[move.boardIndex].winner === aiPlayer) {
        return move;
      }
    }
    for (const move of moves) {
        const board = state.boards[move.boardIndex];
        const cellsClone = [...board.cells];
        cellsClone[move.cellIndex] = opponent;
        if (checkBoardWinner(cellsClone) === opponent) {
            return move;
        }
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // ADVANCED: Shallow Search
  if (difficulty === 'hard') {
    let bestScore = -Infinity;
    let bestMove = moves[0];
    const orderedMoves = orderMoves(state, moves, aiPlayer);

    for (const move of orderedMoves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const score = evaluateStateAdvanced(nextState, aiPlayer);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return { ...bestMove, score: bestScore };
  }

  // IMPOSSIBLE: Advanced Iterative Deepening Minimax
  if (difficulty === 'impossible') {
    return getImpossibleMove(state, moves);
  }

  return moves[0];
};

// --- IMPOSSIBLE ENGINE ---

const getImpossibleMove = (state: GameState, moves: { boardIndex: number; cellIndex: number }[]) => {
  const startTime = performance.now();
  const aiPlayer = state.currentPlayer;
  
  let bestMove = moves[0];
  let bestScore = -Infinity;

  let sortedMoves = orderMoves(state, moves, aiPlayer);

  for (let depth = 1; depth <= MAX_DEPTH_IMPOSSIBLE; depth++) {
    try {
      if (performance.now() - startTime > TIME_LIMIT_MS) break;

      let currentBestMove = sortedMoves[0];
      let currentBestScore = -Infinity;
      let alpha = -Infinity;
      let beta = Infinity;

      for (const move of sortedMoves) {
        const nextState = makeMove(state, move.boardIndex, move.cellIndex);
        
        const score = minimax(
          nextState, 
          depth - 1, 
          alpha, 
          beta, 
          false, 
          aiPlayer, 
          startTime
        );

        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }
        
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; 
      }

      bestMove = currentBestMove;
      bestScore = currentBestScore;
      
      // Sort moves: Best move first for next iteration
      sortedMoves = [
          bestMove,
          ...sortedMoves.filter(m => m.boardIndex !== bestMove.boardIndex || m.cellIndex !== bestMove.cellIndex)
      ];

    } catch (e) {
      break; 
    }
  }

  return { ...bestMove, score: bestScore };
};

const minimax = (
  state: GameState, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean, 
  aiPlayer: Player,
  startTime: number
): number => {
  if ((performance.now() - startTime) > TIME_LIMIT_MS) throw new Error("Timeout");

  if (state.winner === aiPlayer) return WIN_SCORE + depth; 
  if (state.winner && state.winner !== 'Draw') return -WIN_SCORE - depth; 
  if (state.winner === 'Draw') return 0;

  if (depth === 0) {
    return evaluateStateAdvanced(state, aiPlayer);
  }

  const moves = getAvailableMoves(state);
  if (moves.length === 0) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const evalScore = minimax(nextState, depth - 1, alpha, beta, false, aiPlayer, startTime);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const evalScore = minimax(nextState, depth - 1, alpha, beta, true, aiPlayer, startTime);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const orderMoves = (state: GameState, moves: { boardIndex: number; cellIndex: number }[], player: Player): { boardIndex: number; cellIndex: number }[] => {
  const opponent = player === 'X' ? 'O' : 'X';

  return moves.map(move => {
    let score = 0;
    const targetBoard = state.boards[move.boardIndex];

    // 1. Wins Game?
    const macroTest = [...state.macroBoard];
    macroTest[move.boardIndex] = player;
    if (checkBoardWinner(macroTest) === player) score += WIN_SCORE;

    // 2. Wins Board?
    const testCells = [...targetBoard.cells];
    testCells[move.cellIndex] = player;
    if (checkBoardWinner(testCells) === player) {
        score += W.BOARD_WON * getMacroWeight(move.boardIndex) * 10; 
    }

    // 3. Strategic Destination Check
    const sentTo = move.cellIndex;
    const destBoard = state.boards[sentTo];

    if (destBoard.winner !== null || destBoard.cells.every(c => c !== null)) {
        score += W.GIVE_FREE_MOVE; 
    } else {
        // Can opponent win the destination board immediately?
        // And is that destination board important?
        let canOpponentWinDest = false;
        for (let i = 0; i < 9; i++) {
            if (destBoard.cells[i] === null) {
                const destTest = [...destBoard.cells];
                destTest[i] = opponent;
                if (checkBoardWinner(destTest) === opponent) {
                    canOpponentWinDest = true;
                    break;
                }
            }
        }
        if (canOpponentWinDest) {
            score += W.SEND_TO_WINNABLE;
        }
    }
    
    // Center bias
    if (move.cellIndex === 4) score += 20;

    return { move, score };
  })
  .sort((a, b) => b.score - a.score)
  .map(item => item.move);
};

// --- ADVANCED EVALUATION ---

const evaluateStateAdvanced = (state: GameState, player: Player): number => {
  const opponent = player === 'X' ? 'O' : 'X';
  let score = 0;

  // 1. MACRO BOARD EVALUATION (Priority #1)
  // Check lines on the macro board
  for (const pattern of WINNING_PATTERNS) {
      let pCount = 0;
      let oCount = 0;
      let draws = 0;
      
      for (const idx of pattern) {
          const winner = state.macroBoard[idx];
          if (winner === player) pCount++;
          else if (winner === opponent) oCount++;
          else if (winner === 'Draw') draws++;
      }

      if (draws === 0) {
          // Line is viable
          if (pCount === 3) return WIN_SCORE; 
          if (oCount === 3) return -WIN_SCORE;

          if (pCount === 2 && oCount === 0) score += W.MACRO_WIN_THREAT;
          else if (oCount === 2 && pCount === 0) score -= W.MACRO_BLOCK_THREAT; // Opponent threat
          else if (pCount === 1 && oCount === 0) score += W.MACRO_LINE_1;
          else if (oCount === 1 && pCount === 0) score -= W.MACRO_LINE_1;
      }
  }

  // 2. SMALL BOARD EVALUATION
  for (let i = 0; i < 9; i++) {
    const board = state.boards[i];
    const weight = getMacroWeight(i);

    if (board.winner === player) {
        score += W.BOARD_WON * weight;
    } else if (board.winner === opponent) {
        score += W.BOARD_LOST * weight;
    } else if (board.winner === 'Draw') {
        score -= 20; 
    } else {
        score += evaluateSmallBoardRaw(board.cells, player, opponent) * weight;
    }
  }

  // 3. TACTICAL PENALTIES
  if (state.currentPlayer === opponent) {
      // We just moved
      if (state.activeBoard === null) {
          score += W.GIVE_FREE_MOVE;
      } else {
          const target = state.boards[state.activeBoard];
          if (canWinBoard(target.cells, opponent)) {
              score += W.SEND_TO_WINNABLE;
          }
      }
  }

  return score;
};

const evaluateSmallBoardRaw = (cells: (Player | null)[], player: Player, opponent: Player): number => {
    let s = 0;
    if (cells[4] === player) s += 5;
    if (cells[4] === opponent) s -= 5;

    for (const pattern of WINNING_PATTERNS) {
        let pCount = 0;
        let oCount = 0;
        for (const idx of pattern) {
            if (cells[idx] === player) pCount++;
            else if (cells[idx] === opponent) oCount++;
        }

        if (pCount > 0 && oCount === 0) {
            if (pCount === 2) s += W.LINE_2;
            else s += W.LINE_1;
        } else if (oCount > 0 && pCount === 0) {
            if (oCount === 2) s -= W.LINE_2;
            else s -= W.LINE_1;
        } else if (oCount === 2 && pCount === 1) {
            s += W.BLOCK_OPP_2;
        }
    }
    return s;
};

const canWinBoard = (cells: (Player | null)[], player: Player): boolean => {
    for (let i = 0; i < 9; i++) {
        if (cells[i] === null) {
            const test = [...cells];
            test[i] = player;
            if (checkBoardWinner(test) === player) return true;
        }
    }
    return false;
};

export const evaluateState = (
    state: GameState, 
    player: Player, 
    _lastMove: { boardIndex: number, cellIndex: number },
    _weights: any = {}
): number => {
    return evaluateStateAdvanced(state, player);
};

export const analyzeMoveQuality = (
  previousState: GameState,
  moveMade: { boardIndex: number, cellIndex: number }
): { classification: MoveClassification, score: number, bestMove?: {boardIndex: number, cellIndex: number} } => {
  
  const player = previousState.currentPlayer;
  const stateAfterMove = makeMove(previousState, moveMade.boardIndex, moveMade.cellIndex);
  const scoreMade = evaluateStateAdvanced(stateAfterMove, player);

  const bestMoveObj = getBestMove(previousState, 'hard'); 
  
  if (!bestMoveObj) return { classification: 'forced', score: scoreMade };

  const bestMove = { boardIndex: bestMoveObj.boardIndex, cellIndex: bestMoveObj.cellIndex };
  const stateAfterBest = makeMove(previousState, bestMove.boardIndex, bestMove.cellIndex);
  const scoreBest = evaluateStateAdvanced(stateAfterBest, player);

  const diff = scoreBest - scoreMade; 

  let classification: MoveClassification = 'good';
  if (diff < 50) classification = 'best';
  else if (diff < 300) classification = 'good';
  else if (diff < 2000) classification = 'inaccuracy';
  else classification = 'blunder';

  if (classification === 'best' && scoreMade > 1000 && Math.abs(scoreBest - scoreMade) < 10) {
      classification = 'brilliant';
  }

  return {
    classification,
    score: scoreMade,
    bestMove: classification === 'best' ? undefined : bestMove
  };
};
