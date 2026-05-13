import fs from 'fs';
let content = fs.readFileSync('public/map.svg', 'utf8');
content = content.replace(/^Please.*\n/i, '');
fs.writeFileSync('public/map.svg', content);
