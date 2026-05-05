import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env';
import type { IContributor } from '../../db/models/Contributor';
import type { OutreachMessage, OutreachResponse } from '../state';

// Initialize Anthropic client
const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
}) : null;

/**
 * Builds a rich context string from a contributor's profile data
 * so Claude can generate highly personalized messages.
 */
function buildProfileContext(contributor: IContributor): string {
  const parts: string[] = [];

  parts.push(`GitHub Username: ${contributor.username}`);
  parts.push(`GitHub Profile: ${contributor.githubUrl}`);

  if (contributor.name) parts.push(`Full Name: ${contributor.name}`);
  if (contributor.bio) parts.push(`Bio: ${contributor.bio}`);
  if (contributor.company) parts.push(`Company: ${contributor.company}`);
  if (contributor.location) parts.push(`Location: ${contributor.location}`);
  if (contributor.blog) parts.push(`Personal Website/Blog: ${contributor.blog}`);
  if (contributor.email) parts.push(`Email: ${contributor.email}`);
  if (contributor.twitterUsername) parts.push(`Twitter/X: @${contributor.twitterUsername}`);
  if (contributor.linkedinUrl) parts.push(`LinkedIn: ${contributor.linkedinUrl}`);

  const sourceProjects = contributor['source-project'];
  if (sourceProjects && sourceProjects.length > 0) {
    parts.push(`Discovered from GitHub Projects: ${sourceProjects.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Generates personalized outreach messages for a contributor across
 * all available channels (LinkedIn, Twitter, Email) using Claude AI.
 */
export async function generateOutreachMessages(
  contributor: IContributor,
  userContext?: string,
  tone: 'professional' | 'casual' | 'enthusiastic' = 'professional',
): Promise<OutreachResponse> {
  if (!anthropic) {
    throw new Error('Anthropic API key is missing. Cannot generate outreach messages.');
  }

  const profileContext = buildProfileContext(contributor);

  // Determine which channels are available for this contributor
  const hasLinkedin = !!contributor.linkedinUrl;
  const hasTwitter = !!contributor.twitterUsername;
  const hasEmail = !!contributor.email;

  if (!hasLinkedin && !hasTwitter && !hasEmail) {
    throw new Error(`No contact channels available for ${contributor.username}. They have no LinkedIn, Twitter, or Email on file.`);
  }

  // Build the channel-specific instructions
  const channelInstructions: string[] = [];

  if (hasLinkedin) {
    channelInstructions.push(`
      "linkedin": {
        "channel": "linkedin",
        "message": "<A LinkedIn connection request note. MUST be under 300 characters. Be concise, warm, and reference something specific about their work.>"
      }`);
  }

  if (hasTwitter) {
    channelInstructions.push(`
      "twitter": {
        "channel": "twitter",
        "message": "<A Twitter/X DM. Keep it casual and under 500 characters. Reference their open-source work or bio.>"
      }`);
  }

  if (hasEmail) {
    channelInstructions.push(`
      "email": {
        "channel": "email",
        "subject": "<A compelling email subject line, under 60 characters>",
        "message": "<A professional cold email body. 3-5 sentences max. Include a clear call-to-action.>"
      }`);
  }

  const toneGuide = {
    professional: 'Keep a polished, professional tone. Be respectful of their time.',
    casual: 'Use a friendly, casual tone like you\'re messaging a fellow developer. Keep it relaxed.',
    enthusiastic: 'Be genuinely excited and energetic. Show passion for their work and open-source contributions.',
  };

  const prompt = `You are an expert networking assistant. Generate personalized outreach messages for a GitHub contributor.

TONE: ${toneGuide[tone]}

${userContext ? `ADDITIONAL CONTEXT FROM SENDER: ${userContext}` : ''}

CONTRIBUTOR PROFILE:
${profileContext}

Generate outreach messages for the available channels. Each message should:
- Reference something SPECIFIC about this person (their bio, company, project, location)
- Feel genuine and personalized, NOT templated
- Have a clear reason for reaching out (open-source collaboration, learning from their work, networking)
- Include a soft call-to-action

Respond ONLY with a valid JSON object in this exact format (only include channels that are available):
{
  "username": "${contributor.username}",
  ${channelInstructions.join(',\n')}
}

No markdown formatting, no preamble, no explanation. Just the JSON.`;

  console.log(`[MessageGenerator] Asking Claude to generate outreach for ${contributor.username}...`);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 800,
    system: 'You are a networking outreach assistant. Generate personalized, genuine outreach messages. Respond ONLY with valid JSON. No markdown, no preamble.',
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Parse the JSON response
  const rawResponse = message.content[0].type === 'text' ? message.content[0].text : '{}';
  const cleanJson = rawResponse.trim().replace(/^```json/, '').replace(/```$/, '').trim();

  const parsed = JSON.parse(cleanJson) as OutreachResponse;

  // Add character counts
  if (parsed.linkedin) {
    parsed.linkedin.charCount = parsed.linkedin.message.length;
  }
  if (parsed.twitter) {
    parsed.twitter.charCount = parsed.twitter.message.length;
  }
  if (parsed.email) {
    parsed.email.charCount = parsed.email.message.length;
  }

  console.log(`[MessageGenerator] Generated outreach for ${contributor.username}:`,
    [hasLinkedin && 'LinkedIn', hasTwitter && 'Twitter', hasEmail && 'Email'].filter(Boolean).join(', ')
  );

  return parsed;
}
