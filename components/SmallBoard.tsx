import React from 'react';
import { SmallBoardState, GameState } from '../types';
import Cell from './Cell';
import { X, Circle } from 'lucide-react';

interface SmallBoardProps {
  boardIndex: number;
  data: SmallBoardState;
  gameState: GameState;
  onMove: (boardIndex: number, cellIndex: number) => void;
  isActive: boolean;
  isPlayable: boolean; // Can current user play here?
}

const SmallBoard: React.FC<SmallBoardProps> = ({ boardIndex, data, gameState, onMove, isActive, isPlayable }) => {
  const { winner, cells } = data;
  const isFull = cells.every(c => c !== null);

  return (
    <div className={`
      relative aspect-square grid grid-cols-3 grid-rows-3 gap-0.5 bg-slate-800 p-0.5 rounded-lg overflow-hidden transition-all duration-300
      ${isActive && !winner && !isFull ? 'ring-2 ring-sky-500/50 shadow-[0_0_15px_rgba(56,189,248,0.2)] scale-[1.02] z-10 bg-slate-700' : 'opacity-90 grayscale-[0.3] scale-100'}
      ${winner ? 'opacity-70' : ''}
    `}>
      {cells.map((cell, idx) => {
        const isLastMove = gameState.lastMove?.boardIndex === boardIndex && gameState.lastMove?.cellIndex === idx;
        const isValid = isActive && !winner && isPlayable && cell === null;
        
        return (
          <Cell
            key={idx}
            value={cell}
            onClick={() => onMove(boardIndex, idx)}
            isValid={isValid}
            isLastMove={isLastMove}
            disabled={!isValid}
          />
        );
      })}

      {/* Winner Overlay */}
      {winner && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-[1px] z-20 animate-fade-in">
          {winner === 'X' && <X className="w-16 h-16 text-sky-500 drop-shadow-lg" strokeWidth={3} />}
          {winner === 'O' && <Circle className="w-16 h-16 text-rose-500 drop-shadow-lg" strokeWidth={3} />}
          {winner === 'Draw' && <span className="text-2xl font-bold text-slate-400 tracking-wider">DRAW</span>}
        </div>
      )}
    </div>
  );
};

export default SmallBoard;