import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  Zap, 
  Gamepad2, 
  PlusCircle, 
  Trophy, 
  User, 
  Search, 
  Filter, 
  Globe, 
  Star, 
  Users, 
  Cpu, 
  ChevronRight,
  Play,
  Dices,
  Flame,
  Clock,
  LayoutGrid,
  Trash2
} from 'lucide-react';
import { translations, Language } from './translations';

// --- Types ---
interface Game {
  id: string;
  title: string;
  thumbnail: string;
  genre: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isAI: boolean;
  isMultiplayer: boolean;
  htmlCode?: string;
}

// --- Mock Data ---
const INITIAL_GAMES: Game[] = [
  { id: '1', title: 'Blitz Clicker', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250', genre: 'speed', difficulty: 'easy', isAI: false, isMultiplayer: false },
  { id: '2', title: 'Neon Memory', thumbnail: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=400&h=250', genre: 'puzzle', difficulty: 'medium', isAI: true, isMultiplayer: false },
  { id: '7', title: 'Math Blitz', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400&h=250', genre: 'puzzle', difficulty: 'medium', isAI: false, isMultiplayer: false },
  { id: '8', title: 'Reaction Master', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400&h=250', genre: 'speed', difficulty: 'hard', isAI: false, isMultiplayer: true },
  { id: 'worldfront', title: 'WorldFront', thumbnail: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=400&h=250', genre: 'battle', difficulty: 'hard', isAI: false, isMultiplayer: false },
];

// --- Components ---

const Logo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizes = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-7xl"
  };
  
  return (
    <motion.div 
      className={`flex items-center font-black tracking-tighter ${sizes[size]}`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <motion.div
        animate={{ 
          filter: ["drop-shadow(0 0 2px #facc15)", "drop-shadow(0 0 10px #facc15)", "drop-shadow(0 0 2px #facc15)"],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <Zap className="text-blitz-yellow fill-blitz-yellow mr-1" size={size === "lg" ? 80 : size === "md" ? 40 : 24} />
      </motion.div>
      <span className="text-white">Blitz</span>
      <motion.span 
        className="text-play-blue glow-blue"
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Play
      </motion.span>
    </motion.div>
  );
};

const GameCard = ({ game, t, onClick, onDelete }: { game: Game, t: any, onClick: () => void, onDelete?: () => void, key?: string }) => {
  const isPlayable = ['1', '2', '7', '8'].includes(game.id) || game.isAI;

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 ${isPlayable ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:shadow-play-blue/20' : 'opacity-70 cursor-not-allowed'}`}
      style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
      onClick={() => isPlayable && onClick()}
    >
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={game.thumbnail} 
          alt={game.title} 
          className={`w-full h-full object-cover transition-transform duration-500 game-image ${isPlayable ? 'group-hover:scale-110' : 'grayscale'}`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/400x250/0b0f1a/3b82f6?text=${game.title}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isPlayable && (
            <motion.div
              initial={{ scale: 0 }}
              whileHover={{ scale: 1 }}
              className="bg-blitz-yellow p-4 rounded-full text-black box-glow-yellow"
            >
              <Play fill="currentColor" size={24} />
            </motion.div>
          )}
        </div>
        
        {!isPlayable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-2">
              <Clock className="text-white/50" size={32} />
              <span className="font-bold text-white/80 uppercase tracking-widest text-sm">{t.comingSoon}</span>
            </div>
          </div>
        )}

        {game.isAI && (
          <div className="absolute top-2 left-2 bg-play-pink/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Cpu size={12} /> AI
          </div>
        )}
        {game.isAI && onDelete && !['1', '2', '7', '8', 'worldfront'].includes(game.id) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md p-1.5 rounded-md text-white transition-colors z-10"
          >
            <Trash2 size={14} />
          </button>
        )}
        {game.isMultiplayer && (
          <div className="absolute top-2 left-2 bg-play-blue/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Users size={12} /> 1v1
          </div>
        )}
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-lg group-hover:text-play-blue transition-colors">{game.title}</h3>
        </div>
        <div className="flex gap-2 mt-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 uppercase font-bold tracking-widest">
            {t[game.genre]}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-widest ${
            game.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
            game.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {t[game.difficulty]}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState<Language>('de');
  const [page, setPage] = useState<'home' | 'games' | 'create'>('home');
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gamesList, setGamesList] = useState<Game[]>(INITIAL_GAMES);
  
  // AI Creator State
  const [aiTitle, setAiTitle] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenre, setAiGenre] = useState('speed');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [useAiImage, setUseAiImage] = useState(true);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [generationError, setGenerationError] = useState(false);

  const t = translations[lang];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const filteredGames = gamesList.filter(g => {
    const matchesFilter = filter === 'all' || g.genre === filter || (filter === 'ai' && g.isAI) || (filter === 'multi' && g.isMultiplayer);
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleGenerateGame = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setGenerationError(false);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Create a simple, playable HTML5 game based on this prompt: "${aiPrompt}". 
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
            required: ["htmlCode", "imagePrompt"]
          }
        }
      });

      let responseText = response.text || "{}";
      responseText = responseText.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
      const result = JSON.parse(responseText);
      
      const newGame: Game = {
        id: Date.now().toString(),
        title: aiTitle.trim() || (aiPrompt.split(' ').slice(0, 2).join(' ') + ' AI'),
        thumbnail: useAiImage && result.imagePrompt ? `https://image.pollinations.ai/prompt/${encodeURIComponent(result.imagePrompt)}` : (customImage || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=400&h=250'),
        genre: aiGenre,
        difficulty: aiDifficulty as any,
        isAI: true,
        isMultiplayer: false,
        htmlCode: result.htmlCode
      };
      
      setGamesList([newGame, ...gamesList]);
      setIsGenerating(false);
      setAiPrompt('');
      setAiTitle('');
      setCustomImage(null);
      setPage('games');
    } catch (error) {
      console.error("Error generating game:", error);
      setIsGenerating(false);
      setGenerationError(true);
    }
  };

  const GameView = ({ game, onClose }: { game: Game, onClose: () => void }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
    
    // Memory Game State
    const [cards, setCards] = useState<{id: number, val: string, flipped: boolean, matched: boolean}[]>([]);
    const [flipped, setFlipped] = useState<number[]>([]);

    // Math Game State
    const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', ans: 0 });
    const [input, setInput] = useState('');

    // AI Game State
    const [fallingObjects, setFallingObjects] = useState<{id: number, x: number, y: number, emoji: string}[]>([]);

    useEffect(() => {
      let timer: any;
      if (isPlaying && timeLeft > 0) {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (timeLeft === 0) {
        setIsPlaying(false);
      }
      return () => clearInterval(timer);
    }, [isPlaying, timeLeft]);

    useEffect(() => {
      let frame: number;
      let lastSpawn = 0;
      const isCustomAI = game.isAI && !['1','2','7','8','worldfront'].includes(game.id);
      
      if (isPlaying && isCustomAI) {
        const loop = (time: number) => {
          if (time - lastSpawn > (game.difficulty === 'hard' ? 400 : game.difficulty === 'medium' ? 600 : 800)) {
            const emojis = game.genre === 'speed' ? ['⚡', '🚀', '🏎️'] : game.genre === 'puzzle' ? ['🧩', '🧠', '💡'] : ['⭐', '🍄', '🏃'];
            setFallingObjects(prev => [...prev, {
              id: Math.random(),
              x: Math.random() * 90,
              y: -10,
              emoji: emojis[Math.floor(Math.random() * emojis.length)]
            }]);
            lastSpawn = time;
          }
          setFallingObjects(prev => prev.map(obj => ({
            ...obj,
            y: obj.y + (game.difficulty === 'hard' ? 1.5 : game.difficulty === 'medium' ? 1 : 0.5)
          })).filter(obj => obj.y < 110));
          frame = requestAnimationFrame(loop);
        };
        frame = requestAnimationFrame(loop);
      }
      return () => cancelAnimationFrame(frame);
    }, [isPlaying, game]);

    const handleCatch = (id: number) => {
      setFallingObjects(prev => prev.filter(obj => obj.id !== id));
      setScore(s => s + 100);
    };

    const spawnTarget = () => {
      setTargetPos({
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10
      });
    };

    const generateProblem = () => {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      setProblem({ a, b, op: '+', ans: a + b });
      setInput('');
    };

    const initMemory = () => {
      const symbols = ['⚡', '🔥', '💎', '⭐', '🍀', '🍎'];
      const deck = [...symbols, ...symbols]
        .sort(() => Math.random() - 0.5)
        .map((val, i) => ({ id: i, val, flipped: false, matched: false }));
      setCards(deck);
      setFlipped([]);
    };

    const handleTargetClick = () => {
      if (!isPlaying) return;
      setScore(prev => prev + 100);
      spawnTarget();
    };

    const handleMemoryClick = (id: number) => {
      if (!isPlaying || flipped.length === 2 || cards[id].flipped || cards[id].matched) return;
      
      const newCards = [...cards];
      newCards[id].flipped = true;
      setCards(newCards);
      
      const newFlipped = [...flipped, id];
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        const [first, second] = newFlipped;
        if (cards[first].val === cards[second].val) {
          setTimeout(() => {
            const matchedCards = [...cards];
            matchedCards[first].matched = true;
            matchedCards[second].matched = true;
            setCards(matchedCards);
            setFlipped([]);
            setScore(prev => prev + 500);
            if (matchedCards.every(c => c.matched)) {
              setIsPlaying(false);
            }
          }, 500);
        } else {
          setTimeout(() => {
            const resetCards = [...cards];
            resetCards[first].flipped = false;
            resetCards[second].flipped = false;
            setCards(resetCards);
            setFlipped([]);
          }, 1000);
        }
      }
    };

    const handleMathSubmit = (e: FormEvent) => {
      e.preventDefault();
      if (parseInt(input) === problem.ans) {
        setScore(prev => prev + 200);
        generateProblem();
      } else {
        setInput('');
      }
    };

    // Reaction Game State
    const [reactionState, setReactionState] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
    const [reactionStartTime, setReactionStartTime] = useState(0);
    const [reactionTime, setReactionTime] = useState(0);

    useEffect(() => {
      let timer: any;
      if (reactionState === 'waiting') {
        const delay = Math.random() * 3000 + 2000;
        timer = setTimeout(() => {
          setReactionState('ready');
          setReactionStartTime(Date.now());
        }, delay);
      }
      return () => clearTimeout(timer);
    }, [reactionState]);

    const handleReactionClick = () => {
      if (reactionState === 'waiting') {
        setReactionState('idle');
        alert("Zu früh! Warte auf GRÜN.");
      } else if (reactionState === 'ready') {
        const time = Date.now() - reactionStartTime;
        setReactionTime(time);
        setReactionState('result');
        setScore(Math.max(0, 1000 - time));
      }
    };

    const startGame = () => {
      setScore(0);
      setTimeLeft(game.id === '2' ? 60 : 15);
      setIsPlaying(true);
      if (game.id === '1') spawnTarget();
      if (game.id === '2') initMemory();
      if (game.id === '7') generateProblem();
      if (game.id === '8') {
        setReactionState('waiting');
        setReactionTime(0);
      }
    };

    if (game.htmlCode) {
      return (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-bg-dark flex flex-col"
        >
          <div className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-black/50">
            <div className="flex items-center gap-4">
              <Zap className="text-blitz-yellow" size={20} />
              <h2 className="text-lg font-bold">{game.title}</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <PlusCircle className="rotate-45 text-white/60" size={28} />
            </button>
          </div>
          <div className="flex-1 relative">
            <iframe srcDoc={game.htmlCode} className="w-full h-full border-0 bg-white" title={game.title} sandbox="allow-scripts allow-same-origin" />
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-bg-dark/95 backdrop-blur-2xl flex flex-col"
      >
        <div className="h-20 px-8 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-4">
            <Zap className="text-blitz-yellow" size={24} />
            <h2 className="text-xl font-bold">{game.title}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <PlusCircle className="rotate-45 text-white/60" size={32} />
          </button>
        </div>
        <div className="flex-1 p-8 flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl aspect-video bg-black rounded-3xl border-4 border-white/5 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
              <img 
                src={game.thumbnail} 
                className="w-full h-full object-cover blur-3xl" 
                referrerPolicy="no-referrer" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://placehold.co/400x250/0b0f1a/3b82f6?text=BlitzPlay';
                }}
              />
            </div>
            
            {!isPlaying && timeLeft > 0 && (
              <div className="relative z-10 text-center">
                {['1', '2', '7', '8'].includes(game.id) || game.isAI ? (
                  <>
                    <button
                      onClick={startGame}
                      className="w-24 h-24 bg-blitz-yellow rounded-full flex items-center justify-center text-black mx-auto mb-6 box-glow-yellow cursor-pointer transition-transform hover:scale-110 active:scale-95"
                    >
                      <Play fill="currentColor" size={40} />
                    </button>
                    <h3 className="text-3xl font-black mb-2">Bereit für {game.title}?</h3>
                    <p className="text-white/40">
                      {game.id === '1' && "Klicke den Blitz so oft du kannst!"}
                      {game.id === '2' && "Finde alle Paare!"}
                      {game.id === '7' && "Löse die Rechenaufgaben!"}
                      {game.id === '8' && "Klicke, sobald es grün wird!"}
                      {game.isAI && !['1','2','7','8'].includes(game.id) && "Fange die fallenden Objekte!"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center text-white/50 mx-auto mb-6">
                      <Clock size={40} />
                    </div>
                    <h3 className="text-3xl font-black mb-2 text-white/50">Coming Soon</h3>
                    <p className="text-white/40">
                      Dieses Spiel wird bald verfügbar sein!
                    </p>
                  </>
                )}
              </div>
            )}

            {isPlaying && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="absolute top-4 left-4 text-2xl font-black text-play-blue">SCORE: {score}</div>
                <div className="absolute top-4 right-4 text-2xl font-black text-play-pink">TIME: {timeLeft}s</div>
                
                {game.id === '1' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    key={`${targetPos.x}-${targetPos.y}`}
                    style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-blitz-yellow rounded-full flex items-center justify-center text-black box-glow-yellow cursor-pointer"
                    onClick={handleTargetClick}
                  >
                    <Zap fill="currentColor" size={32} />
                  </motion.div>
                )}

                {game.id === '2' && (
                  <div className="grid grid-cols-4 gap-4 p-8">
                    {cards.map(card => (
                      <motion.div
                        key={card.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleMemoryClick(card.id)}
                        className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl cursor-pointer transition-all ${
                          card.flipped || card.matched ? 'bg-play-blue text-white box-glow-blue' : 'bg-white/10 text-transparent'
                        }`}
                      >
                        {card.val}
                      </motion.div>
                    ))}
                  </div>
                )}

                {game.id === '7' && (
                  <div className="text-center">
                    <div className="text-6xl font-black mb-8">{problem.a} {problem.op} {problem.b} = ?</div>
                    <form onSubmit={handleMathSubmit}>
                      <input 
                        autoFocus
                        type="number"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="bg-white/5 border-2 border-play-blue rounded-2xl px-6 py-4 text-4xl font-black text-center w-48 focus:outline-none box-glow-blue"
                      />
                    </form>
                  </div>
                )}

                {game.isAI && !['1','2','7','8','worldfront'].includes(game.id) && (
                  <div className="absolute inset-0 overflow-hidden">
                    {fallingObjects.map(obj => (
                      <motion.div
                        key={obj.id}
                        style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                        className="absolute text-5xl cursor-pointer hover:scale-110 transition-transform"
                        onClick={() => handleCatch(obj.id)}
                      >
                        {obj.emoji}
                      </motion.div>
                    ))}
                  </div>
                )}

                {game.id === '8' && (
                  <div 
                    onClick={handleReactionClick}
                    className={`w-full h-full flex items-center justify-center cursor-pointer transition-colors duration-200 ${
                      reactionState === 'waiting' ? 'bg-red-500/20' : 
                      reactionState === 'ready' ? 'bg-green-500' : 
                      'bg-white/5'
                    }`}
                  >
                    <div className="text-center pointer-events-none">
                      {reactionState === 'waiting' && <h3 className="text-4xl font-black">Warte auf GRÜN...</h3>}
                      {reactionState === 'ready' && <h3 className="text-6xl font-black text-black">KLICK JETZT!</h3>}
                      {reactionState === 'result' && (
                        <div>
                          <h3 className="text-4xl font-black mb-4">Reaktionszeit:</h3>
                          <div className="text-7xl font-black text-play-blue">{reactionTime}ms</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="mt-8 px-8 py-4 bg-white/10 hover:bg-white/20 rounded-2xl font-bold"
                          >
                            Nochmal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {timeLeft === 0 && (
              <div className="relative z-10 text-center">
                <h3 className="text-5xl font-black mb-4 text-blitz-yellow glow-yellow">GAME OVER!</h3>
                <div className="text-3xl font-bold mb-8">Dein Score: <span className="text-play-blue">{score}</span></div>
                <button 
                  onClick={startGame}
                  className="px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  Nochmal versuchen
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-bg-dark">
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          <Zap size={100} className="text-blitz-yellow fill-blitz-yellow glow-yellow" />
        </motion.div>
        <motion.div 
          className="mt-8 h-1 w-48 bg-white/10 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="h-full bg-blitz-yellow"
            animate={{ x: [-200, 200] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grid-lines">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-dark/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="cursor-pointer" onClick={() => setPage('home')}>
            <Logo size="sm" />
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            {[
              { id: 'home', icon: LayoutGrid, label: t.home },
              { id: 'games', icon: Gamepad2, label: t.games },
              { id: 'create', icon: PlusCircle, label: t.create },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setPage(item.id as any)}
                className={`flex items-center gap-2 font-bold transition-all hover:text-play-blue ${
                  page === item.id ? 'text-play-blue glow-blue' : 'text-white/60'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Globe size={20} className="text-white/80" />
              </button>
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-2 bg-bg-dark border border-white/10 rounded-xl overflow-hidden z-50"
                  >
                    {(['de', 'en', 'es', 'da'] as const).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setLang(l);
                          setIsLangOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-white/5 transition-colors ${lang === l ? 'text-play-blue' : 'text-white'}`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-4 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">
          {page === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center text-center py-12"
            >
              <Logo size="lg" />
              <motion.p 
                className="mt-6 text-2xl md:text-3xl font-medium text-white/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {t.slogan}
              </motion.p>
              <motion.p 
                className="mt-2 text-lg text-white/40 italic"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                {t.instantFun}
              </motion.p>

              <div className="mt-12 flex flex-col sm:flex-row gap-6">
                <button
                  onClick={() => setPage('games')}
                  className="px-10 py-5 bg-blitz-yellow text-black font-black text-xl rounded-2xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(250,204,21,0.4)]"
                >
                  <Play fill="currentColor" size={24} />
                  {t.playNow}
                </button>
                <button
                  onClick={() => {
                    setPage('games');
                    setTimeout(() => {
                      const randomGame = gamesList[Math.floor(Math.random() * gamesList.length)];
                      setSelectedGame(randomGame);
                    }, 100);
                  }}
                  className="px-10 py-5 border-2 border-white/20 text-white font-black text-xl rounded-2xl flex items-center gap-3 transition-all duration-200 hover:scale-105 active:scale-95 hover:bg-white/10"
                >
                  <Dices size={24} />
                  {t.randomGame}
                </button>
              </div>

              <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                {[
                  { icon: Flame, title: "Blitz Mode", desc: "Increasing speed for true pros." },
                  { icon: Cpu, title: "AI Games", desc: "Endless levels generated by AI." },
                  { icon: Users, title: "Multiplayer", desc: "Challenge your friends in 1v1." },
                ].map((feature, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + i * 0.1 }}
                    className="p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-play-blue/30 transition-colors"
                  >
                    <div className="w-12 h-12 bg-play-blue/20 rounded-xl flex items-center justify-center text-play-blue mb-4 mx-auto">
                      <feature.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-white/50">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {page === 'games' && (
            <motion.div
              key="games"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <h2 className="text-4xl font-black flex items-center gap-3">
                  <Gamepad2 className="text-play-blue" size={36} />
                  {t.games}
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="text" 
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-6 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-play-blue transition-colors w-full sm:w-64"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                    {[
                      { id: 'all', label: t.all },
                      { id: 'speed', label: t.speed },
                      { id: 'puzzle', label: t.puzzle },
                      { id: 'platformer', label: t.platformer },
                      { id: 'ai', label: t.aiGenerated },
                      { id: 'multi', label: t.multiplayer },
                    ].map(f => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                          filter === f.id ? 'bg-play-blue text-white box-glow-blue' : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredGames.map(game => (
                  <GameCard 
                    key={game.id} 
                    game={game} 
                    t={t} 
                    onClick={() => setSelectedGame(game)} 
                    onDelete={() => setGamesList(prev => prev.filter(g => g.id !== game.id))}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {page === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-3xl mx-auto"
            >
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-play-pink/20 rounded-3xl flex items-center justify-center text-play-pink mb-6 mx-auto box-glow-pink">
                  <Cpu size={40} />
                </div>
                <h2 className="text-4xl font-black mb-4">{t.createGame}</h2>
                <p className="text-white/50 text-lg">{t.createGameDesc}</p>
              </div>

              <div className="bg-white/5 p-8 rounded-3xl border border-white/10">
                <div className="mb-6">
                  <label className="block text-sm font-bold uppercase tracking-widest text-white/40 mb-3">{t.gameName}</label>
                  <input 
                    type="text"
                    value={aiTitle}
                    onChange={(e) => setAiTitle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-lg focus:outline-none focus:border-play-pink transition-colors"
                    placeholder={t.gameNamePlaceholder}
                  />
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold uppercase tracking-widest text-white/40 mb-3">{t.gameImage}</label>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setUseAiImage(true)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${useAiImage ? 'bg-play-pink text-white box-glow-pink' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >
                        {t.generateAiImage}
                      </button>
                      <button
                        onClick={() => setUseAiImage(false)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${!useAiImage ? 'bg-play-pink text-white box-glow-pink' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                      >
                        {t.uploadImage}
                      </button>
                    </div>
                    {!useAiImage && (
                      <div className="flex items-center gap-4">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (e) => setCustomImage(e.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-play-pink file:text-white hover:file:bg-play-pink/80"
                        />
                        {customImage && <img src={customImage} alt="Preview" className="w-16 h-16 object-cover rounded-xl border border-white/20" />}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-bold uppercase tracking-widest text-white/40 mb-3">{t.promptLabel}</label>
                  <textarea 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-6 text-lg focus:outline-none focus:border-play-pink transition-colors resize-none"
                    placeholder={t.promptPlaceholder}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">{t.genre}</label>
                    <select 
                      value={aiGenre}
                      onChange={(e) => setAiGenre(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none"
                    >
                      <option value="speed">{t.speed}</option>
                      <option value="puzzle">{t.puzzle}</option>
                      <option value="platformer">{t.platformer}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">{t.difficulty}</label>
                    <select 
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 focus:outline-none"
                    >
                      <option value="easy">{t.easy}</option>
                      <option value="medium">{t.medium}</option>
                      <option value="hard">{t.hard}</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleGenerateGame}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full py-5 bg-play-pink text-white font-black text-xl rounded-2xl flex items-center justify-center gap-3 disabled:opacity-50 transition-transform hover:scale-105 active:scale-95 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)]"
                >
                  {isGenerating ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Cpu size={24} />
                    </motion.div>
                  ) : <Zap size={24} />}
                  {isGenerating ? "Generiere..." : t.generate}
                </button>
                
                {generationError && (
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center font-bold">
                    {t.generateError}
                  </div>
                )}
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-play-blue">
                    <Users size={16} /> Multiplayer Mode
                  </h4>
                  <p className="text-xs text-white/40">Erstelle Spiele, die du direkt mit Freunden im 1v1 Duell spielen kannst.</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-blitz-yellow">
                    <Flame size={16} /> Blitz Mode
                  </h4>
                  <p className="text-xs text-white/40">Füge automatische Geschwindigkeitssteigerung für extra Nervenkitzel hinzu.</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedGame && <GameView game={selectedGame} onClose={() => setSelectedGame(null)} />}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo size="sm" />
          <div className="flex gap-8 text-white/40 text-sm font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-white transition-colors">API</a>
          </div>
          <p className="text-white/20 text-xs">© 2026 BlitzPlay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
