const K_FACTOR = 32;

/**
 * Calculates Elo change with performance adjustments.
 * 
 * Performance Logic:
 * 1. Dominant Win: If you win with a large board margin (e.g., 8-1), you gain more points.
 *    Formula: BaseChange * (1 + (BoardDiff * 0.1))
 * 
 * 2. Close Loss: If you lose but captured several boards (e.g., 4-5), you lose fewer points.
 *    Formula: BaseChange * (1 - (MyBoards * 0.1))
 */
export const calculateEloChange = (
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw',
  myBoardsWon: number,
  oppBoardsWon: number
): number => {
  // 1. Calculate Expected Score based on rating difference
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  
  let actualScore = 0;
  if (result === 'win') actualScore = 1;
  else if (result === 'draw') actualScore = 0.5;

  // 2. Calculate Base Change
  const baseChange = K_FACTOR * (actualScore - expectedScore);

  // 3. Apply Performance Modifiers
  let finalChange = baseChange;
  const boardDiff = myBoardsWon - oppBoardsWon;

  if (result === 'win') {
    // Bonus for dominance. 
    // Example: Winning by 5 boards (5-0) -> 1 + 0.5 = 1.5x multiplier
    // Example: Winning by 1 board (5-4) -> 1 + 0.1 = 1.1x multiplier
    const dominanceFactor = Math.max(0, boardDiff) * 0.1;
    finalChange = baseChange * (1 + dominanceFactor);
  } 
  else if (result === 'loss') {
    // Mitigation for close games.
    // We reduce the penalty based on how many boards the loser captured.
    // Example: I lost, but I won 4 boards -> Reduce penalty by 40%.
    // Limit mitigation to max 50% to ensure losing still hurts.
    const mitigationFactor = Math.min(0.5, myBoardsWon * 0.1);
    finalChange = baseChange * (1 - mitigationFactor);
  }
  else if (result === 'draw') {
    // Small nudge if you had more boards in a draw
    finalChange = baseChange + (boardDiff * 2);
  }

  return Math.round(finalChange);
};

export const getCpuRating = (difficulty: 'easy' | 'medium' | 'hard' | 'impossible'): number => {
  switch (difficulty) {
    case 'easy': return 400;
    case 'medium': return 1000;
    case 'hard': return 1500;
    case 'impossible': return 2200;
  }
};