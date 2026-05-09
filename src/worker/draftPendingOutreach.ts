import nodemailer from 'nodemailer';
import { ContributorModel, type IContributor } from '../db/models/Contributor.js';
import { generatePersonalizedOutreachDraft } from '../agent/tools/outreachDraftGenerator.js';
import { researchContributorSocialProfiles } from '../agent/tools/profileResearcher.js';
import { env } from '../lib/env.js';

export interface DraftPendingOutreachResult {
  matched: number;
  drafted: number;
  emailed: number;
  skippedEmail: number;
  failed: number;
}

function getMissingSmtpFields(): string[] {
  const requiredFields: Array<[string, string | undefined]> = [
    ['SMTP_HOST', env.SMTP_HOST],
    ['SMTP_USER', env.SMTP_USER],
    ['SMTP_PASS', env.SMTP_PASS],
    ['SMTP_FROM', env.SMTP_FROM],
  ];

  return requiredFields
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

async function draftForContributor(contributor: IContributor): Promise<{ subject: string; message: string }> {
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

  return draft;
}

export async function draftPendingOutreachMessages(): Promise<DraftPendingOutreachResult> {
  const contributors = await ContributorModel.find({ isConnectionSent: false });

  const missingFields = getMissingSmtpFields();
  const smtpConfigured = missingFields.length === 0;

  if (!smtpConfigured) {
    console.log(
      `[OutreachEmails] SMTP is not configured. Will draft only. Missing: ${missingFields.join(', ')}.`,
    );
  }

  const transporter = smtpConfigured
    ? nodemailer.createTransport({
      host: env.SMTP_HOST!,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: {
        user: env.SMTP_USER!,
        pass: env.SMTP_PASS!,
      },
    })
    : null;

  let drafted = 0;
  let emailed = 0;
  let skippedEmail = 0;
  let failed = 0;

  for (const contributor of contributors) {
    try {
      console.log(`[OutreachDrafts] Researching and drafting for ${contributor.username}...`);
      const draft = await draftForContributor(contributor);
      drafted += 1;

      const email = contributor.email;
      if (!email || !transporter) {
        skippedEmail += 1;
      } else {
        try {
          console.log(`[OutreachEmails] Sending email draft to ${contributor.username} <${email}>...`);
          const info = await transporter.sendMail({
            from: env.SMTP_FROM!,
            to: email,
            subject: draft.subject,
            text: draft.message,
          });

          await ContributorModel.updateOne(
            { _id: contributor._id },
            {
              $set: {
                isConnectionSent: true,
                'outreachDraft.sentAt': new Date(),
                'outreachDraft.emailTo': email,
                'outreachDraft.emailMessageId': info.messageId,
              },
            },
          );

          emailed += 1;
        } catch (error) {
          failed += 1;
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[OutreachEmails] Failed for ${contributor.username}:`, message);
        }
      }
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OutreachFlow] Failed for ${contributor.username}:`, message);
    }
  }

  return {
    matched: contributors.length,
    drafted,
    emailed,
    skippedEmail,
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
