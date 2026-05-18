const fs = require('fs');

let content = fs.readFileSync('src/components/WorldFrontGame.tsx', 'utf-8');

const regex1 = /if \(!targetIsCoast\) \{\s+let searchRadius = 1;\s+let found = false;\s+while \(searchRadius <= 20 && !found\) \{\s+for\(let dx=-searchRadius; dx<=searchRadius; dx\+\+\)\{\s+for\(let dy=-searchRadius; dy<=searchRadius; dy\+\+\)\{\s+let cx = cell.x\+dx; let cy = cell.y\+dy;\s+let c = getSafe\(cx, cy\);\s+if \(c && c.type !== 'water'\) \{\s+let cAdjs = \[\s+getSafe\(c.x\+1,c.y\), getSafe\(c.x-1,c.y\),\s+getSafe\(c.x,c.y\+1\), getSafe\(c.x,c.y-1\)\s+\];\s+if \(cAdjs.some\(a => a && a.type === 'water'\)\) \{\s+tx = c.x; ty = c.y; found = true; break;\s+\}\s+\}\s+\}\s+if\(found\) break;\s+\}\s+searchRadius\+\+;\s+\}\s+if \(!found\) \{\s+(return; \/\/ Failed to find coast|setContextMenu\(null\);\s+return;)\s+\}\s+\}/g;

const replacement = `if (!targetIsCoast) {
            let queue = [{x: cell.x, y: cell.y}];
            let visited = new Set([\`\${cell.x},\${cell.y}\`]);
            let foundCoast = null;
            
            while(queue.length > 0) {
                let curr = queue.shift();
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
                            let key = \`\${a.x},\${a.y}\`;
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
                $1
            }
        }`;

content = content.replace(regex1, replacement);
fs.writeFileSync('src/components/WorldFrontGame.tsx', content);
