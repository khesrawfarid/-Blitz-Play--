import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Trophy, Users, Play, LogOut, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

let socket: Socket | null = null;

interface Player {
  id: string;
  name: string;
  score: number;
  hasAnswered: boolean;
}

interface Room {
  code: string;
  hostId: string;
  players: Player[];
  state: 'lobby' | 'playing' | 'leaderboard' | 'finished';
  currentQuestion: number;
  questions: any[];
}

export default function PartyGame({ onExit, t }: { onExit: () => void, t: any }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  useEffect(() => {
    // Determine the socket URL. Since we are in the same environment (port 3000 serves both), we can connect relatively.
    socket = io();

    socket.on('room-update', (r: Room) => {
      setRoom(r);
      if (r.state === 'playing' && !selectedAnswer) {
        setTimeLeft(15);
        setSelectedAnswer(null); // Reset for new question
      }
    });

    socket.on('party-closed', () => {
      alert(t.partyClosed);
      onExit();
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [t]);

  // Timer logic for questions
  useEffect(() => {
    if (room?.state === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (room?.state === 'playing' && timeLeft === 0 && !selectedAnswer && !isHost) {
       // time's up, auto-submit empty or wrong
       if (socket && room) {
           socket.emit('submit-answer', { code: room.code, answer: '', timeRemaining: 0 });
           setSelectedAnswer('');
       }
    }
  }, [room?.state, timeLeft, selectedAnswer, isHost]);

  const handleCreateParty = () => {
    let playerName = name.trim();
    if (!playerName) {
      playerName = 'Host';
      setName(playerName);
    }
    setIsHost(true);
    socket?.emit('create-party', (res: any) => {
      if (res.code) {
        setJoinCode(res.code);
        socket?.emit('join-party', { code: res.code, name: playerName }, (joinRes: any) => {
          if (joinRes.error) setError(joinRes.error);
        });
      }
    });
  };

  const handleJoinParty = () => {
    let playerName = name.trim();
    if (!playerName) {
      playerName = 'Player' + Math.floor(Math.random()*1000);
      setName(playerName);
    }
    if (!joinCode) return setError('Error: No Code');
    socket?.emit('join-party', { code: joinCode.toUpperCase(), name: playerName }, (res: any) => {
      if (res.error) setError(res.error);
    });
  };

  const [selectedTopic, setSelectedTopic] = useState('general');
  const [selectedSubTopic, setSelectedSubTopic] = useState('flags-all');

  const TOPICS = [
    { id: 'general', name: 'Allgemein', img: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'geography', name: 'Geografie', img: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'gaming', name: 'Gaming', img: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=200&h=200' },
    { id: 'flags', name: 'Flaggen', img: 'https://images.unsplash.com/photo-1538681105587-85640961bf8b?auto=format&fit=crop&q=80&w=200&h=200' }
  ];

  const startGame = () => {
    if (room?.code) {
      const finalTopic = selectedTopic === 'flags' ? selectedSubTopic : selectedTopic;
      socket?.emit('start-game', { code: room.code, topic: finalTopic });
    }
  };

  const submitAnswer = (answer: string) => {
    if (selectedAnswer || !socket || !room) return;
    setSelectedAnswer(answer);
    socket.emit('submit-answer', { code: room.code, answer, timeRemaining: timeLeft });
  };

  if (!room) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 space-y-8 relative z-10">
        <h2 className="text-4xl font-black text-white drop-shadow-lg mb-8">Party Mode <span className="text-blitz-yellow">⚡</span></h2>
        
        <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-4">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">{error}</div>}
          
          <input 
            type="text" 
            placeholder="Dein Spielername" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-play-blue"
          />
          
          <div className="h-px w-full bg-white/10 my-4"></div>
          
          <input 
            type="text" 
            placeholder="Code" 
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={4}
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-center tracking-widest font-mono font-bold uppercase focus:outline-none focus:border-play-blue"
          />
          
          <button 
            onClick={handleJoinParty}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl transition-colors mt-2"
          >
            {t.joinParty}
          </button>

          <div className="text-center text-white/30 text-sm my-2">{t.or}</div>

          <button 
            onClick={handleCreateParty}
            className="w-full bg-play-blue text-black font-black py-4 rounded-xl hover:scale-105 transition-transform"
          >
            {t.hostParty}
          </button>
        </div>
      </div>
    );
  }

  const myPlayerInfo = room.players.find(p => p.id === socket?.id);

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-8 relative z-10 overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center bg-black/40 p-4 rounded-2xl border border-white/10 mb-8 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="text-sm text-white/50">{t.partyCode}</div>
          <div className="text-3xl font-mono font-black text-blitz-yellow tracking-widest">{room.code}</div>
        </div>
        <div className="text-white/80 font-bold flex gap-4 items-center">
          <Users size={20} className="text-play-blue"/> 
          {room.players.length} {t.players}
          <button onClick={onExit} className="ml-4 p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {room.state === 'lobby' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <h2 className="text-3xl font-bold text-white mb-8">{t.waitPlayers}</h2>
          <div className="flex flex-wrap gap-4 justify-center max-w-2xl">
            <AnimatePresence>
              {room.players.map(p => (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  key={p.id} 
                  className="px-6 py-3 bg-white/10 border border-white/20 rounded-2xl text-white font-bold text-lg flex items-center gap-2"
                >
                  {p.id === room.hostId && <Trophy size={16} className="text-blitz-yellow" />}
                  {p.name}
                  {p.id === socket?.id && <span className="text-xs text-white/40 ml-2">({t.you})</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {isHost && (
            <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-3xl">
              <div className="flex flex-col items-center gap-4 w-full">
                <label className="text-white/60 font-bold text-sm uppercase tracking-wider">{t.chooseTopic}</label>
                <div className="flex flex-row justify-center gap-4 flex-wrap">
                  {TOPICS.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`relative overflow-hidden rounded-2xl border-4 transition-all duration-300 w-32 h-32 group hover:scale-105 ${
                        selectedTopic === topic.id ? 'border-play-blue shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={topic.img} alt={topic.name} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                      <span className="absolute bottom-3 left-0 w-full text-center font-black text-white text-sm drop-shadow-md px-1">
                        {topic.name}
                      </span>
                      {selectedTopic === topic.id && (
                        <div className="absolute top-2 right-2 text-play-blue drop-shadow-md bg-white rounded-full">
                          <CheckCircle2 size={24} fill="currentColor" className="text-black" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {selectedTopic === 'flags' && (
                  <div className="mt-6 flex flex-col items-center gap-2 animate-in fade-in zoom-in duration-300">
                    <label className="text-white/60 font-bold text-sm uppercase tracking-wider">{t.continent}</label>
                    <select
                      value={selectedSubTopic}
                      onChange={(e) => setSelectedSubTopic(e.target.value)}
                      className="bg-black/60 border border-white/10 text-white font-bold text-lg rounded-xl px-6 py-3 cursor-pointer outline-none focus:border-play-blue appearance-none text-center min-w-[250px]"
                    >
                      <option value="flags-all">🌐 {t.worldwide}</option>
                      <option value="flags-europe">🌍 {t.europe}</option>
                      <option value="flags-asia">🌏 {t.asia}</option>
                      <option value="flags-americas">🌎 {t.americas}</option>
                      <option value="flags-africa">🌍 {t.africa}</option>
                    </select>
                  </div>
                )}
              </div>

              <button 
                onClick={startGame}
                disabled={room.players.length < 1}
                className="mt-6 px-12 py-4 bg-play-blue text-black font-black text-xl rounded-2xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-3 shadow-[0_0_30px_rgba(33,245,188,0.5)]"
              >
                <Play fill="currentColor" /> {t.startParty}
              </button>
            </div>
          )}
        </div>
      )}

      {room.state === 'playing' && (
        <div className="flex-1 flex flex-col items-center justify-between">
          <div className="w-full flex justify-between items-center mb-4 px-4">
            <div className="text-play-blue font-mono font-bold">{t.question} {room.currentQuestion + 1} / {room.questions.length}</div>
            <div className="text-2xl font-black text-blitz-yellow flex items-center gap-2">
              <Clock size={24} /> {timeLeft}s
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center w-full px-4 mb-8">
            <h3 className="text-3xl sm:text-5xl font-black text-white text-center leading-tight drop-shadow-2xl">
              {room.questions?.[room.currentQuestion]?.q || "..." }
            </h3>
            {room.questions?.[room.currentQuestion]?.img && (
              <img 
                src={room.questions[room.currentQuestion].img} 
                alt="Image" 
                className="mt-6 w-64 h-auto rounded-lg shadow-[0_0_20px_rgba(255,255,255,0.2)] object-cover border border-white/10"
                referrerPolicy="no-referrer"
              />
            )}
          </div>

          {!isHost || myPlayerInfo ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl pb-8">
              {room.questions?.[room.currentQuestion]?.options?.map((opt: string, i: number) => {
                const isSelected = selectedAnswer === opt;
                return (
                  <button
                    key={opt}
                    disabled={!!selectedAnswer}
                    onClick={() => submitAnswer(opt)}
                    className={`
                      relative overflow-hidden p-6 sm:p-8 rounded-2xl sm:rounded-3xl font-bold text-lg sm:text-xl transition-all duration-300 border-2
                      ${isSelected ? 'bg-play-blue/20 border-play-blue text-white scale-[0.98]' : 'bg-[#0a0f1a]/80 border-white/5 text-white/80 hover:bg-white/5 hover:border-white/20'}
                      ${selectedAnswer && !isSelected ? 'opacity-50' : 'opacity-100'}
                    `}
                  >
                    {opt}
                    {isSelected && <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-play-blue/20 w-32 h-32" />}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-white/50 text-xl pb-16"></div>
          )}
          
          {selectedAnswer && (
             <div className="text-play-blue font-bold animate-pulse pb-4">{t.waitPlayers}</div>
          )}
        </div>
      )}

      {room.state === 'leaderboard' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <h2 className="text-4xl font-black text-white mb-8 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{t.leaderboard}</h2>
          
          <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-2 border border-white/10 mb-8">
            {room.players.sort((a,b) => b.score - a.score).map((p, i) => (
              <div key={p.id} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-black ${i===0?'text-blitz-yellow':i===1?'text-gray-400':i===2?'text-amber-600':'text-white/20'}`}>
                    #{i+1}
                  </span>
                  <span className="text-xl font-bold text-white flex items-center gap-2">
                    {p.name} {p.id === socket?.id && `(${t.you})`}
                    {i === 0 && <Trophy className="text-blitz-yellow" size={20} />}
                  </span>
                </div>
                <div className="text-xl font-mono text-play-blue">{p.score} pt</div>
              </div>
            ))}
          </div>

          <div className="text-play-blue animate-pulse font-bold text-xl">{t.waitNextRound}</div>
        </div>
      )}

      {room.state === 'finished' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
          <Trophy className="w-32 h-32 text-blitz-yellow mb-6 drop-shadow-[0_0_30px_rgba(247,214,48,0.5)]" />
          <h2 className="text-5xl font-black text-white mb-8">{t.endResults}</h2>
          
          <div className="w-full bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 mb-8 text-center space-y-4">
            {room.players.sort((a,b) => b.score - a.score).slice(0,3).map((p, i) => (
              <div key={p.id} className={`flex justify-between items-center ${i===0?'text-3xl font-black text-blitz-yellow': i===1?'text-2xl font-bold text-gray-300':'text-xl font-bold text-amber-500'}`}>
                <span className="flex items-center gap-2">
                  {i+1}. {p.name}
                  {i === 0 && <Trophy fill="currentColor" size={28} className="text-blitz-yellow" />}
                </span>
                <span>{p.score} pt</span>
              </div>
            ))}
          </div>
          
          <button 
             onClick={onExit}
             className="px-8 py-4 bg-play-blue text-black font-black rounded-xl"
          >
             {t.backToHome}
          </button>
        </div>
      )}

    </div>
  );
}
