import { Hono } from 'hono';
import { ContributorModel } from '../../db/models/Contributor';

const app = new Hono();

/**
 * GET /contributors
 * List contributors from the database with optional filters.
 * 
 * Query params:
 *   ?pending=true       — Only contributors who haven't been reached out to
 *   ?hasLinkedin=true   — Only contributors with a LinkedIn URL
 *   ?hasTwitter=true    — Only contributors with a Twitter username
 *   ?hasEmail=true      — Only contributors with an email
 *   ?search=query       — Search by username or name
 *   ?limit=20           — Limit results (default: 50)
 *   ?skip=0             — Skip results for pagination
 */
app.get('/', async (c) => {
  try {
    const query: Record<string, any> = {};

    // Filter: only pending (not yet reached out)
    if (c.req.query('pending') === 'true') {
      query.isConnectionSent = { $ne: true };
    }

    // Filter: has LinkedIn
    if (c.req.query('hasLinkedin') === 'true') {
      query.linkedinUrl = { $ne: null, $exists: true, $nin: ['', null] };
    }

    // Filter: has Twitter
    if (c.req.query('hasTwitter') === 'true') {
      query.twitterUsername = { $ne: null, $exists: true, $nin: ['', null] };
    }

    // Filter: has Email
    if (c.req.query('hasEmail') === 'true') {
      query.email = { $ne: null, $exists: true, $nin: ['', null] };
    }

    // Filter: search by username or name
    const search = c.req.query('search');
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200);
    const skip = parseInt(c.req.query('skip') || '0', 10);

    const [contributors, totalCount] = await Promise.all([
      ContributorModel.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
      ContributorModel.countDocuments(query),
    ]);

    // Compute summary stats
    const allStats = await ContributorModel.aggregate([
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
    ]);

    const stats = allStats[0] || { total: 0, withLinkedin: 0, withTwitter: 0, withEmail: 0, connectionsSent: 0 };

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

  } catch (error: any) {
    console.error('[Contributors] Error listing contributors:', error.message);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

/**
 * GET /contributors/:username
 * Get a single contributor's full profile.
 */
app.get('/:username', async (c) => {
  try {
    const username = c.req.param('username');
    const contributor = await ContributorModel.findOne({ username }).lean();

    if (!contributor) {
      return c.json({ error: `Contributor '${username}' not found` }, 404);
    }

    return c.json({ success: true, contributor });
  } catch (error: any) {
    console.error('[Contributors] Error fetching contributor:', error.message);
    return c.json({ error: error.message || 'Internal Server Error' }, 500);
  }
});

export default app;
