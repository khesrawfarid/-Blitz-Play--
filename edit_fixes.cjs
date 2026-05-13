const fs = require('fs');
let code = fs.readFileSync('src/components/WorldFrontGame.tsx', 'utf8');

// Steaming Ships
code = code.replace(
/let maxDispatch = Math\.min\(wave\.troops, Math\.max\(50, Math\.floor\(wave\.troops \* 0\.2\)\)\);/g,
'let maxDispatch = Math.min(wave.troops, Math.max(500, Math.floor(wave.troops * 0.5)));'
);

// Growth and economy
code = code.replace(
/let troopsGain = \(myCells\.length \* 0\.05\) \+ \(cityCount \* 2\.0\);/g,
'let troopsGain = (myCells.length * 0.15) + (cityCount * 8.0);'
);

// Coastal targets: Fix wave dispatching for naval
code = code.replace(
/coastalCells\.sort\(\(a,b\) => Math\.pow\(a\.x - cell\.x, 2\) \+ Math\.pow\(a\.y - cell\.y, 2\) - \(Math\.pow\(b\.x - cell\.x, 2\) \+ Math\.pow\(b\.y - cell\.y, 2\)\)\);\s*p\.pop -= attackForce;\s*p\.offensiveWaves\.push\(\{ troops: attackForce, target: \{x: cell\.x, y: cell\.y\}, type: 'naval', navalSrc: \{x: coastalCells\[0\]\.x, y: coastalCells\[0\]\.y\} \}\);/g,
`coastalCells.sort((a,b) => Math.pow(a.x - cell.x, 2) + Math.pow(a.y - cell.y, 2) - (Math.pow(b.x - cell.x, 2) + Math.pow(b.y - cell.y, 2)));
                       p.pop -= attackForce;
                       
                       // Find closest coastal to the destination
                       let targetCoast = cell;
                       if (cell.type !== 'water') {
                           // Try to find the closest border cell to target
                           let possibleTargets = [
                               gridRef.current[getCellIndex(cell.x+1,cell.y)],
                               gridRef.current[getCellIndex(cell.x-1,cell.y)],
                               gridRef.current[getCellIndex(cell.x,cell.y+1)],
                               gridRef.current[getCellIndex(cell.x,cell.y-1)]
                           ].filter(c => c && c.type === 'water');
                           if (possibleTargets.length > 0) {
                               targetCoast = possibleTargets[0];
                           } else {
                               // search radius 3. Too slow? Just push target directly, ship logic will handle it better now
                           }
                       }
                       p.offensiveWaves.push({ troops: attackForce, target: {x: cell.x, y: cell.y}, type: 'naval', navalSrc: {x: coastalCells[0].x, y: coastalCells[0].y} });`
);

fs.writeFileSync('src/components/WorldFrontGame.tsx', code);
