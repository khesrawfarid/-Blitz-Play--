const fs = require('fs');

// We don't have Jimp installed by default but we can use canvas or just test SVG loading.
console.log("SVG header:", fs.readFileSync('./public/map.svg', 'utf8').substring(0, 150));
