# Work Order

## Header

- Project: Neon Blaster X
- Work order ID: NBX-003
- Requester: Davis Wang
- Owner: Producer
- Project mode: Existing project
- Phase: Brownfield work order
- Active platform profile: Browser-first

## Objective

Increase enemy ship visual and loot-interest variety without reopening the broader fleet, AI, or browser-flow work. Each enemy spawn should still roll one base quality from the current progression curve, but its non-cockpit blocks may now resolve at base quality plus or minus `1`, clamped at the palette bounds, while mirrored block pairs keep the same tier so silhouettes remain symmetry-first.

## Requested Change

Implement mixed-quality enemy blueprint assembly for the live fleet:

- enemy non-cockpit blocks may resolve at base quality minus `1`, base quality, or base quality plus `1`
- mirrored enemy block pairs must keep matching qualities
- variance must stay bounded to one tier around the spawn's base quality
- current archetype roster, legal-build rules, and quality progression by level stay intact

## Existing Behavior To Preserve

- Browser-first delivery and current local run/test flow
- Shared cockpit-only start/reset state and builder-only rainbow seed behavior
- Current `28`-design fleet across `Needle`, `Bulwark`, `Manta`, and `Fortress`
- Current AI personalities, spawn weighting, and free-for-all combat rules
- Current block vocabulary, connectivity rules, salvage handling, and player-side quality behavior

## In Scope

- Enemy blueprint assembly in `src/ship.js`
- Symmetry-aware quality grouping for mirrored enemy parts
- Deterministic regression coverage for bounded variation and mirrored-quality preservation
- Request-affected runtime docs and harness overlay docs

## Out Of Scope

- New enemy ship designs, new archetypes, or roster-count changes
- AI tuning, spawn-pressure tuning, or progression-level retuning
- Player ship, builder palette, or UI-shell changes
- New block types, new combat verbs, or balance rework beyond bounded enemy quality variance

## Inputs

- `docs/project/00-existing-project-intake.md`
- `README.md`
- `docs/project/02-game-spec.md`
- `docs/project/05-build-note.md`
- `docs/project/10-session-change-log.md`
- `src/ship.js`
- `tests/ship.test.js`

## Artifact Status Inputs

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `reusable` | refreshed for the current request |
| `docs/project/01-work-order.md` | `reusable` | this file is the active scope-control artifact |
| `docs/project/01-producer-work-order.md` | `out_of_scope` | prior brownfield work order; keep as historical reference only |
| `docs/project/02-game-spec.md` | `refresh_required` | needs the enemy mixed-quality rule |
| `docs/project/05-build-note.md` | `refresh_required` | needs the shipped implementation/evidence note |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the current correction-round entry |
| `README.md` | `refresh_required` | should expose the live mixed-quality enemy rule |
| `src/ship.js` | `refresh_required` | implementation seam for enemy quality assignment |
| `tests/ship.test.js` | `refresh_required` | missing deterministic coverage for the new rule |

## Required Outputs

- Enemy blueprint generation that can mix non-cockpit block quality at base quality plus or minus `1`
- Symmetry-aware mirrored-quality preservation for enemy block pairs
- Deterministic automated coverage for bounded variance and mirrored matching
- Updated intake/work order plus request-affected runtime docs

## Constraints

- Keep the change small and localized to the enemy blueprint path
- Preserve legal ship construction under current socket / attachment rules
- Preserve current quality progression by level; this pass changes per-ship composition, not the base tier curve
- Do not introduce asymmetrical quality noise into mirrored enemy layouts
- Do not refresh unrelated artifacts unless the implementation exposes real drift

## Escalation Boundary

The owner may decide alone:

- the exact weighting between base quality minus `1`, base quality, and base quality plus `1`
- whether quality variance is deterministic only when an explicit RNG is provided or always enabled at spawn time, as long as live enemies use the new rule

The owner must return to the user if:

- the request requires changing the quality ladder itself instead of using bounded offsets
- the fleet needs new parts, new archetypes, or non-symmetrical visual direction to land the request
- the browser-first platform profile or current run/test loop no longer fits the change

## Done When

- Live enemy spawns can include non-cockpit blocks at base quality plus or minus `1`
- Every varied enemy block still stays within one tier of the spawn's base quality
- Mirrored enemy block pairs keep matching quality tiers
- `npm test` passes with deterministic coverage for the new rule
- README and request-affected project docs reflect the shipped behavior

## Next Owner

- Game Developer
