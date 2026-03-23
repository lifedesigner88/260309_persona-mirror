# Changelog Index

## Structure
- Daily change records are added as `docs/changelog/YYYY-MM-DD.md`.
- The initial accumulated log is preserved in [2026-03-09.md](2026-03-09.md).

## Operating Rules
### 1. Daily file first
- All changelog entries go into the file for that day first.
- When starting new work, check if the file for that date exists; create it if not.

### 2. During work: short memo only
- While working, accumulate changes as one-line notes only.
- At this stage, complete tracking matters more than polished sentences.
- Minor experiments, reverted attempts, and temporary diagnostics can also be noted briefly.

### 3. Before commit: rewrite by commit bundle
- Before committing, do not leave the day's notes as-is.
- Select only the changes that will actually go into this commit and summarize them.
- Prioritize "learning order" and "intent of change" over "chronological listing".
- Use this structure where possible:
  - `Day Summary`
  - `Recommended Reading Order`
  - Per major step: `Representative Commits / What Changed / Why It Mattered / Files To Read`
  - `End-of-Day Result`

### 4. After commit: keep only durable summary
- After committing, remove sentences that were just interim notes.
- Keep only the final summary that matches the commit history.
- Remove replaced temporary notes, duplicate sentences, and miscellaneous experiment records.

### 5. Relationship to git history
- The changelog is not a copy of `git log`.
- If multiple commits form one learning step, group them into one section.
- Conversely, even a single large commit can be split into multiple sections if it has multiple learning points.
- The key question is: "Is this easy to understand when studying the commits later?"

### 6. Scope discipline
- The changelog captures project-wide operational, structural, and feature changes.
- Detailed API specs are not written at length in the changelog.
- Endpoint details belong in the code, OpenAPI, or separate test/doc files.

## Files
- [ROADMAP.md](ROADMAP.md) — phase-by-phase roadmap built from project history
- [2026-03-09.md](2026-03-09.md)
- [2026-03-10.md](2026-03-10.md)
- [2026-03-21.md](2026-03-21.md)
- [2026-03-22.md](2026-03-22.md)
- [2026-03-23.md](2026-03-23.md)
