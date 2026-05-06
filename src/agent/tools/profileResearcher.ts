import type { IContributor } from '../../db/models/Contributor.js';

export interface ResearchSource {
  kind: 'github' | 'source-project' | 'blog' | 'linkedin' | 'twitter';
  url: string;
  status: 'fetched' | 'known-url' | 'failed';
  summary: string;
}

export interface ContributorResearch {
  displayName: string;
  sourceProjects: string[];
  primaryProject: string | null;
  profileHighlights: string[];
  sources: ResearchSource[];
}

function compactText(value: string, maxLength = 700): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function stripHtml(html: string): string {
  return compactText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'reach-out-to-social-profiles' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'reach-out-to-social-profiles' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.text();
}

function parseGitHubRepoUrl(url: string): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('github.com')) return null;

    const [owner, repo] = parsed.pathname.split('/').filter(Boolean);
    if (!owner || !repo) return null;

    return { owner, repo: repo.replace(/\.git$/, '') };
  } catch {
    return null;
  }
}

function projectNameFromUrl(url: string): string {
  const repo = parseGitHubRepoUrl(url);
  if (repo) return repo.repo;

  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).at(-1) ?? url;
  } catch {
    return url;
  }
}

async function researchGitHubProfile(contributor: IContributor): Promise<ResearchSource> {
  const url = `https://api.github.com/users/${contributor.username}`;

  try {
    const profile = await fetchJson(url) as Record<string, unknown>;
    const highlights = [
      profile.name && `name: ${profile.name}`,
      profile.bio && `bio: ${profile.bio}`,
      profile.company && `company: ${profile.company}`,
      profile.location && `location: ${profile.location}`,
      profile.blog && `website: ${profile.blog}`,
      profile.twitter_username && `twitter: @${profile.twitter_username}`,
      typeof profile.public_repos === 'number' && `${profile.public_repos} public repos`,
      typeof profile.followers === 'number' && `${profile.followers} followers`,
    ].filter(Boolean);

    return {
      kind: 'github',
      url: contributor.githubUrl,
      status: 'fetched',
      summary: compactText(highlights.join('; ')),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return {
      kind: 'github',
      url: contributor.githubUrl,
      status: 'failed',
      summary: message,
    };
  }
}

async function researchSourceProject(url: string): Promise<ResearchSource> {
  const repo = parseGitHubRepoUrl(url);

  if (!repo) {
    return {
      kind: 'source-project',
      url,
      status: 'known-url',
      summary: `Discovered through ${projectNameFromUrl(url)}`,
    };
  }

  try {
    const data = await fetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}`) as Record<string, unknown>;
    const topics = Array.isArray(data.topics) ? data.topics.join(', ') : '';
    const summary = [
      `project: ${repo.owner}/${repo.repo}`,
      data.description && `description: ${data.description}`,
      data.language && `primary language: ${data.language}`,
      topics && `topics: ${topics}`,
    ].filter(Boolean).join('; ');

    return {
      kind: 'source-project',
      url,
      status: 'fetched',
      summary: compactText(summary),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return {
      kind: 'source-project',
      url,
      status: 'failed',
      summary: `${projectNameFromUrl(url)} (${message})`,
    };
  }
}

async function researchPage(kind: 'blog' | 'linkedin' | 'twitter', url: string): Promise<ResearchSource> {
  try {
    const html = await fetchText(url);
    return {
      kind,
      url,
      status: 'fetched',
      summary: stripHtml(html),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'fetch failed';
    return {
      kind,
      url,
      status: kind === 'linkedin' || kind === 'twitter' ? 'known-url' : 'failed',
      summary: kind === 'linkedin' || kind === 'twitter'
        ? `Profile URL is available, but public page details could not be fetched: ${message}`
        : message,
    };
  }
}

export async function researchContributorSocialProfiles(contributor: IContributor): Promise<ContributorResearch> {
  const sourceProjects = contributor['source-project'] ?? [];
  const sources = await Promise.all([
    researchGitHubProfile(contributor),
    ...sourceProjects.map(researchSourceProject),
    contributor.blog ? researchPage('blog', contributor.blog) : null,
    contributor.linkedinUrl ? researchPage('linkedin', contributor.linkedinUrl) : null,
    contributor.twitterUsername ? researchPage('twitter', `https://x.com/${contributor.twitterUsername}`) : null,
  ].filter((source): source is Promise<ResearchSource> => Boolean(source)));

  const profileHighlights = [
    contributor.name && `Name: ${contributor.name}`,
    contributor.bio && `Bio: ${contributor.bio}`,
    contributor.company && `Company: ${contributor.company}`,
    contributor.location && `Location: ${contributor.location}`,
    contributor.blog && `Website: ${contributor.blog}`,
    contributor.linkedinUrl && `LinkedIn: ${contributor.linkedinUrl}`,
    contributor.twitterUsername && `Twitter/X: @${contributor.twitterUsername}`,
    ...sources
      .filter((source) => source.summary)
      .map((source) => `${source.kind}: ${source.summary}`),
  ].filter(Boolean).map(String);

  return {
    displayName: contributor.name || contributor.username,
    sourceProjects,
    primaryProject: sourceProjects[0] ? projectNameFromUrl(sourceProjects[0]) : null,
    profileHighlights,
    sources,
  };
}
