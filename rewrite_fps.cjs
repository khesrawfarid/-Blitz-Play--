const fs = require('fs');

let fileContent = fs.readFileSync('src/components/FPSGame.tsx', 'utf8');

// 1. Remove BotLogic and Player
fileContent = fileContent.replace(/function BotLogic.*?return null;\n}/s, '');
fileContent = fileContent.replace(/function Player.*?<\/Cylinder>\n  \);\n}/s, '');

// 2. Add Target logic
const targetsCode = `
const INITIAL_TARGETS = [
  { id: 1, x: 0, y: 2, z: -15, active: true },
  { id: 2, x: -8, y: 3, z: -10, active: true },
  { id: 3, x: 8, y: 1, z: -12, active: true },
  { id: 4, x: -5, y: 4, z: -18, active: true },
  { id: 5, x: 5, y: 2, z: -18, active: true },
];

function Targets({ targets }: any) {
  return (
    <>
      {targets.map(t => t.active && (
        <Box key={t.id} args={[1.5, 1.5, 0.2]} position={[t.x, t.y, t.z]}>
          <meshStandardMaterial color="#ef4444" roughness={0.5} />
          <Text position={[0, 0, 0.11]} fontSize={0.5} color="white">
            {t.id * 10}
          </Text>
        </Box>
      ))}
    </>
  );
}
`;

fileContent = fileContent.replace('function Weapon', targetsCode + '\nfunction Weapon');

// 3. Fix LocalPlayer movement to not tilt
fileContent = fileContent.replace(/\/\/ Standard camera relative movement.*?camera\.translateZ\(velocity\.current\.z\);/s, `
    // Standard camera relative movement using world space yaw only
    const euler = new THREE.Euler(0, camera.rotation.y, 0, 'YXZ');
    const moveVec = new THREE.Vector3(-velocity.current.x, 0, velocity.current.z).applyEuler(euler);

    const prevPosition = camera.position.clone();
    
    camera.position.x += moveVec.x;
    camera.position.z += moveVec.z;
`);

fileContent = fileContent.replace(/\/\/ Try X movement only.*?camera\.translateZ\(velocity\.current\.z\);/s, `
       // Try X movement only
       camera.position.x += moveVec.x;
       if (checkCollision(camera.position)) {
          camera.position.x = prevPosition.x;
       }
       
       // Try Z movement only
       const positionAfterX = camera.position.clone();
       camera.position.z += moveVec.z;
`);

fileContent = fileContent.replace(/camera\.translateY\(velocity\.current\.y \* delta\);/s, `
    camera.position.y += velocity.current.y * delta;
`);

fileContent = fileContent.replace(/setRotation\(\[camera\.rotation\.x, camera\.rotation\.y, camera\.rotation\.z\]\);/s, `
    camera.rotation.z = 0; // Fix camera tilting!
    setRotation([camera.rotation.x, camera.rotation.y, 0]);
`);


// 4. Update FPSGame state and lasers
fileContent = fileContent.replace(/const \[playMode, setPlayMode\] = useState<'bot' \| 'multiplayer' \| null>\(null\);/, '');
fileContent = fileContent.replace(/const \[score, setScore\] = useState\(\{ me: 0, enemy: 0 \}\);/, `const [score, setScore] = useState(0);\n  const [targets, setTargets] = useState<{id: number, x: number, y: number, z: number, active: boolean}[]>(INITIAL_TARGETS);`);

// Remove Enemy State declarations
fileContent = fileContent.replace(/const \[enemyHealth, setEnemyHealth\] = useState\(100\);\n/g, '');
fileContent = fileContent.replace(/const \[enemyPos, setEnemyPos\] = useState\(\[0, 2, -10\]\);\n  const \[enemyRot, setEnemyRot\] = useState\(\[0, Math\.PI, 0\]\);\n/g, '');
fileContent = fileContent.replace(/const enemyPosRef.*?\}\], \[enemyRot\]\);\n/s, '');
fileContent = fileContent.replace(/const lastBotShotTime = useRef\(0\);\n/g, '');

fileContent = fileContent.replace(/let hitsEnemy = false;/g, '');
fileContent = fileContent.replace(/!hitsMe && !hitsEnemy/g, '!hitsMe');

