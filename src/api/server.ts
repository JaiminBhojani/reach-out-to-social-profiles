import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import contributorsRouter from './routes/contributors.js';
import outreachRouter from './routes/outreach.js';
import { env } from '../lib/env.js';
import { connectDB } from '../db/mongo.js';
import { draftPendingOutreachMessages } from '../worker/draftPendingOutreach.js';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Reach Out to Social Profiles API is running!');
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

app.route('/contributors', contributorsRouter);
app.route('/outreach', outreachRouter);

const port = parseInt(env.PORT, 10);

console.log(`Starting server on port ${port}...`);

connectDB()
  .then(async () => {
    const result = await draftPendingOutreachMessages();
    console.log(`[OutreachDrafts] Drafted placeholder messages for ${result.modified}/${result.matched} pending contributors.`);
  })
  .catch(console.error);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
