import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Anchor, Crosshair, Map as MapIcon, X, Users, Coins, Building2, Rocket, Zap, Factory, RadioTower, Swords, Sword, RefreshCw, Flame, Volume2, VolumeX } from 'lucide-react';

interface WorldFrontProps {
  onExit: () => void;
  t: any;
}

interface Player {
  id: string;
  name: string;
  color: string;
  pop: number;
  maxPop: number;
  baseMaxPop?: number;
  gold: number;
  growth?: number;
  landCount?: number;
  buildingCounts?: Record<string, number>;
  tradeShipCount?: number;
  isAI: boolean;
  status: 'alive' | 'dead';
  type: 'player' | 'nation' | 'bot';
  targetCellId: number | null;
  offensiveWaves: AttackWave[];
  lastAttackerId?: string;
  lat?: number;
  lon?: number;
}

interface AttackWave {
    troops: number;
    target: {x: number, y: number};
    type?: 'land' | 'naval';
    navalSrc?: {x: number, y: number};
    targetOwnerId?: string | null;
}

interface Train {
  id: number;
  ownerId: string;
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  px: number;
  py: number;
  progress: number;
  speed: number;
  angle?: number;
  path?: {x:number, y:number}[];
  pathIndex?: number;
}

interface Cell {
  x: number;
  y: number;
  idx: number;
  ownerId: string | null;
  hp: number;
  maxHp: number;
  type: 'plains' | 'highlands' | 'mountains' | 'water' | 'snow' | 'desert';
  building: 'city' | 'factory' | 'defense' | 'port' | 'silo' | 'sam' | null;
  lastFired?: number;
  lastTrainOut?: number;
  lastTradeOut?: number;
  color?: string;
  isBorder?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'troop' | 'fx' | 'ship';
  payload?: number;
  ownerId?: string;
  targetCell?: number;
  path?: {x: number, y: number}[];
  age?: number;
  text?: string;
}

interface Projectile {
  id: number;
  x: number; y: number;
  startX: number; startY: number;
  targetX: number; targetY: number;
  type: 'nuke';
  ownerId: string;
  progress: number;
}

import { NATION_DATA } from '../lib/nations';

const COLORS = Array.from({length: NATION_DATA.length + 1}, (_, i) => {
    const h = (i * 137.508) % 360; // golden angle approximation for distinct hues
    const s = 65 + Math.random() * 20; 
    const l = 45 + Math.random() * 15;
    return `hsl(${h}, ${s}%, ${l}%)`;
});

const GRID_W = 1920;
const GRID_H = 960;
const CELL_SIZE = 2;
const MAP_W = GRID_W * CELL_SIZE;
const MAP_H = GRID_H * CELL_SIZE;
const WILDERNESS_HP = 5;

// Audio Utilities
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;
let moduleAudioEnabled = true;
let moduleAudioLevel = 1.0;

if (typeof window !== 'undefined') {
    window.addEventListener('settingsChanged', (e: any) => {
        moduleAudioLevel = e.detail?.audioLevel ?? 1.0;
    });
    const saved = localStorage.getItem('game_app_settings');
    if (saved) {
        try { moduleAudioLevel = JSON.parse(saved).audioLevel ?? 1.0; } catch(e){}
    }
}

const playSynthSound = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.1, fadeOut: boolean = true) => {
    if (!audioCtx || audioCtx.state === 'suspended' || !moduleAudioEnabled || moduleAudioLevel === 0) return;
    const finalVolume = volume * moduleAudioLevel;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gain.gain.setValueAtTime(finalVolume, audioCtx.currentTime);
    if (fadeOut) {
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    }
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
};

const sounds = {
    click: () => playSynthSound(800, 'sine', 0.05, 0.05),
    expand: () => playSynthSound(200, 'square', 0.1, 0.02),
    capture: () => playSynthSound(150, 'sine', 0.1, 0.03),
    build: () => {
        playSynthSound(400, 'triangle', 0.1, 0.05);
        setTimeout(() => playSynthSound(600, 'triangle', 0.1, 0.03), 50);
    },
    destroy: () => {
        playSynthSound(100, 'sawtooth', 0.3, 0.05);
        playSynthSound(50, 'sine', 0.4, 0.1);
    },
    nukeLaunch: () => {
        const now = audioCtx?.currentTime || 0;
        const osc = audioCtx!.createOscillator();
        const gain = audioCtx!.createGain();
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 1.5);
        gain.gain.setValueAtTime(0.1 * moduleAudioLevel, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start();
        osc.stop(now + 1.5);
    },
    nukeExplode: () => {
        playSynthSound(60, 'sawtooth', 1.0, 0.2);
        playSynthSound(40, 'sine', 1.5, 0.3);
    },
    eliminate: () => {
        playSynthSound(300, 'sine', 0.2, 0.1);
        setTimeout(() => playSynthSound(200, 'sine', 0.3, 0.1), 150);
        setTimeout(() => playSynthSound(100, 'sine', 0.5, 0.1), 350);
    }
};

