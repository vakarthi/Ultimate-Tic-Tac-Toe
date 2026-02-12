import React from 'react';
import { GameState } from '../types';
import SmallBoard from './SmallBoard';
import { X, Circle, Trophy } from 'lucide-react';

interface BigBoardProps {
  gameState: GameState;
  onMove: (boardIndex: number, cellIndex: number) => void;
  highlightMoves: boolean; // False if not player's turn (e.g., online opponent turn)
}

const BigBoard: React.FC<BigBoardProps> = ({ gameState, onMove, highlightMoves }) => {
  const { winner, activeBoard, boards } = gameState;

  return (
    <div className="relative w-full h-full">
      <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3 w-full h-full">
        {boards.map((board, idx) => {
          // If activeBoard is null, all non-won boards are active
          // If activeBoard is set, only that board is active
          const isTargeted = activeBoard === null || activeBoard === idx;
          const isActive = isTargeted && board.winner === null && highlightMoves;

          return (
            <SmallBoard
              key={idx}
              boardIndex={idx}
              data={board}
              gameState={gameState}
              onMove={onMove}
              isActive={isActive}
              isPlayable={highlightMoves}
            />
          );
        })}
      </div>

      {/* Global Winner Overlay */}
      {winner && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-[fade-in_0.5s_ease-out]">
          <div className="bg-slate-900 p-8 rounded-2xl border border-slate-800 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 transform animate-[scale-in_0.3s_cubic-bezier(0.34,1.56,0.64,1)]">
            <Trophy className={`w-16 h-16 ${winner === 'X' ? 'text-sky-400' : winner === 'O' ? 'text-rose-400' : 'text-slate-400'}`} />
            
            <h2 className="text-3xl font-bold text-white">
              {winner === 'Draw' ? 'Game Draw!' : `Player ${winner} Wins!`}
            </h2>
            
            <p className="text-slate-400 text-center text-sm">
              {winner === 'Draw' 
                ? "An intense battle with no victor." 
                : "Congratulations on conquering the Ultimate grid."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BigBoard;