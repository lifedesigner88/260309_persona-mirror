# PersonaMirror Roadmap

Built from project history. Each phase maps to what was actually done or decided.

---

## Phase 0 — Foundation `2026-03-09` ✅

Goal: empty monorepo → runnable template

- [x] Nx monorepo, pnpm + uv, `.nvmrc`, `.python-version`
- [x] FastAPI `/health` + React Router v7 frontend scaffold
- [x] ESLint, Prettier, Ruff, pre-commit
- [x] httpOnly cookie-based session auth (signup / login / logout / admin)
- [x] `capture_jobs` table + `POST /capture/jobs`, `GET`, `GET /{id}`
- [x] Capture step UI draft (interview / voice / image / review)
- [x] Frontend / backend aligned to same domain names: `auth`, `admin`, `capture`

---

## Phase 0.5 — Operational Baseline `2026-03-10` ✅

Goal: loosely-running template → reproducible and verifiable

- [x] Three execution paths stabilized: `pnpm dev` / `pnpm docker` / `docker compose up`
- [x] Runtime pinned to patch version (Node 24.11.0, Python 3.11.15, Postgres 16.13, Redis 7.4.7)
- [x] `.env.example` tracked; actual `.env` auto-generated; `compose.env` consolidated
- [x] 10 backend smoke tests (auth, admin, capture)
- [x] `capture_jobs.owner_id` → FK to `users.id`
- [x] Capture submit → submission list / detail / delete full cycle working
- [x] Per-date changelog + stacked branch policy documented

---

## Phase 1 — March 25 MVP `2026-03-21` 🔄

Goal: full AI pipeline → shareable Level 1 persona card

- [x] Email signup with OTP verification (Resend) + 4-digit PIN login
- [x] Reset PIN via email OTP
- [x] Admin account seed + admin user list
- [x] AI chat interview — Claude asks 5 adaptive questions (`POST /capture/interview/chat`)
- [x] `capture_jobs.result` (JSON) + `persona_id` (String 16) added
- [x] ai-worker LangGraph pipeline: polls pending jobs → Claude → writes `{ archetype, top3_values, one_liner }`
- [x] Level 1 Persona Card on submission detail (polls every 2s until done)
- [x] Public persona page `/persona/:id` — hero, MBTI bars, radar, SDG, timeline, strengths
- [x] `/persona/demo` — Hupository data, no backend needed
- [x] Capture routes auth-gated (nav hidden + route redirect on 401)
- [x] Dev environment: `.env` files created, model set to `claude-haiku-4-5` for cost
- [x] `GET /persona/:id` real backend endpoint (personas table + router)
- [x] `POST /persona/:id/ask` Q&A panel backend endpoint — Claude Haiku answers in-persona; frontend Ask panel wired end-to-end
- [ ] DB volume reset required (new columns: `result`, `persona_id`)
- [x] Production Docker images: frontend nginx build + nginx.conf SPA routing
- [x] GHCR CI: build + push `persona-mirror-frontend`, `persona-mirror-backend`, `persona-mirror-ai-worker`
- [x] Supabase as managed DB — removed local Postgres/Redis from compose
- [x] Deploy to `asm17.huposit.kr` via 260312-demo-infra (Caddy + compose)

---

## Phase 1.5 — Internationalization (KOR / ENG) `planned`

Goal: full Korean ↔ English UI switch with AI responses in the active locale

- [ ] Install `react-i18next` + `i18next-http-backend`; configure lazy namespace loading
- [ ] Locale JSON files per feature: `en/{common,auth,capture,persona}.json` + `ko/` mirrors
- [ ] Language detection: `localStorage` → `navigator.language` (`ko*` → Korean) → `en`
- [ ] `<LangToggle>` component in nav (KO / EN pill switch, persists to localStorage)
- [ ] Replace all hardcoded UI strings in auth, capture, persona, admin pages with `t()` calls
- [ ] Korean web font — Pretendard via `@fontsource/pretendard` or CDN; apply in `index.css`
- [ ] Layout audit: remove fixed widths on text containers; verify KOR/ENG renders without overflow
- [ ] Pass `lang` (active locale) from frontend to `POST /capture/interview/chat` → backend forwards to Claude system prompt so AI replies in the correct language
- [ ] AI-worker: inject locale into LangGraph state; persona generation prompts output KOR or ENG based on `lang`
- [ ] Date / number formatting: replace manual formats with `Intl.DateTimeFormat` / `Intl.NumberFormat` using active locale
- [ ] `<html lang="...">` attribute updated reactively on locale change

---

## Phase 2 — Enriched Analysis `planned`

Goal: Level 2+ persona depth, multi-modal input

- [ ] LangGraph Phase 2 nodes: `extract_speaking`, `generate_card`
- [ ] Whisper voice analysis node
- [ ] Image analysis node
- [ ] Level 2 output: language patterns + decision-making tendencies + career direction
- [ ] Multi-LLM backend support (GPT, Gemini swap via LangGraph)

---

## Phase 3 — Operations `planned`

Goal: production-ready

- [ ] Alembic migration introduction
- [ ] Playwright e2e tests
- [ ] Admin capture submission list / detail view
- [ ] Logging and monitoring
- [ ] Infrastructure automation (Terraform)
- [ ] Level N: life timeline · goal hierarchy · value evolution · SDG alignment

---

## Next Recommended Work

1. DB volume reset on next local deploy (run `docker compose down -v && docker compose up`)
2. Voice and image capture pipeline
