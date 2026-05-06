import { z } from 'zod';

export const ChannelSchema = z.enum(['linkedin', 'twitter', 'email']);
export type OutreachChannel = z.infer<typeof ChannelSchema>;

export const ToneSchema = z.enum(['professional', 'casual', 'enthusiastic']);
export type OutreachTone = z.infer<typeof ToneSchema>;

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
  outreachDraft: z.object({
    subject: z.string(),
    message: z.string(),
    generatedAt: z.coerce.date(),
    research: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type Contributor = z.infer<typeof ContributorSchema>;

export const OutreachMessageSchema = z.object({
  channel: ChannelSchema,
  subject: z.string().optional(),
  message: z.string(),
  charCount: z.number().int().nonnegative(),
});

export type OutreachMessage = z.infer<typeof OutreachMessageSchema>;

export const OutreachRequestSchema = z.object({
  context: z.string().trim().max(2000).optional(),
  tone: ToneSchema.default('professional'),
});

export type OutreachRequest = z.infer<typeof OutreachRequestSchema>;

export const OutreachResponseSchema = z.object({
  username: z.string(),
  linkedin: OutreachMessageSchema.optional(),
  twitter: OutreachMessageSchema.optional(),
  email: OutreachMessageSchema.optional(),
});

export type OutreachResponse = z.infer<typeof OutreachResponseSchema>;
