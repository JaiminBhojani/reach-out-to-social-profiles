import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { env } from '../../lib/env.js';
import type { IContributor } from '../../db/models/Contributor.js';
import type { ContributorResearch } from './profileResearcher.js';

const anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
}) : null;

const PersonalizedDraftSchema = z.object({
  subject: z.string().min(1),
  message: z.string().min(1),
});

export type PersonalizedDraft = z.infer<typeof PersonalizedDraftSchema>;

function extractJsonObject(rawResponse: string): string {
  const trimmed = rawResponse.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Claude response did not contain a JSON object.');
  }

  return trimmed.slice(start, end + 1);
}

function formatProjectName(projectName: string | null): string {
  return projectName || 'your open-source work';
}

function subjectForResearch(research: ContributorResearch): string {
  return research.primaryProject
    ? `I found you through your contribution in ${research.primaryProject}`
    : 'I found you through your open-source work';
}

function fallbackDraft(contributor: IContributor, research: ContributorResearch): PersonalizedDraft {
  const displayName = contributor.name || contributor.username;
  const projectName = formatProjectName(research.primaryProject);
  const detail = contributor.bio || contributor.company || `your contribution in ${projectName}`;

  return {
    subject: subjectForResearch(research),
    message: `Hey ${displayName},

I found you through your contribution in ${projectName}. I am a software developer with almost 2 years of experience, and I want to learn more about AI agents, AI software, and secure AI agents.

I saw ${detail}, and it seems like you have strong experience I can learn from. Could you share the resources you follow so I can learn in the right direction? I also want to become a better open-source contributor, so any guidance from you would mean a lot.

If you have useful projects where I can help, I would be happy to contribute just for learning purposes, no charges.`,
  };
}

export async function generatePersonalizedOutreachDraft(
  contributor: IContributor,
  research: ContributorResearch,
): Promise<PersonalizedDraft> {
  if (!anthropic) {
    return fallbackDraft(contributor, research);
  }

  const prompt = `Generate a personalized outreach email draft for this GitHub contributor.

Sender context:
- The sender is a software developer with 2 years of experience.
- The sender has a foundational understanding of AI concepts and is AWS AI Practitioner certified.
- The sender is willing to work on useful projects for learning purposes at Indian market price.

Contributor:
- Username: ${contributor.username}
- Name: ${contributor.name || 'unknown'}
- Bio: ${contributor.bio || 'unknown'}
- Company: ${contributor.company || 'unknown'}
- Location: ${contributor.location || 'unknown'}
- GitHub: ${contributor.githubUrl}
- Blog/website: ${contributor.blog || 'unknown'}
- LinkedIn: ${contributor.linkedinUrl || 'unknown'}
- Twitter/X: ${contributor.twitterUsername ? `@${contributor.twitterUsername}` : 'unknown'}
- Discovered through projects: ${research.sourceProjects.join(', ') || 'unknown'}
- Primary project to mention: ${formatProjectName(research.primaryProject)}

Research notes:
${research.profileHighlights.map((item) => `- ${item}`).join('\n')}

Write in a warm, direct style similar to:
"Hey, I am a software developer with almost 2 years of experience... I want to be an open source contributor, so if you can help me in this... Also if you want I can work on your personal projects at Indian market price."

Requirements:
- Return JSON only.
- Include "subject" and "message".
- Subject must follow this exact pattern when a project is available: "I found you through your contribution in ${formatProjectName(research.primaryProject)}".
- If no project is available, use: "I found you through your open-source work".
- Message must mention the person's name or username and at least one concrete detail from the research.
- Keep the message humble, clear, and not salesy.
- Do not claim facts that are not in the research notes.`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 900,
    system: 'You write concise, genuine outreach drafts. Respond only with valid JSON.',
    messages: [{ role: 'user', content: prompt }],
  });

  const rawResponse = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const draft = PersonalizedDraftSchema.parse(JSON.parse(extractJsonObject(rawResponse)));
  return {
    ...draft,
    subject: subjectForResearch(research),
  };
}
