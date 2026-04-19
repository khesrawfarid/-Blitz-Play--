import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import http from "http";

dotenv.config();

// Multiplayer Quiz State
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

const rooms = new Map<string, Room>();

const QUESTION_BANK: Record<string, any[]> = {
  general: [
    { q: "Welches Tier ist am schnellsten?", options: ["Gepard", "Falke", "Schwertfisch", "Pferd"], a: "Falke" },
    { q: "Wer malte die Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], a: "Leonardo da Vinci" },
    { q: "Was ist die Hauptstadt von Australien?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], a: "Canberra" },
    { q: "Wie viele Planeten hat unser Sonnensystem?", options: ["7", "8", "9", "10"], a: "8" },
    { q: "In welchem Jahr fiel die Berliner Mauer?", options: ["1987", "1989", "1990", "1991"], a: "1989" },
    { q: "Was ist das chemische Symbol für Gold?", options: ["Ag", "Au", "Go", "Gd"], a: "Au" }
  ],
  geography: [
    { q: "Welcher ist der längste Fluss der Erde?", options: ["Nil", "Amazonas", "Jangtsekiang", "Mississippi"], a: "Nil" },
    { q: "In welchem Ozean liegen die Hawaii-Inseln?", options: ["Atlantik", "Indischer Ozean", "Pazifik", "Arktischer Ozean"], a: "Pazifik" },
    { q: "Welches Land hat die meisten Einwohner?", options: ["Indien", "China", "USA", "Indonesien"], a: "Indien" },
    { q: "Welches ist das größte Land der Welt nach Fläche?", options: ["Kanada", "USA", "China", "Russland"], a: "Russland" },
    { q: "Was ist die Hauptstadt von Japan?", options: ["Seoul", "Peking", "Tokio", "Osaka"], a: "Tokio" }
  ],
  gaming: [
    { q: "Welches war die erste Heimkonsole von Nintendo?", options: ["SNES", "Nintendo 64", "GameCube", "NES"], a: "NES" },
    { q: "Was baut man in Minecraft als erstes ab?", options: ["Stein", "Holz", "Erde", "Eisen"], a: "Holz" },
    { q: "Aus welchem Spiel stammt der Charakter 'Master Chief'?", options: ["Call of Duty", "Gears of War", "Halo", "Destiny"], a: "Halo" },
    { q: "Wie heißt das Spiel mit den fallenden Blöcken?", options: ["Tetris", "Pong", "Pac-Man", "Breakout"], a: "Tetris" },
    { q: "Welche Firma entwickelte 'The Witcher'?", options: ["Bethesda", "BioWare", "CD Projekt Red", "Ubisoft"], a: "CD Projekt Red" }
  ],
  'flags-europe': [
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/de.png", options: ["Belgien", "Deutschland", "Österreich", "Schweiz"], a: "Deutschland" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/fr.png", options: ["Niederlande", "Frankreich", "Russland", "Italien"], a: "Frankreich" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/it.png", options: ["Italien", "Irland", "Ungarn", "Spanien"], a: "Italien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/es.png", options: ["Portugal", "Spanien", "Griechenland", "Rumänien"], a: "Spanien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/gb.png", options: ["USA", "Australien", "Großbritannien", "Neuseeland"], a: "Großbritannien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ch.png", options: ["Schweiz", "Dänemark", "Schweden", "Norwegen"], a: "Schweiz" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/se.png", options: ["Finnland", "Schweden", "Ukraine", "Island"], a: "Schweden" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/gr.png", options: ["Zypern", "Griechenland", "Kroatien", "Bulgarien"], a: "Griechenland" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/nl.png", options: ["Niederlande", "Luxemburg", "Frankreich", "Belgien"], a: "Niederlande" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/pl.png", options: ["Polen", "Österreich", "Indonesien", "Monaco"], a: "Polen" }
  ],
  'flags-asia': [
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/jp.png", options: ["Südkorea", "China", "Japan", "Vietnam"], a: "Japan" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/cn.png", options: ["Vietnam", "Türkei", "China", "Taiwan"], a: "China" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/in.png", options: ["Indien", "Pakistan", "Nepal", "Bangladesch"], a: "Indien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/kr.png", options: ["Japan", "Nordkorea", "Südkorea", "Laos"], a: "Südkorea" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/th.png", options: ["Thailand", "Indonesien", "Kambodscha", "Malaysia"], a: "Thailand" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/vn.png", options: ["China", "Vietnam", "Philippinen", "Myanmar"], a: "Vietnam" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/id.png", options: ["Japan", "Indonesien", "Polen", "Oman"], a: "Indonesien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ph.png", options: ["Tschechien", "Puerto Rico", "Philippinen", "Malaysia"], a: "Philippinen" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/tr.png", options: ["Türkei", "Tunesien", "Pakistan", "Aserbaidschan"], a: "Türkei" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/sa.png", options: ["Saudi-Arabien", "Irak", "Iran", "Ägypten"], a: "Saudi-Arabien" }
  ],
  'flags-americas': [
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/us.png", options: ["Großbritannien", "Australien", "Kanada", "USA"], a: "USA" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ca.png", options: ["Kanada", "Peru", "Chile", "Schweiz"], a: "Kanada" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/br.png", options: ["Argentinien", "Brasilien", "Bolivien", "Ecuador"], a: "Brasilien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/mx.png", options: ["Ungarn", "Italien", "Mexiko", "Peru"], a: "Mexiko" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ar.png", options: ["Uruguay", "Honduras", "Argentinien", "Guatemala"], a: "Argentinien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/co.png", options: ["Ecuador", "Kolumbien", "Venezuela", "Rumänien"], a: "Kolumbien" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/cl.png", options: ["Texas", "Kuba", "Panama", "Chile"], a: "Chile" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/cu.png", options: ["Kuba", "Puerto Rico", "Bahamas", "Jamaika"], a: "Kuba" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/pe.png", options: ["Peru", "Kanada", "Österreich", "Mexiko"], a: "Peru" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/uy.png", options: ["Argentinien", "Uruguay", "Chile", "Paraguay"], a: "Uruguay" }
  ],
  'flags-africa': [
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/za.png", options: ["Südafrika", "Kenia", "Nigeria", "Ghana"], a: "Südafrika" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/eg.png", options: ["Syrien", "Ägypten", "Irak", "Jemen"], a: "Ägypten" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ng.png", options: ["Pakistan", "Nigeria", "Kamerun", "Senegal"], a: "Nigeria" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ke.png", options: ["Tansania", "Kenia", "Sambia", "Uganda"], a: "Kenia" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ma.png", options: ["Vietnam", "Türkei", "Marokko", "Tunesien"], a: "Marokko" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/gh.png", options: ["Ghana", "Senegal", "Mali", "Togo"], a: "Ghana" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/cm.png", options: ["Kamerun", "Simbabwe", "Angola", "Nigeria"], a: "Kamerun" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/ci.png", options: ["Irland", "Italien", "Elfenbeinküste", "Mali"], a: "Elfenbeinküste" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/sn.png", options: ["Kamerun", "Senegal", "Ghana", "Mali"], a: "Senegal" },
    { q: "Zu welchem Land gehört diese Flagge?", img: "https://flagcdn.com/w320/dz.png", options: ["Pakistan", "Algerien", "Ägypten", "Tunesien"], a: "Algerien" }
  ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  app.use(express.json());

  // Socket.IO Logic
  io.on("connection", (socket) => {
    socket.on("create-party", (callback) => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      socket.join(code);
      const room: Room = {
        code,
        hostId: socket.id,
        players: [],
        state: 'lobby',
        currentQuestion: 0,
        questions: []
      };
      rooms.set(code, room);
      callback({ code });
    });

    socket.on("join-party", ({ code, name }, callback) => {
      const room = rooms.get(code);
      if (!room) return callback({ error: "Code ungültig!" });
      if (room.state !== 'lobby') return callback({ error: "Spiel läuft bereits!" });
      if (room.players.find(p => p.name === name)) return callback({ error: "Name schon vergeben!" });

      socket.join(code);
      room.players.push({ id: socket.id, name, score: 0, hasAnswered: false });
      io.to(code).emit("room-update", room);
      callback({ success: true, room });
    });

    socket.on("start-game", (data) => {
      let code, topic;
      if (typeof data === 'string') {
        code = data;
        topic = 'general';
      } else if (data) {
        code = data.code;
        topic = data.topic;
      } else {
        return;
      }

      const room = rooms.get(code);
      if (room && room.hostId === socket.id) {
        
        let selectedQuestions = [];
        if (topic === 'flags-all') {
          selectedQuestions = [
            ...(QUESTION_BANK['flags-europe'] || []),
            ...(QUESTION_BANK['flags-asia'] || []),
            ...(QUESTION_BANK['flags-americas'] || []),
            ...(QUESTION_BANK['flags-africa'] || [])
          ];
        } else {
          selectedQuestions = QUESTION_BANK[topic] || QUESTION_BANK['general'];
        }
        
        // Shuffle and pick 5 questions max
        selectedQuestions = [...selectedQuestions].sort(() => 0.5 - Math.random()).slice(0, 5);

        room.questions = selectedQuestions;
        room.state = 'playing';
        io.to(code).emit("room-update", room);
      }
    });

    socket.on("submit-answer", ({ code, answer, timeRemaining }) => {
      const room = rooms.get(code);
      if (room && room.state === 'playing') {
        const player = room.players.find(p => p.id === socket.id);
        if (player && !player.hasAnswered) {
          player.hasAnswered = true;
          const currentQ = room.questions[room.currentQuestion];
          if (answer === currentQ.a) {
            player.score += Math.round(100 + (timeRemaining * 10)); // Reward fast answers
          }
          
          io.to(code).emit("room-update", room);

          // Check if all players have answered
          if (room.players.every(p => p.hasAnswered)) {
            room.state = 'leaderboard';
            io.to(code).emit("room-update", room);

            setTimeout(() => {
              const currentRoom = rooms.get(code);
              if (currentRoom && currentRoom.state === 'leaderboard') {
                if (currentRoom.currentQuestion < currentRoom.questions.length - 1) {
                  currentRoom.currentQuestion++;
                  currentRoom.players.forEach(p => p.hasAnswered = false);
                  currentRoom.state = 'playing';
                } else {
                  currentRoom.state = 'finished';
                }
                io.to(code).emit("room-update", currentRoom);
              }
            }, 5000);
          }
        }
      }
    });

    socket.on("disconnect", () => {
      rooms.forEach((room, code) => {
        if (room.hostId === socket.id) {
          // Host left, end game
          io.to(code).emit("party-closed");
          rooms.delete(code);
        } else {
          // Player left
          const idx = room.players.findIndex(p => p.id === socket.id);
          if (idx !== -1) {
            room.players.splice(idx, 1);
            io.to(code).emit("room-update", room);
          }
        }
      });
    });
  });

  // Google Site Verification Route
  app.get("/google7c842860a3292c60.html", (req, res) => {
    res.send("google-site-verification: google7c842860a3292c60.html");
  });

  // API route for generation
  app.get("/api/debug-key", (req, res) => {
    res.json({
      gemini: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : "none",
      google: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 5) : "none",
      api: process.env.API_KEY ? process.env.API_KEY.substring(0, 5) : "none",
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
