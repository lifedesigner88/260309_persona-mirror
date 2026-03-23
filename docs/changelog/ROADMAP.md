# SoMa Community Roadmap

Built from the current product direction and completed work in the repo. Checked items reflect what is already implemented as of `2026-03-23`.

---

## Phase 0 — Foundation ✅

Goal: empty monorepo -> runnable product base

- [x] Nx monorepo, `pnpm` + `uv`, pinned runtime versions
- [x] FastAPI backend + React Router frontend scaffold
- [x] ESLint, Prettier, Ruff, pre-commit baseline
- [x] Cookie-based session auth structure
- [x] Docker / Compose / local dev execution paths
- [x] Daily changelog and roadmap documentation flow

---

## Phase 1 — Community Pivot MVP ✅ `2026-03-23`

Goal: `PersonaMirror` -> `ASM 17 Community`

- [x] `ASM 17 Community` branding and navigation cleanup
- [x] Email signup with OTP verification
- [x] `4-digit PIN` login and PIN reset
- [x] Admin seed account with real reset-ready email
- [x] Supabase as the shared backend / worker DB path
- [x] Successful-applicant verification as the main onboarding flow
- [x] Verification apply + edit-after-approval flow
- [x] Required verification fields with privacy/help notes
- [x] Kakao open-chat follow-up guidance in the verification flow
- [x] Interview `start time` storage with auto-derived `1T`-`5T`
- [x] Seoul interview dashboard with `500-seat` operating model
- [x] Compact mobile-friendly dashboard board and `320px` layout handling
- [x] Admin verification review page with full submitted info
- [x] Admin approve / reject flow
- [x] Admin member list with verification revoke action
- [x] Admin dashboard-slot inspection without applicant verification
- [x] `Sejong Persona` kept as demo data only
- [x] `capture` hidden from current user navigation
- [x] Busan dashboard placeholder navigation (`Coming soon`)

---

## Phase 2 — Community Safety and Review Tools `planned`

Goal: make browsing safer and reduce duplicated outreach

- [ ] User report / 신고 feature for inappropriate profiles or behavior
- [ ] Report categories and optional evidence submission
- [ ] Admin report queue with status: `received`, `reviewing`, `resolved`, `dismissed`
- [ ] Reporter protection: hide who reported and prevent easy retaliation
- [ ] User-level block / hide feature
- [ ] `내가 확인한 유저` list for members
- [ ] Per-user review states such as `확인함`, `연락함`, `보류`, `관심있음`
- [ ] Personal notes/tags on reviewed users
- [ ] Filter to hide users already reviewed or already contacted
- [ ] Duplicate-outreach reduction cues in dashboard or member views

---

## Phase 3 — 3-Person Team Building Assist `planned`

Goal: help members form balanced 3-person teams faster

- [ ] Team-building profile fields: role, strengths, preferred stack, project interests
- [ ] Availability fields: region, remote/onsite preference, active hours
- [ ] `팀 구하는 중` states such as `2명 찾는 중`, `1명 찾는 중`, `팀 완성`
- [ ] Search / filter by role, stack, interest, and region
- [ ] Trio recommendation view for complementary 3-person combinations
- [ ] Balance signals for a trio: role coverage, stack diversity, availability overlap
- [ ] Save shortlisted candidate trios
- [ ] `찜한 팀원 후보` / shortlist collection
- [ ] One-click compare view for 2~3 candidate teammates
- [ ] `우리 팀 1명 더 필요해요` post or badge
- [ ] Mutual interest or invite flow before moving to open chat

---

## Phase 4 — Community Profiles and Persona Extension `planned`

Goal: expand from verification data to richer teaming signals

- [ ] Dedicated community profile beyond verification-only fields
- [ ] Skills, interests, side-project history, and collaboration preferences
- [ ] Public-ish member summary visible only to verified cohort members
- [ ] Persona-assisted teammate introduction summary
- [ ] Reuse the current `Sejong Persona` structure for future member-level persona cards
- [ ] Reintroduce persona/capture flows only when team-building priority is high enough

---

## Phase 5 — Data Model and Operations Hardening `planned`

Goal: make the community app easier to operate at real scale

- [ ] Seoul / Busan team separation in the actual data model
- [ ] Busan dashboard implementation
- [ ] Interview slot normalization with a dedicated slots table
- [ ] Real schedule cleanup after enough member submissions arrive
- [ ] Alembic migrations
- [ ] Playwright e2e coverage
- [ ] Logging, moderation audit trail, and operational monitoring
- [ ] Infrastructure automation and deploy hardening

---

## Deferred but Preserved

- [x] Bilingual persona structure (`data_eng` / `data_kor`)
- [x] Demo persona page and ask flow
- [x] Legacy capture / ai-worker codebase kept for later reuse
- [ ] Member-facing voice / image capture relaunch
- [ ] Persona-first team recommendation workflow

---

## Next Recommended Work

1. Add `신고` and `내가 확인한 유저` features first so browsing becomes safer and more organized.
2. Add minimal team-building profile fields and shortlist states so members can manage candidate teammates before full trio recommendation logic.
3. Normalize interview slots and add real Seoul / Busan team separation before Busan goes live.
