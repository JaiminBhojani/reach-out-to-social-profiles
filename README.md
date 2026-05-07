# Reach Out to Social Profiles - Outreach Draft Agent

This project is the second half of the outreach pipeline. It reads enriched contributor profiles from the same MongoDB database used by [`social-profiles-from-github-repos`](https://github.com/JaiminBhojani/social-profiles-from-github-repos), researches each pending profile, drafts a personalized outreach subject and message, and saves the draft back to MongoDB.

There is no API in this project. Running the project runs the drafting job.

## Current Flow

When you run the project:

1. It connects to MongoDB.
2. It fetches all contributor documents where:

   ```js
   isConnectionSent: false
   ```

3. For each pending contributor, it researches available context:
   - GitHub profile
   - source project repository
   - blog or personal website, if present
   - LinkedIn URL, if present
   - Twitter/X profile, if present

4. It uses Claude to draft a personalized outreach subject and message.
5. It saves the draft on the same contributor document.
6. It disconnects from MongoDB and exits.

## MongoDB Output

The draft is stored directly on the contributor object in the shared `contributors` collection:

```js
{
  isConnectionSent: false,
  outreachDraft: {
    subject: "I found you through your contribution in OpenClaw",
    message: "Hey ...",
    generatedAt: "2026-05-07T...",
    research: {
      displayName: "...",
      sourceProjects: ["..."],
      primaryProject: "...",
      profileHighlights: ["..."],
      sources: [
        {
          kind: "github",
          url: "https://github.com/...",
          status: "fetched",
          summary: "..."
        }
      ]
    }
  }
}
```

`isConnectionSent` is not changed by this project. It stays `false`; this agent only prepares drafts.

## Prompt Location

The outreach prompt is written in:

[src/agent/tools/outreachDraftGenerator.ts](src/agent/tools/outreachDraftGenerator.ts)

The worker that loops through pending contributors is:

[src/worker/draftPendingOutreach.ts](src/worker/draftPendingOutreach.ts)

## Tech Stack

- Node.js with TypeScript
- MongoDB and Mongoose
- Zod for environment/schema validation
- `@anthropic-ai/sdk` for Claude draft generation

## Getting Started

### Prerequisites

- Node.js >= 24
- MongoDB Atlas cluster used by the discovery agent
- Anthropic API key

### Installation

```bash
npm install
```

Create a `.env` file in the root directory:

```env
ANTHROPIC_API_KEY=sk-ant-your_api_key_here
MONGODB_URI=mongodb://your_atlas_connection_string
```

### Run

```bash
npm run dev
```

For a compiled run:

```bash
npm run build
npm start
```

Expected log shape:

```text
[OutreachDrafts] Starting outreach draft generation...
[MongoDB] Successfully connected to database.
[OutreachDrafts] Researching and drafting for username...
[OutreachDrafts] Drafted personalized messages for 5/5 pending contributors. Failed: 0.
```
