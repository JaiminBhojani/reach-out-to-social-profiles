import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../lib/env.js';
import type { IContributor } from '../../db/models/Contributor.js';
import {
  OutreachResponseSchema,
  type OutreachResponse,
  type OutreachTone,
} from '../state.js';

const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
}) : null;

function buildProfileContext(contributor: IContributor): string {
  const parts: string[] = [
    `GitHub Username: ${contributor.username}`,
    `GitHub Profile: ${contributor.githubUrl}`,
  ];

  if (contributor.name) parts.push(`Full Name: ${contributor.name}`);
  if (contributor.bio) parts.push(`Bio: ${contributor.bio}`);
  if (contributor.company) parts.push(`Company: ${contributor.company}`);
  if (contributor.location) parts.push(`Location: ${contributor.location}`);
  if (contributor.blog) parts.push(`Personal Website/Blog: ${contributor.blog}`);
  if (contributor.email) parts.push(`Email: ${contributor.email}`);
  if (contributor.twitterUsername) parts.push(`Twitter/X: @${contributor.twitterUsername}`);
  if (contributor.linkedinUrl) parts.push(`LinkedIn: ${contributor.linkedinUrl}`);

  const sourceProjects = contributor['source-project'];
  if (sourceProjects?.length) {
    parts.push(`Discovered from GitHub Projects: ${sourceProjects.join(', ')}`);
  }

  return parts.join('\n');
}

function extractJsonObject(rawResponse: string): string {
  const trimmed = rawResponse.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Claude response did not contain a JSON object.');
  }

  return trimmed.slice(start, end + 1);
}

function withCharacterCounts(outreach: OutreachResponse): OutreachResponse {
  if (outreach.linkedin) {
    outreach.linkedin.charCount = outreach.linkedin.message.length;
  }
  if (outreach.twitter) {
    outreach.twitter.charCount = outreach.twitter.message.length;
  }
  if (outreach.email) {
    outreach.email.charCount = outreach.email.message.length;
  }

  return outreach;
}

export async function generateOutreachMessages(
  contributor: IContributor,
  userContext?: string,
  tone: OutreachTone = 'professional',
): Promise<OutreachResponse> {
  if (!anthropic) {
    throw new Error('Anthropic API key is missing. Cannot generate outreach messages.');
  }

  const hasLinkedin = !!contributor.linkedinUrl;
  const hasTwitter = !!contributor.twitterUsername;
  const hasEmail = !!contributor.email;

  if (!hasLinkedin && !hasTwitter && !hasEmail) {
    throw new Error(`No contact channels available for ${contributor.username}. They have no LinkedIn, Twitter, or Email on file.`);
  }

  const channelInstructions: string[] = [];

  if (hasLinkedin) {
    channelInstructions.push(`
      "linkedin": {
        "channel": "linkedin",
        "message": "<LinkedIn connection note under 300 characters. Be concise, warm, and specific.>",
        "charCount": 0
      }`);
  }

  if (hasTwitter) {
    channelInstructions.push(`
      "twitter": {
        "channel": "twitter",
        "message": "<Twitter/X DM under 500 characters. Keep it casual and specific.>",
        "charCount": 0
      }`);
  }

  if (hasEmail) {
    channelInstructions.push(`
      "email": {
        "channel": "email",
        "subject": "<Email subject under 60 characters>",
        "message": "<Professional cold email body. 3-5 sentences max with a soft call-to-action.>",
        "charCount": 0
      }`);
  }

  const toneGuide: Record<OutreachTone, string> = {
    professional: 'Keep a polished, professional tone. Be respectful of their time.',
    casual: "Use a friendly, casual tone like you are messaging a fellow developer. Keep it relaxed.",
    enthusiastic: 'Be genuinely excited and energetic. Show passion for their work and open-source contributions.',
  };

  const prompt = `You are an expert networking assistant. Generate personalized outreach messages for a GitHub contributor.

TONE: ${toneGuide[tone]}

${userContext ? `ADDITIONAL CONTEXT FROM SENDER: ${userContext}` : ''}

CONTRIBUTOR PROFILE:
${buildProfileContext(contributor)}

Generate outreach messages for the available channels. Each message should:
- Reference something specific about this person, such as their bio, company, project, location, or GitHub work.
- Feel genuine and personalized, not templated.
- Have a clear reason for reaching out around open-source collaboration, learning from their work, or developer networking.
- Include a soft call-to-action.

Respond only with a valid JSON object in this exact shape, including only available channels:
{
  "username": "${contributor.username}",
  ${channelInstructions.join(',\n')}
}

Do not include markdown, a preamble, or an explanation.`;

  console.log(`[MessageGenerator] Asking Claude to generate outreach for ${contributor.username}...`);

  const message = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 800,
    system: 'You are a networking outreach assistant. Generate personalized, genuine outreach messages. Respond only with valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawResponse = message.content[0]?.type === 'text' ? message.content[0].text : '';
  const parsedJson = JSON.parse(extractJsonObject(rawResponse));
  const outreach = withCharacterCounts(OutreachResponseSchema.parse(parsedJson));

  console.log(
    `[MessageGenerator] Generated outreach for ${contributor.username}:`,
    [outreach.linkedin && 'LinkedIn', outreach.twitter && 'Twitter', outreach.email && 'Email'].filter(Boolean).join(', '),
  );

  return outreach;
}
