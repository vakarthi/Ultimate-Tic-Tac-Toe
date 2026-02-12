import React, { useState, useEffect } from 'react';
import { MatchRecord, MoveClassification } from '../types';
import BigBoard from './BigBoard';
import { reconstructGameState } from '../services/gameLogic';
import { analyzeMoveQuality, evaluateState } from '../services/ai';
import { ChevronLeft, ChevronRight, X, AlertCircle, CheckCircle, Star, ChevronsLeft, AlertTriangle } from 'lucide-react';

interface GameReviewProps {
  gameRecord: MatchRecord;
  onClose: () => void;
}

const GameReview: React.FC<GameReviewProps> = ({ gameRecord, onClose }) => {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [currentEval, setCurrentEval] = useState(0); // Normalized 0-100% (50 = equal)
  const [analysisCache, setAnalysisCache] = useState<Record<number, { class: MoveClassification, score: number }>>({});
  
  // Reconstruct state up to currentMoveIndex
  const historySlice = gameRecord.history.slice(0, currentMoveIndex);
  const currentState = reconstructGameState(historySlice);
  
  useEffect(() => {
    // Basic Evaluation Bar Calculation
    // We normalize the heuristic score (-5000 to 5000 roughly) to 0-100%
    // 0 score = 50%.
    const rawScore = evaluateState(currentState, 'X', currentState.lastMove || {boardIndex: 4, cellIndex: 4});
    
    // Sigmoid-ish clamping for visualization
    const clamped = Math.max(-2000, Math.min(2000, rawScore));
    const normalized = 50 + (clamped / 40); // 50 +/- 50
    setCurrentEval(Math.max(5, Math.min(95, normalized)));

  }, [currentState]);

  useEffect(() => {
    // Analyze the move that JUST happened (at currentMoveIndex - 1)
    if (currentMoveIndex > 0 && !analysisCache[currentMoveIndex - 1]) {
        // This is expensive, so we'd typically run this in a web worker or async
        // For now, run it for the current move only
        const previousState = reconstructGameState(gameRecord.history.slice(0, currentMoveIndex - 1));
        const moveMade = gameRecord.history[currentMoveIndex - 1];
        
        const analysis = analyzeMoveQuality(previousState, moveMade);
        setAnalysisCache(prev => ({
            ...prev,
            [currentMoveIndex - 1]: { class: analysis.classification, score: analysis.score }
        }));
    }
  }, [currentMoveIndex, gameRecord.history]);


  const getMoveClassIcon = (cls: MoveClassification) => {
    switch (cls) {
      case 'brilliant': return <Star className="text-teal-400" size={16} />;
      case 'best': return <CheckCircle className="text-emerald-500" size={16} />;
      case 'good': return <CheckCircle className="text-emerald-500/50" size={16} />;
      case 'inaccuracy': return <AlertCircle className="text-yellow-500" size={16} />;
      case 'blunder': return <AlertTriangle className="text-rose-500" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900 shrink-0">
        <div className="font-bold text-slate-200">Game Review vs {gameRecord.opponentName}</div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
            <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Analysis Board Area */}
        <div className="flex-1 relative flex items-center justify-center bg-slate-950 p-4">
            
            {/* Eval Bar */}
            <div className="absolute left-4 top-4 bottom-4 w-4 bg-slate-800 rounded-full overflow-hidden flex flex-col-reverse border border-slate-700">
                <div 
                    className="w-full bg-slate-200 transition-all duration-500 ease-out"
                    style={{ height: `${currentEval}%` }} 
                />
            </div>

            <div className="w-full max-w-xl aspect-square">
                <BigBoard gameState={currentState} onMove={() => {}} highlightMoves={false} />
            </div>
        </div>

        {/* Move List / Controls */}
        <div className="w-full md:w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="text-xs text-slate-500 font-bold uppercase mb-2">Move List</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm font-mono">
                    {gameRecord.history.map((move, idx) => {
                         if (idx % 2 !== 0) return null; // Only render rows for X
                         const oMove = gameRecord.history[idx + 1];
                         const xAnalysis = analysisCache[idx];
                         const oAnalysis = analysisCache[idx + 1];

                         return (
                            <React.Fragment key={idx}>
                                <div 
                                    className={`flex items-center justify-between p-1 rounded cursor-pointer ${currentMoveIndex === idx + 1 ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                                    onClick={() => setCurrentMoveIndex(idx + 1)}
                                >
                                    <span className="text-slate-400 w-6">{(idx / 2) + 1}.</span>
                                    <span className="text-sky-400">X ({move.boardIndex},{move.cellIndex})</span>
                                    {xAnalysis && getMoveClassIcon(xAnalysis.class)}
                                </div>
                                <div 
                                    className={`flex items-center justify-between p-1 rounded cursor-pointer ${oMove && currentMoveIndex === idx + 2 ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
                                    onClick={() => oMove && setCurrentMoveIndex(idx + 2)}
                                >
                                    {oMove ? (
                                        <>
                                            <span className="text-rose-400">O ({oMove.boardIndex},{oMove.cellIndex})</span>
                                            {oAnalysis && getMoveClassIcon(oAnalysis.class)}
                                        </>
                                    ) : <span className="text-slate-700">-</span>}
                                </div>
                            </React.Fragment>
                         )
                    })}
                </div>
            </div>

            {/* Analysis Detail Box */}
            <div className="h-32 bg-slate-800 p-4 border-t border-slate-700">
                {currentMoveIndex > 0 ? (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            {analysisCache[currentMoveIndex-1] && getMoveClassIcon(analysisCache[currentMoveIndex-1].class)}
                            <span className="font-bold text-white capitalize">
                                {analysisCache[currentMoveIndex-1]?.class || "Analyzing..."} Move
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            {analysisCache[currentMoveIndex-1]?.class === 'best' 
                                ? "This was the best move in the position." 
                                : analysisCache[currentMoveIndex-1]?.class === 'blunder'
                                ? "This move loses significant advantage."
                                : "Position is roughly balanced."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm">Start of game.</div>
                )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex justify-center gap-2">
                <button 
                    onClick={() => setCurrentMoveIndex(0)}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    disabled={currentMoveIndex === 0}
                >
                    <ChevronsLeft size={20} />
                </button>
                <button 
                    onClick={() => setCurrentMoveIndex(Math.max(0, currentMoveIndex - 1))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    disabled={currentMoveIndex === 0}
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    onClick={() => setCurrentMoveIndex(Math.min(gameRecord.history.length, currentMoveIndex + 1))}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
                    disabled={currentMoveIndex === gameRecord.history.length}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default GameReview;