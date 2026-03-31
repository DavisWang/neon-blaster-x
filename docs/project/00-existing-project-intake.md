# Existing Project Intake

## Header

- Project: Neon Blaster X
- Owner: Producer
- Date: 2026-03-30
- Requested outcome: let enemy ships roll non-cockpit block qualities at base quality plus or minus `1` while preserving mirrored symmetry, legal builds, and the current browser-first loop
- Active platform profile: Browser-first

## Current Playable State

The project is already browser-playable with title, run, and builder states; cockpit-only shared start/reset behavior; live salvage pickup and attachment; free-for-all combat; and a shipped `28`-design enemy fleet across `Needle`, `Bulwark`, `Manta`, and `Fortress`. The request-affected gap is narrower: enemy ships currently apply one flat non-cockpit quality tier per spawn, so internal silhouette contrast and salvage desirability inside a single enemy frame are flatter than intended.

## Docs Reviewed

- `./AGENTS.md`
- `./README.md`
- `./docs/project/01-producer-work-order.md`
- `./docs/project/02-game-spec.md`
- `./docs/project/05-build-note.md`
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
- `src/ship.js`
- `src/main.js`
- `tests/ship.test.js`

## Current Run And Test Commands

- run: `python3 -m http.server 4199 --bind 127.0.0.1`
- test: `npm test`

## Known Bugs And Quality Gaps

- Enemy blueprint assembly still uses one shared non-cockpit quality per spawned ship.
- There is no deterministic regression that proves mixed enemy block quality stays within base quality plus or minus `1`.
- There is no deterministic regression that proves mirrored enemy block pairs keep matching qualities after variation is introduced.
- Runtime-facing docs still describe enemy quality progression only at the whole-ship level.

## Artifact Status

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `refresh_required` | previous intake covered an older enemy-roster / AI loop, not the current mixed-quality request |
| `docs/project/01-work-order.md` | `missing` | canonical brownfield work order for this request does not exist yet |
| `docs/project/01-producer-work-order.md` | `out_of_scope` | keep as historical source material only; do not treat it as the active work order for this loop |
| `docs/project/02-game-spec.md` | `refresh_required` | needs the shipped enemy quality-variation rule |
| `docs/project/05-build-note.md` | `refresh_required` | needs the implementation/evidence summary for mixed-quality enemy ships |
| `docs/project/06-test-verdict.md` | `out_of_scope` | no title/state-flow/UI contract changed in this loop; targeted logic validation is sufficient |
| `docs/project/07-mock-player-memo.md` | `out_of_scope` | this is a contained enemy-generation pass, not a broader first-session feel review |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the current correction-round entry |
| `README.md` | `refresh_required` | runtime-facing notes should mention mirrored base-quality-plus-or-minus-`1` enemy accents |
| `src/ship.js` | `refresh_required` | flat per-ship enemy quality assignment lives here |
| `tests/ship.test.js` | `refresh_required` | missing bounded-variance and mirrored-symmetry coverage |

## Recommended Loop Scope

- Refresh only the request-affected artifact chain: intake, current work order, enemy blueprint logic, deterministic regressions, README, game spec, build note, and session change log.
- Preserve the shipped `28`-design roster, archetype lineup, AI profile tables, progression curve, and current browser run/test flow.
- Preserve player/builder quality behavior; this pass is limited to enemy blueprint assembly.
- Avoid unrelated UI, camera, salvage, or combat-balance retuning unless the mixed-quality implementation exposes a concrete regression.
