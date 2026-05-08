import mongoose from 'mongoose';
import { connectDB } from './db/mongo.js';
import { draftPendingOutreachMessages } from './worker/draftPendingOutreach.js';

async function main(): Promise<void> {
  console.log('[OutreachFlow] Starting draft + email flow...');

  await connectDB();
  const result = await draftPendingOutreachMessages();

  console.log(
    `[OutreachFlow] Processed ${result.matched} pending contributors. Drafted: ${result.drafted}. Emailed: ${result.emailed}. Email skipped: ${result.skippedEmail}. Failed: ${result.failed}.`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[OutreachFlow] Failed:', message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
