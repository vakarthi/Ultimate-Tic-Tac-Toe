import { GameMode } from '../types';

const K_FACTOR = 32;

export const calculateEloChange = (
  playerRating: number,
  opponentRating: number,
  result: 'win' | 'loss' | 'draw'
): number => {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
  
  let actualScore = 0;
  if (result === 'win') actualScore = 1;
  else if (result === 'draw') actualScore = 0.5;

  return Math.round(K_FACTOR * (actualScore - expectedScore));
};

export const getCpuRating = (difficulty: 'easy' | 'medium' | 'hard' | 'impossible'): number => {
  switch (difficulty) {
    case 'easy': return 400;
    case 'medium': return 1000;
    case 'hard': return 1500;
    case 'impossible': return 2200;
  }
};