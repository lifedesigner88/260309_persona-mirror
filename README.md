# SoMa Community

> A lightweight community hub for Software Maestro applicants and members.

An applicant directory and verification-first networking service for the Software Maestro community. The current refactor focuses on signup, 17th cohort verification, and the interview dashboard first. Persona features remain in the codebase only as a future team-building extension, with the creator profile kept as demo data.

**Refactor target: March 25, 2026**

---

## Stack

| Layer     | Tech                                                      |
| --------- | --------------------------------------------------------- |
| Frontend  | React 19, React Router v7, TypeScript, Tailwind CSS, Vite |
| Backend   | FastAPI, SQLAlchemy, Supabase Postgres                    |
| AI Worker | Python, LangGraph, Claude API (`claude-haiku-4-5`)        |
| Monorepo  | Nx, pnpm (Node 24.11.0), uv (Python 3.11.15)              |
| Infra     | Docker Compose                                            |

---

## Quick Start

### 1. Install system tools (fresh Ubuntu 24)

**nvm + Node 24.11.0**

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
source ~/.bashrc
nvm install 24.11.0 && nvm use 24.11.0
```

**uv (Python manager)**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
uv python install 3.11.15
```

**Docker**

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker   # apply group without logout
```

### 2. Clone & bootstrap

```bash
git clone <repo-url> && cd 260309_persona-mirror
node scripts/setup-dev.mjs   # installs pnpm, Node deps, Python envs, generates .env files
```

> After the first bootstrap, use `pnpm setup` instead (pnpm is now installed).
> Re-run it any time you pull changes that add new dependencies.

### 3. Add API keys

Edit `apps/backend/.env` and `apps/ai-worker/.env` and fill in:

```text
DATABASE_URL=...        # Supabase transaction-pooler URL (use the same value in both files)
ANTHROPIC_API_KEY=...   # console.anthropic.com
RESEND_API_KEY=...      # resend.com (optional — for email OTP)
```

> `apps/ai-worker/.env` should reuse the same `DATABASE_URL` as `apps/backend/.env`.

### 4. Run

**Option A — local dev** (all 3 app services on host, Supabase for DB)

```bash
pnpm dev
```

**Option B — full Docker via pnpm** (Nx-managed, builds images per service)

```bash
pnpm docker        # builds images + starts backend, frontend, ai-worker
pnpm docker:down   # stop all app containers
pnpm infra:down    # no-op for DB; Supabase is external
```

> `pnpm docker` reuses the same app-level `.env` files, so backend and ai-worker both connect to Supabase.
> On first run, Docker builds can take a few minutes. Subsequent runs reuse cached layers.

**Option C — full Docker via Compose** (all services in one command)

```bash
docker compose up          # start frontend, backend, and ai-worker
docker compose up -d       # same, detached (background)
docker compose down        # stop and remove containers
docker compose down -v     # also wipe Compose-managed caches/volumes
```

> On first run, `pip install uv` + `uv sync` run inside each Python container — takes ~1 min.
> Subsequent runs reuse existing containers and start instantly (no reinstall).
> To force a full reinstall: `docker compose down && docker compose up`

---

## What's Working (Community Refactor)

- Email signup with OTP verification + 4-digit PIN login + PIN reset
- 17th cohort verification application with interview date, interview start time, auto-derived time slot, and room
- Admin approval flow for verification requests
- Interview dashboard grid for 4 interview dates × 5 time slots × 5 rooms × 5 seats = 500 seats
- Slot detail access gated to approved members only
- Creator demo persona page kept as placeholder data for a future team-building feature
- Persona/capture backend structure still exists, but it is not the current product priority

---

## Not Yet Done

- Seoul / Busan team segmentation in the data model and UI
- Final real-world interview schedule cleanup after members start applying
- Dedicated community profile and team-building surfaces
- Persona capture workflow as a member-facing feature

---

## Structure

```text
apps/
├── frontend/     # React SPA (auth, verification, dashboard, admin, demo persona)
├── backend/      # FastAPI (auth, verification, dashboard, admin, legacy persona structure)
└── ai-worker/    # Legacy persona pipeline kept for later team-building experiments
infrastructure/
└── terraform/
```

---

## API

Base: `http://localhost:8000` · Docs: `http://localhost:8000/docs`

| Method | Path                                     | Notes                                       |
| ------ | ---------------------------------------- | ------------------------------------------- |
| POST   | `/auth/signup`                           | email + 4-digit PIN                         |
| POST   | `/auth/verify`                           | OTP confirmation                            |
| POST   | `/auth/login`                            |                                             |
| POST   | `/auth/logout`                           |                                             |
| GET    | `/auth/me`                               |                                             |
| POST   | `/auth/reset-pin/request`                | sends OTP                                   |
| POST   | `/auth/reset-pin/confirm`                | sets new PIN                                |
| GET    | `/admin/users`                           | admin only                                  |
| GET    | `/admin/verifications`                   | admin only                                  |
| POST   | `/admin/verifications/{user_id}/approve` | admin only                                  |
| POST   | `/admin/verifications/{user_id}/reject`  | admin only                                  |
| POST   | `/verification/apply`                    | logged-in users only                        |
| GET    | `/verification/me`                       | logged-in users only                        |
| GET    | `/dashboard`                             | public 500-seat overview                    |
| GET    | `/dashboard/slot`                        | approved members only                       |
| POST   | `/capture/interview/chat`                | AI chat, returns `{ message, is_complete }` |
| POST   | `/capture/jobs`                          | create job                                  |
| GET    | `/capture/jobs`                          | list jobs                                   |
| GET    | `/capture/jobs/{id}`                     | includes `result` when done                 |
| DELETE | `/capture/jobs/{id}`                     |                                             |
| GET    | `/persona/{id}`                          | public, no auth                             |
| GET    | `/health`                                |                                             |

---

## Quality

```bash
pnpm test:backend
pnpm lint
pnpm format
uvx pre-commit run --all-files
```

---

## Git Policy

- `main` — stable, PR merge only
- `feat/*` — feature branches
- One PR = one branch; merge before starting the next
