import { Hono } from 'hono';
import { ContributorModel } from '../../db/models/Contributor.js';

const app = new Hono();
const nonEmptyStringQuery = { $exists: true, $nin: [null, ''] };

function parsePaginationValue(value: string | undefined, fallback: number, max?: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  const safeValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  return max ? Math.min(safeValue, max) : safeValue;
}

app.get('/', async (c) => {
  try {
    const query: Record<string, unknown> = {};

    if (c.req.query('pending') === 'true') {
      query.isConnectionSent = { $ne: true };
    }

    if (c.req.query('hasLinkedin') === 'true') {
      query.linkedinUrl = nonEmptyStringQuery;
    }

    if (c.req.query('hasTwitter') === 'true') {
      query.twitterUsername = nonEmptyStringQuery;
    }

    if (c.req.query('hasEmail') === 'true') {
      query.email = nonEmptyStringQuery;
    }

    const search = c.req.query('search');
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const limit = parsePaginationValue(c.req.query('limit'), 50, 200);
    const skip = parsePaginationValue(c.req.query('skip'), 0);

    const [contributors, totalCount, allStats] = await Promise.all([
      ContributorModel.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
      ContributorModel.countDocuments(query),
      ContributorModel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            withLinkedin: { $sum: { $cond: [{ $and: [{ $ne: ['$linkedinUrl', null] }, { $ne: ['$linkedinUrl', ''] }] }, 1, 0] } },
            withTwitter: { $sum: { $cond: [{ $and: [{ $ne: ['$twitterUsername', null] }, { $ne: ['$twitterUsername', ''] }] }, 1, 0] } },
            withEmail: { $sum: { $cond: [{ $and: [{ $ne: ['$email', null] }, { $ne: ['$email', ''] }] }, 1, 0] } },
            connectionsSent: { $sum: { $cond: ['$isConnectionSent', 1, 0] } },
          },
        },
      ]),
    ]);

    const stats = allStats[0] ?? {
      total: 0,
      withLinkedin: 0,
      withTwitter: 0,
      withEmail: 0,
      connectionsSent: 0,
    };

    return c.json({
      success: true,
      stats: {
        total: stats.total,
        withLinkedin: stats.withLinkedin,
        withTwitter: stats.withTwitter,
        withEmail: stats.withEmail,
        connectionsSent: stats.connectionsSent,
        pendingOutreach: stats.total - stats.connectionsSent,
      },
      pagination: {
        limit,
        skip,
        returned: contributors.length,
        totalMatching: totalCount,
      },
      contributors,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Contributors] Error listing contributors:', message);
    return c.json({ error: message }, 500);
  }
});

app.get('/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const contributor = await ContributorModel.findOne({ username }).lean();

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found` }, 404);
    }

    return c.json({ success: true, contributor });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    console.error('[Contributors] Error fetching contributor:', message);
    return c.json({ error: message }, 500);
  }
});

export default app;
