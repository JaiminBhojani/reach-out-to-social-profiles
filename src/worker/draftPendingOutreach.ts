import { ContributorModel } from '../db/models/Contributor.js';

export const DEFAULT_DRAFT_MESSAGE = 'hello';

export interface DraftPendingOutreachResult {
  matched: number;
  modified: number;
}

export async function draftPendingOutreachMessages(): Promise<DraftPendingOutreachResult> {
  const generatedAt = new Date();
  const result = await ContributorModel.updateMany(
    { isConnectionSent: false },
    {
      $set: {
        outreachDraft: {
          message: DEFAULT_DRAFT_MESSAGE,
          generatedAt,
        },
      },
    },
  );

  return {
    matched: result.matchedCount,
    modified: result.modifiedCount,
  };
}

export async function draftContributorOutreach(username: string): Promise<boolean> {
  const result = await ContributorModel.updateOne(
    { username, isConnectionSent: false },
    {
      $set: {
        outreachDraft: {
          message: DEFAULT_DRAFT_MESSAGE,
          generatedAt: new Date(),
        },
      },
    },
  );

  return result.matchedCount > 0;
}
