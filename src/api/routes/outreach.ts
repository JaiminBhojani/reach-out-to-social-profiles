import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ContributorModel } from '../../db/models/Contributor';
import { generateOutreachMessages } from '../../agent/tools/messageGenerator';

const app = new Hono();

// Zod schema for the outreach generation request
const OutreachRequestSchema = z.object({
  context: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'enthusiastic']).default('professional'),
});

// Zod schema for the mark-sent request
const MarkSentSchema = z.object({
  channel: z.enum(['linkedin', 'twitter', 'email']),
});

/**
 * POST /outreach/:username
 * Generate personalized outreach messages for a contributor using Claude AI.
 */
app.post('/:username', zValidator('json', OutreachRequestSchema), async (c) => {
  const startTime = Date.now();

  try {
    const username = c.req.param('username');
    const { context, tone } = c.req.valid('json');

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`[Outreach] 🚀 Generating outreach for: ${username}`);
    console.log(`[Outreach]    Tone: ${tone}`);
    if (context) console.log(`[Outreach]    Extra context: ${context}`);
    console.log(`${'═'.repeat(70)}`);

    // 1. Fetch contributor from DB
    const contributor = await ContributorModel.findOne({ username });

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found in database.` }, 404);
    }

    // 2. Generate outreach messages via Claude
    console.log(`[Outreach] 🤖 Phase 1/2 — Generating AI-powered messages...`);
    const outreach = await generateOutreachMessages(contributor, context, tone);

    // 3. Save generated messages to outreach history
    console.log(`[Outreach] 💾 Phase 2/2 — Saving to outreach history...`);
    const historyEntries = [];

    if (outreach.linkedin) {
      historyEntries.push({
        channel: 'linkedin',
        message: outreach.linkedin.message,
        generatedAt: new Date(),
      });
    }
    if (outreach.twitter) {
      historyEntries.push({
        channel: 'twitter',
        message: outreach.twitter.message,
        generatedAt: new Date(),
      });
    }
    if (outreach.email) {
      historyEntries.push({
        channel: 'email',
        message: outreach.email.message,
        subject: outreach.email.subject,
        generatedAt: new Date(),
      });
    }

    if (historyEntries.length > 0) {
      await ContributorModel.findOneAndUpdate(
        { username },
        { $push: { outreachHistory: { $each: historyEntries } } },
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n${'─'.repeat(70)}`);
    console.log(`[Outreach] ✅ Messages generated successfully`);
    console.log(`[Outreach]    Channels: ${[outreach.linkedin && 'LinkedIn', outreach.twitter && 'Twitter', outreach.email && 'Email'].filter(Boolean).join(', ')}`);
    console.log(`[Outreach]    ⏱  Completed in ${elapsed}s`);
    console.log(`${'═'.repeat(70)}\n`);

    return c.json({
      success: true,
      message: `Outreach messages generated for ${username}`,
      elapsed: `${elapsed}s`,
      outreach,
    });

  } catch (error: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[Outreach] ❌ Failed after ${elapsed}s:`, error.message);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

/**
 * POST /outreach/:username/mark-sent
 * Mark a contributor as having been reached out to on a specific channel.
 */
app.post('/:username/mark-sent', zValidator('json', MarkSentSchema), async (c) => {
  try {
    const username = c.req.param('username');
    const { channel } = c.req.valid('json');

    const contributor = await ContributorModel.findOne({ username });

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found.` }, 404);
    }

    // Update isConnectionSent to true
    const updated = await ContributorModel.findOneAndUpdate(
      { username },
      { $set: { isConnectionSent: true } },
      { new: true },
    );

    console.log(`[Outreach] ✓ Marked ${username} as connection sent (channel: ${channel})`);

    return c.json({
      success: true,
      message: `${username} marked as reached out via ${channel}`,
      contributor: updated,
    });

  } catch (error: any) {
    console.error('[Outreach] Error marking sent:', error.message);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

export default app;
