import React, { useState, useEffect } from 'react';
import { PlayerProfile, MatchRecord } from '../types';
import { getProfile, getMatchHistory, saveProfile } from '../services/stats';
import { Trophy, TrendingUp, Calendar, Hash, Edit2, Check, User, BookOpen } from 'lucide-react';

interface ProfileProps {
  onReviewGame: (record: MatchRecord) => void;
}

const Profile: React.FC<ProfileProps> = ({ onReviewGame }) => {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [history, setHistory] = useState<MatchRecord[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const p = getProfile();
    setProfile(p);
    setEditName(p.username);
    setHistory(getMatchHistory());
  }, []);

  const handleSaveName = () => {
    if (profile && editName.trim()) {
      const newProfile = { ...profile, username: editName.trim() };
      saveProfile(newProfile);
      setProfile(newProfile);
      setIsEditing(false);
    }
  };

  if (!profile) return null;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950 p-6 xl:p-10">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Card */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-sky-500 to-rose-500 flex items-center justify-center text-4xl font-black text-white shadow-lg">
            {profile.username.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input 
                    className="bg-slate-950 border border-slate-700 rounded px-3 py-1 text-xl font-bold focus:outline-none focus:border-sky-500"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <button onClick={handleSaveName} className="p-2 bg-green-500/20 text-green-500 rounded hover:bg-green-500/30">
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-white">{profile.username}</h2>
                  <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-white transition-colors">
                    <Edit2 size={16} />
                  </button>
                </>
              )}
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-slate-400 text-sm">
              <div className="flex items-center gap-1">
                <Calendar size={14} /> Joined {new Date(profile.joinDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Hash size={14} /> ID: #{(Math.random() * 10000).toFixed(0).padStart(4, '0')}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="text-center px-6 py-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">Online Elo</div>
              <div className="text-2xl font-mono font-bold text-sky-400">{profile.ratings.online}</div>
            </div>
            <div className="text-center px-6 py-3 bg-slate-950 rounded-xl border border-slate-800">
              <div className="text-xs text-slate-500 uppercase font-bold mb-1">CPU Elo</div>
              <div className="text-2xl font-mono font-bold text-rose-400">{profile.ratings.cpu}</div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm font-bold uppercase">Total Wins</div>
              <div className="text-3xl font-bold text-emerald-400 mt-1">{profile.stats.wins}</div>
            </div>
            <Trophy className="text-slate-800 w-12 h-12" />
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm font-bold uppercase">Total Losses</div>
              <div className="text-3xl font-bold text-rose-400 mt-1">{profile.stats.losses}</div>
            </div>
            <TrendingUp className="text-slate-800 w-12 h-12 rotate-180" />
          </div>
          <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-slate-500 text-sm font-bold uppercase">Draws</div>
              <div className="text-3xl font-bold text-slate-400 mt-1">{profile.stats.draws}</div>
            </div>
            <div className="text-slate-800 text-4xl font-black">=</div>
          </div>
        </div>

        {/* Match History */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="text-sky-400" /> Match History
          </h3>
          
          <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No games played yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="p-4">Result</th>
                    <th className="p-4">Opponent</th>
                    <th className="p-4 hidden sm:table-cell">Mode</th>
                    <th className="p-4 text-right">Rating</th>
                    <th className="p-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map((game) => (
                    <tr key={game.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="p-4">
                        <span className={`
                          px-2 py-1 rounded text-xs font-bold uppercase
                          ${game.result === 'win' ? 'bg-emerald-500/10 text-emerald-400' : 
                            game.result === 'loss' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'}
                        `}>
                          {game.result}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-slate-200">{game.opponentName}</div>
                        <div className="text-xs text-slate-500">{new Date(game.date).toLocaleDateString()}</div>
                      </td>
                      <td className="p-4 hidden sm:table-cell capitalize text-slate-400">{game.mode}</td>
                      <td className="p-4 text-right font-mono">
                        <span className={game.ratingChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {game.ratingChange > 0 ? '+' : ''}{game.ratingChange}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => onReviewGame(game)}
                          className="bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-300 px-3 py-1 rounded transition-colors text-xs font-bold"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;