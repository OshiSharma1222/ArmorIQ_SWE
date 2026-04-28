import { Router } from 'express';
import db from '../db/index.js';

const router = Router();

router.get('/conversations', (req, res) => {
  const conversations = db.prepare(`
    SELECT c.*, 
      (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count,
      (SELECT SUM(token_count) FROM messages WHERE conversation_id = c.id) as total_tokens
    FROM conversations c 
    ORDER BY c.created_at DESC
  `).all();
  res.json(conversations);
});

router.get('/conversations/:id', (req, res) => {
  const { id } = req.params;
  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!conversation) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }

  const messages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(id);

  res.json({ ...conversation, messages });
});

export default router;
