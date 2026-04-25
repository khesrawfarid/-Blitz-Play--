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
    socket = io("https://blitzplaygame.onrender.com");

    socket.on('room-update', (r: Room) => {
      setRoom(r);
      if (r.state === 'playing' && !selectedAnswer) {
        setTimeLeft(15);
        setSelectedAnswer(null);
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

  useEffect(() => {
    if (room?.state === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (
      room?.state === 'playing' &&
      timeLeft === 0 &&
      !selectedAnswer &&
      !isHost
    ) {
      if (socket && room) {
        socket.emit('submit-answer', {
          code: room.code,
          answer: '',
          timeRemaining: 0
        });
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

        socket?.emit(
          'join-party',
          {
            code: res.code,
            name: playerName
          },
          (joinRes: any) => {
            if (joinRes.error) setError(joinRes.error);
          }
        );
      }
    });
  };

  const handleJoinParty = () => {
    let playerName = name.trim();

    if (!playerName) {
      playerName = 'Player' + Math.floor(Math.random() * 1000);
      setName(playerName);
    }

    if (!joinCode) {
      setError('Error: No Code');
      return;
    }

    socket?.emit(
      'join-party',
      {
        code: joinCode.toUpperCase(),
        name: playerName
      },
      (res: any) => {
        if (res.error) setError(res.error);
      }
    );
  };

  return (
    <div className="w-full h-full flex flex-col justify-center items-center p-6 space-y-8 relative z-10">
      <h2 className="text-4xl font-black text-white">
        Party Mode ⚡
      </h2>

      {error && (
        <div className="text-red-400 font-bold">
          {error}
        </div>
      )}

      <input
        type="text"
        placeholder="Dein Spielername"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="p-3 rounded-xl"
      />

      <input
        type="text"
        placeholder="Code"
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
        maxLength={4}
        className="p-3 rounded-xl text-center"
      />

      <button
        onClick={handleJoinParty}
        className="px-6 py-3 bg-white text-black rounded-xl font-bold"
      >
        Beitreten
      </button>

      <button
        onClick={handleCreateParty}
        className="px-6 py-3 bg-cyan-400 text-black rounded-xl font-bold"
      >
        Party erstellen
      </button>

      <button
        onClick={onExit}
        className="px-6 py-3 bg-red-500 text-white rounded-xl font-bold"
      >
        Zurück
      </button>
    </div>
  );
}
