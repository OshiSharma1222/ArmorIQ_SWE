import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import policyRouter from './routes/policy.js';
import logsRouter from './routes/logs.js';
import agentRouter from './routes/agent.js';
import MCPClientManager from './mcp/client.js';
import policyEngine from './policy/engine.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3001';

app.use(cors());
app.use(express.json());

app.use('/api/policies', policyRouter);
app.use('/api/logs', logsRouter);
app.use('/api/agent', agentRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const wsClients = new Set();

wss.on('connection', (ws) => {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
  ws.on('error', () => wsClients.delete(ws));
});

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === 1) {
      ws.send(msg);
    }
  }
}

app.locals.broadcastPolicyUpdate = () => {
  policyEngine.refresh();
  broadcast({ type: 'policy_update' });
};

app.locals.broadcastEvent = (event) => {
  broadcast(event);
};

const mcpClient = new MCPClientManager();
app.locals.mcpClient = mcpClient;

async function connectMCPServers() {
  try {
    await mcpClient.connectSSE('custom', `${MCP_SERVER_URL}/sse`);
    console.log('Connected to custom MCP server');
  } catch (err) {
    console.error('Failed to connect to custom MCP server:', err.message);
    console.log('Will retry in 5s...');
    setTimeout(connectMCPServers, 5000);
  }
}

server.listen(PORT, async () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
  await connectMCPServers();
});

export { app, server };
