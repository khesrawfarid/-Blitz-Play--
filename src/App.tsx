import { useState, useEffect, FormEvent, Fragment } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Trash2,
  X,
  Home
} from 'lucide-react';
import { translations, Language } from './translations';
import PartyGame from './components/PartyGame';
import TowerDefenseGame from './components/TowerDefense';

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
const ALL_IQ_QUESTIONS = [
  { q: "Was ist das nächste Element: 2, 4, 8, 16, ...?", options: ["32", "24", "18", "64"], a: "32", img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wenn alle A auch B sind und einige B auch C sind, sind dann einige A auch C?", options: ["Ja", "Nein", "Bestimmbar"], a: "Bestimmbar", img: "https://images.unsplash.com/photo-1532622784046-b247b4e72a85?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welche Zahl passt nicht in die Reihe? 3, 5, 7, 9, 11, 13", options: ["3", "7", "9", "11"], a: "9", img: "https://images.unsplash.com/photo-1549466827-023a1a1f9e98?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Schläger und ein Ball kosten zusammen 1.10$. Der Schläger kostet 1.00$ mehr als der Ball. Wie viel kostet der Ball?", options: ["0.10$", "0.05$", "0.15$", "1.00$"], a: "0.05$", img: "https://images.unsplash.com/photo-1508344928928-7137b29de216?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wenn 5 Maschinen in 5 Minuten 5 Teile herstellen, wie lange brauchen 100 Maschinen für 100 Teile?", options: ["100 Minuten", "50 Minuten", "5 Minuten", "1 Minute"], a: "5 Minuten", img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welches Wort passt nicht zu den anderen?", options: ["Apfel", "Banane", "Karotte", "Mango"], a: "Karotte", img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein See ist mit Seerosen bedeckt. Jeden Tag verdoppelt sich die Fläche. Es dauert 48 Tage, bis der See voll ist. Wann war er halb voll?", options: ["Tag 24", "Tag 47", "Tag 26", "Tag 46"], a: "Tag 47", img: "https://images.unsplash.com/photo-1463130456064-96fe74ef43d3?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wenn du von 100 immer wieder 7 abziehst, was ist die kleinste positive Zahl, die du erreichst?", options: ["1", "2", "3", "4"], a: "2", img: "https://images.unsplash.com/photo-1612440317336-da229ca2e4c8?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welcher Tag ist der Tag nach dem Tag vor gestern, wenn morgen Sonntag ist?", options: ["Donnerstag", "Freitag", "Samstag", "Mittwoch"], a: "Freitag", img: "https://images.unsplash.com/photo-1506784951206-3827ec318e80?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welche Zahl kommt als nächstes: 1, 1, 2, 3, 5, 8, 13, ...?", options: ["18", "21", "24", "15"], a: "21", img: "https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welches Wort bedeutet das Gegenteil von 'stets'?", options: ["Immer", "Oft", "Manchmal", "Nie"], a: "Nie", img: "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Arzt gibt dir 3 Tabletten, du sollst jede halbe Stunde eine nehmen. Wie lange reichen sie?", options: ["1 Stunde", "1.5 Stunden", "2 Stunden", "3 Stunden"], a: "1 Stunde", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Quadrat hat wie viele Symmetrieachsen?", options: ["2", "4", "8", "Unendlich"], a: "4", img: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welche Form fügt sich logisch in diese Reihe ein: Dreieck, Viereck, Fünfeck, ...?", options: ["Kreis", "Sechseck", "Oval", "Achteck"], a: "Sechseck", img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wie viele Monate haben 28 Tage?", options: ["1", "Alle 12", "Keiner", "6"], a: "Alle 12", img: "https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Vater ist 4 mal so alt wie sein Sohn. In 20 Jahren wird er doppelt so alt sein. Wie alt ist der Vater jetzt?", options: ["40", "32", "48", "60"], a: "40", img: "https://images.unsplash.com/photo-1506869640319-a1a19d192f15?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Finde die fehlende Zahl: 2, 6, 12, 20, 30, ...?", options: ["42", "40", "38", "36"], a: "42", img: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Alle Hunde sind Tiere. Alle Tiere atmen. Atmen alle Hunde?", options: ["Ja", "Nein", "Bestimmbar"], a: "Ja", img: "https://images.unsplash.com/photo-1532622784046-b247b4e72a85?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Bauer hat 17 Schafe. Alle bis auf 9 sterben. Wie viele Schafe hat der Bauer noch?", options: ["17", "9", "8", "0"], a: "9", img: "https://images.unsplash.com/photo-1518133835878-5a93cc3f89e5?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Du nimmst an einem Rennen teil. Du überholst den Zweiten. An welcher Position bist du jetzt?", options: ["Erster", "Zweiter", "Dritter", "Letzter"], a: "Zweiter", img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Was wird nass, wenn es trocknet?", options: ["Handtuch", "Wasser", "Sonne", "Wind"], a: "Handtuch", img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Jeder in einer Gruppe von 5 Personen schüttelt jedem anderen genau einmal die Hand. Wie viele Händedrücke gibt es?", options: ["10", "15", "20", "25"], a: "10", img: "https://images.unsplash.com/photo-1584824486516-0555a07fc511?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Was gehört dir, wird aber von anderen mehr benutzt als von dir?", options: ["Geld", "Dein Name", "Auto", "Haus"], a: "Dein Name", img: "https://images.unsplash.com/photo-1612440317336-da229ca2e4c8?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Mann hat 5 Töchter. Jede Tochter hat einen Bruder. Wie viele Kinder hat der Mann?", options: ["5", "6", "10", "11"], a: "6", img: "https://images.unsplash.com/photo-1463130456064-96fe74ef43d3?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Welches Tier passt nicht in die Reihe: Hai, Wal, Delfin, Orca?", options: ["Hai", "Wal", "Delfin", "Orca"], a: "Hai", img: "https://images.unsplash.com/photo-1506869640319-a1a19d192f15?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Eine Flasche und ein Korken kosten 1.10$. Die Flasche kostet 1.00$ mehr als der Korken. Wie viel kostet der Korken?", options: ["0.05$", "0.10$", "1.00$", "1.05$"], a: "0.05$", img: "https://images.unsplash.com/photo-1508344928928-7137b29de216?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Was hat Städte, aber keine Häuser; Wälder, aber keine Bäume; Wasser, aber keine Fische?", options: ["Karte", "Traum", "Buch", "Weltraum"], a: "Karte", img: "https://images.unsplash.com/photo-1532622784046-b247b4e72a85?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Ein Schneck kriecht einen 10 Meter tiefen Brunnen hoch. Am Tag schafft er 3 Meter, in der Nacht rutscht er 2 Meter ab. Wie viele Tage braucht er?", options: ["8", "10", "7", "9"], a: "8", img: "https://images.unsplash.com/photo-1549466827-023a1a1f9e98?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wenn du ein Streichholz hast und in einen dunklen Raum mit einer Öllampe, einem Kamin und einer Kerze kommst, was zündest du zuerst an?", options: ["Kerze", "Kamin", "Öllampe", "Streichholz"], a: "Streichholz", img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&q=80&w=600&h=300" },
  { q: "Wie viele 9en gibt es zwischen 1 und 100?", options: ["10", "11", "19", "20"], a: "20", img: "https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&q=80&w=600&h=300" }
];

const INITIAL_GAMES: Game[] = [
  { id: 'party', title: 'Party Quiz (Online)', thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400&h=250', genre: 'party', difficulty: 'easy', isAI: false, isMultiplayer: true },
  { id: '1', title: 'Blitz Clicker', thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=400&h=250', genre: 'speed', difficulty: 'easy', isAI: false, isMultiplayer: false },
  { id: '2', title: 'Neon Memory', thumbnail: '/neon-memory.svg', genre: 'puzzle', difficulty: 'medium', isAI: true, isMultiplayer: false },
  { id: '7', title: 'Math Blitz', thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&q=80&w=400&h=250', genre: 'puzzle', difficulty: 'medium', isAI: false, isMultiplayer: false },
  { id: '8', title: 'Reaction Master', thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&q=80&w=400&h=250', genre: 'speed', difficulty: 'hard', isAI: false, isMultiplayer: true },
  { id: '9', title: 'Tower Defense', thumbnail: '/tower-defense.svg', genre: 'battle', difficulty: 'medium', isAI: false, isMultiplayer: false },
  { id: 'iq', title: 'IQ Test', thumbnail: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=400&h=250', genre: 'puzzle', difficulty: 'hard', isAI: true, isMultiplayer: false },
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
  const isPlayable = ['1', '2', '7', '8', '9', 'iq', 'party'].includes(game.id) || game.isAI;

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
        {game.isAI && onDelete && !['1', '2', '7', '8', '9', 'worldfront', 'iq'].includes(game.id) && (
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-md p-1.5 rounded-md text-white transition-colors z-10"
          >
            <Trash2 size={14} />
          </button>
        )}
        {game.isMultiplayer && (
          <div className="absolute top-2 left-2 bg-play-blue/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Users size={12} /> Online
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
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [footerModal, setFooterModal] = useState<'privacy' | 'terms' | 'support' | 'api' | null>(null);

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
    setGenerationError(null);
    
    try {
      const resp = await fetch("/api/generate-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || `Server returned ${resp.status}`);
      }

      const result = await resp.json();
      
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
    } catch (error: any) {
      console.error("Error generating game:", error);
      setIsGenerating(false);
      setGenerationError(error.message || "Failed to generate game");
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

    // IQ Game State
    const [iqQuestionIdx, setIqQuestionIdx] = useState(0);
    const [currentIqQuestions, setCurrentIqQuestions] = useState(ALL_IQ_QUESTIONS.slice(0, 15));
    const [usedIqQuestions, setUsedIqQuestions] = useState<string[]>([]);

    // AI Game State
    const [fallingObjects, setFallingObjects] = useState<{id: number, x: number, y: number, emoji: string}[]>([]);

    useEffect(() => {
      let timer: any;
      if (isPlaying && timeLeft > 0 && !['iq', 'party', '9'].includes(game.id)) {
        timer = setInterval(() => {
          setTimeLeft(prev => prev - 1);
        }, 1000);
      } else if (timeLeft === 0 && !['iq', 'party', '9'].includes(game.id)) {
        setIsPlaying(false);
      }
      return () => clearInterval(timer);
    }, [isPlaying, timeLeft, game.id]);

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
        setReactionState('idle'); // Pause timer
        alert(t.tooEarly);
        setTimeout(() => {
          if (document.visibilityState === 'visible') { // basic check
            setReactionState('waiting');
          }
        }, 100);
      } else if (reactionState === 'ready') {
        const time = Date.now() - reactionStartTime;
        setReactionTime(time);
        setReactionState('result');
        setScore(Math.max(0, 1000 - time));
      }
    };

    const startGame = () => {
      setScore(0);
      setTimeLeft(game.id === '2' ? 60 : ['iq', 'party', '8', '9'].includes(game.id) ? -1 : 15);
      setIsPlaying(true);
      if (game.id === '1') spawnTarget();
      if (game.id === '2') initMemory();
      if (game.id === '7') generateProblem();
      if (game.id === '8') {
        setReactionState('waiting');
        setReactionTime(0);
      }
      if (game.id === 'iq') {
        let availableQs = ALL_IQ_QUESTIONS.filter(q => !usedIqQuestions.includes(q.q));
        if (availableQs.length < 15) {
          setUsedIqQuestions([]);
          availableQs = [...ALL_IQ_QUESTIONS];
        }
        const shuffled = availableQs.sort(() => 0.5 - Math.random()).slice(0, 15);
        setCurrentIqQuestions(shuffled);
        setUsedIqQuestions(prev => [...prev, ...shuffled.map(q => q.q)]);
        setIqQuestionIdx(0);
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
            
            {!isPlaying && (timeLeft > 0 || ['iq', 'party', '8', '9'].includes(game.id)) && (
              <div className="relative z-10 text-center">
                {['1', '2', '7', '8', '9', 'iq', 'party'].includes(game.id) || game.isAI ? (
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
                      {game.id === '9' && "Verteidige deine Basis vor Feinden!"}
                      {game.id === 'iq' && "Beantworte die Logikfragen!"}
                      {game.id === 'party' && "Erstelle eine Party und spiele live mit Freunden!"}
                      {game.isAI && !['1','2','7','8','9','iq','party'].includes(game.id) && "Fange die fallenden Objekte!"}
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
                {game.id !== 'party' && game.id !== '8' && game.id !== '9' && (
                  <>
                    <div className="absolute top-4 left-4 text-2xl font-black text-play-blue">SCORE: {score}</div>
                    {game.id !== 'iq' && (
                      <div className="absolute top-4 right-4 text-2xl font-black text-play-pink">TIME: {timeLeft}s</div>
                    )}
                  </>
                )}
                
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

                {game.isAI && !['1','2','7','8','9','worldfront','iq','party'].includes(game.id) && (
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
                      {reactionState === 'waiting' && <h3 className="text-4xl font-black">{t.waitGreen}</h3>}
                      {reactionState === 'ready' && <h3 className="text-6xl font-black text-black">{t.clickNow}</h3>}
                      {reactionState === 'result' && (
                        <div>
                          <h3 className="text-4xl font-black mb-4">{t.reactionTime}</h3>
                          <div className="text-7xl font-black text-play-blue drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]">{reactionTime} ms</div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startGame(); }}
                            className="mt-8 px-10 py-5 bg-play-blue text-black font-black text-xl hover:scale-105 rounded-2xl transition-transform shadow-[0_0_20px_rgba(59,130,246,0.3)] pointer-events-auto"
                          >
                            {t.tryAgain}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {game.id === '9' && (
                  <TowerDefenseGame onExit={() => { setScore(0); setIsPlaying(false); onClose(); }} t={t} />
                )}
                {game.id === 'party' && (
                  <PartyGame onExit={() => { setScore(0); setIsPlaying(false); onClose(); }} t={t} />
                )}

                {game.id === 'iq' && (
                  <div className="w-full h-full flex flex-col items-center justify-between p-4 sm:p-8 text-center relative z-10">
                    <div className="w-full flex-grow flex flex-col items-center justify-center max-w-4xl px-2 sm:px-4">
                      <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-2xl">
                        {currentIqQuestions[iqQuestionIdx]?.q}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-3xl pb-4 sm:pb-8">
                      {currentIqQuestions[iqQuestionIdx]?.options?.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            if (opt === currentIqQuestions[iqQuestionIdx]?.a) {
                              setScore(prev => prev + 200);
                            }
                            if (iqQuestionIdx < currentIqQuestions.length - 1) {
                              setIqQuestionIdx(prev => prev + 1);
                            } else {
                              setTimeLeft(0);
                              setIsPlaying(false);
                            }
                          }}
                          className="group relative p-4 sm:p-6 bg-white/5 hover:bg-play-blue/10 border border-white/5 hover:border-play-blue/50 rounded-2xl font-bold transition-all duration-300 hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center justify-center overflow-hidden min-h-[80px]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-play-blue/0 via-play-blue/10 to-play-blue/0 opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000"></div>
                          <span className="text-base sm:text-lg text-white/80 group-hover:text-white transition-colors relative z-10 px-8">
                            {opt}
                          </span>
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/5 font-black text-4xl group-hover:text-play-blue/20 transition-colors">
                            {i + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {timeLeft === 0 && !['party', '8', '9'].includes(game.id) && (
              <div className="relative z-10 text-center">
                <h3 className={`text-5xl font-black mb-4 ${game.id === 'iq' ? 'text-play-blue glow-blue' : 'text-blitz-yellow glow-yellow'}`}>
                  {game.id === 'iq' ? t.testEnded : t.gameOver}
                </h3>
                
                {game.id === 'iq' ? (
                  <div className="mb-8">
                    <p className="text-xl text-white/70 mb-2">{t.estimatedIQ}</p>
                    <div className="text-8xl font-black text-white glow-blue mb-2">
                      {Math.floor(70 + (score / 200) * 9)}
                    </div>
                    <p className="text-sm text-white/50">
                      {t.questionsAnswered} {score / 200} {t.outOf} {currentIqQuestions.length} {t.questionsAnswered2}
                    </p>
                  </div>
                ) : (
                  <div className="text-3xl font-bold mb-8">
                    {t.yourScore} <span className="text-play-blue">{score}</span>
                  </div>
                )}
                
                <button 
                  onClick={startGame}
                  className="px-8 py-4 rounded-2xl font-bold transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {t.tryAgain}
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
                
                <div className="flex flex-col xl:flex-row gap-4 min-w-0 max-w-full">
                  <div className="relative shrink-0 w-full sm:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                    <input 
                      type="text" 
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 pr-6 h-12 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-play-blue transition-colors w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden custom-scrollbar pb-3 min-w-0 w-full">
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
                        className={`h-12 px-6 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 border flex shrink-0 items-center justify-center ${
                          filter === f.id 
                            ? 'bg-play-blue text-white border-play-blue box-glow-blue' 
                            : 'bg-white/5 text-white/60 hover:bg-white/10 border-white/10 hover:text-white hover:border-white/20'
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
                  <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center font-bold break-words">
                    {t.generateError}: {generationError}
                  </div>
                )}
              </div>

              <div className="mt-12 grid grid-cols-2 gap-6">
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-play-blue">
                    <Users size={16} /> {t.multiplayerMode}
                  </h4>
                  <p className="text-xs text-white/40">{t.multiplayerDesc}</p>
                </div>
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                  <h4 className="font-bold mb-2 flex items-center gap-2 text-blitz-yellow">
                    <Flame size={16} /> {t.blitzMode}
                  </h4>
                  <p className="text-xs text-white/40">{t.blitzModeDesc}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedGame && <GameView game={selectedGame} onClose={() => setSelectedGame(null)} />}
        </AnimatePresence>

        <AnimatePresence>
          {footerModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setFooterModal(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-[#0a0f1a] border border-white/10 p-8 rounded-3xl max-w-lg w-full relative shadow-2xl"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute -inset-10 bg-play-blue/20 blur-3xl rounded-full opacity-50 z-0 pointer-events-none"></div>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFooterModal(null);
                  }}
                  className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors z-[60] cursor-pointer"
                >
                  <X size={20} className="pointer-events-none" />
                </button>
                <div className="relative z-10">
                  <h2 className="text-2xl font-black mb-4 capitalize text-white">
                    {footerModal === 'api' ? 'API Documentation' : footerModal}
                  </h2>
                  <div className="text-white/60 space-y-4">
                    <div className="text-white/60 space-y-4 text-sm max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                      {footerModal === 'privacy' && (
                        <>
                          <h3 className="text-white font-bold mb-2">{t.privacyTitle}</h3>
                          <p>{t.privacy1}</p>
                          <h4 className="text-white font-bold mt-4 mb-2">{t.privacy2}</h4>
                          <p>{t.privacy3}</p>
                          <p className="mt-2">{t.privacy4}</p>
                          <h4 className="text-white font-bold mt-4 mb-2">{t.privacy5}</h4>
                          <p>{t.privacy6}</p>
                          <p className="mt-2">{t.privacy7}</p>
                        </>
                      )}
                      {footerModal === 'terms' && (
                        <>
                          <h3 className="text-white font-bold mb-2">{t.termsTitle}</h3>
                          <p>{t.terms1}</p>
                          
                          <h4 className="text-white font-bold mt-4 mb-2">{t.terms2}</h4>
                          <p>{t.terms3}</p>
                          <p>{t.terms4.split('\n').map((line: string, i: number) => <Fragment key={i}>{line}<br/></Fragment>)}</p>
                          <p>{t.terms5.split('\n').map((line: string, i: number) => <Fragment key={i}>{line}<br/></Fragment>)}</p>

                          <h4 className="text-white font-bold mt-4 mb-2">{t.terms6}</h4>
                          <p>{t.terms7}</p>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            <li>{t.terms8}</li>
                            <li>{t.terms9}</li>
                            <li>{t.terms10}</li>
                          </ul>
                        </>
                      )}
                      {footerModal === 'support' && <p>{t.supportText}</p>}
                      {footerModal === 'api' && <p>{t.apiText}</p>}
                    </div>
                    <button 
                      onClick={() => {
                        setFooterModal(null);
                        setPage('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="mt-8 font-bold bg-play-blue/10 text-play-blue border border-play-blue/20 hover:bg-play-blue hover:text-black px-6 py-4 rounded-xl transition-all flex items-center gap-3 w-full justify-center group"
                    >
                      <Home size={18} className="group-hover:scale-110 transition-transform" /> 
                      {t.backToHome}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <Logo size="sm" />
          <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-4 text-white/40 text-sm font-bold uppercase tracking-widest">
            <button onClick={() => setFooterModal('privacy')} className="hover:text-white transition-colors">{t.privacy}</button>
            <button onClick={() => setFooterModal('terms')} className="hover:text-white transition-colors">{t.terms}</button>
            <button onClick={() => setFooterModal('support')} className="hover:text-white transition-colors">{t.support}</button>
            <button onClick={() => setFooterModal('api')} className="hover:text-white transition-colors">{t.api}</button>
          </div>
          <p className="text-white/20 text-xs text-center md:text-left mt-4 md:mt-0">© 2026 BlitzPlay. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
