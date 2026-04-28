import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import policyRouter from './routes/policy.js';
import logsRouter from './routes/logs.js';
import agentRouter from './routes/agent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/policies', policyRouter);
app.use('/api/logs', logsRouter);
app.use('/api/agent', agentRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});

export { app };
