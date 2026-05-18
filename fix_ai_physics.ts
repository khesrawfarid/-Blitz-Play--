import fs from 'fs';

let content = fs.readFileSync('src/components/WorldFrontGame.tsx', 'utf8');

// 1. IMPROVE AI LOGIC
const aiLogicBefore = `let randomBorder = currentBorders[Math.floor(Math.random() * currentBorders.length)];
                      p.pop -= autoTargetForce;
                      p.offensiveWaves.push({ troops: autoTargetForce, target: {x: randomBorder.dest.x, y: randomBorder.dest.y}, targetOwnerId: randomBorder.dest.ownerId });`;

const aiLogicAfter = `let bestBorder = currentBorders[0];
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
                      p.offensiveWaves.push({ troops: autoTargetForce, target: {x: bestBorder.dest.x, y: bestBorder.dest.y}, targetOwnerId: bestBorder.dest.ownerId });`;

content = content.replace(aiLogicBefore, aiLogicAfter);

// 2. EXTRACT PHYSICS FROM GAMETICK
const tickIndex = content.indexOf('const gameTick = () => {');
const loopIndex = content.indexOf('let animationId: number;');

// We need to move the // Process Particles ... // Process Trains logic from end of gameTick
const processStart = content.indexOf('// Process Particles', tickIndex);
const processEnd = content.indexOf('};', content.indexOf('trainsRef.current.splice(i, 1);', processStart) + 100);

// Look until the end of trains logic: `    }` before `  };` (end of gameTick)
const matchRange = content.substring(processStart, processEnd + 2);

// Wait, getting exact boundaries of `processEnd` can be tricky. Let's just find `    // Process Particles` and `  };` which closes gameTick.
const endOfTick = content.indexOf('  };', processStart);

const physicsCode = content.substring(processStart, endOfTick);

// Remove physicsCode from gameTick
content = content.substring(0, processStart) + content.substring(endOfTick);

// Add updatePhysics function above gameTick
const newPhysicsCode = `
  const updatePhysics = (dt: number) => {
    let grid = gridRef.current;
    let players = playersRef.current;
    let dtScale = dt / 50;
    
` + physicsCode
    .replace(/ts\.progress \+= ts\.speed;/g, 'ts.progress += ts.speed * dtScale;')
    .replace(/moveAmount = 2.0;/g, 'moveAmount = 2.0 * dtScale;')
    .replace(/t\.progress \+= t\.speed;/g, 't.progress += t.speed * dtScale;')
    .replace(/proj\.progress \+= 0\.01;/g, 'proj.progress += 0.01 * dtScale;')
    .replace(/p\.life \-= 0\.05;/g, 'p.life -= 0.05 * dtScale;')
    .replace(/p\.x \+= p\.vx;/g, 'p.x += p.vx * dtScale;')
    .replace(/p\.y \+= p\.vy;/g, 'p.y += p.vy * dtScale;')
    .replace(/particlesRef\.current\[i\];/g, 'particlesRef.current[i]; if(p.type === "ship") p.age = (p.age || 0) + dtScale;')
    .replace(/p\.age = \(p\.age \|\| 0\) \+ 1;/g, '') // removed since it's added above
 + `\n  };\n`;

content = content.replace('const gameTick = () => {', newPhysicsCode + '\n  const gameTick = () => {');

// 3. HOOK updatePhysics IN LOOP
const loopStart = content.indexOf('const loop = (time: number) => {');
const loopHook = `
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = time;
      let dt = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      // Cap dt to prevent huge jumps if tab was inactive
      if (dt > 100) dt = 100;
      updatePhysics(dt);
`;

const useEffLoop = content.substring(content.indexOf('useEffect(() => {', loopStart - 100), loopStart + 50);

content = content.replace(useEffLoop, `  // Need lastFrameTimeRef
  const lastFrameTimeRef = useRef<number>(0);
` + useEffLoop);

content = content.replace('if (time - lastTickRef.current > 50) { // faster logic ticks', loopHook + '\n      if (time - lastTickRef.current > 50) { // faster logic ticks');


fs.writeFileSync('src/components/WorldFrontGame.tsx', content);
console.log('Fixed AI and Physics structure!');
