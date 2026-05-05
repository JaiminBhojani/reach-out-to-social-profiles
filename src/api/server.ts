import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import contributorsRouter from './routes/contributors';
import outreachRouter from './routes/outreach';
import { env } from '../lib/env';
import { connectDB } from '../db/mongo';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Reach Out to Social Profiles API is running!');
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Register routes
app.route('/contributors', contributorsRouter);
app.route('/outreach', outreachRouter);

const port = parseInt(env.PORT, 10);

console.log(`Starting server on port ${port}...`);

// Initialize database connection
connectDB().catch(console.error);

serve({
  fetch: app.fetch,
  port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`);
});
