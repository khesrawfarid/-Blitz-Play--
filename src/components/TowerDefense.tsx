import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Coins, Heart, Play, RefreshCw, LogOut } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pathIndex: number;
  reward: number;
  slowTimer: number; // ms remaining
  slowFactor: number;
}

interface Tower {
  id: number;
  x: number;
  y: number;
  type: TowerType;
  range: number;
  damage: number;
  fireRate: number; // shots per ms
  lastFired: number;
  cost: number;
}

interface Projectile {
  id: number;
  x: number;
  y: number;
  targetId: number;
  speed: number;
  damage: number;
  color: string;
  isFrost?: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

type TowerType = 'basic' | 'rapid' | 'sniper' | 'frost';

const TOWER_CONFIGS: Record<TowerType, { cost: number, range: number, damage: number, fireRate: number, color: string, label: string, description: string, labelKey: string, descKey: string }> = {
  basic: { cost: 50, range: 3.5, damage: 15, fireRate: 800, color: '#3b82f6', label: 'Basic', description: 'Solid defense', labelKey: 'towerBasic', descKey: 'towerBasicDesc' },
  rapid: { cost: 120, range: 2.5, damage: 8, fireRate: 200, color: '#ef4444', label: 'Rapid', description: 'Extreme speed', labelKey: 'towerRapid', descKey: 'towerRapidDesc' },
  sniper: { cost: 200, range: 10, damage: 120, fireRate: 2500, color: '#eab308', label: 'Sniper', description: 'One shot kill', labelKey: 'towerSniper', descKey: 'towerSniperDesc' },
  frost: { cost: 150, range: 4, damage: 2, fireRate: 1200, color: '#22d3ee', label: 'Frost', description: 'Slows down enemies', labelKey: 'towerFrost', descKey: 'towerFrostDesc' },
};
const PATH = [
  { x: 0, y: 3 },
  { x: 5, y: 3 },
  { x: 5, y: 7 },
  { x: 10, y: 7 },
  { x: 10, y: 2 },
  { x: 15, y: 2 },
  { x: 15, y: 5 },
  { x: 20, y: 5 } // End
];

const GRID_SIZE = 40;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

export default function TowerDefenseGame({ onExit, t }: { onExit: () => void, t: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameOver' | 'won'>('idle');
  const [money, setMoney] = useState(250);
  const [lives, setLives] = useState(10);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [selectedTowerType, setSelectedTowerType] = useState<TowerType>('basic');
  
  // Ref for mutable state that drives the loop without causing full re-renders
  const stateRef = useRef({
    enemies: [] as Enemy[],
    towers: [] as Tower[],
    projectiles: [] as Projectile[],
    particles: [] as Particle[],
    money: 250,
    lives: 10,
    score: 0,
    wave: 1,
    frameCount: 0,
    enemiesToSpawn: 0,
    spawnTimer: 0,
    state: 'idle',
    lastTick: performance.now(),
    isWaitingForWave: false,
    waveWaitTimer: 0
  });

  const [waveWaitTimeLeft, setWaveWaitTimeLeft] = useState(0);

  const nextEnemyId = useRef(1);
  const nextProjId = useRef(1);
  const nextTowerId = useRef(1);

  const startGame = () => {
    stateRef.current = {
      enemies: [],
      towers: [],
      projectiles: [],
      particles: [],
      money: 250,
      lives: 10,
      score: 0,
      wave: 1,
      frameCount: 0,
      enemiesToSpawn: 5,
      spawnTimer: performance.now(),
      state: 'playing',
      lastTick: performance.now(),
      isWaitingForWave: true,
      waveWaitTimer: performance.now()
    };
    nextEnemyId.current = 1;
    nextProjId.current = 1;
    nextTowerId.current = 1;
    setMoney(100);
    setLives(10);
    setWave(1);
    setScore(0);
    setWaveWaitTimeLeft(10);
    setGameState('playing');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = (timestamp: number) => {
      if (stateRef.current.state === 'playing') {
        const dt = timestamp - stateRef.current.lastTick;
        update(dt, timestamp);
        draw(ctx);
      } else if (stateRef.current.state === 'idle') {
        draw(ctx); // Just draw initial state
      }
      stateRef.current.lastTick = timestamp;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const spawnParticle = (x: number, y: number, color: string) => {
    for (let i = 0; i < 5; i++) {
      stateRef.current.particles.push({
        id: Math.random(),
        x,
        y,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.5) * 100,
        life: 1,
        maxLife: 1,
        color,
        size: Math.random() * 3 + 2
      });
    }
  };

  const update = (dt: number, time: number) => {
    const state = stateRef.current;
    if (state.lives <= 0) {
      state.state = 'gameOver';
      setGameState('gameOver');
      return;
    }

    // Update Particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      p.life -= dt / 1000;
      if (p.life <= 0) state.particles.splice(i, 1);
    }

    // Spawning logic
    if (state.isWaitingForWave) {
      const waitPassed = time - state.waveWaitTimer;
      const timeLeft = Math.ceil(10 - waitPassed / 1000);
      setWaveWaitTimeLeft(Math.max(0, timeLeft));
      
      if (waitPassed >= 10000) {
        state.isWaitingForWave = false;
        state.spawnTimer = time;
      }
    } else {
      if (state.enemiesToSpawn > 0) {
        if (time - state.spawnTimer > 1000) {
          const waveMultiplier = Math.pow(1.35, state.wave - 1);
          state.enemies.push({
            id: nextEnemyId.current++,
            x: PATH[0].x,
            y: PATH[0].y,
            hp: 20 * waveMultiplier,
            maxHp: 20 * waveMultiplier,
            speed: Math.min(6, 1.8 + (state.wave * 0.2)), // grid units per second
            pathIndex: 0,
            reward: 15 + Math.floor(state.wave * 1.5),
            slowTimer: 0,
            slowFactor: 1
          });
          state.enemiesToSpawn--;
          state.spawnTimer = time;
        }
      } else if (state.enemies.length === 0) {
        // Wave clear
        state.wave++;
        state.enemiesToSpawn = 5 + state.wave * 2;
        state.isWaitingForWave = true;
        state.waveWaitTimer = time;
        setWave(state.wave);
        setWaveWaitTimeLeft(10);
      }
    }

    // Move enemies
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const enemy = state.enemies[i];
      
      // Update slow effect
      if (enemy.slowTimer > 0) {
        enemy.slowTimer -= dt;
        if (enemy.slowTimer <= 0) {
          enemy.slowFactor = 1;
        }
      }

      const targetPoint = PATH[enemy.pathIndex + 1];
      
      if (!targetPoint) {
        // Reached end
        state.lives--;
        setLives(state.lives);
        state.enemies.splice(i, 1);
        continue;
      }

      const dx = targetPoint.x - enemy.x;
      const dy = targetPoint.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      const effectiveSpeed = enemy.speed * enemy.slowFactor;
      const moveDist = (effectiveSpeed * dt) / 1000;

      if (dist <= moveDist) {
        // Reached waypoint
        enemy.x = targetPoint.x;
        enemy.y = targetPoint.y;
        enemy.pathIndex++;
      } else {
        enemy.x += (dx / dist) * moveDist;
        enemy.y += (dy / dist) * moveDist;
      }
    }

    // Towers attack
    state.towers.forEach(tower => {
      if (time - tower.lastFired > tower.fireRate) {
        // Find target
        const target = state.enemies.find(e => {
          const dist = Math.sqrt(Math.pow(e.x - tower.x, 2) + Math.pow(e.y - tower.y, 2));
          return dist <= tower.range;
        });

        if (target) {
          state.projectiles.push({
            id: nextProjId.current++,
            x: tower.x,
            y: tower.y,
            targetId: target.id,
            speed: tower.type === 'sniper' ? 20 : 10,
            damage: tower.damage,
            color: TOWER_CONFIGS[tower.type].color,
            isFrost: tower.type === 'frost'
          });
          tower.lastFired = time;
        }
      }
    });

    // Move projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const proj = state.projectiles[i];
      const target = state.enemies.find(e => e.id === proj.targetId);

      if (!target) {
        state.projectiles.splice(i, 1);
        continue;
      }

      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const moveDist = (proj.speed * dt) / 1000;

      if (dist <= moveDist) {
        // Hit
        target.hp -= proj.damage;
        
        if (proj.isFrost) {
          target.slowTimer = 2000;
          target.slowFactor = 0.5;
        }

        spawnParticle(proj.x * GRID_SIZE + GRID_SIZE/2, proj.y * GRID_SIZE + GRID_SIZE/2, proj.color);
        
        state.projectiles.splice(i, 1);

        if (target.hp <= 0) {
          const enemyIndex = state.enemies.findIndex(e => e.id === target.id);
          if (enemyIndex !== -1) {
            state.money += target.reward;
            setMoney(state.money);
            state.score += 10;
            setScore(state.score);
            state.enemies.splice(enemyIndex, 1);
          }
        }
      } else {
        proj.x += (dx / dist) * moveDist;
        proj.y += (dy / dist) * moveDist;
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    // Clear
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw semi-transparent dark background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid
    if (showGrid) {
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < CANVAS_WIDTH; x+=GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
      }
      for (let y = 0; y < CANVAS_HEIGHT; y+=GRID_SIZE) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
      }
    }

    // Draw Path with Glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = GRID_SIZE;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(PATH[0].x * GRID_SIZE + GRID_SIZE/2, PATH[0].y * GRID_SIZE + GRID_SIZE/2);
    for (let i = 1; i < PATH.length; i++) {
      ctx.lineTo(PATH[i].x * GRID_SIZE + GRID_SIZE/2, PATH[i].y * GRID_SIZE + GRID_SIZE/2);
    }
    ctx.stroke();
    
    // Path center line neon glow
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#3b82f6';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Base (End of path)
    const end = PATH[PATH.length - 1];
    ctx.fillStyle = '#ec4899';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.roundRect(end.x * GRID_SIZE + 4, end.y * GRID_SIZE + 4, GRID_SIZE - 8, GRID_SIZE - 8, 8);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Towers
    stateRef.current.towers.forEach(tower => {
      const conf = TOWER_CONFIGS[tower.type];
      const cx = tower.x * GRID_SIZE + GRID_SIZE/2;
      const cy = tower.y * GRID_SIZE + GRID_SIZE/2;

      // Base
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(tower.x * GRID_SIZE + 2, tower.y * GRID_SIZE + 2, GRID_SIZE - 4, GRID_SIZE - 4, 4);
      ctx.fill();

      // Gem/Crystal
      ctx.fillStyle = conf.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = conf.color;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Range indicator (subtle)
      ctx.globalAlpha = 0.05;
      ctx.fillStyle = conf.color;
      ctx.beginPath();
      ctx.arc(cx, cy, tower.range * GRID_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Draw Enemies
    stateRef.current.enemies.forEach(enemy => {
      const cx = enemy.x * GRID_SIZE + GRID_SIZE/2;
      const cy = enemy.y * GRID_SIZE + GRID_SIZE/2;
      
      const isSlowed = enemy.slowFactor < 1;

      // Glow if slowed
      if (isSlowed) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22d3ee';
      }

      // Body
      ctx.fillStyle = isSlowed ? '#22d3ee' : '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, GRID_SIZE/4, 0, Math.PI * 2);
      ctx.fill();
      
      if (isSlowed) {
         ctx.strokeStyle = 'white';
         ctx.lineWidth = 1;
         ctx.stroke();
      }

      ctx.shadowBlur = 0;

      // Health bar
      const hpPercent = Math.max(0, enemy.hp / enemy.maxHp);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.roundRect(cx - 12, cy - 18, 24, 4, 2);
      ctx.fill();
      
      ctx.fillStyle = enemy.hp < enemy.maxHp * 0.3 ? '#ef4444' : '#22c55e';
      ctx.beginPath();
      ctx.roundRect(cx - 12, cy - 18, 24 * hpPercent, 4, 2);
      ctx.fill();
    });

    // Draw Projectiles
    stateRef.current.projectiles.forEach(proj => {
      ctx.shadowBlur = 10;
      ctx.shadowColor = proj.color;
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x * GRID_SIZE + GRID_SIZE/2, proj.y * GRID_SIZE + GRID_SIZE/2, proj.isFrost ? 5 : 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw Particles
    stateRef.current.particles.forEach(p => {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  };

  const isPathOrTower = (tx: number, ty: number) => {
    // Check if on path
    for (let i = 0; i < PATH.length - 1; i++) {
      const p1 = PATH[i];
      const p2 = PATH[i+1];
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      if (tx >= minX && tx <= maxX && ty >= minY && ty <= maxY) return true;
    }
    // Check if tower exists
    if (stateRef.current.towers.some(t => Math.floor(t.x) === tx && Math.floor(t.y) === ty)) return true;
    return false;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (gameState !== 'playing') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Scale coordinates if canvas is styled with 100% width
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);

    // Try to place tower
    const towerConfig = TOWER_CONFIGS[selectedTowerType];
    const towerCost = towerConfig.cost;
    if (stateRef.current.money >= towerCost && !isPathOrTower(gridX, gridY)) {
      stateRef.current.money -= towerCost;
      setMoney(stateRef.current.money);
      stateRef.current.towers.push({
        id: nextTowerId.current++,
        x: gridX,
        y: gridY,
        type: selectedTowerType,
        range: towerConfig.range,
        damage: towerConfig.damage,
        fireRate: towerConfig.fireRate,
        lastFired: 0,
        cost: towerCost
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-4 pointer-events-auto">
      <div className="flex w-full max-w-4xl justify-between items-center bg-black/40 p-4 rounded-t-2xl border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-6 text-white font-bold">
          <div className="flex items-center gap-2">
            <Coins className="text-blitz-yellow" /> <span className="text-xl">{money}$</span>
          </div>
          <div className="flex items-center gap-2">
            <Heart className="text-play-pink" /> <span className="text-xl">{lives}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="text-play-blue" /> <span className="text-xl">{t.wave} {wave}</span>
          </div>
          {waveWaitTimeLeft > 0 && gameState === 'playing' && (
            <div className="flex items-center gap-2 text-play-pink animate-pulse">
              <span>{t.nextWaveIn} {waveWaitTimeLeft}s</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-white/50">{t.score}: {score}</span>
          <button onClick={onExit} className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </div>
      
      {gameState === 'playing' && (
        <div className="flex w-full max-w-4xl justify-center gap-4 bg-black/40 p-2 border-x border-white/10 backdrop-blur-md">
          {(Object.keys(TOWER_CONFIGS) as TowerType[]).map(type => {
            const conf = TOWER_CONFIGS[type];
            const isSelected = selectedTowerType === type;
            const canAfford = money >= conf.cost;
            return (
              <button
                key={type}
                onClick={() => setSelectedTowerType(type)}
                className={`px-4 py-2 rounded-xl border-2 transition-all flex flex-col items-center gap-1 hover:border-white/50 relative overflow-hidden ${isSelected ? 'bg-white/10 ring-2 ring-white/20' : 'bg-transparent'} ${!canAfford ? 'opacity-50 grayscale' : ''}`}
                style={{ borderColor: isSelected ? conf.color : 'rgba(255,255,255,0.1)' }}
              >
                <div className="font-black tracking-widest uppercase text-xs sm:text-sm" style={{ color: conf.color }}>{t[conf.labelKey]}</div>
                <div className="text-white font-bold text-sm">{conf.cost}$</div>
                <div className="text-white/40 text-[10px] hidden sm:block whitespace-nowrap">{t[conf.descKey]}</div>
                {isSelected && (
                  <motion.div 
                    layoutId="tower-selection" 
                    className="absolute inset-x-0 bottom-0 h-1 bg-white" 
                    style={{ backgroundColor: conf.color }}
                  />
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="relative border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] rounded-b-2xl overflow-hidden group">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-40 pointer-events-none" 
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1533227260814-ce361bd4eb7c?auto=format&fit=crop&q=80&w=800&h=400')` }}
        />
        <canvas 
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={handleCanvasClick}
          className="w-full max-w-4xl object-contain cursor-crosshair relative z-10"
          title={`${t.clickToBuild} ${t[TOWER_CONFIGS[selectedTowerType].labelKey]} (${t.costs}: ${TOWER_CONFIGS[selectedTowerType].cost}$)`}
        />
        
        {/* Game Over / Start Overlay */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm z-10">
            {gameState === 'idle' && (
              <>
                <h2 className="text-5xl font-black text-white mb-4">Tower Defense</h2>
                <p className="text-white/60 text-lg max-w-md mb-8">
                  {t.towerDefenseIntro}
                  <br/>{t.towerDefenseCostNotice}
                </p>
                <button 
                  onClick={startGame}
                  className="px-10 py-5 bg-play-blue text-black font-black text-2xl rounded-2xl flex items-center gap-3 hover:scale-105 transition-transform"
                >
                  <Play fill="currentColor" /> {t.startGame}
                </button>
              </>
            )}

            {gameState === 'gameOver' && (
              <>
                <h2 className="text-5xl font-black text-play-pink mb-4">{t.baseDestroyed}</h2>
                <p className="text-white/60 text-xl font-bold mb-8">{t.wave}: {wave} | {t.score}: {score}</p>
                <button 
                  onClick={startGame}
                  className="px-10 py-5 bg-white/10 text-white font-black text-2xl rounded-2xl flex items-center gap-3 hover:scale-105 hover:bg-white/20 transition-all border border-white/20"
                >
                  <RefreshCw className="text-blitz-yellow" /> {t.playAgain}
                </button>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
