import { PlayerProfile, MatchRecord } from '../types';

const PROFILE_KEY = 'uttt_profile_v2';
const HISTORY_KEY = 'uttt_match_history_v2';

const DEFAULT_PROFILE: PlayerProfile = {
  username: 'Player',
  joinDate: new Date().toISOString(),
  ratings: {
    online: 1200,
    cpu: 800,
  },
  stats: { wins: 0, losses: 0, draws: 0 },
  detailedStats: {
    local: { X: 0, O: 0, draws: 0 },
    cpu: {
        easy: { wins: 0, losses: 0, draws: 0 },
        medium: { wins: 0, losses: 0, draws: 0 },
        hard: { wins: 0, losses: 0, draws: 0 },
        impossible: { wins: 0, losses: 0, draws: 0 },
    },
    online: { wins: 0, losses: 0, draws: 0 }
  }
};

export const getProfile = (): PlayerProfile => {
  try {
    const stored = localStorage.getItem(PROFILE_KEY);
    if (!stored) return DEFAULT_PROFILE;
    const parsed = JSON.parse(stored);
    
    // Ensure deep merge of new stat keys if they don't exist in old localstorage
    const merged = { ...DEFAULT_PROFILE, ...parsed };
    merged.detailedStats = { ...DEFAULT_PROFILE.detailedStats, ...parsed.detailedStats };
    merged.detailedStats.cpu = { ...DEFAULT_PROFILE.detailedStats.cpu, ...parsed.detailedStats.cpu };
    
    return merged;
  } catch (e) {
    return DEFAULT_PROFILE;
  }
};

export const getStats = () => {
    return getProfile().detailedStats;
};

export const saveProfile = (profile: PlayerProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const getMatchHistory = (): MatchRecord[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveMatchRecord = (record: MatchRecord) => {
  const history = getMatchHistory();
  // Keep last 50 games
  const newHistory = [record, ...history].slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
};

export const updateProfileAfterGame = (
  result: 'win' | 'loss' | 'draw',
  mode: 'online' | 'cpu' | 'local',
  ratingChange: number,
  difficulty?: 'easy' | 'medium' | 'hard' | 'impossible'
) => {
  const profile = getProfile();
  
  // Update Rating
  if (mode === 'online') profile.ratings.online += ratingChange;
  if (mode === 'cpu') profile.ratings.cpu += ratingChange;

  // Update Global Stats
  if (result === 'win') profile.stats.wins++;
  else if (result === 'loss') profile.stats.losses++;
  else profile.stats.draws++;

  // Update Detailed Stats
  if (mode === 'local') {
      if (result === 'win') profile.detailedStats.local.X++;
      else if (result === 'loss') profile.detailedStats.local.O++;
      else profile.detailedStats.local.draws++;
  } else if (mode === 'cpu' && difficulty) {
      if (result === 'win') profile.detailedStats.cpu[difficulty].wins++;
      else if (result === 'loss') profile.detailedStats.cpu[difficulty].losses++;
      else profile.detailedStats.cpu[difficulty].draws++;
  } else if (mode === 'online') {
      if (result === 'win') profile.detailedStats.online.wins++;
      else if (result === 'loss') profile.detailedStats.online.losses++;
      else profile.detailedStats.online.draws++;
  }

  saveProfile(profile);
  return profile;
};