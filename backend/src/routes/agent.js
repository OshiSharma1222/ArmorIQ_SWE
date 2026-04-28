import { Router } from 'express';
import { runAgentLoop } from '../agent/loop.js';
import db from '../db/index.js';

const router = Router();

router.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: 'message is required' });
    return;
  }

  const mcpClient = req.app.locals.mcpClient;
  if (!mcpClient) {
    res.status(503).json({ error: 'MCP client not initialized yet' });
    return;
  }

  try {
    const result = await runAgentLoop(
      message,
      mcpClient,
      req.app.locals.broadcastEvent
    );
    res.json(result);
  } catch (err) {
    console.error('Agent loop error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/tools', (req, res) => {
  const mcpClient = req.app.locals.mcpClient;
  if (!mcpClient) {
    res.json([]);
    return;
  }
  res.json(mcpClient.getAllTools());
});

router.post('/approve/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  db.prepare('UPDATE approval_queue SET status = ? WHERE id = ?').run('approved', id);
  res.json({ approved: true });
});

router.post('/reject/:id', (req, res) => {
  const { id } = req.params;
  const row = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(id);
  if (!row) {
    res.status(404).json({ error: 'Approval request not found' });
    return;
  }
  db.prepare('UPDATE approval_queue SET status = ? WHERE id = ?').run('rejected', id);
  res.json({ rejected: true });
});

router.get('/approvals', (req, res) => {
  const pending = db.prepare(
    'SELECT * FROM approval_queue WHERE status = ? ORDER BY created_at DESC'
  ).all('pending');
  res.json(pending);
});

export default router;
