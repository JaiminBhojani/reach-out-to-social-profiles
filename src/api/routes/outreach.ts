import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ContributorModel } from '../../db/models/Contributor.js';
import { ChannelSchema } from '../../agent/state.js';
import { draftContributorOutreach } from '../../worker/draftPendingOutreach.js';

const app = new Hono();

const MarkSentSchema = z.object({
  channel: ChannelSchema,
});

app.post('/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const contributor = await ContributorModel.findOne({ username });

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found in database.` }, 404);
    }

    if (contributor.isConnectionSent) {
      return c.json({ error: `${username} has already been marked as reached out.` }, 409);
    }

    await draftContributorOutreach(username);
    const updated = await ContributorModel.findOne({ username }).lean();

    return c.json({
      success: true,
      message: `Personalized outreach draft stored for ${username}`,
      outreachDraft: updated?.outreachDraft,
      contributor: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Outreach] Error drafting outreach:', message);
    return c.json({ error: message }, 500);
  }
});

app.post('/:username/mark-sent', zValidator('json', MarkSentSchema), async (c) => {
  try {
    const username = c.req.param('username');
    const { channel } = c.req.valid('json');

    const contributor = await ContributorModel.findOne({ username });

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found.` }, 404);
    }

    await ContributorModel.updateOne(
      { username },
      { $set: { isConnectionSent: true } },
    );

    await ContributorModel.updateOne(
      { username, 'outreachHistory.channel': channel },
      { $set: { 'outreachHistory.$[entry].sentAt': new Date() } },
      { arrayFilters: [{ 'entry.channel': channel, 'entry.sentAt': { $exists: false } }] },
    );

    const updated = await ContributorModel.findOne({ username });

    console.log(`[Outreach] Marked ${username} as connection sent via ${channel}`);

    return c.json({
      success: true,
      message: `${username} marked as reached out via ${channel}`,
      contributor: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Outreach] Error marking sent:', message);
    return c.json({ error: message }, 500);
  }
});

export default app;
