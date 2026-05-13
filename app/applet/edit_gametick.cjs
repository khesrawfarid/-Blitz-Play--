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

    let cellsByOwner = {};
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

// Optimize borders
code = code.replace(
`      if (gameState === 'playing') {
          for (let i = p.offensiveWaves.length - 1; i >= 0; i--) {`,
`      let myBorders = null;

      if (gameState === 'playing') {
          for (let i = p.offensiveWaves.length - 1; i >= 0; i--) {`
);

code = code.replace(
`              let borders: {src: Cell, dest: Cell}[] = [];
              for(let c of myCells) {
                  let adjs = [
                      grid[getCellIndex(c.x+1,c.y)], grid[getCellIndex(c.x-1,c.y)],
                      grid[getCellIndex(c.x,c.y+1)], grid[getCellIndex(c.x,c.y-1)]
                  ];
                  for(let adj of adjs) {
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') {
                          borders.push({src: c, dest: adj});
                      }
                  }
              }`,
`              if (!myBorders) {
                  myBorders = [];
                  for(let c of myCells) {
                      let cIdx = c.idx;
                      let adjs = [
                          grid[cIdx+1], grid[cIdx-1],
                          grid[cIdx+GRID_W], grid[cIdx-GRID_W]
                      ];
                      for(let adj of adjs) {
                          if (adj && adj.ownerId !== p.id && adj.type !== 'water') {
                              myBorders.push({src: c, dest: adj});
                          }
                      }
                  }
              }
              let borders = myBorders;`
);

code = code.replace(
`          if (autoTargetForce > 10) {
              let borders = myCells.filter(mc => {
                  let adjs = [ grid[getCellIndex(mc.x+1,mc.y)], grid[getCellIndex(mc.x-1,mc.y)], grid[getCellIndex(mc.x,mc.y+1)], grid[getCellIndex(mc.x,mc.y-1)] ];
                  return adjs.some(targetFilter);
              });
              if (borders.length > 0) {
                  let start = borders[Math.floor(Math.random() * borders.length)];
                  let adjs = [grid[getCellIndex(start.x+1,start.y)], grid[getCellIndex(start.x-1,start.y)], grid[getCellIndex(start.x,start.y+1)], grid[getCellIndex(start.x,start.y-1)]];
                  let targets = adjs.filter(targetFilter);
                  if (targets.length > 0) {
                      p.pop -= autoTargetForce;
                      p.offensiveWaves.push({ troops: autoTargetForce, target: {x: targets[0].x, y: targets[0].y} });
                  }
              }
          }`,
`          if (autoTargetForce > 10) {
              if (!myBorders) {
                  myBorders = [];
                  for(let c of myCells) {
                      let cIdx = c.idx;
                      let adjs = [grid[cIdx+1], grid[cIdx-1], grid[cIdx+GRID_W], grid[cIdx-GRID_W]];
                      for(let adj of adjs) {
                          if (adj && adj.ownerId !== p.id && adj.type !== 'water') {
                              myBorders.push({src: c, dest: adj});
                          }
                      }
                  }
              }
              if (myBorders.length > 0) {
                  let randomBorder = myBorders[Math.floor(Math.random() * myBorders.length)];
                  p.pop -= autoTargetForce;
                  p.offensiveWaves.push({ troops: autoTargetForce, target: {x: randomBorder.dest.x, y: randomBorder.dest.y} });
              }
          }`
);

fs.writeFileSync('src/components/WorldFrontGame.tsx', code);
console.log('Done optimization.');
