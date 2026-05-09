import { z } from 'zod';

// Contributor schema representing the shared discovery-agent data model.
export const ContributorSchema = z.object({
  username: z.string(),
  avatarUrl: z.url().nullable().optional(),
  name: z.string().nullable().optional(),
  email: z.email().nullable().optional(),
  blog: z.string().nullable().optional(),
  twitterUsername: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  linkedinUrl: z.url().nullable().optional(),
  personalWebsite: z.url().nullable().optional(),
  githubUrl: z.url(),
  'source-project': z.array(z.string()).default([]),
  isConnectionSent: z.boolean().optional(),
  isEmailSent: z.boolean().optional(),
  outreachDraft: z.object({
    subject: z.string(),
    message: z.string(),
    generatedAt: z.coerce.date(),
    sentAt: z.coerce.date().optional(),
    emailTo: z.string().optional(),
    emailMessageId: z.string().optional(),
    research: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type Contributor = z.infer<typeof ContributorSchema>;
