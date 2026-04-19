import { execSync, spawn } from 'child_process';
import http from 'http';

const server = spawn('node', ['server.ts'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3001' }
});

setTimeout(() => {
  http.get('http://localhost:3001/assets/', (res) => {
    console.log("Status:", res.statusCode);
    server.kill();
  }).on('error', e => {
    console.log("Req error", e.message);
    server.kill();
  });
}, 2000);

server.stdout.on('data', d => console.log('OUT:', d.toString()));
server.stderr.on('data', d => console.log('ERR:', d.toString()));
