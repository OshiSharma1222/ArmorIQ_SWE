import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const mcpServer = spawn('node', ['src/index.js'], {
  cwd: path.join(__dirname, 'mcp-server'),
  stdio: 'inherit',
  env: { ...process.env, MCP_PORT: process.env.MCP_PORT || '3001' }
});

setTimeout(() => {
  const backend = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, 'backend'),
    stdio: 'inherit',
    env: { ...process.env }
  });

  backend.on('exit', (code) => {
    console.log('Backend exited with code', code);
    mcpServer.kill();
    process.exit(code || 1);
  });
}, 2000);

mcpServer.on('exit', (code) => {
  console.log('MCP server exited with code', code);
  process.exit(code || 1);
});

process.on('SIGTERM', () => {
  mcpServer.kill();
  process.exit(0);
});
