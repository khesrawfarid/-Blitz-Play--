import { execSync } from 'child_process';
try {
  execSync('node server.ts', { stdio: 'inherit' });
} catch (e) {
  console.log("Error:", e.message);
}
