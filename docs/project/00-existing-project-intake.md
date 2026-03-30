# Existing Project Intake

## Header

- Project: Neon Blaster X
- Owner: Producer
- Date: 2026-03-30
- Requested outcome: implement the approved enemy archetypes and AI personalities, with tests and documentation
- Active platform profile: Browser-first

## Current Playable State

The project is already browser-playable with title, run, builder, combat, salvage pickup, drag-and-attach rebuilding, and persistent ship-death loot. The main runtime gap before this loop was richer enemy identity: enemies existed, but they still spawned from a small generic template pool and all used the same pursuit logic.

## Docs Reviewed

- [README.md](/Users/davis.wang/Documents/neon-blaster-x/README.md)
- [docs/project/01-producer-work-order.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/01-producer-work-order.md)
- [docs/project/02-game-spec.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/02-game-spec.md)
- [docs/project/05-build-note.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/05-build-note.md)
- [docs/project/10-session-change-log.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/10-session-change-log.md)

## Code Areas Reviewed

- [src/ship.js](/Users/davis.wang/Documents/neon-blaster-x/src/ship.js)
- [src/main.js](/Users/davis.wang/Documents/neon-blaster-x/src/main.js)
- [tests/ship.test.js](/Users/davis.wang/Documents/neon-blaster-x/tests/ship.test.js)

## Current Run And Test Commands

- run: `python3 -m http.server 4199 --bind 127.0.0.1`
- test: `npm test`
- syntax check: `node --check src/main.js` and `node --check src/ship.js`

## Known Bugs And Quality Gaps

- Enemy silhouettes and behavior variety were underpowered relative to the rest of the salvage loop.
- The previous producer work order was stale and still described the repo as greenfield.
- The project did not yet encode the approved archetype-to-AI weighting in tests or docs.

## Artifact Status

| Artifact | Status | Notes |
| --- | --- | --- |
| Existing-project intake | `refresh_required` | missing before this loop; required by the harness for the current brownfield feature pass |
| Producer work order | `refresh_required` | stale greenfield framing; needs existing-project enemy-system scope |
| Canonical game spec | `refresh_required` | current runtime now includes a richer enemy roster than the spec describes |
| Build note | `refresh_required` | currently describes only simple pursuit AI |
| Session change log | `refresh_required` | needs the enemy-archetype / AI-personality round |
| README | `refresh_required` | runtime-facing notes should expose the roster and AI profile system |
| Tests | `refresh_required` | needs deterministic coverage for archetype validity and AI behavior differences |

## Recommended Loop Scope

- Refresh the harness overlay docs for the current existing-project request.
- Replace the old enemy template pool with the approved `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` archetypes.
- Implement the `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker` AI profiles with archetype-specific spawn weighting.
- Keep the rest of the salvage, builder, and physics systems untouched unless required by the enemy-system rewrite.
- Preserve browser-first delivery, current run/test commands, and the cockpit-only shared default ship state.
