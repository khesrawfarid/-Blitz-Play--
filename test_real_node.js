import { execSync } from 'child_process';
try {
  let env = { ...process.env };
  delete env.NODE_OPTIONS;
  execSync('node server.ts', { stdio: 'inherit', env });
} catch (e) {
  console.log("Error:", e.message);
}
