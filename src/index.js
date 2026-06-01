import express from 'express';
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

const queue = new Queue('email-verify', { connection });
const app = express();
app.use(express.json());

app.post('/verify', async (req, res) => {
  const { firstName, lastName, domain } = req.body;

  if (!firstName || !lastName || !domain) {
    return res.status(400).json({ error: 'firstName, lastName, and domain are required' });
  }

  try {
    const job = await queue.add('verify-email', { firstName, lastName, domain });
    res.status(202).json({ jobId: job.id, status: 'queued' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to queue job', details: err.message });
  }
});

app.get('/verify/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({ jobId, state, progress, result, failedReason });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch job', details: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});
