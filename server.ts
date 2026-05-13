import express from "express";
import cors from "cors";
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
  type?: 'quiz' | 'chess';
  code: string;
  hostId: string;
  players: Player[];
  state: 'lobby' | 'playing' | 'leaderboard' | 'finished';
  currentQuestion?: number;
  questions?: any[];
  chessState?: any;
}

const rooms = new Map<string, Room>();

const QUESTION_BANK: Record<string, any[]> = {
  general: [
    { q: "Welches Tier ist am schnellsten?", options: ["Gepard", "Falke", "Schwertfisch", "Pferd"], a: "Falke" },
    { q: "Wer malte die Mona Lisa?", options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"], a: "Leonardo da Vinci" },
    { q: "Was ist die Hauptstadt von Australien?", options: ["Sydney", "Melbourne", "Canberra", "Perth"], a: "Canberra" },
    { q: "Wie viele Planeten hat unser Sonnensystem?", options: ["7", "8", "9", "10"], a: "8" },
    { q: "In welchem Jahr fiel die Berliner Mauer?", options: ["1987", "1989", "1990", "1991"], a: "1989" },
    { q: "Was ist das chemische Symbol für Gold?", options: ["Ag", "Au", "Go", "Gd"], a: "Au" },
    { q: "Wer hat die Glühbirne kommerziell erfolgreich gemacht?", options: ["Nikola Tesla", "Thomas Edison", "Alexander Graham Bell", "Albert Einstein"], a: "Thomas Edison" },
    { q: "Welches ist das kleinste Land der Welt?", options: ["Monaco", "Vatikanstadt", "San Marino", "Liechtenstein"], a: "Vatikanstadt" }
  ],
  geography: [
    { q: "Welcher ist der längste Fluss der Erde?", options: ["Nil", "Amazonas", "Jangtsekiang", "Mississippi"], a: "Nil" },
    { q: "In welchem Ozean liegen die Hawaii-Inseln?", options: ["Atlantik", "Indischer Ozean", "Pazifik", "Arktischer Ozean"], a: "Pazifik" },
    { q: "Welches Land hat die meisten Einwohner?", options: ["Indien", "China", "USA", "Indonesien"], a: "Indien" },
    { q: "Welches ist das größte Land der Welt nach Fläche?", options: ["Kanada", "USA", "China", "Russland"], a: "Russland" },
    { q: "Was ist die Hauptstadt von Japan?", options: ["Seoul", "Peking", "Tokio", "Osaka"], a: "Tokio" },
    { q: "Welcher Kontinent ist der kälteste?", options: ["Europa", "Nordamerika", "Antarktika", "Asien"], a: "Antarktika" }
  ],
  gaming: [
    { q: "Welches war die erste Heimkonsole von Nintendo?", options: ["SNES", "Nintendo 64", "GameCube", "NES"], a: "NES" },
    { q: "Was baut man in Minecraft als erstes ab?", options: ["Stein", "Holz", "Erde", "Eisen"], a: "Holz" },
    { q: "Aus welchem Spiel stammt der Charakter 'Master Chief'?", options: ["Call of Duty", "Gears of War", "Halo", "Destiny"], a: "Halo" },
    { q: "Wie heißt das Spiel mit den fallenden Blöcken?", options: ["Tetris", "Pong", "Pac-Man", "Breakout"], a: "Tetris" },
    { q: "Welche Firma entwickelte 'The Witcher'?", options: ["Bethesda", "BioWare", "CD Projekt Red", "Ubisoft"], a: "CD Projekt Red" },
    { q: "Welches Videospiel-Franchise beinhaltet 'Pikachu'?", options: ["Digimon", "Pokémon", "Yu-Gi-Oh!", "Monster Hunter"], a: "Pokémon" }
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
  ],
  music: [
    { q: "Welcher Sänger ist als 'King of Pop' bekannt?", options: ["Elvis Presley", "Michael Jackson", "Prince", "Freddie Mercury"], a: "Michael Jackson" },
    { q: "Welches Instrument hat Tasten, Pedale und Saiten?", options: ["Gitarre", "Schlagzeug", "Klavier", "Harfe"], a: "Klavier" },
    { q: "Wer sang den Hit 'Rolling in the Deep'?", options: ["Adele", "Beyoncé", "Lady Gaga", "Rihanna"], a: "Adele" },
    { q: "Welche legendäre Band bestand aus John, Paul, George und Ringo?", options: ["The Rolling Stones", "The Who", "The Beatles", "Pink Floyd"], a: "The Beatles" },
    { q: "In welchem Jahrzehnt fand das Woodstock-Festival statt?", options: ["1950er", "1960er", "1970er", "1980er"], a: "1960er" },
    { q: "Welcher Komponist war am Ende seines Lebens taub?", options: ["Mozart", "Bach", "Beethoven", "Chopin"], a: "Beethoven" }
  ],
  movies: [
    { q: "Welcher Film hat das berühmte Zitat: 'Möge die Macht mit dir sein'?", options: ["Star Trek", "Star Wars", "Harry Potter", "Herr der Ringe"], a: "Star Wars" },
    { q: "Wer spielte den Jack Dawson in 'Titanic'?", options: ["Brad Pitt", "Tom Cruise", "Leonardo DiCaprio", "Johnny Depp"], a: "Leonardo DiCaprio" },
    { q: "Welcher Superheld wird von Bruce Wayne gespielt?", options: ["Superman", "Spider-Man", "Iron Man", "Batman"], a: "Batman" },
    { q: "Wie heißt das Zauberei-Internat in Harry Potter?", options: ["Hogwarts", "Beauxbatons", "Durmstrang", "Ilvermorny"], a: "Hogwarts" },
    { q: "Welcher Film gewann 2024 den Oscar als bester Film?", options: ["Oppenheimer", "Barbie", "Poor Things", "Dune 2"], a: "Oppenheimer" },
    { q: "In welchem Film spielt eine rote oder blaue Pille eine Hauptrolle?", options: ["Inception", "Matrix", "Interstellar", "Avatar"], a: "Matrix" }
  ],
  science: [
    { q: "Welches ist das härteste natürliche Material auf der Erde?", options: ["Gold", "Eisen", "Diamant", "Platin"], a: "Diamant" },
    { q: "Wie nennt man die Kraft, die uns auf der Erde hält?", options: ["Magnetismus", "Gravitation", "Reibung", "Zentrifugalkraft"], a: "Gravitation" },
    { q: "Welches Gas atmen Pflanzen bei der Fotosynthese ein?", options: ["Sauerstoff", "Stickstoff", "Helium", "Kohlendioxid"], a: "Kohlendioxid" },
    { q: "Was ist das Zentrum unseres Sonnensystems?", options: ["Die Erde", "Die Sonne", "Der Mond", "Der Jupiter"], a: "Die Sonne" },
    { q: "Aus wie vielen Knochen besteht das menschliche Skelett etwa?", options: ["150", "206", "250", "300"], a: "206" },
    { q: "Was studiert ein Mykologe?", options: ["Sterne", "Fische", "Pilze", "Insekten"], a: "Pilze" }
  ],
  sports: [
    { q: "Welches Land hat die meisten FIFA-Weltmeisterschaften gewonnen?", options: ["Deutschland", "Italien", "Brasilien", "Argentinien"], a: "Brasilien" },
    { q: "In welcher Sportart gibt es einen 'Touchdown'?", options: ["Rugby", "Basketball", "American Football", "Eishockey"], a: "American Football" },
    { q: "Wie oft finden die Olympischen Sommerspiele statt?", options: ["Alle 2 Jahre", "Alle 3 Jahre", "Alle 4 Jahre", "Alle 5 Jahre"], a: "Alle 4 Jahre" },
    { q: "Wer hält den Weltrekord im 100-Meter-Sprint?", options: ["Carl Lewis", "Tyson Gay", "Usain Bolt", "Yohan Blake"], a: "Usain Bolt" },
    { q: "Welcher Sport wird in Wimbledon gespielt?", options: ["Golf", "Tennis", "Polo", "Cricket"], a: "Tennis" },
    { q: "Wie viele Spieler pro Team sind beim Eishockey auf dem Eis?", options: ["5", "6", "7", "11"], a: "6" }
  ],
  history: [
    { q: "Wer war der erste Präsident der Vereinigten Staaten?", options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"], a: "George Washington" },
    { q: "In welchem Jahr begann der Zweite Weltkrieg?", options: ["1914", "1939", "1945", "1989"], a: "1939" },
    { q: "Wer entdeckte Amerika 1492?", options: ["Marco Polo", "Christoph Kolumbus", "James Cook", "Vasco da Gama"], a: "Christoph Kolumbus" },
    { q: "Welche antike Zivilisation baute die Pyramiden von Gizeh?", options: ["Römer", "Griechen", "Ägypter", "Mayas"], a: "Ägypter" },
    { q: "Wie hieß der berühmte Herrscher des antiken Roms, der 'Veni, vidi, vici' sagte?", options: ["Julius Cäsar", "Augustus", "Nero", "Caligula"], a: "Julius Cäsar" },
    { q: "Welche Mauer fiel im November 1989?", options: ["Chinesische Mauer", "Klostermauer", "Berliner Mauer", "Jerusalemer Stadtmauer"], a: "Berliner Mauer" },
    { q: "Wer war auch bekannt als 'Der Sonnenkönig'?", options: ["Heinrich VIII", "Karl der Große", "Ludwig XIV", "Philipp II"], a: "Ludwig XIV" },
    { q: "In welchem Land begann die industrielle Revolution?", options: ["Frankreich", "Deutschland", "Großbritannien", "USA"], a: "Großbritannien" }
  ]
};

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  app.use(cors());
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
      console.log("start-game data received:", data);
      if (typeof data === 'string') {
        code = data;
        topic = 'general';
      } else if (data) {
        code = data.code;
        topic = data.topic || 'general';
      } else {
        return;
      }
      console.log("Parsed code:", code, "topic:", topic);

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
        } else if (topic === 'mixed') {
          selectedQuestions = Object.keys(QUESTION_BANK).flatMap(k => QUESTION_BANK[k]);
        } else {
          selectedQuestions = QUESTION_BANK[topic] || QUESTION_BANK['general'];
        }
        
        console.log("Selected questions length:", selectedQuestions.length, "for topic:", topic, "did fallback to general?", !QUESTION_BANK[topic]);
        
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

    socket.on("create-chess-room", (callback) => {
      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      socket.join(code);
      const room: Room = {
        type: 'chess',
        code,
        hostId: socket.id,
        players: [],
        state: 'lobby',
        chessState: null
      };
      rooms.set(code, room);
      callback({ code });
    });

    socket.on("join-chess-room", ({ code, name }, callback) => {
      const room = rooms.get(code);
      if (!room) return callback({ error: "Code ungültig!" });
      if (room.type !== 'chess') return callback({ error: "Das ist kein Schach-Raum!" });
      if (room.state !== 'lobby') return callback({ error: "Spiel läuft bereits!" });
      if (room.players.length >= 2) return callback({ error: "Raum ist voll!" });

      socket.join(code);
      const color = room.players.length === 0 ? 'w' : 'b';
      room.players.push({ id: socket.id, name, score: 0, hasAnswered: false, color } as any);
      io.to(code).emit("chess-room-update", room);
      callback({ success: true, room });
    });

    socket.on("chess-start", ({ code, timeLimit }) => {
      const room = rooms.get(code);
      if (room && room.hostId === socket.id && room.players.length === 2) {
        room.state = 'playing';
        room.chessState = {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          timeLimit
        };
        io.to(code).emit("chess-start-game", room);
      }
    });

    socket.on("chess-move", ({ code, fen }) => {
      const room = rooms.get(code);
      if (room && room.state === 'playing') {
        room.chessState.fen = fen;
        socket.to(code).emit("chess-moved", { fen });
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
  app.post("/api/generate-game", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }

      // Read from process env (checking multiple possible names due to UI bug)
      const apiKey = process.env.MEIN_NEUER_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("your-api-key")) {
        console.error("GEMINI_API_KEY is not set correctly on the server.");
        res.status(500).json({ error: "API Key still set to placeholder 'MY_GEMINI_API_KEY'." });
        return;
      }
      
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Create a simple, playable HTML5 game based on this prompt: "${prompt}". 
        The game should be fully contained in a single HTML string (including CSS and JS). 
        It should be responsive, use modern graphics (canvas or DOM), and be playable with mouse/touch or keyboard.
        Also provide a short, descriptive prompt for an AI image generator to create a thumbnail for this game.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              htmlCode: {
                type: Type.STRING,
                description: "The complete HTML code for the game, including <style> and <script> tags."
              },
              imagePrompt: {
                type: Type.STRING,
                description: "A prompt for an image generator to create a thumbnail for this game."
              }
            },
            required: ["htmlCode", "imagePrompt"],
          }
        }
      });
      
      const rawText = response.text || "{}";
      const cleanedText = rawText.replace(/```json\n?|\n?```/g, "").trim();
      const generatedData = JSON.parse(cleanedText);      
      
      res.json(generatedData);
    } catch (error: any) {
      console.error("Gemini API Error:", error.message || error);
      res.status(500).json({ error: "Failed to generate game. " + (error.message || "") });
    }
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
    // Ensure assets are always served, even if the user's browser URL has a leftover base path like /BlitzPlayGame/
    app.use('/BlitzPlayGame/assets', express.static(path.join(distPath, 'assets')));
    app.use('/BlitzPlayGame', express.static(distPath));
    app.use('/assets', express.static(path.join(distPath, 'assets')));
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
