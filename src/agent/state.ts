import { z } from 'zod';

// Contributor Schema — matches the first project's data model exactly
export const ContributorSchema = z.object({
  username: z.string(),
  avatarUrl: z.url().optional(),
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
  isConnectionSent: z.boolean().optional(),
});

export type Contributor = z.infer<typeof ContributorSchema>;

// Schema for a single generated outreach message
export const OutreachMessageSchema = z.object({
  channel: z.enum(['linkedin', 'twitter', 'email']),
  subject: z.string().optional(),   // Only for email
  message: z.string(),
  charCount: z.number(),
});

export type OutreachMessage = z.infer<typeof OutreachMessageSchema>;

// Schema for the outreach generation request
export const OutreachRequestSchema = z.object({
  context: z.string().optional(),    // Extra context the user wants to include
  tone: z.enum(['professional', 'casual', 'enthusiastic']).default('professional'),
});

export type OutreachRequest = z.infer<typeof OutreachRequestSchema>;

// Schema for the full outreach response
export const OutreachResponseSchema = z.object({
  username: z.string(),
  linkedin: OutreachMessageSchema.optional(),
  twitter: OutreachMessageSchema.optional(),
  email: OutreachMessageSchema.optional(),
});

export type OutreachResponse = z.infer<typeof OutreachResponseSchema>;
