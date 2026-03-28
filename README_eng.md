# team-fit

The current GitHub repository URL is `https://github.com/lifedesigner88/asm17-team-fit`.

> Can team building be approached like a coding test?
>
> I'm Sejong Park, a developer who works through life problems with AI.
>
> I believe engineering is about defining a problem clearly and designing a better solution with technology.
>
> The problem we are facing is clear: among 300 people we may work with for the next six months, how do we find the two who fit us better?
>
> We cannot meet everyone, we cannot choose a team from self-introduction docs alone, and part of the final decision still comes down to intuition.
>
> So I am approaching this less as a recommender that declares the right answer and more as a structure that narrows the candidate set and helps us decide who to talk to first.
>
> This repository is the first demo for showing how I see that problem and how I am currently trying to solve it.

For the Korean README, see [README.md](README.md).

## Current Product Definition

As of March 28, 2026, the root experience of this project is `Team-fit exploration`, not `Park Sejong PR`.

- `/` is the `Team-fit exploration` front door that explains the problem and immediately opens the interview-style team-fit intake flow.
- `/persona/sejong` is the dedicated builder profile page.
- `/ai/sejong` is the login-based `AI Sejong` multi-turn chat.
- `/seoul/dashboard` remains the ASM17 Seoul interview discovery and ops surface.
- `/team-fit` is kept as a legacy alias and now resolves to `/`.

The current product is therefore `team-fit + AI Sejong + ASM17 operations tooling`.

## Why I Built This

The original motivation came from SW Maestro 17 team building.

Before people meet in person, there is very little structured context. Most people end up deciding based on a name, a short intro, a GitHub link, and eventually intuition.

This project is not trying to replace human judgment with an automated truth machine. It is trying to answer a more practical question:

> Before meeting in person, can we narrow down who is worth talking to first in a better way?

The current implementation is the first product experiment around that question.

## What Users Can Do Now

- Open `/` and immediately see the problem framing plus the team-fit exploration interview demo
- Preview the Step 1 / Step 2 intake flow before logging in
- In Step 1, enter `one problem sentence + MBTI 5 axes + 4 SDGs`
- In Step 2, write up to 800 characters of Markdown context
- After clicking save, let AI ask 3 follow-up questions one by one before the profile is finally stored
- After saving, open the `Candidates` tab first to review the first 3 people worth talking to
- Below the `Candidates` tab recommendations, browse all signed-up users 10 at a time and narrow by `with fit record / without fit record / team-fit order`
- Switch to the `Team-fit profile` tab to edit the saved intake fields and interview transcript, then save again
- In recommendation details or signed-up-user details, save a `0–100 fit score` plus a short memo after a real conversation, and remove already-scored candidates from the next recommendation round
- Continue the saved interview later through the `answer again` follow-up action
- Open `/persona/sejong` and review Sejong's builder profile
- Use the login-only `AI Sejong` multi-turn chat at `/ai/sejong`
- Sign up, log in, and reset PIN
- Complete email verification and 17th-cohort verification
- Enter interview date and start time
- Connect GitHub / Notion links
- Explore people interviewed in the same slot through `/seoul/dashboard`

## Current Core Flow

1. A user enters `/` and first understands the team-building problem plus the purpose of `Team-fit exploration`.
2. On the same surface, the user previews the Step 1 and Step 2 intake structure.
3. After logging in, Step 1 captures `one problem sentence + MBTI 5 axes + 4 SDGs`.
4. Step 2 captures up to 800 characters of Markdown context about the problem, motivation, and desired team shape.
5. Clicking save starts an AI interview that asks 3 additional questions one at a time.
6. Once the third answer is complete, the interview is saved and the `Candidates` tab opens first.
7. The `Candidates` tab shows `safe fit / complementary fit / wildcard` cards, and below them a full signed-up-user directory in 10-person pages that can be re-sorted by `with fit record / without fit record / team-fit order`.
8. After a real conversation, the user can store a `0–100 fit score` plus a short memo inside candidate details, and scored candidates are excluded from the next recommendation pass.
9. If needed, they continue into `/persona/sejong`, `AI Sejong`, or the Seoul dashboard for more context.

## Key Features