export default function WorldFrontGame({ onExit, t }: WorldFrontProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const troopsRef = useRef<HTMLDivElement>(null);
  const topPanelRef = useRef<HTMLDivElement>(null);
  const hoveredMouseRef = useRef<{clientX: number, clientY: number, gridX: number, gridY: number} | null>(null);
  
  const [gameState, setGameState] = useState<'loading' | 'spawn' | 'playing' | 'gameover'>('loading');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [myId] = useState('p1');
  const [uiState, setUiState] = useState({ pop: 0, maxPop: 0, gold: 0, growth: 0, counts: { city:0, factory:0, port:0, defense:0, silo:0, nuke: 0 } });
  const [attackRatio, setAttackRatio] = useState(30);
  const [selectedAction, _setSelectedAction] = useState<'expand'|'ship'|'city'|'factory'|'defense'|'port'|'silo'|'sam'|'nuke'>('expand');
  const selectedActionRef = useRef(selectedAction);
  const setSelectedAction = (action: typeof selectedAction) => {
      _setSelectedAction(action);
      selectedActionRef.current = action;
  };
  const [zoom, setZoom] = useState(1);
  const cameraRef = useRef({ x: MAP_W / 2, y: MAP_H / 2 });
  
  const [notifications, setNotifications] = useState<{id:number, msg:string, time:number}[]>([]);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, cellX: number, cellY: number} | null>(null);
  const notifIdRef = useRef(1);

  // Refs
  const gridRef = useRef<Cell[]>([]);
  const playersRef = useRef<Record<string, Player>>({});
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const trainsRef = useRef<Train[]>([]);
  const tradeShipsRef = useRef<Train[]>([]);
  const nextProjId = useRef(1);
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const lastTickRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastCaptureSoundRef = useRef<number>(0);
  const activeCellsRef = useRef<Set<number>>(new Set());
  const mapImageRef = useRef<HTMLImageElement | null>(null);

  const getCellIndex = (x: number, y: number) => y * GRID_W + x;

  const setCellOwner = (cell: Cell, ownerId: string | null) => {
      const oldOwnerId = cell.ownerId;
      if (ownerId === myId && oldOwnerId !== myId) {
          if (!lastCaptureSoundRef.current || Date.now() - lastCaptureSoundRef.current > 100) {
              sounds.capture();
              lastCaptureSoundRef.current = Date.now();
          }
      }
      cell.ownerId = ownerId;
      if (ownerId) activeCellsRef.current.add(cell.idx);
      else if (!cell.building) activeCellsRef.current.delete(cell.idx);

      // Update border for self and neighbors
      updateCellBorder(cell);
      const nx = [cell.x+1, cell.x-1, cell.x, cell.x];
      const ny = [cell.y, cell.y, cell.y+1, cell.y-1];
      for(let i=0; i<4; i++) {
          if (nx[i]>=0 && nx[i]<GRID_W && ny[i]>=0 && ny[i]<GRID_H) {
              updateCellBorder(gridRef.current[getCellIndex(nx[i], ny[i])]);
          }
      }
  };
  
  const setCellBuilding = (cell: Cell, building: any) => {
      if (building) sounds.build();
      else if (cell.building) sounds.destroy();
      cell.building = building;
      if (building) activeCellsRef.current.add(cell.idx);
      else if (!cell.ownerId) activeCellsRef.current.delete(cell.idx);
      updateCellBorder(cell);
  };

  const updateCellBorder = (cell: Cell) => {
      if (!cell.ownerId) {
          cell.isBorder = false;
          return;
      }
      let isBorder = false;
      const nCoords = [
          [cell.x+1, cell.y], [cell.x-1, cell.y], [cell.x, cell.y+1], [cell.x, cell.y-1],
          [cell.x+1, cell.y+1], [cell.x-1, cell.y-1], [cell.x+1, cell.y-1], [cell.x-1, cell.y+1]
      ];
      for (let i = 0; i < 8; i++) {
          const nx = nCoords[i][0];
          const ny = nCoords[i][1];
          if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) {
              isBorder = true;
              break;
          }
          const neighbor = gridRef.current[getCellIndex(nx, ny)];
          if (neighbor.ownerId !== cell.ownerId || neighbor.type === 'water') {
              isBorder = true;
              break;
          }
      }
      cell.isBorder = isBorder;
  };

  const getOwnedCells = (id: string) => {
      let cells = [];
      for (let idx of activeCellsRef.current) {
          if (gridRef.current[idx].ownerId === id) cells.push(gridRef.current[idx]);
      }
      return cells;
  };

  const pushNotification = (msg: string) => {
      const id = notifIdRef.current++;
      setNotifications(prev => [...prev.slice(-3), { id, msg, time: Date.now() }]);
      setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== id));
      }, 3000);
  };

  const isWaterOpen = (sx: number, sy: number) => {
      let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
      let mw = getSafe(sx, sy);
      if (!mw || mw.type !== 'water') return false;
      let visited = new Set<number>();
      let q = [mw.idx];
      visited.add(mw.idx);
      let count = 0;
      while(q.length > 0 && count < 200) {
          let curr = q.shift()!;
          count++;
          let c = gridRef.current[curr];
          let adjs = [getSafe(c.x+1,c.y), getSafe(c.x-1,c.y), getSafe(c.x,c.y+1), getSafe(c.x,c.y-1)];
          for(let a of adjs) {
              if (a && a.type === 'water' && !visited.has(a.idx)) {
                  visited.add(a.idx);
                  q.push(a.idx);
              }
          }
      }
      return count >= 200;
  };

  const findWaterPath = (sx: number, sy: number, tx: number, ty: number): {x:number, y:number}[] | null => {
      let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;

      let startWaters = [
          getSafe(sx+1,sy), getSafe(sx-1,sy), getSafe(sx,sy+1), getSafe(sx,sy-1)
      ].filter(c => c && c.type === 'water');

      let destWaters = [
          getSafe(tx+1,ty), getSafe(tx-1,ty), getSafe(tx,ty+1), getSafe(tx,ty-1)
      ].filter(c => c && c.type === 'water');

      if (startWaters.length === 0 || destWaters.length === 0) return null;

      class PriorityQueue {
          data: {idx: number, f: number}[] = [];
          push(val: {idx: number, f: number}) {
              this.data.push(val);
              this.up(this.data.length - 1);
          }
          pop() {
              if (this.data.length === 0) return null;
              if (this.data.length === 1) return this.data.pop()!;
              const top = this.data[0];
              this.data[0] = this.data.pop()!;
              this.down(0);
              return top;
          }
          up(i: number) {
              while (i > 0) {
                  const p = Math.floor((i - 1) / 2);
                  if (this.data[i].f >= this.data[p].f) break;
                  const tmp = this.data[i]; this.data[i] = this.data[p]; this.data[p] = tmp;
                  i = p;
              }
          }
          down(i: number) {
              const len = this.data.length;
              while (true) {
                  let left = 2 * i + 1, right = 2 * i + 2, swap = i;
                  if (left < len && this.data[left].f < this.data[swap].f) swap = left;
                  if (right < len && this.data[right].f < this.data[swap].f) swap = right;
                  if (swap === i) break;
                  const tmp = this.data[i]; this.data[i] = this.data[swap]; this.data[swap] = tmp;
                  i = swap;
              }
          }
          get length() { return this.data.length; }
      }

      let open = new PriorityQueue();
      let cameFrom = new Map<number, number>();
      let gScore = new Map<number, number>();
      let destWaterIdxs = new Set(destWaters.map(c => c!.idx));
      
      for (let sw of startWaters) {
          open.push({idx: sw!.idx, f: 0});
          gScore.set(sw!.idx, 0);
      }

      let iterations = 0;
      while(open.length > 0 && iterations < 30000) {
          iterations++;
          let current = open.pop()!.idx;

          if (destWaterIdxs.has(current)) {
              let path = [];
              let curr = current;
              while(cameFrom.has(curr)) {
                  let cell = gridRef.current[curr];
                  path.push({x: cell.x, y: cell.y});
                  curr = cameFrom.get(curr)!;
              }
              let cell = gridRef.current[curr];
              path.push({x: cell.x, y: cell.y});
              return path.reverse();
          }

          let cg = gScore.get(current)!;
          let cCell = gridRef.current[current];
          let adjs = [
              getSafe(cCell.x+1,cCell.y), getSafe(cCell.x-1,cCell.y), 
              getSafe(cCell.x,cCell.y+1), getSafe(cCell.x,cCell.y-1),
              getSafe(cCell.x+1,cCell.y+1), getSafe(cCell.x-1,cCell.y-1), 
              getSafe(cCell.x-1,cCell.y+1), getSafe(cCell.x+1,cCell.y-1)
          ];
          
          for (let n of adjs) {
              if (!n || n.type !== 'water') continue;
              
              let cost = 1;
              if (!destWaterIdxs.has(n.idx) && !startWaters.some(sw => sw && sw.idx === n.idx)) {
                  for(let dx=-2; dx<=2; dx++){
                      for(let dy=-2; dy<=2; dy++){
                          if(dx===0 && dy===0) continue;
                          let a = getSafe(n.x+dx, n.y+dy);
                          if(a && a.type !== 'water') {
                              cost += (Math.abs(dx)<=1 && Math.abs(dy)<=1) ? 5 : 1;
                          }
                      }
                  }
              }

              let tg = cg + cost;
              if (!gScore.has(n.idx) || tg < gScore.get(n.idx)!) {
                  gScore.set(n.idx, tg);
                  let h = Math.abs(n.x - tx) + Math.abs(n.y - ty);
                  open.push({idx: n.idx, f: tg + h});
                  cameFrom.set(n.idx, current);
              }
          }
      }
      return null;
  };

  useEffect(() => {
    let initialPlayers: Record<string, any> = {
      'p1': { id: 'p1', name: 'You', color: COLORS[0], pop: 0, maxPop: 2500, gold: 1000, isAI: false, status: 'alive', type: 'player', targetCellId: null, offensiveWaves: [] }
    };
    NATION_DATA.forEach((data, i) => {
        initialPlayers[`ai${i+1}`] = { id: `ai${i+1}`, name: data.name, lat: data.lat, lon: data.lon, color: COLORS[i+1], pop: 0, maxPop: 2500, gold: 500, isAI: true, status: 'alive', type: 'nation', targetCellId: null, offensiveWaves: [] };
    });
    playersRef.current = initialPlayers as Record<string, Player>;
  }, []);

  const generateProcedural = () => {
        const w = GRID_W, h = GRID_H;
        const g: Cell[] = [];
        const SEED = Math.random() * 10000;
        
        const rand = (vx: number, vy: number) => {
           const dot = vx * 12.9898 + vy * 78.233 + SEED;
           const s = Math.sin(dot) * 43758.5453;
           return s - Math.floor(s);
        };

        const noise2D = (x: number, y: number) => {
           const ix = Math.floor(x); const iy = Math.floor(y);
           const fx = x - ix; const fy = y - iy;
           const a = rand(ix, iy); const b = rand(ix + 1, iy);
           const c = rand(ix, iy + 1); const d = rand(ix + 1, iy + 1);
           const ux = fx * fx * (3 - 2 * fx); const uy = fy * fy * (3 - 2 * fy);
           return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
        };

        const fbm = (x: number, y: number, scale: number, octaves: number) => {
           let v = 0, a = 0.5, freq = scale;
           for (let i = 0; i < octaves; i++) {
               v += a * noise2D(x * freq, y * freq);
               freq *= 2; a *= 0.5;
           }
           return v;
        };
        
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                // Base terrain elevation
                let e = fbm(x, y, 0.035, 5); 
                
                // Chokepoint modifier - add ridges and valleys
                let cp = fbm(x + 500, y + 500, 0.08, 3);
                if (cp > 0.6) e += 0.2; // Mountain ridges
                else if (cp < 0.3) e -= 0.15; // Natural valleys / land bridges

                // Island mask - make ocean mostly just near the edges, leaving a massive continent
                const dx = Math.abs(x - w / 2) / (w / 2);
                const dy = Math.abs(y - h / 2) / (h / 2);
                // Dist ranges from 0 (center) to ~1.414 (corners)
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                // Subtraction starts softly at 0.6 dist (60% to edges), and pushes e down at the very edges
                e -= Math.pow(Math.max(0, distFromCenter - 0.6), 2) * 1.5;

                // Moisture map
                let m = fbm(x + 100, y + 100, 0.04, 4);

                let type: 'plains' | 'highlands' | 'mountains' | 'water' | 'snow' | 'desert' = 'water';
                
                if (e > 0.40) {
                    type = 'plains';
                    if (e > 0.60) type = 'highlands';
                    if (e > 0.75) type = 'mountains';

                    if (y < GRID_H * 0.15 || y > GRID_H * 0.85) {
                        type = 'snow';
                    } else if (y > GRID_H * 0.3 && y < GRID_H * 0.7) {
                        if (type === 'plains' && m < 0.4) {
                            type = 'desert';
                        }
                    }
                }
                
                // Resource Generation (Strategic Locations)
                let resource: 'gold' | null = null;
                if (type !== 'water' && type !== 'snow') {
                    let rNoise = rand(x, y);
                    if (type === 'mountains' && rNoise > 0.95) resource = 'gold'; // 5% in mountains
                    else if (type === 'highlands' && rNoise > 0.97) resource = 'gold'; // 3% in highlands
                    else if (type === 'desert' && rNoise > 0.98) resource = 'gold'; // 2% in desert
                    else if (rNoise > 0.995) resource = 'gold'; // 0.5% in plains
                }
                
                g.push({
                    x, y, idx: getCellIndex(x, y),
                    ownerId: null,
                    type,
                    hp: type === 'water' ? 9999 : (type === 'mountains' ? 50 : WILDERNESS_HP),
                    maxHp: 20,
                    building: null,
                    resource
                });
            }
        }
        return g;
    };

    const prerenderBg = (g: Cell[]) => {
        const bgCanvas = document.createElement('canvas');
        bgCanvas.width = MAP_W;
        bgCanvas.height = MAP_H;
        const bgCtx = bgCanvas.getContext('2d');
        if (bgCtx) {
            bgCtx.fillStyle = '#003399'; // Deep Ocean
            bgCtx.fillRect(0, 0, MAP_W, MAP_H);
            for (const cell of g) {
                let cellColor = cell.color || '#003399';
                
                if (!cell.color) {
                    if (cell.type === 'water') {
                        // Check if coastal water
                        let isCoast = false;
                        for(let dx=-1; dx<=1; dx++) {
                            for(let dy=-1; dy<=1; dy++) {
                               if(dx===0 && dy===0) continue;
                               const nx = cell.x+dx; const ny = cell.y+dy;
                               if (nx>=0 && nx<GRID_W && ny>=0 && ny<GRID_H) {
                                   const adj = g[getCellIndex(nx, ny)];
                                   if (adj && adj.type !== 'water') { isCoast = true; break; }
                               }
                            }
                            if(isCoast) break;
                        }
                        if (isCoast) cellColor = '#0050b3'; // Shallow coastal water
                    } else {
                        const noisePattern = (cell.x * 13 + cell.y * 37) % 100;
                        
                        if (cell.type === 'mountains') {
                            // Gray with white caps
                            if (noisePattern > 80) cellColor = '#ffffff'; // snow cap
                            else if (noisePattern > 30) cellColor = '#aaaaaa'; // gray rock
                            else cellColor = '#808080'; // dark rock
                        } else if (cell.type === 'snow') {
                            // Ice and Snow
                            if (noisePattern > 60) cellColor = '#ffffff'; 
                            else if (noisePattern > 20) cellColor = '#e6f0fa'; 
                            else cellColor = '#cce0ff';
                        } else if (cell.type === 'desert') {
                            // Orange and yellow sands
                            if (noisePattern > 50) cellColor = '#ffcc00'; // light sand
                            else if (noisePattern > 10) cellColor = '#ff9900'; // orange sand
                            else cellColor = '#cc6600'; // dark sand/dunes
                        } else if (cell.type === 'highlands') {
                            // Lighter greens and transitional dirt
                            if (noisePattern > 60) cellColor = '#99cc33'; 
                            else if (noisePattern > 20) cellColor = '#73a921'; 
                            else cellColor = '#d2b48c'; // light dirt
                        } else {
                            // Plains (thick forests and grasslands)
                            if (noisePattern > 70) cellColor = '#339933'; // normal green
                            else if (noisePattern > 15) cellColor = '#006600'; // dark green
                            else cellColor = '#004d00'; // deeper forest
                        }
                    }
                }
                
                bgCtx.fillStyle = cellColor;
                bgCtx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

                // Add dark coastline for land
                if (cell.type !== 'water') {
                    let isCoast = false;
                    const nX = [cell.x+1, cell.x-1, cell.x, cell.x];
                    const nY = [cell.y, cell.y, cell.y+1, cell.y-1];
                    for(let i=0; i<4; i++) {
                        const nx = nX[i], ny = nY[i];
                        if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H || g[getCellIndex(nx, ny)].type === 'water') {
                            isCoast = true;
                            break;
                        }
                    }
                    if (isCoast) {
                        bgCtx.fillStyle = 'rgba(0,0,0,0.25)';
                        bgCtx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    }
                }

                // Draw Resource 
                if (cell.resource === 'gold') {
                    bgCtx.fillStyle = '#fbbf24'; 
                    bgCtx.beginPath();
                    bgCtx.arc(cell.x * CELL_SIZE + CELL_SIZE/2 - 1, cell.y * CELL_SIZE + CELL_SIZE/2 + 1, CELL_SIZE/3.5, 0, 2*Math.PI);
                    bgCtx.fill();
                    bgCtx.fillStyle = '#fcd34d'; 
                    bgCtx.beginPath();
                    bgCtx.arc(cell.x * CELL_SIZE + CELL_SIZE/2 + 1, cell.y * CELL_SIZE + CELL_SIZE/2 - 1, CELL_SIZE/4, 0, 2*Math.PI);
                    bgCtx.fill();
                    bgCtx.strokeStyle = '#b45309';
                    bgCtx.lineWidth = 0.5;
                    bgCtx.stroke();
                }
            }
            bgCanvasRef.current = bgCanvas;
        }
    };

    const runGeneration = () => {
        const genG = generateProcedural();
        gridRef.current = genG;
        prerenderBg(genG);
        setGameState('spawn');
    };
    
    useEffect(() => {
        runGeneration();
    }, []);

  const spawnFX = (x: number, y: number, color: string, count: number, speed: number) => {
      if (particlesRef.current.length > 1500) return;
      for(let i=0; i<count; i++) {
          let ang = Math.random() * Math.PI * 2;
          let vel = Math.random() * speed;
          particlesRef.current.push({
              x, y, vx: Math.cos(ang)*vel, vy: Math.sin(ang)*vel,
              life: 1.0, maxLife: Math.random()*0.5 + 0.5,
              color, size: Math.random()*2 + 1, type: 'fx'
          });
      }
  };

  const dispatchShip = (fromCell: Cell, toCell: Cell, ownerId: string, troops: number) => {
      if (!fromCell || !toCell) return;
      let fx = fromCell.x * CELL_SIZE + CELL_SIZE/2;
      let fy = fromCell.y * CELL_SIZE + CELL_SIZE/2;
      let tx = toCell.x * CELL_SIZE + CELL_SIZE/2;
      let ty = toCell.y * CELL_SIZE + CELL_SIZE/2;
      
      let ang = Math.atan2(ty - fy, tx - fx);
      particlesRef.current.push({
          x: fx, y: fy,
          vx: Math.cos(ang) * 2, vy: Math.sin(ang) * 2, // slower than troops
          life: 1.0, maxLife: 1.0, 
          color: playersRef.current[ownerId]?.color || '#fff',
          size: 4, type: 'ship', ownerId, targetCell: toCell.idx, payload: troops,
          path: [{x: fx, y: fy}]
      });
  };



  
  const updatePhysics = (dt: number) => {
    let grid = gridRef.current;
    let players = playersRef.current;
    let dtScale = dt / 50;
    
// Process Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        let p = particlesRef.current[i]; if(p.type === "ship") p.age = (p.age || 0) + dtScale;
        
        if (p.type === 'ship') {
            let avoiding = false;
            
            
            // Self-destruct/refund if stuck too long (e.g. 1000 ticks)
            if (p.age > 1000) {
                if (p.ownerId && p.payload) players[p.ownerId].pop += p.payload;
                particlesRef.current.splice(i, 1);
                continue;
            }

            let tc = p.targetCell !== undefined ? grid[p.targetCell] : null;
            let tx = tc ? tc.x * CELL_SIZE + CELL_SIZE/2 : p.x;
            let ty = tc ? tc.y * CELL_SIZE + CELL_SIZE/2 : p.y;
            let distToTarget = Math.hypot(p.x - tx, p.y - ty);

            // Improved land avoidance
            let lookAhead = 15;
            let checkX = Math.floor((p.x + p.vx * lookAhead) / CELL_SIZE);
            let checkY = Math.floor((p.y + p.vy * lookAhead) / CELL_SIZE);
            
            if (distToTarget > 40 && checkX >= 0 && checkX < GRID_W && checkY >= 0 && checkY < GRID_H) {
                let cellAhead = grid[getCellIndex(checkX, checkY)];
                if (cellAhead.type !== 'water' && p.targetCell !== cellAhead.idx) {
                    // Check left and right to see which way is clearer
                    let speed = Math.hypot(p.vx, p.vy);
                    let baseAngle = Math.atan2(p.vy, p.vx);
                    
                    let leftClear = true;
                    let rightClear = true;
                    
                    // Sample left
                    let la = baseAngle - 0.5;
                    let lcx = Math.floor((p.x + Math.cos(la) * lookAhead) / CELL_SIZE);
                    let lcy = Math.floor((p.y + Math.sin(la) * lookAhead) / CELL_SIZE);
                    if (lcx>=0 && lcx<GRID_W && lcy>=0 && lcy<GRID_H && grid[getCellIndex(lcx, lcy)].type !== 'water') leftClear = false;
                    
                    // Sample right
                    let ra = baseAngle + 0.5;
                    let rcx = Math.floor((p.x + Math.cos(ra) * lookAhead) / CELL_SIZE);
                    let rcy = Math.floor((p.y + Math.sin(ra) * lookAhead) / CELL_SIZE);
                    if (rcx>=0 && rcx<GRID_W && rcy>=0 && rcy<GRID_H && grid[getCellIndex(rcx, rcy)].type !== 'water') rightClear = false;

                    let steer = 0.2;
                    if (!leftClear && rightClear) steer = 0.4;
                    else if (leftClear && !rightClear) steer = -0.4;
                    else if (!leftClear && !rightClear) steer = 0.6; // both blocked, hard right
                    else {
                        // both clear or both blocked similarly, steer towards target
                        let targetAngle = Math.atan2(ty - p.y, tx - p.x);
                        let diff = targetAngle - baseAngle;
                        while(diff > Math.PI) diff -= Math.PI*2;
                        while(diff < -Math.PI) diff += Math.PI*2;
                        steer = diff > 0 ? 0.3 : -0.3;
                    }

                    let a = baseAngle + steer;
                    p.vx = Math.cos(a) * speed;
                    p.vy = Math.sin(a) * speed;
                    avoiding = true;
                }
            }
            
            if (!avoiding && tc) {
                let currentSpeed = Math.hypot(p.vx, p.vy);
                let targetAngle = Math.atan2(ty - p.y, tx - p.x);
                let currentAngle = Math.atan2(p.vy, p.vx);
                let diff = targetAngle - currentAngle;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                
                let a = currentAngle + diff * 0.15; // Steer slightly more aggressively
                p.vx = Math.cos(a) * currentSpeed;
                p.vy = Math.sin(a) * currentSpeed;
            }
            
            if (p.path) {
                let lastP = p.path[p.path.length-1];
                if (Math.hypot(p.x - lastP.x, p.y - lastP.y) > 10) {
                    p.path.push({x: p.x, y: p.y});
                }
            }
        }
        
        p.x += p.vx * dtScale; p.y += p.vy * dtScale;
        
        let cx = Math.floor(p.x / CELL_SIZE);
        let cy = Math.floor(p.y / CELL_SIZE);
        if (cx >= 0 && cx < GRID_W && cy >= 0 && cy < GRID_H) {
            let currentCell = grid[getCellIndex(cx, cy)];
            if (p.type === 'ship' && currentCell.type !== 'water' && currentCell.ownerId !== p.ownerId) {
                p.targetCell = currentCell.idx; // force landing on this coast
            }
        }
        
        if ((p.type === 'troop' || p.type === 'ship') && p.targetCell !== undefined && p.ownerId && p.payload) {
            let tc = grid[p.targetCell];
            let tx = tc.x * CELL_SIZE + CELL_SIZE/2;
            let ty = tc.y * CELL_SIZE + CELL_SIZE/2;
            let dist = Math.sqrt(Math.pow(p.x - tx, 2) + Math.pow(p.y - ty, 2));
            let speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            
            if (p.type === 'ship' && Math.random() < 0.1) {
                // Ship wake
                particlesRef.current.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 1, maxLife: 1, color: '#93c5fd', size: 2, type: 'fx' });
            }

            let hitDist = p.type === 'ship' ? speed + CELL_SIZE * 4 : speed + CELL_SIZE;
            if (dist < hitDist) {
                // Impact - Ships can only impact land or its actual target cell if it reached it
                if (p.type === 'ship' && tc.type === 'water') {
                    // Reached target water cell but no land yet? Look for adjacent land.
                    let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                    let adjs = [
                        getSafe(tc.x+1, tc.y), getSafe(tc.x-1, tc.y),
                        getSafe(tc.x, tc.y+1), getSafe(tc.x, tc.y-1)
                    ].filter(c => c && c.type !== 'water');
                    if (adjs.length > 0) {
                        p.targetCell = adjs[0].idx; // Shift target to nearest land
                        continue; // try again next frame
                    }
                }

                if (tc.ownerId !== p.ownerId) {
                    let isProtected = false;
                    if (tc.ownerId && defensesByOwner[tc.ownerId]) {
                        for (let d of defensesByOwner[tc.ownerId]) {
                            if (Math.hypot(d.x - tc.x, d.y - tc.y) <= 15) { isProtected = true; break; }
                        }
                    }
                    let multiplier = isProtected ? 10 : 1;
                    
                    let cellMaxHp = tc.ownerId ? 20 + (tc.building ? 20 : 0) : (tc.type === 'mountains' ? 50 : WILDERNESS_HP);
                    let effectivePayload = Math.floor(p.payload / multiplier);
                    if (effectivePayload < 1) effectivePayload = 1;
                    
                    let dmg = Math.min(tc.hp, effectivePayload);
                    tc.hp -= dmg;
                    
                    if (tc.hp <= 0) {
                        let excess = p.payload - (dmg * multiplier);
                        if (excess < 0) excess = 0;
                        let oldOwner = tc.ownerId;
                        if (oldOwner) {
                            players[oldOwner].lastAttackerId = p.ownerId;
                        }
                        setCellOwner(tc, p.ownerId);
                        tc.hp = 20;
                        setCellBuilding(tc, null);
                        
                        if (excess > 0) {
                            let cx = tc.x; let cy = tc.y;
                            let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                            let adjs = [
                                getSafe(cx+1, cy), getSafe(cx-1, cy),
                                getSafe(cx, cy+1), getSafe(cx, cy-1)
                            ].filter(c => c && c.type !== 'water' && c.ownerId !== p.ownerId);
                            
                            if (adjs.length > 0) {
                                let payloadPerDir = Math.floor(excess / adjs.length);
                                let remainder = excess % adjs.length;
                                let first = true;
                                
                                for (let j=0; j<adjs.length; j++) {
                                    let nextTarget = adjs[j];
                                    let pload = payloadPerDir + (first ? remainder : 0);
                                    if (pload <= 0) continue;
                                    
                                    let tx2 = nextTarget.x * CELL_SIZE + CELL_SIZE/2;
                                    let ty2 = nextTarget.y * CELL_SIZE + CELL_SIZE/2;
                                    let dx2 = tx2 - p.x; let dy2 = ty2 - p.y;
                                    let len = Math.sqrt(dx2*dx2 + dy2*dy2) || 1;
                                    let spd = p.type === 'ship' ? 1.5 : 2;
                                    
                                    if (first) {
                                        p.payload = pload;
                                        p.targetCell = nextTarget.idx;
                                        p.vx = (dx2/len)*spd;
                                        p.vy = (dy2/len)*spd;
                                        first = false;
                                    } else {
                                        particlesRef.current.push({
                                            x: p.x, y: p.y,
                                            vx: (dx2/len)*spd, vy: (dy2/len)*spd,
                                            life: 1, maxLife: 1, color: p.color,
                                            size: p.size, type: p.type, ownerId: p.ownerId,
                                            targetCell: nextTarget.idx, payload: pload
                                        });
                                    }
                                }
                                if (!first) continue; // we reused 'p', so skip destroying it
                            }
                            // If we didn't branch (adjs.length === 0 or payload too small), refund remainder
                            players[p.ownerId].pop += excess;
                        }
                    } else {
                        // hit spark removed
                    }
                } else {
                    players[p.ownerId].pop += p.payload; // Refund if hit own cell
                }
                particlesRef.current.splice(i, 1);
                continue;
            }
        } else {
            p.life -= 0.05 * dtScale;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }
    }

    // Process Nukes
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        let proj = projectilesRef.current[i];
        proj.progress += 0.01 * dtScale;
        proj.x = proj.startX + (proj.targetX - proj.startX) * proj.progress;
        proj.y = proj.startY + (proj.targetY - proj.startY) * proj.progress;
        spawnFX(proj.x, proj.y, '#fef08a', 2, 1);
        
        if (proj.progress >= 1) {
            sounds.nukeExplode();
            let tx = Math.floor(proj.targetX/CELL_SIZE);
            let ty = Math.floor(proj.targetY/CELL_SIZE);
            
            // detonate radius 5
            for (let y = ty - 5; y <= ty + 5; y++) {
                for (let x = tx - 5; x <= tx + 5; x++) {
                    let d = Math.sqrt((x-tx)**2 + (y-ty)**2);
                    if (d <= 5) {
                        let c = grid[getCellIndex(x, y)];
                        if (c && c.type !== 'water') {
                            setCellOwner(c, null);
                            setCellBuilding(c, null);
                            c.hp = c.type === 'mountains' ? 50 : WILDERNESS_HP;
                        }
                    }
                }
            }
            spawnFX(tx*CELL_SIZE, ty*CELL_SIZE, '#ffffff', 50, 10);
            spawnFX(tx*CELL_SIZE, ty*CELL_SIZE, '#f97316', 80, 6);
            pushNotification(`Nuclear Detonation!`);
            projectilesRef.current.splice(i, 1);
        }
    }

    // Process Trade Ships
    for (let i = tradeShipsRef.current.length - 1; i >= 0; i--) {
        let ts = tradeShipsRef.current[i];
        
        if (ts.path && ts.pathIndex !== undefined && ts.pathIndex < ts.path.length) {
            let targetNode = ts.path[ts.pathIndex];
            let tpx = targetNode.x * CELL_SIZE + CELL_SIZE/2;
            let tpy = targetNode.y * CELL_SIZE + CELL_SIZE/2;
            let dist = Math.hypot(tpx - ts.px, tpy - ts.py);
            
            let moveAmount = 2.0 * dtScale; // 2 pixels per tick
            
            if (dist <= moveAmount) {
                ts.px = tpx;
                ts.py = tpy;
                ts.pathIndex++;
                if (ts.pathIndex >= ts.path.length) {
                    ts.progress = 1.0;
                }
            } else {
                let ang = Math.atan2(tpy - ts.py, tpx - ts.px);
                ts.px += Math.cos(ang) * moveAmount;
                ts.py += Math.sin(ang) * moveAmount;
                ts.angle = ang;
            }
        } else {
            ts.progress += ts.speed * dtScale;
            ts.px = ts.sx + (ts.tx - ts.sx) * ts.progress;
            ts.py = ts.sy + (ts.ty - ts.sy) * ts.progress;
            ts.angle = Math.atan2(ts.ty - ts.sy, ts.tx - ts.sx);
        }

        if (ts.progress >= 1) {
            let p = playersRef.current[ts.ownerId];
            if (p && p.status !== 'dead') {
                p.gold += 130000;
                if (p.id === myId) {
                    pushNotification("Trade ship arrived! +130k Gold");
                    particlesRef.current.push({
                        x: ts.tx, y: ts.ty - 10,
                        vx: 0, vy: -0.5,
                        life: 1.0, maxLife: 1.0,
                        color: '#fde047', size: 10, type: 'fx', text: "+130K"
                    });
                }
            }
            tradeShipsRef.current.splice(i, 1);
        }
    }

    // Process Trains
    for (let i = trainsRef.current.length - 1; i >= 0; i--) {
        let t = trainsRef.current[i];
        t.progress += t.speed * dtScale;
        if (t.progress >= 1) {
            let p = playersRef.current[t.ownerId];
            if (p && p.status !== 'dead') {
                let count = 0;
                // Quick count hack
                for (let j of activeCellsRef.current) {
                    if (gridRef.current[j].ownerId === p.id) count++;
                }
                // Reward scaled by distance travelled and empire size
                let dist = Math.hypot(t.tx-t.sx, t.ty-t.sy) / CELL_SIZE;
                let reward = 5000 + (Math.floor(dist) * 50);
                p.gold += reward;
                // Show floating text if it's the player
                if (p.id === myId) {
                    let textAmount = reward >= 1000 ? `+${(reward/1000).toFixed(1)}K` : `+${Math.floor(reward)}`;
                    particlesRef.current.push({
                        x: t.tx, y: t.ty - 10,
                        vx: 0, vy: -0.5,
                        life: 1.0, maxLife: 1.0,
                        color: '#fbbf24', size: 10, type: 'fx', text: textAmount
                    });
                }
            }
            trainsRef.current.splice(i, 1);
        } else {
            let dx = t.tx - t.sx;
            let dy = t.ty - t.sy;
            let adx = Math.abs(dx);
            let ady = Math.abs(dy);
            let totalD = adx + ady;
            if (totalD === 0) totalD = 1;
            let pX = adx / totalD; // fraction of distance/time spent on X axis

            if (t.progress <= pX && pX > 0) {
                // Moving on X axis
                t.px = t.sx + dx * (t.progress / pX);
                t.py = t.sy;
                t.angle = dx > 0 ? 0 : Math.PI;
            } else {
                // Moving on Y axis
                t.px = t.tx;
                let yProg = pX < 1 ? (t.progress - pX) / (1 - pX) : 1;
                t.py = t.sy + dy * yProg;
                t.angle = dy > 0 ? Math.PI/2 : -Math.PI/2;
            }
        }
    }

  };

  const gameTick = () => {
    frameCountRef.current++;
    let grid = gridRef.current;
    let players = playersRef.current;

    let cellsByOwner: Record<string, Cell[]> = {};
    let bordersByOwner: Record<string, Cell[]> = {};
    let countsByOwner: Record<string, any> = {};
    let defensesByOwner: Record<string, Cell[]> = {};
    let shipsByOwner: Record<string, number> = {};
    let allPorts: Cell[] = [];

    tradeShipsRef.current.forEach(ts => {
        shipsByOwner[ts.ownerId] = (shipsByOwner[ts.ownerId] || 0) + 1;
    });

    for (const idx of activeCellsRef.current) {
        let c = grid[idx];
        if (c.building === 'port') allPorts.push(c);
        if (c.ownerId) {
            if (!cellsByOwner[c.ownerId]) {
                cellsByOwner[c.ownerId] = [];
                countsByOwner[c.ownerId] = { city:0, factory:0, port:0, defense:0, silo:0 };
                defensesByOwner[c.ownerId] = [];
            }
            cellsByOwner[c.ownerId].push(c);
            if (c.building) {
                 countsByOwner[c.ownerId][c.building] = (countsByOwner[c.ownerId][c.building] || 0) + 1;
                 if (c.building === 'defense') {
                     defensesByOwner[c.ownerId].push(c);
                 }
            }
            if (c.isBorder) {
                if (!bordersByOwner[c.ownerId]) bordersByOwner[c.ownerId] = [];
                bordersByOwner[c.ownerId].push(c);
            }
        }
    }

    Object.values(players).forEach((p: Player) => {
      if (p.status !== 'alive') return;
      
      let myCells = cellsByOwner[p.id] || [];
      if (myCells.length === 0 && gameState === 'playing') {
          p.status = 'dead';
          sounds.eliminate();
          if (p.id === myId) setGameState('gameover');
          
          if (p.lastAttackerId && players[p.lastAttackerId]) {
              players[p.lastAttackerId].gold += p.gold;
              players[p.lastAttackerId].pop += p.maxPop; // "dann bekomme ich die zu geschikte troops zuruck"
          }
          return;
      }
      
      let prevPop = p.pop;
      
      let counts = countsByOwner[p.id] || { city:0, factory:0, port:0, defense:0, silo:0, nuke: 0 };
      
      p.landCount = myCells.length;
      p.buildingCounts = counts;
      p.tradeShipCount = shipsByOwner[p.id] || 0;

      let cityCount = counts.city || 0;
      let factoryCount = counts.factory || 0;
      let siloCount = counts.silo || 0;
      let defenseCount = counts.defense || 0;
      let portCount = counts.port || 0;

      // Growth
      p.maxPop = 2500 + Math.floor(myCells.length * 2.5) + (cityCount * 25000);
      let ratio = p.maxPop > 0 ? (p.pop / p.maxPop) : 0;
      
      let growthPerSec = 0;
      
      let landIncome = myCells.length * 1.2;
      let popInterest = p.pop * 0.05;
      let baseGrowth = 25 + landIncome + popInterest + (cityCount * 400);
      
      if (ratio < 0.8) {
          growthPerSec = baseGrowth; // Fast growth, continuously goes up as pop grows
      } else if (ratio <= 1.0) {
          let slowdownRatio = (1.0 - ratio) / 0.2;
          growthPerSec = baseGrowth * slowdownRatio; // Slowly comes down to 0 at 100%
      } else {
          growthPerSec = -p.pop * 0.02; // slowly decays if over 100% capacity
      }

      if (myCells.length === 0) growthPerSec = 0; // dead
      let troopsGain = growthPerSec / 60;
      let realGrowth = growthPerSec; // for UI, show per second
      p.growth = realGrowth;
      p.pop += troopsGain;
      if (p.pop > p.maxPop) {
          // decay overcap smoothly
          p.pop -= Math.max(1, (p.pop - p.maxPop) * 0.05);
      }
      
      // Economy
      let resourceIncome = myCells.filter(c => c.resource === 'gold').length * 25;
      let income = (myCells.length * 0.1) + (cityCount * 2) + (factoryCount * 5) + resourceIncome;
      p.gold += income;

      // Trains (Eisenbahnen)
      if (factoryCount > 0) {
          let networks = myCells.filter(c => c.building === 'city' || c.building === 'factory' || c.building === 'port');
          if (networks.length > 1) {
              let f = networks.filter(c => c.building === 'factory' && (!c.lastTrainOut || Date.now() - c.lastTrainOut > 15000));
              if (f.length > 0) {
                  let src = f[Math.floor(Math.random() * f.length)];
                  let dests = networks.filter(c => c.idx !== src.idx && Math.hypot(c.x - src.x, c.y - src.y) <= 60);
                  if (dests.length > 0) {
                      let dest = dests[Math.floor(Math.random() * dests.length)];
                      src.lastTrainOut = Date.now();
                      let sx = src.x * CELL_SIZE + CELL_SIZE/2;
                      let sy = src.y * CELL_SIZE + CELL_SIZE/2;
                      let tx = dest.x * CELL_SIZE + CELL_SIZE/2;
                      let ty = dest.y * CELL_SIZE + CELL_SIZE/2;
                      trainsRef.current.push({
                          id: Math.random(), ownerId: p.id,
                          sx, sy, tx, ty, px: sx, py: sy,
                          progress: 0, speed: Math.max(0.005, 1.5 / Math.max(1, Math.hypot(tx-sx, ty-sy)))
                      });
                  }
              }
          }
      }

      // Trade Ships
      if (portCount > 0 && allPorts.length > 1) {
          let myPorts = myCells.filter(c => c.building === 'port' && (!c.lastTradeOut || Date.now() - c.lastTradeOut > 20000));
          if (myPorts.length > 0) {
              let foreignPorts = allPorts.filter(c => c.ownerId !== p.id);
              if (foreignPorts.length > 0) {
                  let src = myPorts[Math.floor(Math.random() * myPorts.length)];
                  
                  // Shuffle foreignPorts
                  foreignPorts.sort(() => 0.5 - Math.random());
                  
                  let path: {x:number, y:number}[] | null = null;
                  let dest: Cell | null = null;
                  for (let fp of foreignPorts) {
                      path = findWaterPath(src.x, src.y, fp.x, fp.y);
                      if (path) {
                          dest = fp;
                          break;
                      }
                  }

                  if (path && dest) {
                      src.lastTradeOut = Date.now();
                      let sx = path[0].x * CELL_SIZE + CELL_SIZE/2;
                      let sy = path[0].y * CELL_SIZE + CELL_SIZE/2;
                      let tx = path[path.length-1].x * CELL_SIZE + CELL_SIZE/2;
                      let ty = path[path.length-1].y * CELL_SIZE + CELL_SIZE/2;
                      tradeShipsRef.current.push({
                          id: Math.random(), ownerId: p.id,
                          sx, sy, tx, ty, px: sx, py: sy,
                          progress: 0, speed: Math.max(0.002, 1.0 / Math.max(1, path.length * 10)),
                          path: path, pathIndex: 0
                      });
                  } else {
                      // mark it so we don't spam pathfinding if isolated
                      src.lastTradeOut = Date.now() - 15000; // try again in 5s
                  }
              }
          }
      }

      if (p.id === myId) {
          setUiState({ 
              pop: Math.floor(p.pop), 
              maxPop: Math.floor(p.maxPop), 
              gold: Math.floor(p.gold), 
              growth: Math.floor(realGrowth),
              counts: { city: cityCount, factory: factoryCount, defense: defenseCount, port: portCount, silo: siloCount, nuke: 0 }
          });
      }

      // Path finding & Attack Logic
      let myBorders: {src: Cell, dest: Cell}[] | null = null;
      const getMyBorders = () => {
          if (!myBorders) {
              myBorders = [];
              let borderCells = bordersByOwner[p.id] || [];
              for(let i=0; i<borderCells.length; i++) {
                  let c = borderCells[i];
                  let cx = c.x;
                  let cy = c.y;
                  let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                  let adjs = [
                      getSafe(cx+1, cy), getSafe(cx-1, cy), getSafe(cx, cy+1), getSafe(cx, cy-1),
                      getSafe(cx+1, cy+1), getSafe(cx-1, cy-1), getSafe(cx+1, cy-1), getSafe(cx-1, cy+1)
                  ];
                  for(let j=0; j<adjs.length; j++) {
                      let adj = adjs[j];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') {
                          myBorders.push({src: c, dest: adj});
                      }
                  }
              }
          }
          return myBorders;
      };

      if (gameState === 'playing') {
          for (let i = p.offensiveWaves.length - 1; i >= 0; i--) {
              let wave = p.offensiveWaves[i];
              if (wave.troops <= 0) {
                  p.offensiveWaves.splice(i, 1);
                  continue;
              }
              
              if (myCells.length === 0) continue;

              if (wave.type === 'naval' && wave.navalSrc) {
                  let fromCell = grid[getCellIndex(wave.navalSrc.x, wave.navalSrc.y)];
                  // Check if we still own this coastal cell or find a new one
                  if (!fromCell || fromCell.ownerId !== p.id) {
                      let myCells = cellsByOwner[p.id] || [];
                      let newCoastal = myCells.find(c => {
                          let adjs = [grid[c.idx+1], grid[c.idx-1], grid[c.idx+GRID_W], grid[c.idx-GRID_W]];
                          return adjs.some(a => a && a.type === 'water');
                      });
                      if (newCoastal) {
                          wave.navalSrc = {x: newCoastal.x, y: newCoastal.y};
                          fromCell = newCoastal;
                      } else {
                          // Lost all coast, refund
                          p.pop += wave.troops;
                          p.offensiveWaves.splice(i, 1);
                          continue;
                      }
                  }

                  let maxDispatch = Math.min(wave.troops, Math.max(500, Math.floor(wave.troops * 0.5)));
                  let amount = Math.min(wave.troops, maxDispatch || 1);
                  if (amount > 0) {
                      let toCell = grid[getCellIndex(wave.target.x, wave.target.y)];
                      if (fromCell && toCell) {
                          dispatchShip(fromCell, toCell, p.id, amount);
                          wave.troops -= amount;
                      } else {
                          p.offensiveWaves.splice(i, 1);
                      }
                  }
                  continue;
              }

              let borders = getMyBorders();
              
              if (borders.length === 0) {
                  // nowhere to expand, refund troops
                  p.pop += wave.troops;
                  p.offensiveWaves.splice(i, 1);
                  continue;
              }

              let tgX = wave.target.x;
              let tgY = wave.target.y;
              let tgOwner = wave.targetOwnerId !== undefined ? wave.targetOwnerId : null;

              let matchingBorders = borders.filter(b => b.dest.ownerId === tgOwner);
              if (matchingBorders.length === 0) {
                  // We lost the border to this owner (or conquered them completely)
                  p.pop += wave.troops;
                  p.offensiveWaves.splice(i, 1);
                  continue;
              } else {
                  // Random shuffle will cause expansion in all directions into the target territory
                  matchingBorders.sort(() => 0.5 - Math.random());
              }

              // Process progressive expansion per tick
              if (wave.troops > 0) {
                  let maxDispatch = Math.min(wave.troops, Math.max(5000, Math.floor(wave.troops * 0.9)));
                  let currentBorders = matchingBorders.slice();
                  let expanded = 0;
                  let visited = new Set<number>();
                  let queued = new Set<number>();
                  for (let b of currentBorders) queued.add(b.dest.idx);
                  
                  let maxExpandPerTick = Math.max(10, Math.min(200, Math.ceil(wave.troops / 50)));

                  while(wave.troops > 0 && maxDispatch > 0 && currentBorders.length > 0 && expanded < maxExpandPerTick) {
                      let tc = currentBorders.shift()!.dest;
                      if (!tc || tc.type === 'water' || tc.ownerId === p.id || visited.has(tc.idx)) continue;
                      visited.add(tc.idx);
                      
                      let isProtected = false;
                      if (tc.ownerId && defensesByOwner[tc.ownerId]) {
                          for (let d of defensesByOwner[tc.ownerId]) {
                              if (Math.hypot(d.x - tc.x, d.y - tc.y) <= 15) { isProtected = true; break; }
                          }
                      }
                      let multiplier = isProtected ? 10 : 1;
                      
                      let cellMaxHp = tc.ownerId ? 20 + (tc.building ? 20 : 0) : (tc.type === 'mountains' ? 50 : WILDERNESS_HP);
                      let maxAffordable = Math.floor(wave.troops / multiplier);
                      let attackAmount = Math.min(maxDispatch, Math.max(1, Math.min(maxAffordable, cellMaxHp)));
                      
                      if (attackAmount < 1 && tc.hp > 0) {
                          // Out of troops to break defense
                          wave.troops = 0;
                          continue;
                      }

                      wave.troops -= attackAmount * multiplier;
                      maxDispatch -= attackAmount * multiplier;
                      tc.hp -= attackAmount;
                      expanded++;
                      
                      if (tc.hp <= 0) {
                          let excess = -tc.hp;
                          let oldOwner = tc.ownerId;
                          if (oldOwner) {
                              players[oldOwner].lastAttackerId = p.id;
                          }
                          setCellOwner(tc, p.id);
                          tc.hp = 20;
                          setCellBuilding(tc, null);
                          
                          if (excess > 0) {
                              wave.troops += excess;
                              maxDispatch += excess;
                          }
                          
                          // push new neighbors
                          let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                          let adjs = [
                             getSafe(tc.x+1, tc.y), getSafe(tc.x-1, tc.y), getSafe(tc.x, tc.y+1), getSafe(tc.x, tc.y-1),
                             getSafe(tc.x+1, tc.y+1), getSafe(tc.x-1, tc.y-1), getSafe(tc.x+1, tc.y-1), getSafe(tc.x-1, tc.y+1)
                          ];
                          for(let a of adjs) {
                              if (a && a.type !== 'water' && a.ownerId !== p.id && !queued.has(a.idx) && a.ownerId === tgOwner) {
                                  currentBorders.push({src: tc, dest: a});
                                  queued.add(a.idx);
                              }
                          }
                      }
                  }
              }

              if (wave.troops <= 0) {
                  p.offensiveWaves.splice(i, 1);
              }
          }
      }

      // Auto-Expand and AI Logic
      if (gameState === 'playing' && myCells.length > 0) {
          if (p.isAI) {
              if (Math.random() < 0.05 && p.pop > 100) {
                  let autoTargetForce = Math.floor(p.pop * 0.3);
                  let currentBorders = getMyBorders();
                  if (currentBorders.length > 0) {
                      let bestBorder = currentBorders[0];
                      let maxScore = -99999;
                      
                      for (let b of currentBorders) {
                          let cell = grid[b.dest.idx];
                          let score = Math.random() * 20; // Base random factor
                          
                          // Priorities based on map layout and player tactics
                          if (cell.resource === 'gold') score += 100;
                          if (cell.resource === 'oil') score += 50;
                          if (!cell.ownerId && cell.hp < 15) score += 30; // easy to take
                          
                          if (cell.ownerId === 'p1') {
                              if (p.pop > p.maxPop * 0.6) score += 120; // Attack player aggressively if strong
                              else score -= 40; // Avoid player if weak
                          }
                          
                          if (cell.building === 'city' || cell.building === 'factory') score += 150;
                          if (cell.building === 'silo' || cell.building === 'defense') score += 200; // Prioritize strategic targets
                          
                          if (score > maxScore) {
                              maxScore = score;
                              bestBorder = b;
                          }
                      }
                      
                      p.pop -= autoTargetForce;
                      p.offensiveWaves.push({ troops: autoTargetForce, target: {x: bestBorder.dest.x, y: bestBorder.dest.y}, targetOwnerId: bestBorder.dest.ownerId });
                  }
              }

              // AI Building Logic (Limit how often AI tries to build so it's not spamming sounds & state)
              if (frameCountRef.current % 60 === 0 && Math.random() < 0.2) {
                  let emptyCells = myCells.filter(c => !c.building);
                  if (emptyCells.length > 0) {
                      // Shuffle
                      emptyCells.sort(() => 0.5 - Math.random());
                      let targetCell = emptyCells[0];
                      let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                      
                      // Helper to place building silently
                      const buildAI = (type: any) => {
                          targetCell.building = type;
                          activeCellsRef.current.add(targetCell.idx);
                      }

                      // Nuke
                      if (p.gold >= 500000 && Math.random() < 0.05) {
                          let allSilos = myCells.filter(c => c.building === 'silo');
                          let readySilos = allSilos.filter(c => !c.lastFired || Date.now() - c.lastFired > 15000);
                          if (readySilos.length > 0) {
                              let enemyCells = grid.filter(c => c.ownerId && c.ownerId !== p.id);
                              if (enemyCells.length > 0) {
                                  enemyCells.sort(() => 0.5 - Math.random());
                                  let target = enemyCells[0];
                                  p.gold -= 500000;
                                  readySilos[0].lastFired = Date.now();
                                  let wx = target.x*CELL_SIZE; let wy = target.y*CELL_SIZE;
                                  projectilesRef.current.push({ id: nextProjId.current++, startX: readySilos[0].x*CELL_SIZE, startY: readySilos[0].y*CELL_SIZE, x: readySilos[0].x*CELL_SIZE, y: readySilos[0].y*CELL_SIZE, targetX: wx, targetY: wy, type: 'nuke', ownerId: p.id, progress: 0 });
                              }
                          }
                      } 
                      // Silo
                      else if (p.gold >= 250000 && siloCount < 3 && Math.random() < 0.1) {
                          p.gold -= 250000; buildAI('silo');
                      }
                      // City
                      else if (p.gold >= 250000 && p.pop >= p.maxPop * 0.8 && Math.random() < 0.4) {
                          p.gold -= 250000; p.maxPop += 25000; buildAI('city');
                      }
                      // Factory
                      else if (p.gold >= 125000 && cityCount >= factoryCount*2 && Math.random() < 0.5) {
                          p.gold -= 125000; buildAI('factory');
                      }
                      // Port
                      else if (p.gold >= 100000 && Math.random() < 0.2) {
                          let adjsW = [
                              getSafe(targetCell.x+1,targetCell.y), getSafe(targetCell.x-1,targetCell.y),
                              getSafe(targetCell.x,targetCell.y+1), getSafe(targetCell.x,targetCell.y-1)
                          ];
                          let wNode = adjsW.find(a => a && a.type === 'water');
                          if (wNode && isWaterOpen(wNode.x, wNode.y)) {
                              p.gold -= 100000; buildAI('port');
                          }
                      }
                      // Defense
                      else if (p.gold >= 50000 && Math.random() < 0.3) {
                          p.gold -= 50000; buildAI('defense');
                      }
                  }
              }
          }
      }
    });
    
      };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000000'; // Dark void background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraRef.current.x, -cameraRef.current.y);

    const grid = gridRef.current;
    const players = playersRef.current;

    if (bgCanvasRef.current) {
        ctx.drawImage(bgCanvasRef.current, 0, 0);
    }

    const centers: Record<string, { x: number, y: number, count: number }> = {};
    
    let cellsByColor: Record<string, Cell[]> = {};
    let bordersByColor: Record<string, Cell[]> = {};
    let buildingsToDraw: Cell[] = [];

    for (let idx of activeCellsRef.current) {
        const c = grid[idx];
        if (c.ownerId && players[c.ownerId]) {
            let color = players[c.ownerId].color;
            if (!cellsByColor[color]) cellsByColor[color] = [];
            cellsByColor[color].push(c);

            if (!centers[c.ownerId]) centers[c.ownerId] = { x: 0, y: 0, count: 0 };
            centers[c.ownerId].x += c.x;
            centers[c.ownerId].y += c.y;
            centers[c.ownerId].count++;

            if (c.isBorder) {
                if (!bordersByColor[color]) bordersByColor[color] = [];
                bordersByColor[color].push(c);
            }
        }
        if (c.building) {
            buildingsToDraw.push(c);
        }
    }

    // Draw ownership fills
    ctx.globalAlpha = 0.3;
    for (const color in cellsByColor) {
        ctx.fillStyle = color;
        for (const c of cellsByColor[color]) {
            ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }

    // Draw ownership borders (higher opacity)
    ctx.globalAlpha = 0.85;
    for (const color in bordersByColor) {
        ctx.fillStyle = color;
        for (const c of bordersByColor[color]) {
            ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
    }
    ctx.globalAlpha = 1.0;

    // Draw defense visual coverage
    ctx.lineWidth = 2 / zoom;
    for (const c of buildingsToDraw) {
        if (c.building === 'defense') {
            const cx = c.x * CELL_SIZE + CELL_SIZE / 2;
            const cy = c.y * CELL_SIZE + CELL_SIZE / 2;
            const radiusPx = 15 * CELL_SIZE;

            ctx.fillStyle = players[c.ownerId!] ? players[c.ownerId!].color : '#ffffff';
            ctx.globalAlpha = 0.15;
            ctx.beginPath();
            ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 0.4;
            ctx.strokeStyle = ctx.fillStyle;
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1.0;

    for (const c of buildingsToDraw) {
        const cx = c.x * CELL_SIZE + CELL_SIZE/2; 
        const cy = c.y * CELL_SIZE + CELL_SIZE/2;
        const s = 10; // larger icon size
        ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#000000'; ctx.lineWidth = Math.max(0.5, 1.5/zoom); 
        
        ctx.beginPath();
        if (c.building === 'city') {
            ctx.rect(cx - s*0.4, cy - s*0.6, s*0.4, s*1.1); // tall building left
            ctx.rect(cx, cy - s*0.2, s*0.4, s*0.7); // short building right
            ctx.fill(); ctx.stroke();
            
            // Windows
            ctx.fillStyle = '#000000';
            ctx.fillRect(cx - s*0.25, cy - s*0.4, s*0.1, s*0.15);
            ctx.fillRect(cx - s*0.25, cy - s*0.1, s*0.1, s*0.15);
            ctx.fillRect(cx - s*0.25, cy + s*0.2, s*0.1, s*0.15);
            ctx.fillRect(cx + s*0.15, cy, s*0.1, s*0.15);
            ctx.fillRect(cx + s*0.15, cy + s*0.3, s*0.1, s*0.15);
        } else if (c.building === 'factory') {
            ctx.rect(cx - s*0.6, cy - s*0.1, s*1.2, s*0.6); // base
            ctx.fill(); ctx.stroke();
            
            ctx.beginPath();
            ctx.rect(cx - s*0.4, cy - s*0.6, s*0.15, s*0.5); // Smoke stack 1
            ctx.rect(cx + s*0.1, cy - s*0.8, s*0.15, s*0.7); // Smoke stack 2
            ctx.fill(); ctx.stroke();
            
            // smoke bubbles
            ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
            ctx.beginPath(); ctx.arc(cx - s*0.3, cy - s*0.7, s*0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + s*0.2, cy - s*0.9, s*0.2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(cx + s*0.25, cy - s*1.1, s*0.15, 0, Math.PI*2); ctx.fill();
        } else if (c.building === 'silo') {
            // Launch pad base
            ctx.fillStyle = '#888888';
            ctx.beginPath();
            ctx.rect(cx - s*0.5, cy + s*0.2, s*1.0, s*0.3);
            ctx.fill(); ctx.stroke();

            // Rocket body
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.rect(cx - s*0.15, cy - s*0.6, s*0.3, s*0.8);
            ctx.fill(); ctx.stroke();
            
            // Rocket nose
            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.moveTo(cx - s*0.15, cy - s*0.6);
            ctx.lineTo(cx, cy - s*1.0);
            ctx.lineTo(cx + s*0.15, cy - s*0.6);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            
            // Rocket fins
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(cx - s*0.15, cy);
            ctx.lineTo(cx - s*0.35, cy + s*0.2);
            ctx.lineTo(cx - s*0.15, cy + s*0.2);
            ctx.fill(); ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(cx + s*0.15, cy);
            ctx.lineTo(cx + s*0.35, cy + s*0.2);
            ctx.lineTo(cx + s*0.15, cy + s*0.2);
            ctx.fill(); ctx.stroke();
        } else if (c.building === 'port') {
            // dock
            ctx.fillStyle = '#8b5a2b'; // brown dock
            ctx.fillRect(cx - s*0.4, cy - s*0.1, s*0.8, s*0.4);
            ctx.strokeRect(cx - s*0.4, cy - s*0.1, s*0.8, s*0.4);
            // anchor icon
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(cx, cy - s*0.3, s*0.15, 0, Math.PI*2);
            ctx.moveTo(cx, cy - s*0.15);
            ctx.lineTo(cx, cy + s*0.5);
            ctx.moveTo(cx - s*0.2, cy + s*0.1);
            ctx.lineTo(cx + s*0.2, cy + s*0.1);
            ctx.moveTo(cx - s*0.3, cy + s*0.2);
            ctx.quadraticCurveTo(cx, cy + s*0.6, cx + s*0.3, cy + s*0.2);
            ctx.stroke();
            ctx.lineWidth = Math.max(0.5, 1.5/zoom);
        } else if (c.building === 'defense') {
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.moveTo(cx, cy - s*0.5);
            ctx.lineTo(cx + s*0.4, cy - s*0.3);
            ctx.lineTo(cx + s*0.4, cy + s*0.3);
            ctx.lineTo(cx, cy + s*0.5);
            ctx.lineTo(cx - s*0.4, cy + s*0.3);
            ctx.lineTo(cx - s*0.4, cy - s*0.3);
            ctx.closePath();
            ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#cbd5e1';
            ctx.beginPath();
            ctx.moveTo(cx, cy - s*0.3);
            ctx.lineTo(cx + s*0.2, cy - s*0.15);
            ctx.lineTo(cx + s*0.2, cy + s*0.15);
            ctx.lineTo(cx, cy + s*0.3);
            ctx.lineTo(cx - s*0.2, cy + s*0.15);
            ctx.lineTo(cx - s*0.2, cy - s*0.15);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.arc(cx, cy, s*0.4, 0, Math.PI*2);
            ctx.fill(); ctx.stroke();
        }
    }

    // Persistent Train Tracks
    const networkCells = buildingsToDraw.filter(c => c.building === 'city' || c.building === 'factory' || c.building === 'port');
    
    // Track Base
    ctx.strokeStyle = '#475569';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < networkCells.length; i++) {
        const c1 = networkCells[i];
        const cx1 = c1.x * CELL_SIZE + CELL_SIZE/2;
        const cy1 = c1.y * CELL_SIZE + CELL_SIZE/2;
        for (let j = i + 1; j < networkCells.length; j++) {
            const c2 = networkCells[j];
            if ((c1.building === 'factory' || c2.building === 'factory') && c1.ownerId === c2.ownerId && Math.hypot(c1.x - c2.x, c1.y - c2.y) <= 60) {
                 ctx.moveTo(cx1, cy1);
                 ctx.lineTo(c2.x * CELL_SIZE + CELL_SIZE/2, cy1);
                 ctx.lineTo(c2.x * CELL_SIZE + CELL_SIZE/2, c2.y * CELL_SIZE + CELL_SIZE/2);
            }
        }
    }
    ctx.stroke();

    // Track Sleepers (Colored by player)
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i < networkCells.length; i++) {
        const c1 = networkCells[i];
        if (!players[c1.ownerId!]) continue;
        const pColor = players[c1.ownerId!].color;
        const cx1 = c1.x * CELL_SIZE + CELL_SIZE/2;
        const cy1 = c1.y * CELL_SIZE + CELL_SIZE/2;
        ctx.beginPath();
        ctx.strokeStyle = pColor;
        for (let j = i + 1; j < networkCells.length; j++) {
            const c2 = networkCells[j];
            if ((c1.building === 'factory' || c2.building === 'factory') && c1.ownerId === c2.ownerId && Math.hypot(c1.x - c2.x, c1.y - c2.y) <= 60) {
                 ctx.moveTo(cx1, cy1);
                 ctx.lineTo(c2.x * CELL_SIZE + CELL_SIZE/2, cy1);
                 ctx.lineTo(c2.x * CELL_SIZE + CELL_SIZE/2, c2.y * CELL_SIZE + CELL_SIZE/2);
            }
        }
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1.0;

    // Draw Particles & Projectiles
    tradeShipsRef.current.forEach(ts => {
        let pColor = playersRef.current[ts.ownerId]?.color || '#fff';
        ctx.beginPath();
        ctx.arc(ts.px, ts.py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fde047'; // yellow gold dot for trade ship
        ctx.fill();
        ctx.strokeStyle = pColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    });

    trainsRef.current.forEach(t => {
        let pColor = playersRef.current[t.ownerId]?.color || '#fff';
        
        // Train cart
        ctx.save();
        ctx.translate(t.px, t.py);
        ctx.rotate(t.angle !== undefined ? t.angle : Math.atan2(t.ty - t.sy, t.tx - t.sx));
        ctx.fillStyle = pColor;
        ctx.fillRect(-8, -4, 16, 8); // chassis
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, -3, 6, 6); // cabin
        ctx.fillStyle = '#facc15';
        ctx.fillRect(7, -2, 2, 4); // headlights
        ctx.restore();
    });

    projectilesRef.current.forEach(proj => {
        ctx.fillStyle = '#fef08a'; ctx.beginPath();
        ctx.arc(proj.x, proj.y, 6, 0, Math.PI*2); ctx.fill();
    });
    particlesRef.current.forEach(p => {
        ctx.fillStyle = p.color;
        if(p.type === 'fx') ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath(); 
        
        if (p.type === 'ship') {
            if (p.path && p.path.length > 0) {
                ctx.save();
                ctx.strokeStyle = p.color;
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 1;
                ctx.setLineDash([2, 2]);
                ctx.beginPath();
                ctx.moveTo(p.path[0].x, p.path[0].y);
                for(let i=1; i<p.path.length; i++) ctx.lineTo(p.path[i].x, p.path[i].y);
                ctx.lineTo(p.x, p.y);
                ctx.stroke();
                ctx.restore();
                ctx.beginPath();
            }
            // Draw a tiny boat
            ctx.moveTo(p.x - p.size, p.y - p.size);
            ctx.lineTo(p.x + p.size, p.y - p.size);
            ctx.lineTo(p.x + p.size/2, p.y + p.size);
            ctx.lineTo(p.x - p.size/2, p.y + p.size);
        } else {
            ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
        }
        
        ctx.fill();
        ctx.globalAlpha = 1.0;
    });

    // Centers / Text
    Object.keys(centers).forEach(pid => {
        const center = centers[pid];
        if (center.count > 0 && players[pid].status === 'alive') {
            const avgX = center.x / center.count;
            const avgY = center.y / center.count;
            
            let bestX = avgX;
            let bestY = avgY;
            
            const color = players[pid].color;
            if (cellsByColor[color]) {
                let minD = Infinity;
                for (let i=0; i<cellsByColor[color].length; i++) {
                    let c = cellsByColor[color][i];
                    if (c.ownerId === pid) {
                        let dx = c.x - avgX;
                        let dy = c.y - avgY;
                        let d = dx*dx + dy*dy;
                        if (d < minD) {
                            minD = d;
                            bestX = c.x;
                            bestY = c.y;
                        }
                    }
                }
            }

            const cx = bestX * CELL_SIZE + CELL_SIZE/2;
            const cy = bestY * CELL_SIZE + CELL_SIZE/2;
            
            ctx.fillStyle = 'white';
            const fontSize = Math.max(1.5, Math.min(30, Math.sqrt(center.count) * 0.3));
            ctx.font = `bold ${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'black';
            ctx.shadowBlur = Math.max(1, fontSize / 4);
            ctx.fillText(players[pid].name, cx, cy - fontSize * 0.1);
            
            ctx.font = `${fontSize * 0.6}px monospace`;
            ctx.fillText(Math.floor(players[pid].pop).toString(), cx, cy + fontSize * 0.8);
            ctx.shadowBlur = 0;
            ctx.textBaseline = 'alphabetic';
            
            // Draw Target Path
            if (players[pid].offensiveWaves.length > 0 && pid === myId) {
                const target = players[pid].offensiveWaves[0].target;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(target.x * CELL_SIZE + CELL_SIZE/2, target.y * CELL_SIZE + CELL_SIZE/2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    });

    // Draw range indicator if hovering
    if (hoveredMouseRef.current) {
        const { gridX, gridY } = hoveredMouseRef.current;
        if (gridX >= 0 && gridX < GRID_W && gridY >= 0 && gridY < GRID_H) {
             const cx = gridX * CELL_SIZE + CELL_SIZE/2;
             const cy = gridY * CELL_SIZE + CELL_SIZE/2;
             
             if (selectedActionRef.current === 'factory') {
                 ctx.beginPath();
                 ctx.arc(cx, cy, 60 * CELL_SIZE, 0, Math.PI * 2);
                 ctx.fillStyle = 'rgba(134, 239, 172, 0.1)';
                 ctx.fill();
                 ctx.strokeStyle = 'rgba(134, 239, 172, 0.5)';
                 ctx.setLineDash([4, 4]);
                 ctx.lineWidth = 1;
                 ctx.stroke();
                 
                 // Draw lines to connectable targets in range
                 let networks = grid.filter(c => c.ownerId === myId && (c.building === 'city' || c.building === 'factory' || c.building === 'port'));
                 ctx.strokeStyle = 'rgba(134, 239, 172, 0.8)';
                 ctx.beginPath();
                 for (let c of networks) {
                     if (Math.hypot(c.x - gridX, c.y - gridY) <= 60) {
                         ctx.moveTo(cx, cy);
                         ctx.lineTo(c.x * CELL_SIZE + CELL_SIZE/2, cy);
                         ctx.lineTo(c.x * CELL_SIZE + CELL_SIZE/2, c.y * CELL_SIZE + CELL_SIZE/2);
                     }
                 }
                 ctx.stroke();
                 ctx.setLineDash([]);
             } else if (selectedActionRef.current === 'defense') {
                 const cx = gridX * CELL_SIZE + CELL_SIZE / 2;
                 const cy = gridY * CELL_SIZE + CELL_SIZE / 2;
                 const radiusPx = 15 * CELL_SIZE;

                 ctx.fillStyle = 'rgba(14, 165, 233, 0.15)'; // tailwind sky-500
                 ctx.beginPath();
                 ctx.arc(cx, cy, radiusPx, 0, Math.PI * 2);
                 ctx.fill();

                 ctx.globalAlpha = 0.4;
                 ctx.strokeStyle = 'rgba(14, 165, 233, 1)';
                 ctx.lineWidth = 2 / zoom;
                 ctx.stroke();
                 ctx.globalAlpha = 1.0;
             } else if (selectedActionRef.current === 'port') {
                 let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? grid[y * GRID_W + x] : null;
                 let adjs = [
                     getSafe(gridX+1,gridY), getSafe(gridX-1,gridY),
                     getSafe(gridX,gridY+1), getSafe(gridX,gridY-1),
                     getSafe(gridX-1,gridY-1), getSafe(gridX+1,gridY-1),
                     getSafe(gridX-1,gridY+1), getSafe(gridX+1,gridY+1)
                 ];
                 let isCoast = adjs.some(a => a && a.type === 'water');
                 ctx.fillStyle = isCoast ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.4)';
                 ctx.fillRect(gridX * CELL_SIZE - 1, gridY * CELL_SIZE - 1, CELL_SIZE + 2, CELL_SIZE + 2);
             }
        }
    }

    ctx.restore();

    // No minimap
  };

    // Need lastFrameTimeRef
  const lastFrameTimeRef = useRef<number>(0);
useEffect(() => {
    let animationId: number;
    const loop = (time: number) => {
      
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      let dt = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      // Cap dt to prevent huge jumps if tab was inactive
      if (dt > 100) dt = 100;
      updatePhysics(dt);

      if (time - lastTickRef.current > 50) { // faster logic ticks
         gameTick();
         lastTickRef.current = time;
      }
      draw();
      // Top Panel
      if (topPanelRef.current) {
          if (hoveredMouseRef.current) {
              const { gridX, gridY } = hoveredMouseRef.current;
              let owner = null;
              if (gridX >= 0 && gridX < GRID_W && gridY >= 0 && gridY < GRID_H) {
                  const cell = gridRef.current[getCellIndex(gridX, gridY)];
                  if (cell.ownerId && cell.ownerId !== myId) {
                      owner = playersRef.current[cell.ownerId];
                  }
              }
              
              if (owner && owner.status !== 'dead') {
                  const g = Math.floor(owner.growth || 0);
                  const gStr = g >= 0 ? '+' + formatK(g) : '-' + formatK(Math.abs(g));
                  const gColor = g >= 0 ? 'text-green-400 border-green-700/80 bg-green-900/30' : 'text-red-400 border-red-700/80 bg-red-900/30';
                  
                  let popStr = formatK(Math.floor(owner.pop));
                  let maxPopStr = formatK(Math.floor(owner.maxPop));

                  let typeLabel = owner.isAI ? 'Bot' : 'Player';
                  
                  let cityIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`;
                  let factoryIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2-2Z"/><path d="M17 18h1"/><path d="M12 18h1"/><path d="M7 18h1"/></svg>`;
                  let portIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><line x1="5" y1="12" x2="19" y2="12"/><path d="M2 15a10 10 0 0 0 20 0"/></svg>`;
                  let defenseIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
                  let siloIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="rotate-45"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 3.81-2.14c.76-.32 1.63-.51 2.5-.51 1.72 0 3.3.74 3.3.74s-.74 1.58-.74 3.3c0 .87-.19 1.74-.51 2.5A22 22 0 0 1 12 15Z"/><path d="M9 11 7.2 9M15 15l2 1.8M15 9l-6 6"/></svg>`;
                  let shipIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.5 0 2.5 2 5 2 1.3 0 1.9-.5 2.5-1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/></svg>`;

                  let buildingsHtml = [
                      {icon: cityIcon, count: owner.buildingCounts?.city || 0},
                      {icon: factoryIcon, count: owner.buildingCounts?.factory || 0},
                      {icon: portIcon, count: owner.buildingCounts?.port || 0},
                      {icon: siloIcon, count: owner.buildingCounts?.silo || 0},
                      {icon: defenseIcon, count: owner.buildingCounts?.defense || 0},
                      {icon: shipIcon, count: owner.tradeShipCount || 0}
                  ].map(b => `
                      <div class="flex items-center gap-1.5 px-2 py-1 rounded border border-slate-700/50 bg-[#1e293b] text-slate-300 text-[11px] font-bold shadow-inner">
                         ${b.icon} ${b.count}
                      </div>
                  `).join('');

                  let html = `
                    <div class="pointer-events-auto w-max flex flex-col gap-1.5 bg-[#172033] p-1.5 rounded-lg border border-slate-700/50 shadow-xl">
                       <div class="flex items-center gap-3 px-1">
                           <div class="flex items-center gap-1.5 px-2.5 py-1 rounded border border-yellow-500 bg-[#3f3f1e] text-yellow-500 font-bold text-xs uppercase tracking-wide">
                               <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/><path d="M12 6L18 12 12 18 6 12z" stroke="currentColor" stroke-width="2"/></svg>
                               ${formatK(Math.floor(owner.gold))}
                           </div>
                           <div class="flex flex-col items-center leading-none text-[#38bdf8] min-w-[32px]">
                               <div class="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0" class="text-[#38bdf8]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 13v-6" stroke-width="2" stroke-linecap="round"/><path d="M16 10l3-3 3 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                               </div>
                               <span class="font-bold text-sm mt-0.5">${gStr.replace('+','')}</span>
                           </div>
                           <div class="flex items-baseline gap-1.5 ml-1">
                               <span class="text-white font-bold text-[17px] tracking-wide">${owner.name}</span>
                               <span class="text-slate-500 text-[11px] uppercase tracking-wider font-semibold">${typeLabel}</span>
                           </div>
                       </div>
                       <div class="flex items-center gap-2 mt-0.5">
                           <div class="flex items-center bg-[#0f172a] border border-slate-700/50 rounded overflow-hidden shadow-inner">
                               <div class="bg-[#0284c7] text-white font-bold px-2.5 py-1 text-sm shadow-inner">${owner.landCount || 0}</div>
                               <div class="flex items-center gap-1.5 px-2.5 py-1">
                                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-300"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                   <span class="text-white font-bold text-sm">${popStr}</span>
                               </div>
                           </div>
                           ${buildingsHtml}
                       </div>
                    </div>
                  `;
                  
                  if (topPanelRef.current.innerHTML !== html) {
                      topPanelRef.current.innerHTML = html;
                  }
                  if (topPanelRef.current.style.display !== 'flex') {
                      topPanelRef.current.style.display = 'flex';
                  }
              } else {
                  if (topPanelRef.current.style.display !== 'none') {
                      topPanelRef.current.style.display = 'none';
                  }
              }
          } else {
              if (topPanelRef.current.style.display !== 'none') {
                  topPanelRef.current.style.display = 'none';
              }
          }
      }

      if (troopsRef.current && playersRef.current[myId]) {
          const myPlayer = playersRef.current[myId];
          const g = Math.floor(myPlayer.growth || 0);
          const gStr = g >= 0 ? '+' + formatK(g) : '-' + formatK(Math.abs(g));
          const gColor = g >= 0 ? 'text-green-400 border-green-700/80 bg-green-900/30' : 'text-red-400 border-red-700/80 bg-red-900/30';
          
          let popStr = formatK(Math.floor(myPlayer.pop));
          let maxPopStr = formatK(Math.floor(myPlayer.maxPop));
          let goldStr = formatK(Math.floor(myPlayer.gold));
          let ratio = Math.min(100, Math.max(0, (myPlayer.pop / myPlayer.maxPop) * 100));

          const text = `<div class="flex items-stretch gap-2 mb-1 w-full h-8">
    <div class="border ${gColor} font-bold px-2 rounded flex items-center justify-center gap-1 min-w-[90px] shadow-inner text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v1.5a2.5 2.5 0 0 0 5 0V9h1l1 4h5v-4h1v1.5a2.5 2.5 0 0 0 5 0V9a2 2 0 0 0-2-2h-3l-2.5-3z"/></svg>
        ${gStr}/s
    </div>
    <div class="flex-1 bg-slate-900 rounded relative overflow-hidden flex items-center justify-center border border-slate-700 shadow-inner">
        <div class="absolute left-0 top-0 bottom-0 bg-[#0ea5e9]" style="width: ${ratio}%;"></div>
        <div class="relative z-10 text-white font-bold tracking-wide flex items-center gap-2 drop-shadow-md text-[15px]">
            ${popStr} / ${maxPopStr}
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
    </div>
    <div class="border border-yellow-600/80 bg-yellow-900/30 text-yellow-500 font-bold px-3 rounded flex items-center justify-center gap-1 min-w-[80px] shadow-inner text-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
        ${goldStr}
    </div>
</div>`;
          if (troopsRef.current.innerHTML !== text) {
              troopsRef.current.innerHTML = text;
          }
      }

      animationId = requestAnimationFrame(loop);
    };
    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [gameState, zoom]);

  useEffect(() => {
    const handleResize = () => { if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; } };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (though there aren't many here)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case '1': setSelectedAction('expand'); break;
        case '2': setSelectedAction('city'); break;
        case '3': setSelectedAction('factory'); break;
        case '4': setSelectedAction('port'); break;
        case '5': setSelectedAction('defense'); break;
        case '6': setSelectedAction('silo'); break;
        case '7': setSelectedAction('nuke'); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedAction]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    if (contextMenu) setContextMenu(null);
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
    
    // Only drag and click with left button
    if (e.button !== 0) return;
    
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    // initialMouse is not used currently, we reuse lastMouse to see if we dragged
    // store an extra property to check drag distance
    (lastMouse.current as any).startX = e.clientX;
    (lastMouse.current as any).startY = e.clientY;
    lastMouse.current.x = e.clientX;
    lastMouse.current.y = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current) {
      cameraRef.current.x -= (e.clientX - lastMouse.current.x) / zoom;
      cameraRef.current.y -= (e.clientY - lastMouse.current.y) / zoom;
      lastMouse.current.x = e.clientX;
      lastMouse.current.y = e.clientY;
      hoveredMouseRef.current = null;
    } else {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - canvasRef.current.width/2) / zoom + cameraRef.current.x;
        const worldY = (e.clientY - rect.top - canvasRef.current.height/2) / zoom + cameraRef.current.y;
        const gridX = Math.floor(worldX / CELL_SIZE);
        const gridY = Math.floor(worldY / CELL_SIZE);

        hoveredMouseRef.current = {
            clientX: e.clientX,
            clientY: e.clientY,
            gridX,
            gridY
        };
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    isDragging.current = false;
    
    // Only handle primary click for game actions
    if (e.button !== 0) return;
    
    // Check if we dragged
    const startX = (lastMouse.current as any).startX || e.clientX;
    const startY = (lastMouse.current as any).startY || e.clientY;
    if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) return;
    
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - canvasRef.current.width/2) / zoom + cameraRef.current.x;
    const worldY = (e.clientY - rect.top - canvasRef.current.height/2) / zoom + cameraRef.current.y;
    const gridX = Math.floor(worldX / CELL_SIZE);
    const gridY = Math.floor(worldY / CELL_SIZE);

    if (gridX >= 0 && gridX < GRID_W && gridY >= 0 && gridY < GRID_H) {
      handleCellClick(gridX, gridY, worldX, worldY);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).tagName !== 'CANVAS') return;
    setZoom(prev => Math.min(Math.max(0.1, prev * Math.exp(-e.deltaY * 0.002)), 8));
  };
  
  const handleCellClick = (x: number, y: number, wx: number, wy: number) => {
    const idx = getCellIndex(x, y);
    const cell = gridRef.current[idx];

    if (gameState === 'spawn') {
      if (!cell.ownerId && cell.type !== 'water') {
        sounds.capture();
        setCellOwner(cell, myId);
        playersRef.current[myId].pop = 2500;
        let spawnedSpots = [{x, y}];
        
        Object.keys(playersRef.current).filter(k => k !== myId).forEach(ai => {
            let placed = false;
            let p = playersRef.current[ai];
            
            let attempts = 0;
            while(!placed && attempts < 2000) {
              let c = gridRef.current[Math.floor(Math.random() * gridRef.current.length)];
              let reqDist = attempts < 1000 ? 60 : (attempts < 1500 ? 30 : 0);
              let minDist = reqDist === 0 ? 1000 : Math.min(...spawnedSpots.map(s => Math.hypot(c.x - s.x, c.y - s.y)));
              
              if (!c.ownerId && c.type !== 'water' && (reqDist === 0 || minDist > reqDist)) {
                 setCellOwner(c, ai);
                 p.pop = 2500; 
                 placed = true;
                 spawnedSpots.push({x: c.x, y: c.y});
              }
              attempts++;
            }
        });
        setGameState('playing');
        spawnFX(wx, wy, playersRef.current[myId].color, 30, 5);
      }
    } else if (gameState === 'playing') {
       let p = playersRef.current[myId];
       if (selectedAction === 'expand') {
           if (cell.type !== 'water' && cell.ownerId !== myId) {
               let myCells = getOwnedCells(myId);
               let hasBorder = false;
               for (let c of myCells) {
                   if (c.isBorder) {
                       let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
                       let adjs = [
                           getSafe(c.x+1,c.y), getSafe(c.x-1,c.y),
                           getSafe(c.x,c.y+1), getSafe(c.x,c.y-1),
                           getSafe(c.x-1,c.y-1), getSafe(c.x+1,c.y-1),
                           getSafe(c.x-1,c.y+1), getSafe(c.x+1,c.y+1)
                       ];
                       if (cell.ownerId !== null) {
                           if (adjs.some(a => a && a.type !== 'water' && a.ownerId === cell.ownerId)) {
                               hasBorder = true; break;
                           }
                       } else {
                           if (adjs.some(a => a && a.type !== 'water' && a.ownerId === null)) {
                               hasBorder = true; break;
                           }
                       }
                   }
               }

               if (!hasBorder) {
                   return;
               }

               let ratio = attackRatio / 100;
               let attackForce = Math.floor(p.pop * ratio);
               if (attackForce > 50) {
                  p.pop -= attackForce;
                  p.offensiveWaves.push({ troops: attackForce, target: {x: cell.x, y: cell.y}, targetOwnerId: cell.ownerId });
                  
               } else {
                  return;
               }
           }
       } else if (selectedAction === 'ship') {
           let ratio = attackRatio / 100;
           let attackForce = Math.floor(p.pop * ratio);
           if (attackForce > 50) {
               // Find coastal cell
               let myCells = getOwnedCells(myId);
               let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
               let coastalCells = myCells.filter(c => {
                   let adjs = [
                       getSafe(c.x+1,c.y), getSafe(c.x-1,c.y),
                       getSafe(c.x,c.y+1), getSafe(c.x,c.y-1),
                       getSafe(c.x-1,c.y-1), getSafe(c.x+1,c.y-1),
                       getSafe(c.x-1,c.y+1), getSafe(c.x+1,c.y+1)
                   ];
                   return adjs.some(a => a && a.type === 'water');
               });
               if (coastalCells.length === 0) {
                   return;
               } else {
                   // Make sure target is coast too
                   let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
                   
                   let tx = cell.x;
                   let ty = cell.y;
                   
                   let adjsTarget = [
                       getSafe(cell.x+1,cell.y), getSafe(cell.x-1,cell.y),
                       getSafe(cell.x,cell.y+1), getSafe(cell.x,cell.y-1),
                       getSafe(cell.x-1,cell.y-1), getSafe(cell.x+1,cell.y-1),
                       getSafe(cell.x-1,cell.y+1), getSafe(cell.x+1,cell.y+1)
                   ];
                   let targetIsCoast = adjsTarget.some(a => a && a.type === 'water');
                   
                   if (!targetIsCoast) {
                       let queue = [{x: cell.x, y: cell.y}];
                       let visited = new Set<string>([`${cell.x},${cell.y}`]);
                       let foundCoast = null;
                       while (queue.length > 0) {
                           let curr = queue.shift()!;
                           if (Math.abs(curr.x - cell.x) + Math.abs(curr.y - cell.y) > 25) continue;
                           let c = getSafe(curr.x, curr.y);
                           if (c && c.type !== 'water') {
                               let cAdjs = [
                                   getSafe(curr.x+1,curr.y), getSafe(curr.x-1,curr.y),
                                   getSafe(curr.x,curr.y+1), getSafe(curr.x,curr.y-1)
                               ];
                               if (cAdjs.some(a => a && a.type === 'water')) {
                                   foundCoast = curr; break;
                               }
                               for (let a of cAdjs) {
                                   if (a && a.type !== 'water') {
                                       let key = `${a.x},${a.y}`;
                                       if (!visited.has(key)) {
                                           visited.add(key); queue.push({x: a.x, y: a.y});
                                       }
                                   }
                               }
                           }
                       }
                       if (!foundCoast) {
                           return; // Failed to find coast
                       }
                       tx = foundCoast.x; ty = foundCoast.y;
                   }
                   
                   coastalCells.sort((a,b) => Math.pow(a.x - tx, 2) + Math.pow(a.y - ty, 2) - (Math.pow(b.x - tx, 2) + Math.pow(b.y - ty, 2)));
                   p.pop -= attackForce;
                   sounds.expand();
                   
                   p.offensiveWaves.push({ troops: attackForce, target: {x: tx, y: ty}, type: 'naval', navalSrc: {x: coastalCells[0].x, y: coastalCells[0].y}, targetOwnerId: cell.ownerId });
               }
           } else {
               return;
           }
       } else if (selectedAction === 'nuke') {
           if (p.gold >= 500000) {
               let allSilos = getOwnedCells(myId).filter(c => c.building === 'silo');
               let readySilos = allSilos.filter(c => !c.lastFired || Date.now() - c.lastFired > 15000);
               
               if (readySilos.length > 0) {
                   p.gold -= 500000;
                   readySilos[0].lastFired = Date.now();
                   projectilesRef.current.push({ id: nextProjId.current++, startX: readySilos[0].x*CELL_SIZE, startY: readySilos[0].y*CELL_SIZE, x: readySilos[0].x*CELL_SIZE, y: readySilos[0].y*CELL_SIZE, targetX: wx, targetY: wy, type: 'nuke', ownerId: myId, progress: 0 });
               } else {
                   return;
               }
           } else {
               return;
           }
       } else if (selectedAction === 'city' && cell.ownerId === myId && p.gold >= 250000 && !cell.building) { p.gold -= 250000; p.maxPop += 25000; setCellBuilding(cell, 'city'); }
         else if (selectedAction === 'factory' && cell.ownerId === myId && p.gold >= 125000 && !cell.building) { p.gold -= 125000; setCellBuilding(cell, 'factory'); }
         else if (selectedAction === 'silo' && cell.ownerId === myId && p.gold >= 250000 && !cell.building) { p.gold -= 250000; setCellBuilding(cell, 'silo'); }
         else if (selectedAction === 'port') {
            let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;

            let targetCell = null;
            for (let r = 0; r <= 5; r++) {
                for (let dx = -r; dx <= r; dx++) {
                    for (let dy = -r; dy <= r; dy++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                        let c = getSafe(cell.x + dx, cell.y + dy);
                        if (c && c.ownerId === myId && !c.building && c.type !== 'water') {
                            let adjsW = [
                                getSafe(c.x+1,c.y), getSafe(c.x-1,c.y),
                                getSafe(c.x,c.y+1), getSafe(c.x,c.y-1)
                            ];
                            let wNode = adjsW.find(a => a && a.type === 'water');
                            if (wNode && isWaterOpen(wNode.x, wNode.y)) {
                                targetCell = c;
                                break;
                            }
                        }
                    }
                    if (targetCell) break;
                }
                if (targetCell) break;
            }
            
            if (targetCell) {
                if (p.gold < 100000) {
                    pushNotification(t.notEnoughGold);
                } else {
                    p.gold -= 100000; setCellBuilding(targetCell, 'port');
                }
            } else {
                pushNotification(t.noSuitableCoast);
            }
         }
         else if (selectedAction === 'defense' && cell.ownerId === myId && p.gold >= 50000 && !cell.building) { p.gold -= 50000; setCellBuilding(cell, 'defense'); }
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (gameState !== 'playing') return;
    if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;
    
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = (e.clientX - rect.left - canvasRef.current.width/2) / zoom + cameraRef.current.x;
    const worldY = (e.clientY - rect.top - canvasRef.current.height/2) / zoom + cameraRef.current.y;
    const gridX = Math.floor(worldX / CELL_SIZE);
    const gridY = Math.floor(worldY / CELL_SIZE);
    
    if (gridX >= 0 && gridX < GRID_W && gridY >= 0 && gridY < GRID_H) {
      setContextMenu({ x: e.clientX, y: e.clientY, cellX: gridX, cellY: gridY });
    }
  };

  const handleNavalAttack = () => {
    if (!contextMenu) return;
    let p = playersRef.current[myId];
    let cell = gridRef.current[getCellIndex(contextMenu.cellX, contextMenu.cellY)];
    
    if (cell.type !== 'water') {
        let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;

        let tx = cell.x;
        let ty = cell.y;
        
        let adjsTarget = [
            getSafe(cell.x+1,cell.y), getSafe(cell.x-1,cell.y),
            getSafe(cell.x,cell.y+1), getSafe(cell.x,cell.y-1),
            getSafe(cell.x-1,cell.y-1), getSafe(cell.x+1,cell.y-1),
            getSafe(cell.x-1,cell.y+1), getSafe(cell.x+1,cell.y+1)
        ];
        let targetIsCoast = adjsTarget.some(a => a && a.type === 'water');
        
        if (!targetIsCoast) {
            let queue = [{x: cell.x, y: cell.y}];
            let visited = new Set<string>([`${cell.x},${cell.y}`]);
            let foundCoast = null;
            
            while(queue.length > 0) {
                let curr = queue.shift()!;
                if (Math.abs(curr.x - cell.x) + Math.abs(curr.y - cell.y) > 25) continue;
                
                let c = getSafe(curr.x, curr.y);
                if (c && c.type !== 'water') {
                    let cAdjs = [
                        getSafe(curr.x+1,curr.y), getSafe(curr.x-1,curr.y),
                        getSafe(curr.x,curr.y+1), getSafe(curr.x,curr.y-1)
                    ];
                    if (cAdjs.some(a => a && a.type === 'water')) {
                        foundCoast = curr;
                        break;
                    }
                    for (let a of cAdjs) {
                        if (a && a.type !== 'water') {
                            let key = `${a.x},${a.y}`;
                            if (!visited.has(key)) {
                                visited.add(key);
                                queue.push({x: a.x, y: a.y});
                            }
                        }
                    }
                }
            }
            
            if (foundCoast) {
                tx = foundCoast.x; 
                ty = foundCoast.y;
            } else {
                setContextMenu(null);
                return; // Failed to find coast
            }
        }

        let ratio = attackRatio / 100;
        let attackForce = Math.floor(p.pop * ratio);
        if (attackForce > 50) {
            let myCells = getOwnedCells(myId);
            let coastalCells = myCells.filter(c => {
                let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
                let adjs = [
                    getSafe(c.x+1,c.y), getSafe(c.x-1,c.y),
                    getSafe(c.x,c.y+1), getSafe(c.x,c.y-1),
                    getSafe(c.x-1,c.y-1), getSafe(c.x+1,c.y-1),
                    getSafe(c.x-1,c.y+1), getSafe(c.x+1,c.y+1)
                ];
                return adjs.some(a => a && a.type === 'water');
            });
            if (coastalCells.length === 0) {
                // silently fail or just close context menu
                setContextMenu(null);
                return;
            } else {
                coastalCells.sort((a,b) => Math.pow(a.x - tx, 2) + Math.pow(a.y - ty, 2) - (Math.pow(b.x - tx, 2) + Math.pow(b.y - ty, 2)));
                p.pop -= attackForce;
                sounds.expand();

                p.offensiveWaves.push({ troops: attackForce, target: {x: tx, y: ty}, type: 'naval', navalSrc: {x: coastalCells[0].x, y: coastalCells[0].y}, targetOwnerId: cell.ownerId });
                sounds.expand();
            }
        } else {
           return;
        }
    }
    setContextMenu(null);
  };

  const formatK = (n: number) => n >= 1000000 ? (n/1000000).toFixed(1)+'M' : n >= 1000 ? (n/1000).toFixed(1)+'K' : n.toString();

  return (
    <div className="fixed inset-0 z-[100] bg-black font-sans select-none overflow-hidden touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full cursor-crosshair touch-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onContextMenu={handleContextMenu} onWheel={handleWheel} />

      <div 
        ref={topPanelRef}
        className="fixed top-0 left-0 right-0 z-[140] pointer-events-none mt-2 flex flex-col items-center opacity-80 transition-opacity hover:opacity-100"
        style={{ display: 'none' }}
      ></div>

      {contextMenu && (
        <div 
            className="absolute z-50 pointer-events-auto"
            style={{ left: contextMenu.x, top: contextMenu.y }}
        >
            {(() => {
                let hasCoastal = false;
                const myCells = getOwnedCells(myId);
                hasCoastal = myCells.some(c => {
                    let getSafe = (x:number, y:number) => (x>=0 && x<GRID_W && y>=0 && y<GRID_H) ? gridRef.current[y * GRID_W + x] : null;
                    let adjs = [
                        getSafe(c.x+1,c.y), getSafe(c.x-1,c.y),
                        getSafe(c.x,c.y+1), getSafe(c.x,c.y-1),
                        getSafe(c.x-1,c.y-1), getSafe(c.x+1,c.y-1),
                        getSafe(c.x-1,c.y+1), getSafe(c.x+1,c.y+1)
                    ];
                    return adjs.some(a => a && a.type === 'water');
                });
                return (
                    <button 
                        onClick={hasCoastal ? handleNavalAttack : undefined} 
                        className={`border-2 rounded-full p-3 shadow-xl flex flex-col items-center gap-1 -translate-x-1/2 -translate-y-1/2 transition-all ${hasCoastal ? 'bg-slate-800 border-blue-500 hover:bg-slate-700 hover:scale-110 active:scale-95 text-white cursor-pointer' : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed opacity-80'}`}
                    >
                        <Anchor size={24} className={hasCoastal ? "text-blue-400" : "text-slate-600"} />
                    </button>
                );
            })()}
        </div>
      )}

      {/* Top Left Menu Toggle / Audio */}
      <div className="absolute top-4 left-4 z-50 flex gap-2 pointer-events-auto">
          <button 
            onClick={() => {
                const newState = !isAudioEnabled;
                setIsAudioEnabled(newState);
                moduleAudioEnabled = newState;
                sounds.click();
            }}
            className="bg-slate-800/80 hover:bg-slate-700 text-white p-2 rounded-sm border border-slate-600"
          >
              {isAudioEnabled ? <Volume2 size={20}/> : <VolumeX size={20}/>}
          </button>
      </div>

      {/* Status */}

      {/* Top Right: Header */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
          <button onClick={() => { sounds.click(); onExit(); }} className="bg-red-500/80 hover:bg-red-500 text-white p-2 rounded-sm"><X size={20}/></button>
      </div>



      {/* Bottom Center: Unified Action Bar */}
      {gameState === 'playing' && (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-auto w-full max-w-[650px] z-[200]">
          <div className="flex flex-col gap-1 items-center mb-2 pointer-events-none w-full">
             <AnimatePresence>
                 {notifications.map(n => (
                     <motion.div key={n.id} initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="text-[11px] px-4 py-1.5 rounded-full font-bold bg-slate-800 border border-slate-600 shadow-lg text-slate-200">
                         {n.msg}
                     </motion.div>
                 ))}
             </AnimatePresence>
          </div>
          <div className="bg-[#1e293b]/95 backdrop-blur border border-slate-700 rounded-lg shadow-2xl flex flex-col w-full">
             
             {/* Row 1: Fast updating stats (Growth, Pop/MaxPop, Gold) via troopsRef */}
             <div className="bg-slate-800/60 p-2.5 w-full border-b border-slate-700/80">
                <div ref={troopsRef} className="w-full" />
             </div>
             
             {/* Row 2: Attack Slider */}
             <div className="px-3 py-2 border-b border-slate-700/80 flex items-center gap-4 bg-slate-900/30">
                 <div className="flex items-center gap-1 min-w-[120px] text-slate-300 font-bold border border-slate-700/80 bg-slate-800/80 px-2 py-1 rounded shadow-inner text-sm">
                     <Sword size={16} className="-ml-0.5" />
                     {attackRatio}% <span className="text-[11px] text-slate-400 font-normal">({formatK(Math.floor(uiState.pop * attackRatio / 100))})</span>
                 </div>
                 <div className="flex-1 flex items-center px-2">
                     <input type="range" min="1" max="100" value={attackRatio} onChange={(e) => setAttackRatio(Number(e.target.value))} className="w-full h-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-slate-300 opacity-90 transition-opacity hover:opacity-100" />
                 </div>
             </div>

             {/* Row 3: Actions */}
             <div className="px-4 py-1.5 flex gap-2 flex-wrap justify-center w-full bg-[#1e293b]/50">
               <BuildBtn label="Expand/Attack" active={selectedAction==='expand'} onClick={()=>setSelectedAction('expand')} icon={<Crosshair/>} shortcut="1" />
               <div className="w-[1px] bg-slate-700/80 mx-1 my-1" />
               <BuildBtn label={t.city} active={selectedAction==='city'} onClick={()=>setSelectedAction('city')} icon={<Building2/>} count={uiState.counts.city} shortcut="2" cost={250000} gold={uiState.gold} />
               <BuildBtn label="Factory" active={selectedAction==='factory'} onClick={()=>setSelectedAction('factory')} icon={<Factory/>} count={uiState.counts.factory} shortcut="3" cost={125000} gold={uiState.gold} />
               <BuildBtn label="Port" active={selectedAction==='port'} onClick={()=>setSelectedAction('port')} icon={<Anchor/>} count={uiState.counts.port} shortcut="4" cost={100000} gold={uiState.gold} />
               <BuildBtn label="Defense" active={selectedAction==='defense'} onClick={()=>setSelectedAction('defense')} icon={<Shield/>} count={uiState.counts.defense} shortcut="5" cost={50000} gold={uiState.gold} />
               <BuildBtn label="Silo" active={selectedAction==='silo'} onClick={()=>setSelectedAction('silo')} icon={<Rocket className="rotate-45" />} count={uiState.counts.silo} shortcut="6" cost={250000} gold={uiState.gold} />
               <BuildBtn label="Launch Nuke" active={selectedAction==='nuke'} onClick={()=>setSelectedAction('nuke')} icon={<Flame/>} count={uiState.counts.nuke} shortcut="7" cost={500000} gold={uiState.gold} />
             </div>
          </div>
      </div>
      )}

      {/* Overlays */}
      {gameState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur z-50 pointer-events-auto">
             <div className="text-white font-bold text-2xl uppercase tracking-widest flex items-center gap-3">
                 <RefreshCw className="animate-spin" /> {t.generatingTerrain}
             </div>
          </div>
      )}
      {gameState === 'spawn' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-[#1e293b]/90 text-white px-8 py-4 rounded-sm font-bold text-xl shadow-2xl border border-slate-700 pointer-events-none flex items-center gap-3">
           <MapIcon /> {t.chooseLocation}
        </div>
      )}
      
      {gameState === 'gameover' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur z-50 pointer-events-auto">
             <div className="bg-[#1e293b] p-8 border border-slate-700 text-center rounded-sm">
                 <h1 className="text-4xl font-black mb-4 uppercase text-white tracking-widest">{t.defeated}</h1>
                 <button onClick={onExit} className="px-8 py-3 bg-play-blue hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded-sm">{t.return}</button>
             </div>
          </div>
      )}
    </div>
  );
}

