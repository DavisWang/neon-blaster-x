# Existing Project Intake

## Header

- Project: Neon Blaster X
- Owner: Producer
- Date: 2026-03-31
- Requested outcome: treat the game as release-ready, read the current repo and harness, refresh stale tests and documentation to match the shipped browser game, update the README to the current behavior and scope, and push the synced state to GitHub
- Active platform profile: Browser-first

## Current Playable State

The project is already a playable browser game with title, run, builder, and retry states; a cockpit-only shared start/reset plus a builder-only rainbow seed ship; live salvage pickup, detach, rotation, and attachment; free-for-all combat; a shipped `28`-ship standard enemy roster plus the late `Warheart` fortress boss; procedural ambient music and melodic combat SFX; and deterministic gameplay coverage at `73/73` passing tests. The request-affected gap is documentation and release-story drift: multiple harness artifacts still describe an earlier pre-approval prototype instead of the current shipped behavior.

## Docs Reviewed

- `./AGENTS.md`
- `./README.md`
- `./docs/project/00-existing-project-intake.md`
- `./docs/project/01-work-order.md`
- `./docs/project/02-game-spec.md`
- `./docs/project/05-build-note.md`
- `./docs/project/06-test-verdict.md`
- `./docs/project/07-mock-player-memo.md`
- `./docs/project/08-release-backlog-summary.md`
- `./docs/project/09-future-directions.md`
- `./docs/project/10-session-change-log.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/AGENTS.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/index.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/workflows/game-lifecycle.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/contracts/platforms/browser-first.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/contracts/roles/producer.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/templates/existing-project-intake.md`
- `/Users/davis.wang/Documents/pwner-studios-dev-team/docs/templates/work-order.md`

## Code Areas Reviewed

- `package.json`
- `index.html`
- `run.html`
- `builder.html`
- `styles.css`
- `src/audio.js`
- `src/main.js`
- `src/ship.js`
- `tests/ship.test.js`

## Current Run And Test Commands

- run: `python3 -m http.server 4199 --bind 127.0.0.1`
- test: `npm test`

## Known Bugs And Quality Gaps

- Several release-facing docs still describe the project as not ready to ship even though the current repo already includes the later gameplay, roster, salvage, and audio passes.
- `run.html` still carries the older three-column HUD wording while the other shipped shells and prior docs use the compact two-bucket wording.
- The current session needs a final documentation sync and Git push, not a broader gameplay rewrite.

## Artifact Status

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `refresh_required` | stale for the current release-sync request |
| `docs/project/01-work-order.md` | `refresh_required` | current work order still scopes the prior audio pass |
| `docs/project/01-producer-work-order.md` | `out_of_scope` | historical source material only |
| `docs/project/02-game-spec.md` | `refresh_required` | should describe the current shipped scope and audio-enabled rules cleanly |
| `docs/project/05-build-note.md` | `refresh_required` | should move from review handoff language to release-sync language |
| `docs/project/06-test-verdict.md` | `refresh_required` | still blocks shipping on an older review snapshot |
| `docs/project/07-mock-player-memo.md` | `refresh_required` | still reads like a pre-approval prototype memo |
| `docs/project/08-release-backlog-summary.md` | `refresh_required` | current release call still says do not ship yet |
| `docs/project/09-future-directions.md` | `reusable` | future-facing ideas still fit the current game |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the release-sync entry |
| `README.md` | `refresh_required` | should present the repo as the current game, not an older prototype snapshot |
| `src/audio.js` | `reusable` | shipped browser audio runtime now exists |
| `src/main.js` | `reusable` | audio hooks and shipped gameplay wiring are already in place |
| `src/ship.js` | `reusable` | core gameplay systems and tuning are already implemented |
| `index.html` / `builder.html` | `reusable` | already reflect the current shell language and media |
| `run.html` | `refresh_required` | compact HUD wording drift remains |
| `styles.css` | `reusable` | current audio-toggle placement and shell styling already match the release direction |
| `tests/ship.test.js` | `refresh_required` | should cover the release-ready audio/runtime expectations and stay in sync with the final docs |

## Recommended Loop Scope

- Refresh only the stale or request-affected release chain: intake, current work order, README, request-affected project docs, the one inconsistent HUD shell, targeted test coverage, and session/change tracking.
- Preserve the shipped browser-first run/test flow, current title/run/builder/game-over states, combat rules, salvage rules, enemy roster, audio direction, and visual-quality toggle behavior.
- Treat the repo's current code as source of truth and avoid reopening balance or feature scope unless the docs are materially wrong.
- Finish with green tests and a GitHub push so the repo state, docs, and remote all agree.
