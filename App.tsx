import React, { useState, useEffect, useCallback } from 'react';
import { GameMode, GameState, Player, MoveHistory, MatchRecord } from './types';
import Menu from './components/Menu';
import BigBoard from './components/BigBoard';
import Sidebar from './components/Sidebar';
import Profile from './components/Profile';
import GameReview from './components/GameReview';
import { INITIAL_GAME_STATE } from './constants';
import { makeMove, isMoveValid, reconstructGameState } from './services/gameLogic';
import { getBestMove } from './services/ai';
import { PeerService } from './services/peerService';
import { updateProfileAfterGame, saveMatchRecord, getProfile, getMatchHistory } from './services/stats';
import { calculateEloChange, getCpuRating } from './services/elo';
import { ArrowLeft, RefreshCw, Wifi, WifiOff, RotateCcw, RotateCw, Search } from 'lucide-react';

type View = 'menu' | 'game' | 'profile' | 'analysis';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('menu');
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);
  
  // Online State
  const [peerService, setPeerService] = useState<PeerService | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [myPlayerId, setMyPlayerId] = useState<Player>('X');
  const [roomId, setRoomId] = useState<string>('');
  const [opponentName, setOpponentName] = useState('Opponent');
  const [opponentRating, setOpponentRating] = useState(1200);

  // Undo/Redo
  const [undoneMoves, setUndoneMoves] = useState<MoveHistory[]>([]);
  const [statsRecorded, setStatsRecorded] = useState(false);

  // Analysis State
  const [reviewGameRecord, setReviewGameRecord] = useState<MatchRecord | null>(null);

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

  // Handle Game End (Stats & Elo)
  useEffect(() => {
    if (gameState.winner && !statsRecorded && gameMode) {
      setStatsRecorded(true);
      
      const myProfile = getProfile();
      let result: 'win' | 'loss' | 'draw';
      let ratingChange = 0;
      let oppRating = 1200;
      let oppName = 'Opponent';

      // Calculate Board Performance
      // Note: In CPU mode, user is always 'X'. In Online, user is 'myPlayerId'.
      const userSymbol = gameMode === 'online' ? myPlayerId : 'X';
      const oppSymbol = userSymbol === 'X' ? 'O' : 'X';
      
      const myBoardsWon = gameState.macroBoard.filter(w => w === userSymbol).length;
      const oppBoardsWon = gameState.macroBoard.filter(w => w === oppSymbol).length;

      if (gameMode === 'cpu') {
        oppRating = getCpuRating(gameState.difficulty || 'medium');
        oppName = `Bot (${gameState.difficulty})`;
        
        if (gameState.winner === 'X') result = 'win';
        else if (gameState.winner === 'O') result = 'loss';
        else result = 'draw';

        ratingChange = calculateEloChange(myProfile.ratings.cpu, oppRating, result, myBoardsWon, oppBoardsWon);
        updateProfileAfterGame(result, 'cpu', ratingChange, gameState.difficulty);
      
      } else if (gameMode === 'online') {
        oppRating = opponentRating;
        oppName = opponentName;

        if (gameState.winner === myPlayerId) result = 'win';
        else if (gameState.winner === 'Draw') result = 'draw';
        else result = 'loss';
        
        ratingChange = calculateEloChange(myProfile.ratings.online, oppRating, result, myBoardsWon, oppBoardsWon);
        updateProfileAfterGame(result, 'online', ratingChange);
        
      } else {
        // Local game - no elo
        result = gameState.winner === 'X' ? 'win' : gameState.winner === 'O' ? 'loss' : 'draw';
        updateProfileAfterGame(result, 'local', 0);
      }

      // Save Match History
      if (gameMode !== 'local') {
        const record: MatchRecord = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            opponentName: oppName,
            opponentRating: oppRating,
            mode: gameMode!,
            result: result,
            ratingChange: ratingChange,
            moves: gameState.history.length,
            history: gameState.history
        };
        saveMatchRecord(record);
      }
    } else if (!gameState.winner) {
      setStatsRecorded(false);
    }
  }, [gameState.winner, gameMode, statsRecorded, myPlayerId, opponentName, opponentRating, gameState.difficulty, gameState.history, gameState.macroBoard]);

  const handleMove = (boardIndex: number, cellIndex: number, isRemote = false) => {
    if (gameState.winner) return;
    if (gameMode === 'online' && !isRemote && gameState.currentPlayer !== myPlayerId) return;
    if (!isMoveValid(gameState, boardIndex, cellIndex)) return;

    if (!isRemote) setUndoneMoves([]);

    const nextState = makeMove(gameState, boardIndex, cellIndex);
    setGameState(nextState);

    if (gameMode === 'online' && !isRemote && peerService) {
      peerService.sendData({ type: 'MOVE', boardIndex, cellIndex });
    }
  };

  // Online Data Listener
  useEffect(() => {
    if (!peerService) return;

    peerService.onData((data) => {
      if (data.type === 'MOVE' && typeof data.boardIndex === 'number' && typeof data.cellIndex === 'number') {
        handleMove(data.boardIndex, data.cellIndex, true);
      } else if (data.type === 'SYNC' && data.state) {
        setGameState(data.state);
        setUndoneMoves([]);
      } else if (data.type === 'RESTART') {
        setGameState(INITIAL_GAME_STATE);
        setUndoneMoves([]);
        setStatsRecorded(false);
      } else if (data.type === 'HANDSHAKE') {
        setOpponentName(data.payload.username || 'Opponent');
        setOpponentRating(data.payload.rating || 1200);
      }
    });
  }, [peerService, gameState, handleMove]);

  const startLocalGame = () => {
    setGameMode('local');
    setGameState(INITIAL_GAME_STATE);
    setUndoneMoves([]);
    setCurrentView('game');
  };

  const startCpuGame = (difficulty: 'easy' | 'medium' | 'hard' | 'impossible') => {
    setGameMode('cpu');
    setGameState({ ...INITIAL_GAME_STATE, difficulty });
    setUndoneMoves([]);
    setCurrentView('game');
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
      setCurrentView('game');

      // Send Handshake with my profile info
      const profile = getProfile();
      peer.sendData({ 
        type: 'HANDSHAKE', 
        payload: { username: profile.username, rating: profile.ratings.online } 
      });
      peer.sendData({ type: 'SYNC', state: INITIAL_GAME_STATE });
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
        setCurrentView('game');

        const profile = getProfile();
        peer.sendData({ 
          type: 'HANDSHAKE', 
          payload: { username: profile.username, rating: profile.ratings.online } 
        });
      });
    });
  };

  const handleUndo = useCallback(() => {
    if (gameMode === 'online' || gameState.history.length === 0) return;

    let movesToUndo = 1;
    if (gameMode === 'cpu' && gameState.currentPlayer === 'X' && gameState.history.length >= 2) {
      movesToUndo = 2;
    }

    const currentHistory = [...gameState.history];
    const removedMoves: MoveHistory[] = [];
    
    for (let i = 0; i < movesToUndo; i++) {
      if (currentHistory.length > 0) removedMoves.unshift(currentHistory.pop()!);
    }

    setUndoneMoves(prev => [...removedMoves, ...prev]);
    const newState = reconstructGameState(currentHistory, gameState.difficulty);
    setGameState(newState);
    setStatsRecorded(false);
  }, [gameState, gameMode]);

  const handleRedo = useCallback(() => {
    if (gameMode === 'online' || undoneMoves.length === 0) return;
    
    let movesToRedo = 1; // Simplify redo for now
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
    if (gameMode === 'online' && peerService) {
         peerService.sendData({ type: 'RESTART' });
    }
    setGameState(INITIAL_GAME_STATE);
    setUndoneMoves([]);
    setStatsRecorded(false);
  };

  const handleExitGame = () => {
    peerService?.destroy();
    setPeerService(null);
    setGameMode(null);
    setConnectionStatus('disconnected');
    setRoomId('');
    setUndoneMoves([]);
    setStatsRecorded(false);
    setCurrentView('menu');
  };

  // View Navigation
  const handleReviewGame = (record: MatchRecord) => {
    setReviewGameRecord(record);
    setCurrentView('analysis');
  };

  // Render content based on view
  const renderContent = () => {
    if (currentView === 'profile') {
        return <Profile onReviewGame={handleReviewGame} />;
    }
    
    if (currentView === 'analysis' && reviewGameRecord) {
        return <GameReview gameRecord={reviewGameRecord} onClose={() => setCurrentView('profile')} />;
    }

    if (currentView === 'game') {
        return (
            <div className="flex flex-col h-full w-full">
              {/* Game Header */}
              <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
                <button onClick={handleExitGame} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                  <ArrowLeft size={20} />
                </button>

                <div className="flex items-center gap-4">
                  {gameMode !== 'online' && (
                    <div className="flex bg-slate-800 rounded-lg p-0.5">
                      <button onClick={handleUndo} disabled={!gameState.history.length} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30"><RotateCcw size={16}/></button>
                      <button onClick={handleRedo} disabled={!undoneMoves.length} className="p-1.5 hover:bg-slate-700 text-slate-300 rounded disabled:opacity-30"><RotateCw size={16}/></button>
                    </div>
                  )}
                  <div className={`px-3 py-1 rounded-full text-sm font-bold ${gameState.currentPlayer === 'X' ? 'bg-sky-500/10 text-sky-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {gameState.currentPlayer === 'X' ? 'Player X' : 'Player O'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                    {gameMode === 'online' && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 mr-2">
                        {connectionStatus === 'connected' ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} className="text-red-500" />}
                        <span className="hidden md:inline font-bold">{opponentName} ({opponentRating})</span>
                        </div>
                    )}
                    <button onClick={handleRestart} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white">
                        <RefreshCw size={20} />
                    </button>
                </div>
              </header>

              {/* Game Board */}
              <main className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-slate-950 relative">
                 {/* Post-Game Modal */}
                 {gameState.winner && statsRecorded && (
                    <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                        <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center space-y-6 max-w-sm mx-4">
                            <h2 className="text-4xl font-black text-white">
                                {gameState.winner === 'Draw' ? 'Draw' : `${gameState.winner} Won!`}
                            </h2>
                            {gameMode !== 'local' && (
                                <div className="text-lg text-slate-400">
                                    Rating: <span className="text-white font-bold">{getProfile().ratings[gameMode as 'online'|'cpu']}</span>
                                </div>
                            )}
                            <div className="flex flex-col gap-3">
                                <button onClick={handleRestart} className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg">Rematch</button>
                                <button 
                                    onClick={() => {
                                        const hist = getProfile().username ? getMatchHistory() : []; 
                                        if (hist.length > 0) handleReviewGame(hist[0]);
                                        else setCurrentView('profile');
                                    }} 
                                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                                >
                                    <Search size={18} /> Game Review
                                </button>
                                <button onClick={handleExitGame} className="w-full py-3 text-slate-500 hover:text-white">Back to Menu</button>
                            </div>
                        </div>
                    </div>
                 )}

                <div className="max-w-2xl w-full aspect-square max-h-[calc(100vh-80px)]">
                  <BigBoard 
                    gameState={gameState} 
                    onMove={(b, c) => handleMove(b, c)} 
                    highlightMoves={gameMode !== 'online' || gameState.currentPlayer === myPlayerId}
                  />
                </div>
              </main>
            </div>
        );
    }

    // Default: Menu
    return (
        <Menu 
            onStartLocal={startLocalGame}
            onStartCpu={startCpuGame}
            onHostOnline={startOnlineHost}
            onJoinOnline={joinOnlineGame}
            isConnecting={connectionStatus === 'connecting'}
            hostId={roomId}
        />
    );
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      <div className={`${currentView === 'game' || currentView === 'analysis' ? 'hidden xl:flex' : 'flex'}`}>
         <Sidebar currentView={currentView} onChangeView={setCurrentView} />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
};

export default App;