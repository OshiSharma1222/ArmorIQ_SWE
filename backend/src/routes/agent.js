import { Router } from 'express';

const router = Router();

// Will be wired up after the agent loop is built
router.post('/chat', async (req, res) => {
  res.status(501).json({ error: 'Agent loop not yet initialized' });
});

export default router;