// Update hits check
fileContent = fileContent.replace(/if \(l\.isEnemy\) \{.*?else \{.*?\}/s, `
               setTargets(prevT => {
                 let hitSomething = false;
                 const newT = prevT.map(t => {
                    if (!t.active) return t;
                    const dX = l.pos.x - t.x;
                    const dY = l.pos.y - t.y;
                    const dZ = l.pos.z - t.z;
                    const dist = Math.sqrt(dX*dX + dY*dY + dZ*dZ);
                    if (dist < 1.2) {
                       hitSomething = true;
                       setScore(s => s + t.id * 10);
                       
                       // Respawn after 2 seconds
                       setTimeout(() => {
                           setTargets(curr => curr.map(ct => ct.id === t.id ? {...ct, active: true} : ct));
                       }, 2000);
                       return { ...t, active: false };
                    }
                    return t;
                 });
                 if (hitSomething) l.ttl = 0;
                 return prevT === newT ? prevT : newT; // React state reference optimization
               });
`);


// Fix effect dependencies for enemyHealth -> health
fileContent = fileContent.replace(/if \(enemyHealth < 100 && enemyHealth > 0\) \{.*?\}, \[enemyHealth\]\);/s, '');

// Fix round ending
fileContent = fileContent.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[health, enemyHealth\]\);/s, `
  useEffect(() => {
     if (health <= 0) {
        setTimeout(() => {
           setHealth(100);
        }, 2000);
     }
  }, [health]);
`);


fileContent = fileContent.replace(/const isMatchOver = score\.me >= 10 \|\| score\.enemy >= 10;/g, 'const isMatchOver = false;');

fileContent = fileContent.replace(/setEnemyHealth\(100\);\n\s*setMyPos\(\[0, 2, 10\]\);\n\s*setEnemyPos\(\[0, 2, -10\]\);/s, 'setMyPos([0, 2, 10]);');

// UI rewrite
fileContent = fileContent.replace(/<span className="text-\[#c2b280\] font-bold tracking-widest text-sm mb-1">YOU<\/span>[\s\S]*?VS[\s\S]*?<\/div>\n\s*<\/div>/g, `
<span className="text-[#c2b280] font-bold tracking-widest text-sm mb-1">SCORE</span>
<span className="text-3xl font-black text-white">{score}</span>
`);

fileContent = fileContent.replace(/DESERT <span className="text-\[#c2b280\]">STRIKE<\/span>/g, 'SHOOTING <span className="text-[#c2b280]">RANGE</span>');
fileContent = fileContent.replace(/Modern 1v1 Sniper Duel/g, 'Practice your aim');

fileContent = fileContent.replace(/onClick=\{\(e\) => \{ e\.stopPropagation\(\); setPlayMode\('bot'\); setInGame\(true\); \}\}/g, `onClick={(e) => { e.stopPropagation(); setInGame(true); }}`);
fileContent = fileContent.replace(/<button[^>]*>[\s\S]*?MULTIPLAYER \(BETA\)[\s\S]*?<\/button>/g, '');
fileContent = fileContent.replace(/<button[^>]*>[\s\S]*?START MATCH[\s\S]*?<\/button>/g, `
<button onClick={(e) => { e.stopPropagation(); setInGame(true); }} className="w-full py-4 bg-[#c2b280] hover:bg-[#d4c59a] text-black font-black text-xl rounded-xl transition-transform hover:scale-105">
   ENTER RANGE
</button>
`);

// PlayMode replace inside Canvas
fileContent = fileContent.replace(/<BotLogic.*?setLasers=\{setLasers\} \/>/, '<Targets targets={targets} />');
fileContent = fileContent.replace(/\{enemyHealth > 0 && \([\s\S]*?\}\)/g, '');
fileContent = fileContent.replace(/\{enemyHealth <= 0 && !isMatchOver && \([\s\S]*?\}\)/g, '');

fileContent = fileContent.replace(/\{score\.me >= 10 \? 'VICTORY' : 'DEFEAT'\}/g, 'DEFEAT');
fileContent = fileContent.replace(/\{score\.me\} - \{score\.enemy\}/g, '');


fs.writeFileSync('src/components/FPSGame.tsx', fileContent);
console.log('Update finished.');
