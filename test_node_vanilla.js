import { spawnSync } from 'child_process';
const out = spawnSync('node', ['server.ts'], { env: { ...process.env, NODE_OPTIONS: '' } });
console.log('STDOUT', out.stdout.toString());
console.log('STDERR', out.stderr.toString());
