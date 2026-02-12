import { GameState, Player, MoveClassification, MoveHistory } from '../types';
import { getAvailableMoves, makeMove, checkBoardWinner } from './gameLogic';

type Difficulty = 'easy' | 'medium' | 'hard' | 'impossible';

const TIME_LIMIT_MS = 800; // Max time the AI can think
const MAX_DEPTH_IMPOSSIBLE = 8;
const WIN_SCORE = 100000;
const MACRO_WIN_SCORE = 5000;

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

  // ADVANCED: Depth 2 Search + Static Heuristic
  if (difficulty === 'hard') {
    let bestScore = -Infinity;
    let bestMove = moves[0];

    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const score = evaluateState(nextState, aiPlayer, move, {});
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    return { ...bestMove, score: bestScore };
  }

  // IMPOSSIBLE: Iterative Deepening Minimax with Opponent Modeling
  if (difficulty === 'impossible') {
    return getImpossibleMove(state, moves);
  }

  return moves[0];
};

// --- IMPOSSIBLE ENGINE ---

const getImpossibleMove = (state: GameState, moves: { boardIndex: number; cellIndex: number }[]) => {
  const startTime = performance.now();
  const aiPlayer = state.currentPlayer;
  
  // 1. Model Opponent Strategy
  const strategyWeights = analyzeOpponentStrategy(state.history, state.currentPlayer === 'X' ? 'O' : 'X');

  let bestMove = moves[0];
  let bestScore = -Infinity;

  // 2. Iterative Deepening
  // We start at depth 2 and increase until we run out of time.
  // This ensures we always have a result, but use all available time to think deeper.
  for (let depth = 2; depth <= MAX_DEPTH_IMPOSSIBLE; depth++) {
    try {
      if (performance.now() - startTime > TIME_LIMIT_MS) break;

      let currentBestMove = moves[0];
      let currentBestScore = -Infinity;
      
      // Root Level Alpha-Beta
      let alpha = -Infinity;
      let beta = Infinity;

      // Move ordering: Try the previous best move first to maximize pruning
      const sortedMoves = sortMoves(moves, bestMove);

      for (const move of sortedMoves) {
        const nextState = makeMove(state, move.boardIndex, move.cellIndex);
        
        const score = minimax(
          nextState, 
          depth - 1, 
          alpha, 
          beta, 
          false, 
          aiPlayer, 
          startTime,
          strategyWeights
        );

        if (score > currentBestScore) {
          currentBestScore = score;
          currentBestMove = move;
        }
        
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break; // Prune
      }

      bestMove = currentBestMove;
      bestScore = currentBestScore;

    } catch (e) {
      // Timeout break
      break;
    }
  }

  return { ...bestMove, score: bestScore };
};

// Alpha-Beta Minimax
const minimax = (
  state: GameState, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean, 
  aiPlayer: Player,
  startTime: number,
  strategyWeights: StrategyWeights
): number => {
  // Timeout Check
  if ((performance.now() - startTime) > TIME_LIMIT_MS) {
    throw new Error("Timeout");
  }

  // Terminal State check
  if (state.winner === aiPlayer) return WIN_SCORE + depth; // Prefer winning sooner
  if (state.winner && state.winner !== 'Draw') return -WIN_SCORE - depth; // Prefer losing later
  if (state.winner === 'Draw') return 0;

  if (depth === 0) {
    // Pass lastMove for evaluation context
    return evaluateState(state, aiPlayer, state.lastMove!, strategyWeights);
  }

  const moves = getAvailableMoves(state);
  
  // If no moves but no winner (shouldn't happen in standard logic but safe guard)
  if (moves.length === 0) return 0;

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const evalScore = minimax(nextState, depth - 1, alpha, beta, false, aiPlayer, startTime, strategyWeights);
      maxEval = Math.max(maxEval, evalScore);
      alpha = Math.max(alpha, evalScore);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move.boardIndex, move.cellIndex);
      const evalScore = minimax(nextState, depth - 1, alpha, beta, true, aiPlayer, startTime, strategyWeights);
      minEval = Math.min(minEval, evalScore);
      beta = Math.min(beta, evalScore);
      if (beta <= alpha) break;
    }
    return minEval;
  }
};

const sortMoves = (moves: { boardIndex: number; cellIndex: number }[], bestMove?: { boardIndex: number; cellIndex: number }) => {
  if (!bestMove) return moves;
  return [
    bestMove,
    ...moves.filter(m => m.boardIndex !== bestMove.boardIndex || m.cellIndex !== bestMove.cellIndex)
  ];
};

// --- OPPONENT STRATEGY ANALYSIS ---

interface StrategyWeights {
  centerWeight: number;
  cornerWeight: number;
  edgeWeight: number;
}

