# Reach Out to Social Profiles — Outreach Agent

An AI-powered outreach agent that generates personalized connection messages for GitHub contributors. This is the second half of a two-agent pipeline — it reads enriched contributor profiles stored in MongoDB by the [social-profiles-from-github-repos](https://github.com/JaiminBhojani/social-profiles-from-github-repos) agent and uses Claude AI to craft tailored outreach messages for LinkedIn, Twitter, and Email.

## How It Works

```
┌──────────────────────────────┐          ┌──────────────────────────────┐
│  Agent 1: Discovery          │          │  Agent 2: Outreach (this)    │
│  social-profiles-from-       │  ──DB──▶ │  reach-out-to-social-        │
│  github-repos                │          │  profiles                    │
│                              │          │                              │
│  • Scans GitHub repos        │          │  • Reads contributor data    │
│  • Scrapes portfolios        │          │  • Generates personalized    │
│  • Extracts contacts via AI  │          │    messages via Claude AI    │
│  • Stores to MongoDB         │          │  • Tracks outreach status    │
└──────────────────────────────┘          └──────────────────────────────┘
                         ▲                          │
                         └── Shared MongoDB Atlas ──┘
```

## Key Features

- **Smart Filtering:** Query contributors by outreach status, available channels (LinkedIn, Twitter, Email), or search by name/username.
- **AI-Powered Personalization:** Uses **Claude (Anthropic)** to generate context-aware outreach messages based on each contributor's bio, company, location, and the project they were discovered from.
- **Multi-Channel Drafts:** Generates channel-appropriate messages — LinkedIn notes (≤300 chars), Twitter DMs, and cold emails with subject lines.
- **Outreach Tracking:** Tracks generated messages in an `outreachHistory` array and lets you mark contributors as "connection sent" to avoid duplicates.
- **Aggregate Stats:** Dashboard-ready stats showing total contributors, available channels, and outreach progress.

## Current Drafting Flow

When the project starts, it connects to MongoDB, fetches contributors where `isConnectionSent` is `false`, researches their available public profile/project context, and stores a personalized draft on each contributor document:

```json
{
  "outreachDraft": {
    "subject": "I found you through your contribution in OpenClaw",
    "message": "Hey ...",
    "generatedAt": "...",
    "research": {
      "displayName": "...",
      "sourceProjects": ["..."],
      "sources": []
    }
  }
}
```

The draft is stored directly on the contributor object in the shared `contributors` collection. The API route `POST /outreach/:username` can also refresh this personalized draft for one pending contributor.

## Tech Stack

- **API Framework:** [Hono](https://hono.dev/) on Node.js (`tsx`)
- **Validation:** [Zod](https://zod.dev/) for environment and request schemas
- **AI Integration:** `@anthropic-ai/sdk` (Claude Opus 4.5)
- **Database:** MongoDB & Mongoose (shared with Agent 1)

## Getting Started

### Prerequisites

- Node.js >= 24
- MongoDB Atlas cluster (same one used by the discovery agent)
- Anthropic API Key

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory:
   ```env
   PORT=3001
   ANTHROPIC_API_KEY=sk-ant-your_api_key_here
   MONGODB_URI=mongodb://your_atlas_connection_string
   ```

### Running Locally

```bash
npm run dev
```

The server will start on `http://localhost:3001`.

## API Endpoints

### `GET /health`
Health check.

### `GET /contributors`
List all contributors from the shared database with optional filters.

**Query Parameters:**
| Param | Description |
|-------|-------------|
| `pending=true` | Only contributors not yet reached out to |
| `hasLinkedin=true` | Only contributors with a LinkedIn URL |
| `hasTwitter=true` | Only contributors with a Twitter username |
| `hasEmail=true` | Only contributors with an email |
| `search=query` | Search by username or name |
| `limit=20` | Limit results (default: 50, max: 200) |
| `skip=0` | Skip results for pagination |

**Response** includes aggregate stats and paginated contributor list.

### `GET /contributors/:username`
Get a single contributor's full profile.

### `POST /outreach/:username`
Refresh the personalized outreach draft for one pending contributor.

**Response:**
```json
{
  "success": true,
  "message": "Personalized outreach draft stored for ritikkumar8z",
  "outreachDraft": {
    "subject": "I found you through your contribution in OpenClaw",
    "message": "Hey RiTiK, ...",
    "generatedAt": "2026-05-06T...",
    "research": {
      "displayName": "RiTiK",
      "sourceProjects": ["https://github.com/..."],
      "sources": []
    }
  },
  "contributor": {
    "username": "ritikkumar8z",
    "outreachDraft": {
      "subject": "I found you through your contribution in OpenClaw",
      "message": "Hey RiTiK, ...",
      "generatedAt": "2026-05-06T..."
    }
  }
}
```

### `POST /outreach/:username/mark-sent`
Mark a contributor as having been reached out to.

**Request Body:**
```json
{
  "channel": "linkedin"
}
```
