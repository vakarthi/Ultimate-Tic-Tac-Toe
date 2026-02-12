import { GameStats, GameMode, Winner } from '../types';

const STATS_KEY = 'ultimate_ttt_stats_v1';

const DEFAULT_STATS: GameStats = {
  local: { X: 0, O: 0, draws: 0 },
  cpu: {
    easy: { wins: 0, losses: 0, draws: 0 },
    medium: { wins: 0, losses: 0, draws: 0 },
    hard: { wins: 0, losses: 0, draws: 0 },
  },
  online: { wins: 0, losses: 0, draws: 0 },
};

export const getStats = (): GameStats => {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : DEFAULT_STATS;
  } catch (e) {
    console.error('Failed to load stats', e);
    return DEFAULT_STATS;
  }
};

export const saveStats = (stats: GameStats) => {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats', e);
  }
};

export const updateStats = (
  mode: GameMode,
  winner: Winner,
  difficulty?: 'easy' | 'medium' | 'hard',
  isHost?: boolean // For online, though currently we treat online stats as generic
): GameStats => {
  const currentStats = getStats();
  const newStats = { ...currentStats };

  if (mode === 'local') {
    if (winner === 'X') newStats.local.X++;
    else if (winner === 'O') newStats.local.O++;
    else if (winner === 'Draw') newStats.local.draws++;
  } else if (mode === 'cpu' && difficulty) {
    // In CPU mode, Player is X, CPU is O
    if (winner === 'X') newStats.cpu[difficulty].wins++;
    else if (winner === 'O') newStats.cpu[difficulty].losses++;
    else if (winner === 'Draw') newStats.cpu[difficulty].draws++;
  } else if (mode === 'online') {
    // In Online, we need to know if "I" won.
    // Assuming this is called from the client's perspective.
    // App.tsx knows 'myPlayerId'. We need to pass that or handle it in App.tsx.
    // Simplification: We'll calculate the stats update object in App.tsx and pass it here?
    // Or we handle logic here. Let's make this function generic update.
  }

  saveStats(newStats);
  return newStats;
};

// Helper to specifically record a result for the current user
export const recordGameResult = (
  mode: GameMode,
  result: 'win' | 'loss' | 'draw',
  difficulty?: 'easy' | 'medium' | 'hard'
) => {
  const currentStats = getStats();
  const newStats = { ...currentStats };

  if (mode === 'cpu' && difficulty) {
    if (result === 'win') newStats.cpu[difficulty].wins++;
    else if (result === 'loss') newStats.cpu[difficulty].losses++;
    else newStats.cpu[difficulty].draws++;
  } else if (mode === 'online') {
    if (result === 'win') newStats.online.wins++;
    else if (result === 'loss') newStats.online.losses++;
    else newStats.online.draws++;
  }
  // Local is handled slightly differently (X vs O), handled by `updateLocalStats` below
  
  saveStats(newStats);
  return newStats;
};

export const recordLocalResult = (winner: Winner) => {
  const currentStats = getStats();
  const newStats = { ...currentStats };
  
  if (winner === 'X') newStats.local.X++;
  else if (winner === 'O') newStats.local.O++;
  else if (winner === 'Draw') newStats.local.draws++;

  saveStats(newStats);
  return newStats;
};
