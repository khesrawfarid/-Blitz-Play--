import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { ArrowLeft, RotateCcw, Clock, Zap, User, Users, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

let socket: Socket;

interface ChessGameProps {
  onBack: () => void;
  t: any;
}

const pieceValues: Record<string, number> = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };

function evaluateBoard(game: Chess) {
  let value = 0;
  const board = game.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = pieceValues[piece.type] || 0;
        value += piece.color === 'w' ? val : -val;
      }
    }
  }
  return value;
}

function minimax(game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
  if (depth === 0 || game.isGameOver()) {
    if (game.isCheckmate()) return isMaximizing ? -10000 : 10000;
    if (game.isDraw()) return 0;
    return evaluateBoard(game);
  }

  const moves = game.moves();
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let move of moves) {
      const copy = new Chess(game.fen());
      copy.move(move);
      const evalValue = minimax(copy, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, evalValue);
      alpha = Math.max(alpha, evalValue);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let move of moves) {
      const copy = new Chess(game.fen());
      copy.move(move);
      const evalValue = minimax(copy, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, evalValue);
      beta = Math.min(beta, evalValue);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function getBestMove(game: Chess, depth: number) {
  let bestMove = null;
  const moves = game.moves();
  if (moves.length === 0) return null;
  
  if (depth === 0) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestEval = game.turn() === 'w' ? -Infinity : Infinity;

  // randomize slightly to avoid deterministic identical games
  moves.sort(() => Math.random() - 0.5);

  // Focus on captures and checks first for better pruning if we want, but simple random sort is enough for depth 2
  for (let move of moves) {
    const copy = new Chess(game.fen());
    copy.move(move);
    const evalValue = minimax(copy, depth - 1, -Infinity, Infinity, game.turn() !== 'w');
    
    if (game.turn() === 'w') {
      if (evalValue > bestEval) {
        bestEval = evalValue;
        bestMove = move;
      }
    } else {
      if (evalValue < bestEval) {
        bestEval = evalValue;
        bestMove = move;
      }
    }
  }
  return bestMove || moves[0];
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ChessGame({ onBack, t }: ChessGameProps) {
  const [game, setGame] = useState(new Chess());
  const [gameEnded, setGameEnded] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [status, setStatus] = useState('Weiß am Zug');
  const [moveFrom, setMoveFrom] = useState('');
  const [optionSquares, setOptionSquares] = useState({});
  const [difficulty, setDifficulty] = useState<number>(1); // 0: Einfach, 1: Mittel, 2: Schwer
  
  // Timer State
  const [initialTime, setInitialTime] = useState(600);
  const [whiteTime, setWhiteTime] = useState(initialTime);
  const [blackTime, setBlackTime] = useState(initialTime);
  const [timerActive, setTimerActive] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  // Multiplayer State
  const [playMode, setPlayMode] = useState<'bot' | 'multiplayer' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState<any>(null);
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w');
  const [roomId, setRoomId] = useState('');

  // Setup Socket
  useEffect(() => {
    const url = window.location.hostname === 'localhost' 
      ? window.location.origin 
      : 'https://blitzplaygame.onrender.com';
      
    if (!socket) {
      socket = io(url, {
        path: '/socket.io',
        transports: ['websocket', 'polling']
      });
    }

    socket.on('chess-room-update', (r) => {
      setRoom(r);
      if (r.state === 'playing' && !gameStarted) {
        setGameStarted(true);
        setTimerActive(true);
      }
    });

    socket.on('chess-start-game', (r) => {
      setRoom(r);
      const newGame = new Chess();
      setGame(newGame);
      setWhiteTime(r.chessState.timeLimit);
      setBlackTime(r.chessState.timeLimit);
      setInitialTime(r.chessState.timeLimit);
      setGameStarted(true);
      setTimerActive(true);
      setStatus(t.whiteTurn);
    });

    socket.on('chess-moved', ({ fen }) => {
      const prevFen = game.fen();
      const newGame = new Chess(fen);
      setGame(newGame);
      
      // Try to find the move by comparing FENs
      const oldGame = new Chess(prevFen);
      const moves = oldGame.moves({ verbose: true });
      const move = moves.find(m => {
        const copy = new Chess(prevFen);
        copy.move(m);
        return copy.fen() === fen;
      });
      if (move) {
        setLastMove({ from: move.from, to: move.to });
      }
    });

    socket.on('party-closed', () => {
      setGameEnded(true);
      setStatus(t.opponentLeft);
      setTimerActive(false);
    });

    return () => {
      socket.off('chess-room-update');
      socket.off('chess-start-game');
      socket.off('chess-moved');
      socket.off('party-closed');
    };
  }, [gameStarted]);

  useEffect(() => {
    let interval: any;
    if (gameStarted && timerActive && !gameEnded) {
      interval = setInterval(() => {
        if (game.turn() === 'w') {
          setWhiteTime((prev) => {
            if (prev <= 0) {
              setGameEnded(true);
              setStatus(t.blackWinsTime);
              setTimerActive(false);
              return 0;
            }
            if (prev === 1) {
              setTimeout(() => {
                setWhiteTime((curr) => {
                  if (curr === 0 && game.turn() === 'w') {
                    setGameEnded(true);
                    setStatus(t.blackWinsTime);
                    setTimerActive(false);
                  }
                  return curr;
                });
              }, 1000);
            }
            return prev - 1;
          });
        } else {
          setBlackTime((prev) => {
            if (prev <= 0) {
              setGameEnded(true);
              setStatus(t.whiteWinsTime);
              setTimerActive(false);
              return 0;
            }
            if (prev === 1) {
              setTimeout(() => {
                setBlackTime((curr) => {
                  if (curr === 0 && game.turn() === 'b') {
                    setGameEnded(true);
                    setStatus(t.whiteWinsTime);
                    setTimerActive(false);
                  }
                  return curr;
                });
              }, 1000);
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, gameEnded, game]);

  const updateStatus = useCallback((myGame: Chess) => {
    let turn = myGame.turn() === 'w' ? t.white : t.black;
    if (myGame.isCheckmate()) {
      const winner = myGame.turn() === 'w' ? t.black : t.white;
      setStatus(t.checkmateWins.replace('{player}', winner));
      setGameEnded(true);
      setTimerActive(false);
    } else if (myGame.isDraw()) {
      setStatus(t.itsADraw);
      setGameEnded(true);
      setTimerActive(false);
    } else {
      const statusText = myGame.turn() === 'w' ? t.whiteTurn : t.blackTurn;
      setStatus(`${statusText}${myGame.isCheck() ? ` (${t.check})` : ''}`);
    }
  }, [t]);

  useEffect(() => {
    updateStatus(game);
  }, [game.fen()]);

  // AI Move
  useEffect(() => {
    if (playMode === 'bot' && gameStarted && game.turn() === 'b' && !gameEnded) {
      const timer = setTimeout(() => {
        const depth = difficulty === 0 ? 0 : difficulty === 1 ? 1 : 2;
        const bestMove = getBestMove(game, depth);
        if (bestMove) {
          const newGame = new Chess(game.fen());
          newGame.move(bestMove);
          setGame(newGame);
          
          // Set last move for AI
          const moves = game.moves({ verbose: true }) as any[];
          const moveObj = moves.find(m => m.san === bestMove || m.lan === bestMove);
          if (moveObj) {
            setLastMove({ from: moveObj.from, to: moveObj.to });
          } else if (typeof bestMove === 'string' && bestMove.length >= 4) {
             // Fallback for some move formats
             const from = bestMove.slice(0, 2);
             const to = bestMove.slice(2, 4);
             setLastMove({ from, to });
          }
          
          updateStatus(newGame);
        }
      }, 700 + (difficulty * 300)); // 700ms for Easy, 1000ms for Medium, 1300ms for Hard
      return () => clearTimeout(timer);
    }
  }, [game, gameEnded, updateStatus, difficulty]);

  function getKingSquare(color: 'w' | 'b') {
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = board[r][c];
        if (p && p.type === 'k' && p.color === color) {
          const files = 'abcdefgh';
          const rank = 8 - r;
          return `${files[c]}${rank}`;
        }
      }
    }
    return null;
  }

  function getCheckSquare() {
    if (game.isCheck() || game.isCheckmate()) {
      return getKingSquare(game.turn());
    }
    return null;
  }

  function getMoveOptions(square: string) {
    const moves = game.moves({
      square: square as any,
      verbose: true
    }) as any[];
    
    if (moves.length === 0) {
       setOptionSquares({});
       return false;
    }
    
    const newSquares: Record<string, any> = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any).color !== game.get(square as any).color
            ? 'radial-gradient(circle, rgba(255,255,255,.2) 85%, transparent 85%)'
            : 'radial-gradient(circle, rgba(255,255,255,.2) 25%, transparent 25%)',
        borderRadius: '50%'
      };
      return move;
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)'
    };
    
    // Maintain check square marking
    const checkSq = getCheckSquare();
    if (checkSq) {
      newSquares[checkSq] = { ...newSquares[checkSq], boxShadow: 'inset 0 0 20px 5px rgba(255, 0, 0, 0.8)' };
    }
    
    setOptionSquares(newSquares);
    return true;
  }

  // Pre-calculate full square styles including check highlighting
  const currentSquareStyles: Record<string, any> = { ...optionSquares };
  
  // Highlight last move
  if (lastMove) {
    const lastMoveStyle = { backgroundColor: 'rgba(255, 255, 0, 0.3)' };
    if (!currentSquareStyles[lastMove.from]) currentSquareStyles[lastMove.from] = lastMoveStyle;
    if (!currentSquareStyles[lastMove.to]) currentSquareStyles[lastMove.to] = lastMoveStyle;
  }
  
  if (gameEnded && status.includes('Zeitablauf')) {
    const whiteKing = getKingSquare('w');
    const blackKing = getKingSquare('b');
    
    if (whiteTime === 0) {
      if (whiteKing) currentSquareStyles[whiteKing] = { boxShadow: 'inset 0 0 20px 5px rgba(255, 0, 0, 0.8)' };
      if (blackKing) currentSquareStyles[blackKing] = { boxShadow: 'inset 0 0 20px 5px rgba(0, 255, 0, 0.8)' };
    } else if (blackTime === 0) {
      if (blackKing) currentSquareStyles[blackKing] = { boxShadow: 'inset 0 0 20px 5px rgba(255, 0, 0, 0.8)' };
      if (whiteKing) currentSquareStyles[whiteKing] = { boxShadow: 'inset 0 0 20px 5px rgba(0, 255, 0, 0.8)' };
    }
  } else {
    const checkSq = getCheckSquare();
    if (checkSq && !currentSquareStyles[checkSq]) {
      currentSquareStyles[checkSq] = { boxShadow: 'inset 0 0 20px 5px rgba(255, 0, 0, 0.8)' };
    }
  }

  function onSquareClick(arg: any) {
    const square = typeof arg === 'string' ? arg : arg?.square;
    if (!square) return;
    
    if (!gameStarted || gameEnded) return;
    if (playMode === 'bot' && game.turn() === 'b') return;
    if (playMode === 'multiplayer' && game.turn() !== playerColor) return;

    if (!moveFrom) {
      const hasMoveOptions = getMoveOptions(square);
      if (hasMoveOptions) setMoveFrom(square);
      return;
    }

    const moves = game.moves({
      square: moveFrom as any,
      verbose: true
    }) as any[];
    
    const foundMove = moves.find((m: any) => m.to === square);
    if (!foundMove) {
      const hasMoveOptions = getMoveOptions(square);
      setMoveFrom(hasMoveOptions ? square : '');
      return;
    }

    // Check for promotion
    if (foundMove.promotion) {
      setPendingPromotion({ from: moveFrom, to: square });
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({
      from: moveFrom,
      to: square,
      promotion: 'q'
    });

    if (move) {
      setGame(gameCopy);
      setLastMove({ from: moveFrom, to: square });
      if (playMode === 'multiplayer' && room) {
        socket.emit('chess-move', { code: room.code, fen: gameCopy.fen() });
      }
      if (!timerActive) setTimerActive(true);
    }
    setMoveFrom('');
    setOptionSquares({});
  }

  function onDrop(arg1: any, arg2?: any) {
    let sourceSquare = arg1;
    let targetSquare = arg2;

    if (typeof arg1 === 'object' && arg1 !== null) {
      sourceSquare = arg1.sourceSquare;
      targetSquare = arg1.targetSquare;
    }

    if (!sourceSquare || !targetSquare) return false;
    if (!gameStarted || gameEnded) return false;
    if (playMode === 'bot' && game.turn() === 'b') return false;
    if (playMode === 'multiplayer' && game.turn() !== playerColor) return false;

    const gameCopy = new Chess(game.fen());
    
    // Check if it's a promotion move
    const moves = game.moves({ square: sourceSquare as any, verbose: true }) as any[];
    const isPromotion = moves.some(m => m.to === targetSquare && m.promotion);

    if (isPromotion) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true;
    }

    try {
      const move = gameCopy.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (move) {
        setGame(gameCopy);
        setLastMove({ from: sourceSquare, to: targetSquare });
        if (playMode === 'multiplayer' && room) {
          socket.emit('chess-move', { code: room.code, fen: gameCopy.fen() });
        }
        setOptionSquares({});
        setMoveFrom('');
        if (!timerActive) setTimerActive(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  const restartGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    updateStatus(newGame);
    setMoveFrom('');
    setOptionSquares({});
    setGameEnded(false);
    setGameStarted(false);
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setTimerActive(false);
    setPendingPromotion(null);
    setLastMove(null);
  };

  const handlePromotionSelect = (piece: string) => {
    if (!pendingPromotion) return;
    
    const gameCopy = new Chess(game.fen());
    const move = gameCopy.move({
      from: pendingPromotion.from,
      to: pendingPromotion.to,
      promotion: piece
    });

    if (move) {
      setGame(gameCopy);
      setLastMove({ from: pendingPromotion.from, to: pendingPromotion.to });
      if (playMode === 'multiplayer' && room) {
        socket.emit('chess-move', { code: room.code, fen: gameCopy.fen() });
      }
      if (!timerActive) setTimerActive(true);
    }
    setPendingPromotion(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 w-full h-full pb-2 flex flex-col items-center justify-center bg-[#0b0f1a] overflow-hidden pointer-events-auto"
    >
      {/* Promotion Modal */}
      <AnimatePresence>
        {pendingPromotion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-[#1a1f2e] border border-white/10 p-6 rounded-2xl shadow-2xl flex flex-col gap-4 w-11/12 max-w-xs text-center"
            >
              <h3 className="text-xl font-black text-white">{t.promotePawn}</h3>
              <p className="text-white/50 text-sm">{t.choosePiece}</p>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {[
                  { id: 'q', labelKey: 'queen', icon: '♕' },
                  { id: 'r', labelKey: 'rook', icon: '♖' },
                  { id: 'n', labelKey: 'knight', icon: '♘' },
                  { id: 'b', labelKey: 'bishop', icon: '♗' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handlePromotionSelect(p.id)}
                    className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl transition-all gap-1 cursor-pointer group"
                  >
                    <span className="text-3xl text-white group-hover:scale-110 transition-transform">{p.icon}</span>
                    <span className="text-xs font-bold text-white/70">{t[p.labelKey]}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="w-full flex items-center justify-between p-4 flex-shrink-0 z-50 pointer-events-auto pt-8 sm:pt-4">
        <div className="flex gap-2">
          <button 
            onClick={onBack}
            className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer inline-flex"
          >
            <ArrowLeft className="text-white" />
          </button>
        </div>

        <div className="text-lg sm:text-2xl font-black text-white px-4 sm:px-6 py-2 bg-white/5 rounded-xl border border-white/10 text-center">
          {status}
        </div>
        
        <button 
          onClick={restartGame}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer inline-flex"
        >
          <RotateCcw className="text-white" />
        </button>
      </div>



      <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0 min-w-0 px-4 gap-4 pb-12 sm:pb-4 pointer-events-auto">
        <div className="w-full max-w-[min(90vw,calc(100vh-320px),600px)] flex flex-col gap-3 relative">
          
          {/* Timer Top - Enemy */}
          <div className={`transition-all duration-300 flex items-center justify-between p-3 sm:p-4 bg-[#1a1f2e] rounded-xl w-full ${game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'border-2 border-[#ff4b4b] shadow-[0_0_20px_rgba(255,75,75,0.2)] opacity-100' : 'border border-white/10 opacity-70'}`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white border border-white/20 shadow-inner transition-colors duration-300 ${game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'bg-gradient-to-br from-red-900 to-black' : 'bg-gradient-to-br from-gray-800 to-black'}`}>
                 <Zap size={20} className={game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'text-[#ff4b4b] animate-pulse' : 'text-white/50'} />
              </div>
              <span className={`font-bold uppercase text-sm sm:text-base tracking-wider ${game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'text-white' : 'text-white/50'}`}>{playMode === 'multiplayer' ? 'Gegner' : 'Bot'}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock size={16} className={`hidden sm:block transition-colors duration-300 ${game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'text-[#ff4b4b] animate-spin-slow' : 'text-white/30'}`} style={game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? { animationDuration: '3s' } : {}} />
              <div className={`text-xl sm:text-3xl font-mono font-bold transition-colors duration-300 bg-black/50 px-3 py-1 rounded-lg border border-white/5 ${(playerColor === 'w' ? blackTime : whiteTime) < 60 ? 'text-[#ff4b4b]' : game.turn() === (playerColor === 'w' ? 'b' : 'w') && timerActive ? 'text-white' : 'text-white/70'}`}>
                {formatTime(playerColor === 'w' ? blackTime : whiteTime)}
              </div>
            </div>
          </div>

          {/* Board */}
          <div className="w-full aspect-square flex justify-center items-center rounded-xl overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)] border-4 border-[#8B5A2B] relative">
             <AnimatePresence>
               {!gameStarted && (
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="absolute inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
                 >
                    <div className="bg-[#1a1f2e] border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl flex flex-col gap-6 w-11/12 max-w-sm text-center">
                      <h3 className="text-2xl font-black text-white">Neues Spiel</h3>
                      
                      {!playMode && (
                        <div className="flex flex-col gap-4">
                          <button onClick={() => setPlayMode('bot')} className="py-4 w-full bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all text-white border border-white/10">
                            Gegen Bot spielen
                          </button>
                          <button onClick={() => setPlayMode('multiplayer')} className="py-4 w-full bg-play-blue hover:scale-105 rounded-xl font-black text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-black cursor-pointer">
                            Multiplayer
                          </button>
                        </div>
                      )}

                      {playMode === 'multiplayer' && (
                        <div className="flex flex-col gap-4">
                           {!room ? (
                             <>
                               <input 
                                  type="text" 
                                  placeholder="Dein Name" 
                                  value={playerName} 
                                  onChange={e => setPlayerName(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-play-blue"
                               />
                               <button 
                                 onClick={() => {
                                   if (!playerName) return alert('Bitte Namen eingeben!');
                                   socket.emit('create-chess-room', (res: any) => {
                                     setRoom({ code: res.code, players: [{ name: playerName, color: 'w' }] });
                                     setPlayerColor('w');
                                   });
                                 }}
                                 className="py-3 w-full bg-play-blue hover:scale-105 rounded-xl font-bold transition-all text-black cursor-pointer"
                               >
                                 Raum erstellen
                               </button>
                               <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    placeholder="Code" 
                                    value={joinCode} 
                                    onChange={e => setJoinCode(e.target.value.toUpperCase())}
                                    className="w-1/2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center uppercase"
                                 />
                                 <button 
                                   onClick={() => {
                                      if (!playerName || !joinCode) return alert('Name & Code eingeben!');
                                      socket.emit('join-chess-room', { code: joinCode, name: playerName }, (res: any) => {
                                        if (res.error) alert(res.error);
                                        else {
                                          setRoom(res.room);
                                          setPlayerColor('b');
                                        }
                                      });
                                   }}
                                   className="w-1/2 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all text-white cursor-pointer"
                                 >
                                   Beitreten
                                 </button>
                               </div>
                               <button onClick={() => setPlayMode(null)} className="text-sm text-white/50 hover:text-white mt-2 cursor-pointer">Zurück</button>
                             </>
                           ) : (
                             <>
                               <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                  <p className="text-white/50 text-sm mb-1">Raum Code:</p>
                                  <p className="text-3xl font-mono font-bold tracking-widest text-play-blue">{room.code}</p>
                               </div>
                               <div className="flex flex-col gap-2">
                                 {room.players?.map((p: any, i: number) => (
                                   <div key={i} className="bg-white/5 p-3 rounded-lg flex items-center gap-3">
                                     <User size={16} className={p.color === 'w' ? 'text-white' : 'text-gray-400'} />
                                     <span className="font-bold">{p.name} {p.color === playerColor ? '(Du)' : ''}</span>
                                   </div>
                                 ))}
                               </div>
                               
                               {room.players?.length === 2 && playerColor === 'w' && (
                                 <div className="mt-4 flex flex-col gap-2">
                                   <p className="text-white/50 text-sm font-bold uppercase tracking-wider mb-2">{t.timeLimit}</p>
                                   <div className="flex gap-2 w-full flex-wrap justify-center mb-4">
                                     {[15, 180, 300, 600].map((limit) => (
                                       <button
                                         key={limit}
                                         onClick={() => {
                                           setInitialTime(limit);
                                           setWhiteTime(limit);
                                           setBlackTime(limit);
                                         }}
                                         className={`flex-[1_0_calc(50%-0.5rem)] py-2 px-1 rounded-xl font-bold text-sm transition-all sm:text-base ${
                                           initialTime === limit 
                                             ? 'bg-play-blue text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                                             : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                         }`}
                                       >
                                         {limit === 15 ? `15 ${t.sec}` : limit === 180 ? `3 ${t.min}` : limit === 300 ? `5 ${t.min}` : `10 ${t.min}`}
                                       </button>
                                     ))}
                                   </div>
                                   <button 
                                     onClick={() => {
                                       socket.emit('chess-start', { code: room.code, timeLimit: initialTime });
                                     }}
                                     className="py-4 w-full bg-play-blue hover:scale-105 rounded-xl font-black text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-black cursor-pointer"
                                   >
                                     {t.startGame}
                                   </button>
                                 </div>
                               )}
                               {room.players?.length < 2 && (
                                 <p className="text-white/50 text-sm animate-pulse mt-2">{t.waitOpponent}</p>
                               )}
                               {playerColor === 'b' && room.players?.length === 2 && (
                                 <p className="text-white/50 text-sm animate-pulse mt-2">{t.waitHost}</p>
                               )}
                             </>
                           )}
                        </div>
                      )}

                      {playMode === 'bot' && (
                        <>
                          <div className="flex flex-col gap-2">
                            <p className="text-white/50 text-sm font-bold uppercase tracking-wider mb-2">{t.timeLimit}</p>
                            <div className="flex gap-2 w-full flex-wrap justify-center">
                              {[15, 180, 300, 600].map((limit) => (
                                <button
                                  key={limit}
                                  onClick={() => {
                                    setInitialTime(limit);
                                    setWhiteTime(limit);
                                    setBlackTime(limit);
                                  }}
                                  className={`flex-[1_0_calc(50%-0.5rem)] py-2 px-1 rounded-xl font-bold text-sm transition-all sm:text-base ${
                                    initialTime === limit 
                                      ? 'bg-play-blue text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {limit === 15 ? `15 ${t.sec}` : limit === 180 ? `3 ${t.min}` : limit === 300 ? `5 ${t.min}` : `10 ${t.min}`}
                                </button>
                              ))}
                            </div>
                          </div>
      
                          <div className="flex flex-col gap-2">
                            <p className="text-white/50 text-sm font-bold uppercase tracking-wider mb-2">{t.botDifficulty}</p>
                            <div className="flex gap-2 w-full">
                              {[0, 1, 2].map((lvl) => (
                                <button
                                  key={lvl}
                                  onClick={() => setDifficulty(lvl)}
                                  className={`flex-1 py-3 px-1 rounded-xl font-bold text-sm transition-all sm:text-base ${
                                    difficulty === lvl 
                                      ? 'bg-play-blue text-black shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                  }`}
                                >
                                  {lvl === 0 ? t.easy : lvl === 1 ? t.medium : t.hard}
                                </button>
                              ))}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setGameStarted(true);
                              setTimerActive(true);
                            }}
                            className="mt-2 py-4 w-full bg-play-blue hover:scale-105 rounded-xl font-black text-xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] text-black cursor-pointer"
                          >
                            {t.startGame}
                          </button>
                          <button onClick={() => setPlayMode(null)} className="text-sm text-white/50 hover:text-white cursor-pointer mt-2">{t.return}</button>
                        </>
                      )}
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
             
             {(gameEnded && game.isCheckmate()) && (
               <div className="absolute inset-0 z-50 pointer-events-none shadow-[inset_0_0_100px_rgba(255,0,0,0.4)]" />
             )}
            <Chessboard 
              options={{
                id: "BasicBoard",
                position: game.fen(),
                onPieceDrop: onDrop,
                onSquareClick: onSquareClick,
                boardOrientation: playerColor === 'b' ? 'black' : 'white',
                darkSquareStyle: { backgroundColor: '#b58863' },
                lightSquareStyle: { backgroundColor: '#f0d9b5' },
                animationDurationInMs: 250,
                squareStyles: currentSquareStyles,
              }}
            />
          </div>

          {/* Timer Bottom - Player */}
          <div className={`transition-all duration-300 flex items-center justify-between p-3 sm:p-4 bg-[#1a1f2e] rounded-xl w-full ${game.turn() === playerColor && timerActive ? 'border-2 border-play-blue shadow-[0_0_20px_rgba(59,130,246,0.2)] opacity-100' : 'border border-white/10 opacity-70'}`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-black border border-white/20 shadow-inner transition-colors duration-300 ${game.turn() === playerColor && timerActive ? 'bg-gradient-to-br from-white to-gray-300' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}>
                 <User size={20} className={game.turn() === playerColor && timerActive ? 'text-black' : 'text-gray-200'} />
              </div>
              <span className={`font-bold uppercase text-sm sm:text-base tracking-wider ${game.turn() === playerColor && timerActive ? 'text-white' : 'text-white/50'}`}>Spieler</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock size={16} className={`hidden sm:block transition-colors duration-300 ${game.turn() === playerColor && timerActive ? 'text-play-blue animate-spin-slow' : 'text-white/30'}`} style={game.turn() === playerColor && timerActive ? { animationDuration: '3s' } : {}} />
              <div className={`text-xl sm:text-3xl font-mono font-bold transition-colors duration-300 bg-black/50 px-3 py-1 rounded-lg border border-white/5 ${(playerColor === 'w' ? whiteTime : blackTime) < 60 ? 'text-[#ff4b4b]' : game.turn() === playerColor && timerActive ? 'text-white' : 'text-white/70'}`}>
                 {formatTime(playerColor === 'w' ? whiteTime : blackTime)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
