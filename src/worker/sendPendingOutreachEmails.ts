import nodemailer from 'nodemailer';
import { env } from '../lib/env.js';
import { ContributorModel } from '../db/models/Contributor.js';

export interface SendPendingOutreachEmailsResult {
  matched: number;
  sent: number;
  skipped: number;
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

export async function sendPendingOutreachEmails(): Promise<SendPendingOutreachEmailsResult> {
  const contributors = await ContributorModel.find({
    isConnectionSent: false,
    email: { $exists: true, $nin: [null, ''] },
    'outreachDraft.subject': { $exists: true, $nin: [null, ''] },
    'outreachDraft.message': { $exists: true, $nin: [null, ''] },
  });

  const missingFields = getMissingSmtpFields();
  if (missingFields.length > 0) {
    console.log(`[OutreachEmails] SMTP is not configured. Skipping ${contributors.length} email sends. Missing: ${missingFields.join(', ')}.`);
    return {
      matched: contributors.length,
      sent: 0,
      skipped: contributors.length,
      failed: 0,
    };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const contributor of contributors) {
    try {
      const email = contributor.email;
      const draft = contributor.outreachDraft;

      if (!email || !draft?.subject || !draft.message) {
        continue;
      }

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

      sent += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[OutreachEmails] Failed to send to ${contributor.username}:`, message);
    }
  }

  return {
    matched: contributors.length,
    sent,
    skipped: contributors.length - sent - failed,
    failed,
  };
}
