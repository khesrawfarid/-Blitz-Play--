import fs from 'fs';

let content = fs.readFileSync('src/components/FPSGame.tsx', 'utf8');

// The new BotController component
const botControllerComponent = `function BotLogic({ myPosRef, enemyPosRef, enemyRotRef, inGame, health, enemyHealth, playMode, setLasers }: any) {
  const lastBotShotTime = useRef(0);
  const dodgeDir = useRef(new THREE.Vector3());
  const nextDodgeTime = useRef(0);

  useFrame((state, delta) => {
     if (playMode !== 'bot' || !inGame || health <= 0 || enemyHealth <= 0) return;
     
     const dx = myPosRef.current.x - enemyPosRef.current.x;
     const dz = myPosRef.current.z - enemyPosRef.current.z;
     const dist = Math.sqrt(dx*dx + dz*dz);
     
     let newX = enemyPosRef.current.x;
     let newZ = enemyPosRef.current.z;
     let newRotY = Math.atan2(dx, dz);
     
     let speed = 8 * delta; // Bot speed: 8 units/sec
     
     // basic LOS check (if line to player intersects obstacle)
     let hasLOS = true;
     for (let obs of OBSTACLES) {
         // rough bounding check between bot and player
         if (Math.min(enemyPosRef.current.x, myPosRef.current.x) < obs.x[1] && Math.max(enemyPosRef.current.x, myPosRef.current.x) > obs.x[0] &&
             Math.min(enemyPosRef.current.z, myPosRef.current.z) < obs.z[1] && Math.max(enemyPosRef.current.z, myPosRef.current.z) > obs.z[0]) {
             hasLOS = false;
         }
     }

     if (!hasLOS) {
         // Move around
         newX += (dx / dist) * speed * 1.5;
         newZ += (dz / dist) * speed * 1.5;
     } else {
         if (dist > 15) {
            newX += (dx / dist) * speed;
            newZ += (dz / dist) * speed;
         } else if (dist < 10) {
            newX -= (dx / dist) * speed;
            newZ -= (dz / dist) * speed;
         }
     }
     
     // Smooth Random dodging
     const now = Date.now();
     if (now > nextDodgeTime.current) {
         if (Math.random() > 0.3) {
             dodgeDir.current.set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2).normalize();
         } else {
             dodgeDir.current.set(0, 0, 0); // stop dodging sometimes
         }
         nextDodgeTime.current = now + 500 + Math.random() * 1000;
     }
     
     // apply dodge
     newX += dodgeDir.current.x * speed * 0.8;
     newZ += dodgeDir.current.z * speed * 0.8;
     
     newX = Math.max(-20, Math.min(20, newX));
     newZ = Math.max(-20, Math.min(20, newZ));
     
     // Check collision and handle sliding for bot
     const potentialPos = new THREE.Vector3(newX, 2, newZ);
     if (!checkCollision(potentialPos)) {
        enemyPosRef.current.set(newX, 2, newZ);
     } else {
        // Try sliding on X
        const slideXPos = new THREE.Vector3(newX, 2, enemyPosRef.current.z);
        if (!checkCollision(slideXPos)) {
           enemyPosRef.current.set(newX, 2, enemyPosRef.current.z);
        } else {
           // Try sliding on Z
           const slideZPos = new THREE.Vector3(enemyPosRef.current.x, 2, newZ);
           if (!checkCollision(slideZPos)) {
              enemyPosRef.current.set(enemyPosRef.current.x, 2, newZ);
           }
        }
     }
     enemyRotRef.current = [0, newRotY, 0];
     
     // Shoot
     if (hasLOS && now - lastBotShotTime.current >= 800) {
        lastBotShotTime.current = now;
        const dir = new THREE.Vector3(dx/dist, 0, dz/dist);
        // add some inaccuracy based on distance
        dir.x += (Math.random() - 0.5) * 0.1 * (dist/10);
        dir.z += (Math.random() - 0.5) * 0.1 * (dist/10);
        dir.normalize();
        
        setLasers(prev => [...prev, { id: now + Math.random(), pos: new THREE.Vector3(enemyPosRef.current.x, 2, enemyPosRef.current.z), dir, isEnemy: true, ttl: 100 }]);
     }
  });
  return null;
}
`;

// Insert BotLogic right before Player
content = content.replace('function Player({ posRef, rotRef }: any) {', botControllerComponent + '\\nfunction Player({ posRef, rotRef }: any) {');

// Remove Old Bot Logic
// Start of old logic
const oldLogicStart = content.indexOf('// Simple Bot Logic');
// Find end of old logic useEffect hook
const oldLogicEnd = content.indexOf('// Laser collision is handled in the effect below.');
if (oldLogicStart !== -1 && oldLogicEnd !== -1) {
    content = content.substring(0, oldLogicStart) + content.substring(oldLogicEnd);
}

// Add <BotLogic /> to the Canvas
const playerTag = '{enemyHealth > 0 && (';
const replacer = '<BotLogic myPosRef={myPosRef} enemyPosRef={enemyPosRef} enemyRotRef={enemyRotRef} inGame={inGame} health={health} enemyHealth={enemyHealth} playMode={playMode} setLasers={setLasers} />\\n            {enemyHealth > 0 && (';
content = content.replace(playerTag, replacer);


fs.writeFileSync('src/components/FPSGame.tsx', content);
console.log('Fixed FPS bot too!');