function BuildBtn({ active, onClick, icon, count, shortcut, disabled, cost, gold, label }: any) {
    const isAffordable = cost === undefined || (gold !== undefined && gold >= cost);
    const costText = cost ? `$${cost >= 1000 ? (cost/1000) + 'K' : cost}` : undefined;
    return (
        <button disabled={disabled || !isAffordable} onClick={() => { sounds.click(); onClick(); }} className={`group relative flex items-center justify-center p-1 rounded min-w-[50px] h-[34px] border ${active ? 'bg-slate-700/80 border-slate-500 shadow-inner' : 'bg-transparent border-slate-700 hover:bg-slate-800/50 text-slate-300'} ${(disabled || !isAffordable) ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
            {shortcut && <span className="absolute top-0.5 left-1 text-[10px] text-slate-500 font-mono" style={{lineHeight: 1}}>{shortcut}</span>}
            <div className="flex items-center gap-1 mt-0.5">
               <div className="transform scale-90">{icon}</div>
               {count !== undefined && <span className="text-white font-mono text-sm leading-none pt-0.5">{count}</span>}
            </div>
            {(label || costText) && (
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 shadow-xl text-xs px-2 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 flex items-center gap-2">
                    {label && <span className="text-slate-300 font-bold">{label}</span>}
                    {costText && <span className="text-yellow-400 font-mono">💰 {costText}</span>}
                </div>
            )}
        </button>
    )
}
