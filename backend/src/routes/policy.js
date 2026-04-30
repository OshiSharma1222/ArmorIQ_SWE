import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/', (req, res) => {
  const policies = db.prepare('SELECT * FROM policies ORDER BY created_at DESC').all();
  res.json(policies);
});

router.post('/', (req, res) => {
  const { name, type, tool_name, config, enabled } = req.body;

  if (!name || !type || !tool_name) {
    res.status(400).json({ error: 'name, type, and tool_name are required' });
    return;
  }

  const validTypes = ['block', 'require_approval', 'input_validation'];
  if (!validTypes.includes(type)) {
    res.status(400).json({ error: `type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const result = db.prepare(
    'INSERT INTO policies (name, type, tool_name, config, enabled) VALUES (?, ?, ?, ?, ?)'
  ).run(name, type, tool_name, JSON.stringify(config || {}), enabled !== undefined ? (enabled ? 1 : 0) : 1);

  const policy = db.prepare('SELECT * FROM policies WHERE id = ?').get(result.lastInsertRowid);

  if (req.app.locals.broadcastPolicyUpdate) {
    req.app.locals.broadcastPolicyUpdate();
  }

  res.status(201).json(policy);
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, type, tool_name, config, enabled } = req.body;

  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }

  db.prepare(
    'UPDATE policies SET name = ?, type = ?, tool_name = ?, config = ?, enabled = ? WHERE id = ?'
  ).run(
    name || existing.name,
    type || existing.type,
    tool_name || existing.tool_name,
    JSON.stringify(config || JSON.parse(existing.config)),
    enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    id
  );

  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);

  if (req.app.locals.broadcastPolicyUpdate) {
    req.app.locals.broadcastPolicyUpdate();
  }

  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }

  db.prepare('DELETE FROM policies WHERE id = ?').run(id);

  if (req.app.locals.broadcastPolicyUpdate) {
    req.app.locals.broadcastPolicyUpdate();
  }

  res.json({ deleted: true });
});

router.patch('/:id/toggle', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);
  if (!existing) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }

  db.prepare('UPDATE policies SET enabled = ? WHERE id = ?').run(existing.enabled ? 0 : 1, id);
  const updated = db.prepare('SELECT * FROM policies WHERE id = ?').get(id);

  if (req.app.locals.broadcastPolicyUpdate) {
    req.app.locals.broadcastPolicyUpdate();
  }

  res.json(updated);
});

export default router;
