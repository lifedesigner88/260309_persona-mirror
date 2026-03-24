# SoMa Community

> A small community app built for SW Maestro 17 (ASM17) team building.
>
> It started from a simple real-world problem: before meeting in person, applicants should be able to share interview schedule, GitHub, and self-introduction Notion links, then understand the people who interviewed together with them faster.
>
> This is still an early product focused on solving that team-building flow first, not a large polished platform.

For the Korean README, see [README.md](README.md).

## Why I Built This

SW Maestro 17 team building is a real, time-bounded problem.

Before people meet in person, there is usually very little structured context to help them decide who they should talk to. Most people only know a name, a short intro, or a GitHub link passed around in chat.

This project started from one practical idea:

> Before meeting people in person, it would be useful if applicants could share interview schedule, GitHub, and intro links and understand the people who interviewed together with them.

SoMa Community is my attempt to turn that idea into a small, usable product.

The creator PR page is still part of the product, but it is only one surface inside the team-building flow. The main product is the community app itself.

## What Users Can Do Now

- Sign up and log in
- Complete email verification and 17th-cohort verification
- Enter interview date, start time, and related interview information
- Add a GitHub profile link
- Add a Notion self-introduction link
- View people who interviewed in the same slot
- Use the service before team building to understand possible teammates faster
- Open the creator PR / introduction page as one part of the overall product flow
- Use the login-only `AI Sejong` multi-turn chat

## Current Core Flow

1. A user signs up.
2. The user completes email verification and 17th-cohort verification.
3. The user enters interview date, start time, and slot-related information.
4. The user adds profile links such as GitHub and a self-introduction Notion page.
5. The system places the user into an interview slot.
6. The user browses other people from the same slot before team building.
7. If needed, the user opens the Creator PR page or uses `AI Sejong` for extra context.
8. The user uses that context and those links to decide who may be worth talking to in person.

## Key Features

- Email signup, login, and PIN reset flow
- Email verification and 17th-cohort verification-based access control
- Interview schedule input for SW Maestro 17 applicants
- GitHub profile link input
- Notion self-introduction link input
- Dashboard and slot-based browsing for people who interviewed together
- Creator PR / introduction page for the builder of the project
- Login-only `AI Sejong` multi-turn chat
- Admin approval flow for managing access to member detail views
- Bilingual UI support for Korean and English

## How AI Sejong Works

`AI Sejong` is not just a one-shot chat box. It is currently designed as a `login-based multi-turn chat` for team-building use.

- Only logged-in users can use it.
- Questions and answers are stored in the DB.
- A recent slice of the conversation is sent back into the model to preserve multi-turn context.
- Responses are grounded in Sejong's persona data, creator PR data, and selected core Hupository documents.
- Logging is kept to discourage careless use and to make common question patterns reviewable later.

It is not a finished AI product yet. The point right now is to learn what people actually ask in a real team-building setting, and what kind of context makes those conversations more useful.

## Future Direction

The current scope is intentionally narrow.

Right now, the goal is to make pre-team-building discovery more useful. It is not yet a polished large-scale community platform.

If enough people gather and the product accumulates meaningful profile data, the next direction I want to explore is:

- AI-assisted recommendations for people whose vision or direction feels similar
- Better shortlist and team-building decision support
- Richer participant profile surfaces beyond the current creator page
- Better grounding, retrieval, conversation UX, and question-pattern analysis for `AI Sejong`

These are roadmap ideas, not finished features.

## What I’d Like To Improve With Teammates

This project already works, but there is still a lot of room to sharpen it.

- How much data the AI should use, and how to ground it more reliably
- How to turn common question patterns into product improvements
- What kind of recommendation, filtering, and conversation UX actually helps team building

I would especially like to work with people who want to make the AI layer more useful, more grounded, and more productively connected to the team-building flow.

## Tech Stack

| Layer     | Tech                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | React 19, React Router v7, TypeScript, Tailwind CSS, Vite                      |
| Backend   | FastAPI, SQLAlchemy, Supabase Postgres                                         |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`) kept for future experiments |
| Tooling   | Nx, pnpm, uv                                                                   |
| Infra     | Docker Compose                                                                 |

Main directories:

- `apps/frontend` — community UI, dashboard, verification flow, and creator PR page
- `apps/backend` — auth, verification, dashboard, admin, and persona APIs
- `apps/ai-worker` — legacy / experimental worker for later AI features
- `infrastructure/terraform` — infrastructure-related workspace

## Local Development / How To Run

### Prerequisites

- Node `24.11.0`
- Python `3.11.15`
- `pnpm`
- `uv`
- Docker optional

### First-time setup

```bash
git clone <repo-url>
cd 260309_persona-mirror
node scripts/setup-dev.mjs
```

After the first bootstrap, use:

```bash
pnpm setup
```

### Environment

`apps/frontend/.env` and `apps/backend/.env` are generated from `.env.example` when needed.

For backend and AI worker development, fill in:

```text
DATABASE_URL=...
ANTHROPIC_API_KEY=...
RESEND_API_KEY=...   # optional
```

If you use the AI worker, keep the same `DATABASE_URL` in both `apps/backend/.env` and `apps/ai-worker/.env`.

### Run locally

```bash
pnpm dev
```

Main local URLs:

- Frontend: `http://localhost:3000`
- Main app entry: `http://localhost:3000/seoul/dashboard`
- Creator PR page: `http://localhost:3000/persona/sejong`
- Backend API docs: `http://localhost:8000/docs`

### Run with Docker

```bash
pnpm docker
pnpm docker:logs
pnpm docker:down
```

### Quality checks

```bash
pnpm test:backend
pnpm lint
pnpm format
```

## Demo / Screenshots

There are no polished screenshots checked into the repository yet.

For now, the easiest way to explore the product is through these routes:

- `http://localhost:3000/seoul/dashboard` — main community and interview-context flow
- `http://localhost:3000/persona/sejong` — creator PR page inside the product
- `http://localhost:8000/docs` — backend API documentation
