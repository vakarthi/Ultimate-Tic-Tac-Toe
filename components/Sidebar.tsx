import React from 'react';
import { Play, User, BookOpen, BarChart2 } from 'lucide-react';

interface SidebarProps {
  currentView: 'menu' | 'game' | 'profile' | 'analysis';
  onChangeView: (view: 'menu' | 'profile') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
  const NavItem = ({ view, icon: Icon, label }: any) => (
    <button
      onClick={() => onChangeView(view)}
      className={`w-full p-4 flex flex-col xl:flex-row items-center gap-2 xl:gap-4 transition-colors
        ${currentView === view 
          ? 'text-sky-400 bg-slate-900 border-r-2 border-sky-400' 
          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'
        }
      `}
    >
      <Icon size={24} />
      <span className="text-xs xl:text-sm font-bold uppercase tracking-wider">{label}</span>
    </button>
  );

  return (
    <div className="w-20 xl:w-64 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 z-20">
      <div className="p-6 hidden xl:block">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-rose-400">
          ULTIMATE
        </h1>
      </div>
      
      <div className="flex-1 flex flex-col pt-4">
        <NavItem view="menu" icon={Play} label="Play" />
        <NavItem view="profile" icon={User} label="Profile" />
        {/* Analysis is usually accessed from history, but could be a library. Keeping it simple. */}
      </div>

      <div className="p-4 text-center text-slate-700 text-xs hidden xl:block">
        v2.0.0
      </div>
    </div>
  );
};

export default Sidebar;
