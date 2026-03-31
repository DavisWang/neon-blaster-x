# Work Order

## Header

- Project: Neon Blaster X
- Work order ID: NBX-006
- Requester: Davis Wang
- Owner: Producer
- Project mode: Existing project
- Phase: Brownfield work order
- Active platform profile: Browser-first

## Objective

Bring the repo into release-ready alignment without changing the shipped game loop. The output of this pass is a coherent, current documentation and test story for the existing browser game, plus a pushed GitHub state that matches the live code.

## Requested Change

Refresh the current repo around the now-finished game:

- read the current runtime and tests as source of truth
- update the harness overlay docs for the current release-sync loop
- update README and stale project docs so they describe the shipped gameplay, logic, and scope accurately
- add or refresh tests only where current behavior lacks matching deterministic coverage
- fix minor documentation-surface drift that conflicts with the shipped UX
- stage, commit, and push the synced repo state to GitHub

## Existing Behavior To Preserve

- Browser-first delivery and current local run/test flow
- Shared cockpit-only start/reset behavior and builder-only rainbow seed behavior
- Current title, run, builder, and game-over state flow
- Current combat, salvage, enemy roster, and free-for-all rules
- Current neon line-art look and rendering-only `Q` quality toggle

## In Scope

- Existing-project intake and current work order refresh
- README and request-affected project-doc refresh
- Deterministic test sync for shipped gameplay/audio rules
- Minor shell wording cleanup where the shipped HTML drifted from the approved repo language
- Git staging, commit, and push

## Out Of Scope

- New gameplay systems, balance rewrites, or roster changes
- New art pipelines, asset packs, or toolchain changes
- Broader UX redesign beyond request-driven drift cleanup
- Rewriting the full artifact chain when an artifact is already current enough

## Inputs

- `docs/project/00-existing-project-intake.md`
- `README.md`
- `docs/project/02-game-spec.md`
- `docs/project/05-build-note.md`
- `docs/project/06-test-verdict.md`
- `docs/project/07-mock-player-memo.md`
- `docs/project/08-release-backlog-summary.md`
- `docs/project/09-future-directions.md`
- `docs/project/10-session-change-log.md`
- `run.html`
- `index.html`
- `builder.html`
- `styles.css`
- `src/audio.js`
- `src/main.js`
- `src/ship.js`
- `tests/ship.test.js`

## Artifact Status Inputs

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `reusable` | refreshed for the current release-sync loop |
| `docs/project/01-work-order.md` | `reusable` | this file is the active scope-control artifact |
| `docs/project/01-producer-work-order.md` | `out_of_scope` | prior brownfield work order; keep as historical reference only |
| `docs/project/02-game-spec.md` | `refresh_required` | needs a final shipped-state wording pass |
| `docs/project/05-build-note.md` | `refresh_required` | should present release-sync evidence instead of an open review handoff |
| `docs/project/06-test-verdict.md` | `refresh_required` | stale review state conflicts with the current request |
| `docs/project/07-mock-player-memo.md` | `refresh_required` | should match the current finished-game framing |
| `docs/project/08-release-backlog-summary.md` | `refresh_required` | release call must align with the current ship-ready request |
| `docs/project/09-future-directions.md` | `reusable` | future backlog remains valid without rewrite |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the release-sync entry |
| `README.md` | `refresh_required` | should reflect current behavior, logic, scope, and release framing |
| `run.html` | `refresh_required` | compact HUD wording drift |
| `index.html` / `builder.html` / `styles.css` | `reusable` | current shell styling and controls already match the intended direction |
| `src/audio.js` | `reusable` | shipped browser audio implementation |
| `src/main.js` / `src/ship.js` | `reusable` | source of truth for current game logic |
| `tests/ship.test.js` | `refresh_required` | release docs and current runtime expectations should stay synchronized |

## Required Outputs

- Refreshed intake and current work order for the final release-sync pass
- README and stale project docs that match the shipped game behavior and scope
- Deterministic tests aligned with the current runtime
- A clean repo state committed and pushed to GitHub

## Constraints

- Preserve shipped gameplay behavior unless the current docs are wrong
- Run a targeted loop only on stale or request-affected areas
- Treat the current repo code as source of truth over older doc language
- Keep the browser-first run/test path unchanged
- Do not stop before the synced state is validated and pushed unless a contract-defined escalation is required

## Escalation Boundary

The owner may decide alone:

- which stale docs need refresh versus reuse
- what minor wording-only shell cleanup is safe
- whether targeted test additions are sufficient versus broader test rewrites

The owner must return to the user if:

- the push cannot complete due credentials, remote access, or another external blocker
- the repo shows severe drift that would require a broader rewrite than the targeted loop allows
- unowned conflicting local changes make a safe sync impossible without direction

## Done When

- the release-facing docs match the current runtime and shipped scope
- any missing deterministic coverage for current behavior has been added
- `npm test` passes
- the repo state is committed and pushed to GitHub

## Next Owner

- Producer
