import { spawn } from 'child_process';
const p = spawn('npx', ['npm', 'start'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '3001' }
});
p.stdout.on('data', d => console.log(d.toString()));
p.stderr.on('data', d => console.error(d.toString()));
p.on('close', code => console.log('Closed', code));
