import { spawn } from 'child_process';
import http from 'http';

// We kill the dev server so we can listen on 3000!
import { execSync } from 'child_process';
try {
  execSync('pkill -f "tsx server.ts"');
} catch(e) {}

const server = spawn('node', ['server.ts'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3000' }
});

setTimeout(() => {
  http.get('http://localhost:3000/', (res) => {
    console.log("Status:", res.statusCode);
    res.on('data', () => {});
    res.on('end', () => server.kill());
  }).on('error', e => {
    console.log("Req error", e.message);
    server.kill();
  });
}, 2000);

server.stdout.on('data', d => console.log('OUT:', d.toString()));
server.stderr.on('data', d => console.log('ERR:', d.toString()));
server.on('close', code => console.log('Closed', code));
