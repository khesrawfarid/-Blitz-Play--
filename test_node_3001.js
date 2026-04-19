import { execSync } from 'child_process';
try {
  execSync('node server.ts', { stdio: 'inherit', env: { ...process.env, PORT: '3001'} });
} catch (e) {
  console.log("Error:", e.message);
}
