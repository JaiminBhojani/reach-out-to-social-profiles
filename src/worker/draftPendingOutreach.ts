import { ContributorModel, type IContributor } from '../db/models/Contributor.js';
import { generatePersonalizedOutreachDraft } from '../agent/tools/outreachDraftGenerator.js';
import { researchContributorSocialProfiles } from '../agent/tools/profileResearcher.js';

export interface DraftPendingOutreachResult {
  matched: number;
  modified: number;
  failed: number;
}

async function draftForContributor(contributor: IContributor): Promise<void> {
  const research = await researchContributorSocialProfiles(contributor);
  const draft = await generatePersonalizedOutreachDraft(contributor, research);

  await ContributorModel.updateOne(
    { _id: contributor._id },
    {
      $set: {
        outreachDraft: {
          subject: draft.subject,
          message: draft.message,
          generatedAt: new Date(),
          research,
        },
      },
    },
  );
}

export async function draftPendingOutreachMessages(): Promise<DraftPendingOutreachResult> {
  const contributors = await ContributorModel.find({ isConnectionSent: false });
  let modified = 0;
  let failed = 0;

  for (const contributor of contributors) {
    try {
      console.log(`[OutreachDrafts] Researching and drafting for ${contributor.username}...`);
      await draftForContributor(contributor);
      modified += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OutreachDrafts] Failed to draft for ${contributor.username}:`, message);
    }
  }

  return {
    matched: contributors.length,
    modified,
    failed,
  };
}

export async function draftContributorOutreach(username: string): Promise<boolean> {
  const contributor = await ContributorModel.findOne({ username, isConnectionSent: false });

  if (!contributor) {
    return false;
  }

  await draftForContributor(contributor);
  return true;
}
