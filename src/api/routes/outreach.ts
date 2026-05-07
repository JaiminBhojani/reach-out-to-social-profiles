import { Hono } from 'hono';
import { ContributorModel } from '../../db/models/Contributor.js';
import { draftContributorOutreach } from '../../worker/draftPendingOutreach.js';

const app = new Hono();

app.post('/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const contributor = await ContributorModel.findOne({ username });

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found in database.` }, 404);
    }

    if (contributor.isConnectionSent) {
      return c.json({ error: `${username} is not pending outreach.` }, 409);
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

export default app;
