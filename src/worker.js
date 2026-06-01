import { Worker } from 'bullmq';
import { getMxHost } from './mx.js';
import { isCatchAll } from './catchall.js';
import { generatePatterns } from './patterns.js';
import { verifyEmail } from './smtp.js';
import { ProxyManager } from './proxy.js';

const PROXIES = (process.env.SOCKS_PROXIES || '').split(',').filter(Boolean);
const proxyManager = new ProxyManager(PROXIES);

const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

async function processJob(job) {
  const { firstName, lastName, domain } = job.data;
  const results = { domain, catchAll: false, emails: [] };

  await job.updateProgress(5);

  const mxHost = await getMxHost(domain);
  results.mxHost = mxHost;
  await job.updateProgress(10);

  const proxy = proxyManager.next();

  const catchAllResult = await isCatchAll(domain, mxHost, proxy);
  if (catchAllResult.catchAll) {
    results.catchAll = true;
    results.message = 'Domain is catch-all, verification unreliable';
    await job.updateProgress(100);
    return results;
  }
  await job.updateProgress(20);

  const emails = generatePatterns(firstName, lastName, domain);
  const total = emails.length;

  for (let i = 0; i < total; i++) {
    const email = emails[i];
    const currentProxy = proxyManager.next();
    const verification = await verifyEmail(email, mxHost, currentProxy);
    results.emails.push(verification);

    const progress = 20 + Math.round(((i + 1) / total) * 80);
    await job.updateProgress(progress);
  }

  return results;
}

const worker = new Worker('email-verify', processJob, {
  connection,
  concurrency: 3,
  limiter: {
    max: 5,
    duration: 10_000,
  },
});

worker.on('completed', (job) => {
  console.log(`Job ${job.id} finished`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
});

console.log('Worker started, waiting for jobs...');
