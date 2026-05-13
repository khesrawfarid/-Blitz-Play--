const fs = require('fs');
let code = fs.readFileSync('src/components/WorldFrontGame.tsx', 'utf8');

// Replace gameTick start to economy
code = code.replace(
`  const gameTick = () => {
    let grid = gridRef.current;
    let players = playersRef.current;

    Object.values(players).forEach(p => {`,
`  const gameTick = () => {
    let grid = gridRef.current;
    let players = playersRef.current;

    let cellsByOwner: Record<string, any[]> = {};
    for (let i = 0; i < grid.length; i++) {
        let ownerId = grid[i].ownerId;
        if (ownerId) {
            if (!cellsByOwner[ownerId]) cellsByOwner[ownerId] = [];
            cellsByOwner[ownerId].push(grid[i]);
        }
    }

    Object.values(players).forEach(p => {`
);

code = code.replace(
`      let myCells = getOwnedCells(p.id);
      if (myCells.length === 0 && gameState === 'playing' && p.pop <= 0) {`,
`      let myCells = cellsByOwner[p.id] || [];
      if (myCells.length === 0 && gameState === 'playing' && p.pop <= 0) {`
);

// Replace Growth
code = code.replace(
`      // Growth
      if (p.id === myId || p.pop < p.maxPop) {
        p.maxPop = Math.max(p.maxPop, 2500 + myCells.length * 100);
        let troopsGain = Math.max(1, Math.floor(myCells.length * 0.5));
        p.pop = Math.min(p.maxPop, p.pop + troopsGain);
      }
      
      // Economy
      let income = myCells.reduce((acc, c) => acc + (c.building==='city'?15:c.building==='factory'?35:1.0), 0);
      p.gold += income;`,
`      // Economy & Growth
      let cityCount = 0;
      let factoryCount = 0;
      for(let i=0; i<myCells.length; i++) {
          if (myCells[i].building === 'city') cityCount++;
          else if (myCells[i].building === 'factory') factoryCount++;
      }
      
      if (p.id === myId || p.pop < p.maxPop) {
        p.maxPop = Math.max(p.maxPop, 2500 + myCells.length * 100);
        // Slower base troops, much faster from cities
        let troopsGain = (myCells.length * 0.05) + (cityCount * 2.0);
        if (troopsGain < 0.1 && myCells.length > 0) troopsGain = 0.1;
        p.pop = Math.min(p.maxPop, p.pop + troopsGain);
      }
      
      let income = (myCells.length * 0.2) + (cityCount * 5) + (factoryCount * 15);
      p.gold += income;`
);

fs.writeFileSync('src/components/WorldFrontGame.tsx', code);
console.log('Modified gameTick economy and myCells cache.');
