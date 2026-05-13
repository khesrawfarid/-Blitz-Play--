import https from 'https';
import fs from 'fs';

const options = {
  hostname: 'upload.wikimedia.org',
  path: '/wikipedia/commons/e/ec/World_map_blank_without_borders.svg',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  }
};

https.get(options, (res) => {
  const path = "public/map.svg"; 
  const writeStream = fs.createWriteStream(path);
  res.pipe(writeStream);
  writeStream.on('finish', () => {
    writeStream.close();
    console.log('Download Completed', res.statusCode);
  });
});
