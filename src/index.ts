import mongoose from 'mongoose';
import { connectDB } from './db/mongo.js';
import { draftPendingOutreachMessages } from './worker/draftPendingOutreach.js';

async function main(): Promise<void> {
  console.log('[OutreachDrafts] Starting outreach draft generation...');

  await connectDB();
  const result = await draftPendingOutreachMessages();

  console.log(`[OutreachDrafts] Drafted personalized messages for ${result.modified}/${result.matched} pending contributors. Failed: ${result.failed}.`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OutreachDrafts] Failed:', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
