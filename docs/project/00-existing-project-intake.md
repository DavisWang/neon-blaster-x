# Existing Project Intake

## Header

- Project: Neon Blaster X
- Owner: Producer
- Date: 2026-03-31
- Requested outcome: let custom enemy ships be authored in the live builder and exported as an exact standardized ship-spec payload, so future boss designs can be handed back without screenshot interpretation drift
- Active platform profile: Browser-first

## Current Playable State

The project is already browser-playable with title, run, and builder states; cockpit-only shared start/reset behavior; live salvage pickup and attachment; free-for-all combat; the standard `28`-ship enemy roster plus two late custom bosses (`Warheart` fortress, `Nightwing` manta); and deterministic gameplay coverage. The request-affected gap is narrower than gameplay: the builder already keeps the current ship serialized internally, but there is no player-facing export button or standardized prompt-ready ship-spec format that can be pasted back into Codex for exact custom enemy implementation.

## Docs Reviewed

- `./AGENTS.md`
- `./README.md`
- `./docs/project/00-existing-project-intake.md`
- `./docs/project/01-work-order.md`
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

- `index.html`
- `run.html`
- `builder.html`
- `styles.css`
- `src/main.js`
- `src/ship.js`
- `tests/ship.test.js`

## Current Run And Test Commands

- run: `python3 -m http.server 4199 --bind 127.0.0.1`
- test: `npm test`

## Known Bugs And Quality Gaps

- Screenshot-only handoff is too ambiguous for exact custom enemy recreation.
- The builder has no user-facing export action even though the runtime already maintains a blueprint representation of the ship.
- There is no stable `ship-design` schema that strips runtime-only ids and preserves exact block coordinates, variants, facing, and quality.
- There is no deterministic regression covering the builder export contract.

## Artifact Status

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `refresh_required` | previous intake covered another loop and did not scope the builder-export request |
| `docs/project/01-work-order.md` | `refresh_required` | previous work order targeted release-sync, not builder export |
| `docs/project/02-game-spec.md` | `out_of_scope` | no core loop or combat rule is changing in this pass |
| `docs/project/05-build-note.md` | `refresh_required` | should document the shipped builder export utility |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the builder-export round recorded |
| `README.md` | `refresh_required` | should tell the user how to export a ship spec from the builder |
| `index.html` / `run.html` / `builder.html` | `refresh_required` | builder sidebar needs an export action and status copy |
| `styles.css` | `refresh_required` | needs export-status styling |
| `src/main.js` | `refresh_required` | UI wiring, clipboard export, and status handling live here |
| `src/ship.js` | `refresh_required` | standardized export schema should live next to blueprint serialization |
| `tests/ship.test.js` | `refresh_required` | needs deterministic coverage for the export format |

## Recommended Loop Scope

- Refresh only the request-affected builder-export seam: harness overlay docs, builder UI, standardized ship-spec formatting, deterministic tests, and request-facing runtime notes.
- Preserve the live builder interaction model, blueprint semantics, current browser run/test flow, and all combat / spawn behavior.
- Export the exact current ship layout rather than introducing a lossy summary format.
- Keep the feature clipboard-first and local-browser friendly; do not add backend storage, import pipelines, or new gameplay systems in this loop.