const analyzeOpponentStrategy = (history: MoveHistory[], opponent: Player): StrategyWeights => {
  // Default balanced weights
  const weights = { centerWeight: 1.0, cornerWeight: 1.0, edgeWeight: 1.0 };
  
  if (history.length < 3) return weights;

  // Look at last 10 moves (or fewer)
  const recentMoves = history.filter(m => m.player === opponent).slice(-5);
  if (recentMoves.length === 0) return weights;

  let corners = 0;
  let centers = 0;
  let edges = 0;

  const cornerIndices = [0, 2, 6, 8];
  const centerIndex = 4;

  recentMoves.forEach(m => {
    if (m.cellIndex === centerIndex) centers++;
    else if (cornerIndices.includes(m.cellIndex)) corners++;
    else edges++;
  });

  const total = recentMoves.length;
  
  // If opponent loves corners, we value occupying corners/centers more to block lines
  // If opponent loves center, we overvalue the center.
  if (corners / total > 0.6) weights.cornerWeight = 1.5;
  if (centers / total > 0.4) weights.centerWeight = 2.0; // Center is usually key, if they fight for it, we must too
  
  return weights;
};

// --- EVALUATION ---

export const evaluateState = (
    state: GameState, 
    player: Player, 
    lastMove: { boardIndex: number, cellIndex: number },
    weights: Partial<StrategyWeights> = { centerWeight: 1, cornerWeight: 1 }
): number => {
  const opponent = player === 'X' ? 'O' : 'X';
  const { centerWeight = 1, cornerWeight = 1 } = weights;

  if (state.winner === player) return WIN_SCORE;
  if (state.winner === opponent) return -WIN_SCORE;

  let score = 0;

  // 1. MACRO BOARD STATUS
  const macroCells = state.macroBoard;
  
  // Count Macro Board Advantage
  for (let i = 0; i < 9; i++) {
    if (macroCells[i] === player) {
      if (i === 4) score += MACRO_WIN_SCORE * 1.5; // Center macro is huge
      else if ([0, 2, 6, 8].includes(i)) score += MACRO_WIN_SCORE * 1.2;
      else score += MACRO_WIN_SCORE;
    } else if (macroCells[i] === opponent) {
      if (i === 4) score -= MACRO_WIN_SCORE * 1.5;
      else score -= MACRO_WIN_SCORE;
    }
  }

  // 2. MACRO THREATS (2 in a row)
  // Check if this move created a threat to win the game
  // Simplified check: rows, cols, diags on macro board
  // (We skip full iteration for performance, but in Impossible mode, the deep search captures this naturally.
  // This heuristic helps the leaf nodes.)

  // 3. MICRO BOARD POSITIONING
  // If the last move won a board, we already added score. 
  // If not, evaluate positional value.
  
  const center = 4;
  const corners = [0, 2, 6, 8];
  
  // Did we send opponent to a bad spot? (Active Board Logic)
  const sentTo = state.activeBoard;
  if (sentTo !== null) {
    const targetBoard = state.boards[sentTo];
    
    // PENALTY: Sending opponent to a board they can win
    // Look ahead 1 ply: Does target board have a winning move for opponent?
    for (let i = 0; i < 9; i++) {
        if (targetBoard.cells[i] === null) {
            const testCells = [...targetBoard.cells];
            testCells[i] = opponent;
            if (checkBoardWinner(testCells) === opponent) {
                // If this wins the GAME, massive penalty
                // If just wins board, large penalty
                score -= 3000;
                break;
            }
        }
    }
    
    // BONUS: Sending opponent to a finished/full board (Free Move for them next turn)?
    // The game logic handles this: if sent to full board, activeBoard becomes null.
    // If activeBoard is NOT null here, we constrained them. Good.
  } else {
    // We gave them a free move. Bad.
    score -= 2000;
  }

  // 4. STRATEGIC POSITIONING (Weighted by Opponent Model)
  if (lastMove.cellIndex === center) score += 100 * centerWeight;
  else if (corners.includes(lastMove.cellIndex)) score += 60 * cornerWeight;
  else score += 20;

  return score;
};

// Analysis Helper for Game Review (Wrapper for compatibility)
export const analyzeMoveQuality = (
  previousState: GameState,
  moveMade: { boardIndex: number, cellIndex: number }
): { classification: MoveClassification, score: number, bestMove?: {boardIndex: number, cellIndex: number} } => {
  
  const player = previousState.currentPlayer;
  
  // Get score of move MADE
  const stateAfterMove = makeMove(previousState, moveMade.boardIndex, moveMade.cellIndex);
  const scoreMade = evaluateState(stateAfterMove, player, moveMade);

  // Get score of BEST move using 'hard' heuristic for speed, or impossible if we want deep analysis (slower UI)
  const bestMoveObj = getBestMove(previousState, 'hard'); 
  
  if (!bestMoveObj) return { classification: 'forced', score: scoreMade };

  const bestMove = { boardIndex: bestMoveObj.boardIndex, cellIndex: bestMoveObj.cellIndex };
  const stateAfterBest = makeMove(previousState, bestMove.boardIndex, bestMove.cellIndex);
  const scoreBest = evaluateState(stateAfterBest, player, bestMove);

  const diff = scoreBest - scoreMade;

  let classification: MoveClassification = 'good';
  if (diff < 50) classification = 'best'; 
  else if (diff < 500) classification = 'good';
  else if (diff < 2000) classification = 'inaccuracy';
  else classification = 'blunder';

  return {
    classification,
    score: scoreMade,
    bestMove: classification === 'best' ? undefined : bestMove
  };
};