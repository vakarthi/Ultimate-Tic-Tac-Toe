import React, { useState, useEffect } from 'react';
import { Users, Cpu, Globe, BarChart2, X, BrainCircuit } from 'lucide-react';
import { getStats } from '../services/stats';
import { GameStats } from '../types';

interface MenuProps {
  onStartLocal: () => void;
  onStartCpu: (difficulty: 'easy' | 'medium' | 'hard' | 'impossible') => void;
  onHostOnline: () => void;
  onJoinOnline: (id: string) => void;
  isConnecting: boolean;
  hostId?: string;
}

const Menu: React.FC<MenuProps> = ({ onStartLocal, onStartCpu, onHostOnline, onJoinOnline, isConnecting, hostId }) => {
  const [menuState, setMenuState] = useState<'main' | 'cpu' | 'online-join' | 'online-host' | 'stats'>('main');
  const [joinId, setJoinId] = useState('');
  const [stats, setStats] = useState<GameStats | null>(null);

  useEffect(() => {
    if (menuState === 'stats') {
      setStats(getStats());
    }
  }, [menuState]);

  const Button = ({ onClick, icon: Icon, title, desc, primary = false, danger = false }: any) => (
    <button 
      onClick={onClick}
      className={`
        w-full p-4 rounded-xl border flex items-center gap-4 transition-all duration-200 text-left group
        ${primary 
          ? 'bg-sky-600 border-sky-500 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/20' 
          : danger 
             ? 'bg-slate-900 border-rose-900/50 hover:bg-rose-950/30 hover:border-rose-500/50 text-slate-200'
             : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-200'
        }
      `}
    >
      <div className={`p-3 rounded-lg ${primary ? 'bg-white/20' : danger ? 'bg-rose-500/10' : 'bg-slate-950 group-hover:bg-slate-900'}`}>
        <Icon size={24} className={primary ? 'text-white' : danger ? 'text-rose-500' : 'text-sky-400'} />
      </div>
      <div>
        <div className={`font-bold text-lg ${danger ? 'text-rose-400' : ''}`}>{title}</div>
        <div className={`text-sm ${primary ? 'text-sky-100' : danger ? 'text-rose-300/70' : 'text-slate-400'}`}>{desc}</div>
      </div>
    </button>
  );

  const StatRow = ({ label, wins, losses, draws }: { label: string, wins: number, losses?: number, draws: number }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-800 last:border-0">
      <span className="text-slate-400 text-sm">{label}</span>
      <div className="flex gap-4 text-sm font-mono">
        <span className="text-sky-400">{wins} W</span>
        {losses !== undefined && <span className="text-rose-400">{losses} L</span>}
        <span className="text-slate-500">{draws} D</span>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-rose-400 tracking-tight">
            ULTIMATE
          </h1>
          <h2 className="text-3xl font-bold text-slate-100 tracking-widest">TIC TAC TOE</h2>
          <p className="text-slate-500">Strategic depth on a 9x9 grid</p>
        </div>

        {menuState === 'main' && (
          <div className="space-y-4 animate-fade-in-up">
            <Button 
              icon={Users} 
              title="Pass & Play" 
              desc="Local multiplayer on one device" 
              onClick={onStartLocal}
              primary
            />
            <Button 
              icon={Cpu} 
              title="Vs CPU" 
              desc="Challenge an intelligent AI" 
              onClick={() => setMenuState('cpu')}
            />
            <Button 
              icon={Globe} 
              title="Online Multiplayer" 
              desc="Host or join a game via P2P" 
              onClick={() => setMenuState('online-host')} 
            />
            
            <div className="pt-4 flex justify-center">
              <button 
                onClick={() => setMenuState('stats')}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
              >
                <BarChart2 size={16} />
                View Statistics
              </button>
            </div>
          </div>
        )}

        {menuState === 'cpu' && (
          <div className="space-y-4 animate-fade-in-up">
            <h3 className="text-xl font-bold text-slate-200 text-center">Select Difficulty</h3>
            <Button 
              icon={Cpu} title="Beginner" desc="Random moves, good for learning"
              onClick={() => onStartCpu('easy')}
            />
            <Button 
              icon={Cpu} title="Intermediate" desc="Blocks wins, plays logically"
              onClick={() => onStartCpu('medium')}
            />
            <Button 
              icon={Cpu} title="Advanced" desc="Heuristic evaluation"
              onClick={() => onStartCpu('hard')}
            />
             <Button 
              icon={BrainCircuit} title="Impossible" desc="Adapts to your strategy (Elo 2200)"
              onClick={() => onStartCpu('impossible')}
              danger
            />
            <button onClick={() => setMenuState('main')} className="w-full text-center text-slate-500 hover:text-slate-300 py-2">Back</button>
          </div>
        )}

        {menuState === 'stats' && stats && (
           <div className="space-y-4 animate-fade-in-up relative">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-xl max-h-[60vh] overflow-y-auto">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                       <BarChart2 size={20} className="text-sky-400"/> Statistics
                    </h3>
                    <button onClick={() => setMenuState('main')} className="text-slate-500 hover:text-white">
                       <X size={20} />
                    </button>
                 </div>
                 
                 <div className="space-y-6">
                    <div>
                       <h4 className="text-xs uppercase font-bold text-slate-600 mb-2">Local PvP</h4>
                       <div className="bg-slate-950/50 rounded-lg p-3">
                          <StatRow label="Player X" wins={stats.local.X} draws={stats.local.draws} />
                          <StatRow label="Player O" wins={stats.local.O} draws={stats.local.draws} />
                       </div>
                    </div>

                    <div>
                       <h4 className="text-xs uppercase font-bold text-slate-600 mb-2">Vs CPU</h4>
                       <div className="bg-slate-950/50 rounded-lg p-3">
                          <StatRow label="Easy" wins={stats.cpu.easy.wins} losses={stats.cpu.easy.losses} draws={stats.cpu.easy.draws} />
                          <StatRow label="Medium" wins={stats.cpu.medium.wins} losses={stats.cpu.medium.losses} draws={stats.cpu.medium.draws} />
                          <StatRow label="Hard" wins={stats.cpu.hard.wins} losses={stats.cpu.hard.losses} draws={stats.cpu.hard.draws} />
                          <StatRow label="Impossible" wins={stats.cpu.impossible?.wins || 0} losses={stats.cpu.impossible?.losses || 0} draws={stats.cpu.impossible?.draws || 0} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}

        {(menuState === 'online-host' || menuState === 'online-join') && !isConnecting && !hostId && (
          <div className="space-y-4 animate-fade-in-up">
            {menuState === 'online-host' && (
              <>
                <div className="flex gap-4">
                  <button onClick={() => setMenuState('online-host')} className="flex-1 py-2 border-b-2 border-sky-500 text-sky-400 font-bold">Host Game</button>
                  <button onClick={() => setMenuState('online-join')} className="flex-1 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-300">Join Game</button>
                </div>
                
                <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 text-center space-y-4">
                  <p className="text-slate-400">Generate a unique ID to invite a friend.</p>
                  <button 
                    onClick={onHostOnline}
                    className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-bold text-white transition-colors"
                  >
                    Generate Room ID
                  </button>
                </div>
              </>
            )}

            {menuState === 'online-join' && (
              <>
                <div className="flex gap-4">
                  <button onClick={() => setMenuState('online-host')} className="flex-1 py-2 border-b-2 border-transparent text-slate-500 hover:text-slate-300">Host Game</button>
                  <button onClick={() => setMenuState('online-join')} className="flex-1 py-2 border-b-2 border-sky-500 text-sky-400 font-bold">Join Game</button>
                </div>

                <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 space-y-4">
                  <label className="block text-sm text-slate-400">Enter Host ID</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={joinId}
                      onChange={(e) => setJoinId(e.target.value)}
                      placeholder="e.g. 8f7d..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                    <button 
                      onClick={() => onJoinOnline(joinId)}
                      disabled={!joinId}
                      className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg font-bold"
                    >
                      Join
                    </button>
                  </div>
                </div>
              </>
            )}
            
            <button onClick={() => setMenuState('main')} className="w-full text-center text-slate-500 hover:text-slate-300 py-2">Back</button>
          </div>
        )}

        {(isConnecting || hostId) && (
          <div className="space-y-6 text-center animate-fade-in-up">
            <div className="w-16 h-16 mx-auto rounded-full border-4 border-slate-800 border-t-sky-500 animate-spin" />
            
            {hostId ? (
              <div className="space-y-4">
                <p className="text-slate-400">Waiting for opponent...</p>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
                  <p className="text-xs uppercase text-slate-500 font-bold mb-1">Share this Room ID</p>
                  <div className="flex items-center justify-center gap-2 text-2xl font-mono text-sky-400 font-bold">
                    {hostId}
                  </div>
                </div>
                <p className="text-sm text-slate-500">Send this ID to your friend so they can join.</p>
              </div>
            ) : (
               <p className="text-slate-400 text-lg">Connecting to server...</p>
            )}
             <button onClick={() => { setMenuState('main'); window.location.reload(); }} className="text-slate-500 hover:text-red-400">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Menu;