- Problem-framing + team-fit landing at `/`
- Guest preview for the interview-style team-fit flow
- Step 1 `one problem sentence + MBTI 5 axes + 4 SDGs`
- Step 2 Markdown narrative capped at 800 characters
- AI interview dialog that generates 3 sequential follow-up questions before saving
- Saved `Candidates` / `Team-fit profile` tab switch after the first save
- Editable saved intake fields and interview transcript
- Incremental follow-up questions through `answer again`
- Conversation-priority recommendation cards that suggest the first 3 people worth talking to
- Signed-up-user directory under the recommendation cards with 10-per-page browsing, fit-record filters, and team-fit-order sorting
- Post-conversation fit scoring and memo capture from both recommendation details and signed-up-user details, with scored candidates removed from the next recommendation pass
- Builder profile page at `/persona/sejong`
- Login-only `AI Sejong`
- Email signup, login, and PIN reset
- Email verification and 17th-cohort approval-based access control
- Interview slot input and Seoul dashboard exploration
- Korean / English UI

## How AI Sejong Works

`AI Sejong` is not a one-shot chat box. It is a login-based multi-turn chat.

- Only logged-in users can use it.
- Questions and answers are stored in the DB.
- A recent slice of the conversation is sent back into the model to preserve context.
- Responses are grounded in Sejong's persona data, creator-profile data, and selected Hupository documents.
- Right now it uses `profile/persona/snapshot`, `decisions.yaml`, the latest `session.md`, and some recent journal context when appropriate.

It is not a finished AI product yet, but it is already useful for learning what people actually ask in a team-building setting.

## Future Direction

The immediate goal is not to become a giant community platform.

The current product direction is to make these parts sharper first:

- smoother team-fit profile intake
- improving recommendation weights and explanations using real conversation feedback
- shortlist / trio support that genuinely helps decisions
- better grounding, retrieval, and conversation quality for `AI Sejong`

## Tech Stack

| Layer     | Tech                                                                           |
| --------- | ------------------------------------------------------------------------------ |
| Frontend  | React 19, React Router v7, TypeScript, Tailwind CSS, Vite                      |
| Backend   | FastAPI, SQLAlchemy, Supabase Postgres, pgvector, OpenAI embeddings            |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`) kept for future experiments |
| Tooling   | Nx, pnpm, uv                                                                   |
| Infra     | Docker Compose                                                                 |

Main directories:

- `apps/frontend` — Team-fit exploration interview, Sejong profile, AI Sejong, dashboard, and verification flow
- `apps/backend` — auth, verification, team-fit exploration interview APIs, dashboard, admin, and persona APIs
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
git clone https://github.com/lifedesigner88/asm17-team-fit.git
cd asm17-team-fit
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
OPENAI_API_KEY=...  # real embeddings for team-fit explorer; optional in local fallback mode
RESEND_API_KEY=...   # optional
```

If you use the AI worker, keep the same `DATABASE_URL` in both `apps/backend/.env` and `apps/ai-worker/.env`.

By default, Hupository-backed answers read from `apps/backend/hupository`.
If you want another location, set `HUPOSITORY_ROOT` in `apps/backend/.env`.

Unless `TEAMFIT_DEMO_SEED_ENABLED` is disabled, backend startup also seeds 12 demo explorer profiles for the team-fit flow.

### Run locally

```bash
pnpm dev
```

Main local URLs:

- Frontend: `http://localhost:3000`
- Main entry / Team-fit exploration: `http://localhost:3000/`
- Sejong profile: `http://localhost:3000/persona/sejong`
- AI Sejong page: `http://localhost:3000/ai/sejong`
- Legacy team-fit alias: `http://localhost:3000/team-fit` -> `http://localhost:3000/`
- Seoul dashboard: `http://localhost:3000/seoul/dashboard`
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

For now, the fastest way to explore the product is through these routes:

- `http://localhost:3000/` — Team-fit exploration root page and default shared link
- `http://localhost:3000/persona/sejong` — builder profile page
- `http://localhost:3000/ai/sejong` — AI Sejong chat page
- `http://localhost:3000/team-fit` — legacy alias that now resolves to `/`
- `http://localhost:3000/seoul/dashboard` — ASM17 community and interview-context flow
- `http://localhost:8000/docs` — backend API documentation
