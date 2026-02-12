import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, GameState, Player, MoveHistory } from './types';
import Menu from './components/Menu';
import BigBoard from './components/BigBoard';
import { INITIAL_GAME_STATE } from './constants';
import { makeMove, isMoveValid, reconstructGameState } from './services/gameLogic';
import { getBestMove } from './services/ai';
import { PeerService } from './services/peerService';
import { recordGameResult, recordLocalResult } from './services/stats';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, RotateCcw, RotateCw } from 'lucide-react';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  const [peerService, setPeerService] = useState<PeerService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [myPlayerId, setMyPlayerId] = useState<Player>('X');
  const [roomId, setRoomId] = useState<string>('');
  
  // Undo/Redo Stacks
  // We store undone moves to allow redoing.
  const [undoneMoves, setUndoneMoves] = useState<MoveHistory[]>([]);

  // Stats Recorded Flag to prevent double counting on re-renders
  const [statsRecorded, setStatsRecorded] = useState(false);

  // AI Turn Effect
  useEffect(() => {
    if (gameMode === 'cpu' && gameState.currentPlayer === 'O' && !gameState.winner) {
      const timer = setTimeout(() => {
        const aiMove = getBestMove(gameState, gameState.difficulty);
        if (aiMove) {
          handleMove(aiMove.boardIndex, aiMove.cellIndex);
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState.currentPlayer, gameMode, gameState.winner, gameState.difficulty]);

  // Cleanup PeerService
  useEffect(() => {
    return () => {
      peerService?.destroy();
    };
  }, [peerService]);

  // Stats Recording
  useEffect(() => {
    if (gameState.winner && !statsRecorded) {
      setStatsRecorded(true);
      if (gameMode === 'local') {
        recordLocalResult(gameState.winner);
      } else if (gameMode === 'cpu') {
        // Player is X
        const result = gameState.winner === 'X' ? 'win' : gameState.winner === 'O' ? 'loss' : 'draw';
        recordGameResult('cpu', result, gameState.difficulty);
      } else if (gameMode === 'online') {
        const result = gameState.winner === myPlayerId ? 'win' : gameState.winner === 'Draw' ? 'draw' : 'loss';
        recordGameResult('online', result);
      }
    } else if (!gameState.winner) {
      setStatsRecorded(false);
    }
  }, [gameState.winner, gameMode, gameState.difficulty, myPlayerId, statsRecorded]);

  const startLocalGame = () => {
    setGameMode('local');
    setGameState(INITIAL_GAME_STATE);
    setUndoneMoves([]);
  };

  const startCpuGame = (difficulty: 'easy' | 'medium' | 'hard') => {
    setGameMode('cpu');
    setGameState({
      ...INITIAL_GAME_STATE,
      difficulty,
    });
    setUndoneMoves([]);
  };

  const startOnlineHost = () => {
    setConnectionStatus('connecting');
    const peer = new PeerService();
    setPeerService(peer);
    
    peer.init((id) => {
      setRoomId(id);
      setConnectionStatus('disconnected');
    });

    peer.onConnection((_conn) => {
      setConnectionStatus('connected');
      setGameMode('online');
      setMyPlayerId('X');
      setGameState(INITIAL_GAME_STATE);
      setUndoneMoves([]);
      peer.sendData({ type: 'SYNC', state: INITIAL_GAME_STATE });
    });

    peer.onData((data) => {
      if (data.type === 'MOVE' && typeof data.boardIndex === 'number' && typeof data.cellIndex === 'number') {
        handleMove(data.boardIndex, data.cellIndex, true);
      } else if (data.type === 'RESTART') {
        setGameState(INITIAL_GAME_STATE);
        setUndoneMoves([]);
      }
    });
  };

  const joinOnlineGame = (hostId: string) => {
    setConnectionStatus('connecting');
    const peer = new PeerService();
    setPeerService(peer);

    peer.init(() => {
      peer.connect(hostId, (_conn) => {
        setConnectionStatus('connected');
        setGameMode('online');
        setMyPlayerId('O');
      });
    });

    peer.onData((data) => {
      if (data.type === 'SYNC' && data.state) {
        setGameState(data.state);
        setUndoneMoves([]);
      } else if (data.type === 'MOVE' && typeof data.boardIndex === 'number' && typeof data.cellIndex === 'number') {
        handleMove(data.boardIndex, data.cellIndex, true);
      } else if (data.type === 'RESTART') {
        setGameState(INITIAL_GAME_STATE);
        setUndoneMoves([]);
      }
    });
  };

  const handleMove = (boardIndex: number, cellIndex: number, isRemote = false) => {
    if (gameState.winner) return;
    if (gameMode === 'online' && !isRemote && gameState.currentPlayer !== myPlayerId) return;
    if (!isMoveValid(gameState, boardIndex, cellIndex)) return;

    // If making a new move, clear redo stack
    if (!isRemote) {
      setUndoneMoves([]);
    }

    const nextState = makeMove(gameState, boardIndex, cellIndex);
    setGameState(nextState);

    if (gameMode === 'online' && !isRemote && peerService) {
      peerService.sendData({ type: 'MOVE', boardIndex, cellIndex });
    }
  };

  const handleUndo = useCallback(() => {
    if (gameMode === 'online' || gameState.history.length === 0) return;

    // Determine how many moves to undo
    let movesToUndo = 1;
    if (gameMode === 'cpu') {
      // If it's Player's turn (CPU just played), undo 2 moves (CPU + Player)
      // If it's CPU's turn (Player just played), undo 1 move (Player)
      // Note: In typical flow, after Player moves, CPU moves quickly. 
      // So usually we are at Player's turn and want to undo the CPU response AND our move.
      if (gameState.currentPlayer === 'X' && gameState.history.length >= 2) {
        movesToUndo = 2;
      }
    }

    const currentHistory = [...gameState.history];
    const removedMoves: MoveHistory[] = [];
    
    for (let i = 0; i < movesToUndo; i++) {
      if (currentHistory.length > 0) {
        removedMoves.unshift(currentHistory.pop()!);
      }
    }

    setUndoneMoves(prev => [...removedMoves, ...prev]);
    
    // Reconstruct state
    const newState = reconstructGameState(currentHistory, gameState.difficulty);
    setGameState(newState);
    setStatsRecorded(false); // Reset stats flag if we undo a win
  }, [gameState, gameMode]);

  const handleRedo = useCallback(() => {
    if (gameMode === 'online' || undoneMoves.length === 0) return;

    // Determine how many moves to redo
    let movesToRedo = 1;
    if (gameMode === 'cpu') {
      // If we undid 2 moves (Player + CPU), we only redo the Player's move.
      // The CPU will then automatically play its turn again.
      movesToRedo = 1; 
    } else {
        // Local mode, just redo one step
        movesToRedo = 1;
    }

    const movesToApply = undoneMoves.slice(0, movesToRedo);
    const remainingUndone = undoneMoves.slice(movesToRedo);

    let newState = { ...gameState };
    for (const move of movesToApply) {
      newState = makeMove(newState, move.boardIndex, move.cellIndex);
    }

    setGameState(newState);
    setUndoneMoves(remainingUndone);
  }, [gameState, undoneMoves, gameMode]);

  const handleRestart = () => {
    if (gameMode === 'online') {
      if (peerService) {
         peerService.sendData({ type: 'RESTART' });
         setGameState(INITIAL_GAME_STATE);
         setUndoneMoves([]);
      }
    } else {
      setGameState({
        ...INITIAL_GAME_STATE,
        difficulty: gameState.difficulty
      });
      setUndoneMoves([]);
      setStatsRecorded(false);
    }
  };

  const goBackToMenu = () => {
    peerService?.destroy();
    setPeerService(null);
    setGameMode(null);
    setConnectionStatus('disconnected');
    setRoomId('');
    setUndoneMoves([]);
    setStatsRecorded(false);
  };

  const canUndo = gameMode !== 'online' && gameState.history.length > 0;
  // Redo allowed if there are undone moves. In CPU mode, strict redo might be tricky if state changed, but logic holds.
  const canRedo = gameMode !== 'online' && undoneMoves.length > 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {!gameMode ? (
        <Menu 
          onStartLocal={startLocalGame}
          onStartCpu={startCpuGame}
          onHostOnline={startOnlineHost}
          onJoinOnline={joinOnlineGame}
          isConnecting={connectionStatus === 'connecting'}
          hostId={roomId}
        />
      ) : (
        <div className="flex flex-col h-full">
          {/* Header */}
          <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border-b border-slate-800 shrink-0">
            <button 
              onClick={goBackToMenu}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            {/* Middle Controls (Turn + Undo/Redo) */}
            <div className="flex items-center gap-2 sm:gap-4">
              {gameMode !== 'online' && (
                <div className="flex bg-slate-800 rounded-lg p-0.5">
                  <button 
                    onClick={handleUndo} 
                    disabled={!canUndo}
                    className="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
                    title="Undo"
                  >
                    <RotateCcw size={16} />
                  </button>
                  <button 
                    onClick={handleRedo} 
                    disabled={!canRedo}
                    className="p-1.5 rounded-md hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-colors"
                    title="Redo"
                  >
                    <RotateCw size={16} />
                  </button>
                </div>
              )}

              <div className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${gameState.currentPlayer === 'X' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                Player {gameState.currentPlayer}
              </div>
            </div>

            <div className="flex items-center gap-2">
                {gameMode === 'online' && (
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 mr-2">
                    {connectionStatus === 'connected' ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-red-500" />}
                    <span className="hidden md:inline">{connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}</span>
                    </div>
                )}
                
                <button 
                onClick={handleRestart}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                title="Restart Game"
                >
                <RefreshCw size={20} />
                </button>
            </div>
          </header>

          {/* Game Area */}
          <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-4 bg-slate-950">
            <div className="max-w-2xl w-full aspect-square max-h-[calc(100vh-80px)]">
              <BigBoard 
                gameState={gameState} 
                onMove={(b, c) => handleMove(b, c)} 
                highlightMoves={gameMode !== 'online' || gameState.currentPlayer === myPlayerId}
              />
            </div>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;