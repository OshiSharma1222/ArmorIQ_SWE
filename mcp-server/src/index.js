import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { registerNoteTools } from './tools/notes.js';
import { registerWeatherTools } from './tools/weather.js';

const PORT = process.env.MCP_PORT || 3001;

const server = new McpServer({
  name: 'armoriq-mcp-server',
  version: '1.0.0'
});

registerNoteTools(server);
registerWeatherTools(server);

const app = express();
app.use(cors());

const transports = {};

app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;

  res.on('close', () => {
    delete transports[transport.sessionId];
  });

  await server.connect(transport);
});

app.post('/messages', express.json(), async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (!transport) {
    res.status(400).json({ error: 'Unknown session' });
    return;
  }
  await transport.handlePostMessage(req, res);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', tools: ['create_note', 'list_notes', 'get_note', 'delete_note', 'get_weather'] });
});

app.listen(PORT, () => {
  console.log(`MCP server running on http://localhost:${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});
