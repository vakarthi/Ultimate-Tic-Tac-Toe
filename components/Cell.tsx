import React from 'react';
import { Player } from '../types';
import { X, Circle, Minus } from 'lucide-react';

interface CellProps {
  value: Player | null;
  onClick: () => void;
  isValid: boolean;
  isLastMove: boolean;
  disabled: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isValid, isLastMove, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || value !== null}
      className={`
        w-full h-full flex items-center justify-center relative
        transition-all duration-200
        border border-slate-800/50
        ${isValid && !value ? 'hover:bg-slate-800 cursor-pointer bg-slate-900/50' : 'cursor-default bg-slate-900'}
        ${isLastMove ? 'bg-slate-800 ring-inset ring-2 ring-slate-600' : ''}
      `}
    >
      {isValid && !value && !disabled && (
        <div className="w-2 h-2 rounded-full bg-slate-700 opacity-50 absolute" />
      )}
      
      {value === 'X' && (
        <X className="w-3/4 h-3/4 text-sky-400 animate-[scale-in_0.2s_ease-out]" strokeWidth={2.5} />
      )}
      {value === 'O' && (
        <Circle className="w-2/3 h-2/3 text-rose-400 animate-[scale-in_0.2s_ease-out]" strokeWidth={2.5} />
      )}
    </button>
  );
};

export default Cell;