const fs = require('fs');

let code = fs.readFileSync('src/components/WorldFrontGame.tsx', 'utf8');

code = code.replace(
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
              }`,
`              if (!myBorders) {
                  myBorders = [];
                  for(let i=0; i<myCells.length; i++) {
                      let c = myCells[i];
                      let cIdx = c.idx;
                      let adj = grid[cIdx+1];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx-1];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx+GRID_W];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx-GRID_W];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                  }
              }`
);

code = code.replace(
`              if (!myBorders) {
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
              }`,
`              if (!myBorders) {
                  myBorders = [];
                  for(let i=0; i<myCells.length; i++) {
                      let c = myCells[i];
                      let cIdx = c.idx;
                      let adj = grid[cIdx+1];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx-1];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx+GRID_W];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                      adj = grid[cIdx-GRID_W];
                      if (adj && adj.ownerId !== p.id && adj.type !== 'water') myBorders.push({src: c, dest: adj});
                  }
              }`
);

fs.writeFileSync('src/components/WorldFrontGame.tsx', code);
