# Work Order

## Header

- Project: Neon Blaster X
- Work order ID: NBX-002
- Requester: Davis Wang
- Owner: Producer
- Project mode: Existing project
- Phase: Brownfield work order
- Active platform profile: Browser-first

## Objective

Revamp the current enemy AI so the runtime stays free-for-all and survivable without leaning on an empty early game. The output must preserve the existing salvage-and-rebuild loop, keep the expanded legal ship pool, and replace the old combat-seeking `Passive` bucket with softer personalities that genuinely ignore, delay, or fail at attacking the player.

## Requested Change

Implement the approved enemy roster and replace the AI model with a softer-majority engagement matrix:

- `Needle`
- `Bulwark`
- `Manta`
- `Fortress`

Each concrete ship design should remain buildable under the current socket / attachment rules, should still read as one of the `5` approved archetypes, and each spawn should also roll one of these AI personalities:

- `Punching Bag`
- `Slow Reacting`
- `Won't Attack First`
- `Cautious`
- `Opportunist`
- `Aggressive`
- `Berserker`

## Existing Behavior To Preserve

- Browser-first delivery and current local run/test flow
- Shared cockpit-only start/reset state
- Builder-only rainbow seed behavior
- Free-for-all combat model
- Persistent ship-death loot rules
- Current block vocabulary: `cockpit`, `hull`, `blaster`, `thruster`, `shield`

## In Scope

- Enemy blueprint generation
- Enemy-design variant generation within each archetype
- Enemy spawn metadata
- Runtime AI decision-making
- Provocation / retaliation state
- Enemy-archetype / design-pool documentation
- Deterministic tests for provocation, soft-personality behavior, roster size, and AI behavior differences
- Harness overlay refresh for the current brownfield loop

## Out Of Scope

- New block types or enemy-only modules
- Wave scripting or boss systems
- UI redesign
- Audio or VFX pass
- Builder changes unrelated to enemy validity

## Inputs

- [docs/project/00-existing-project-intake.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/00-existing-project-intake.md)
- [README.md](/Users/davis.wang/Documents/neon-blaster-x/README.md)
- [docs/project/02-game-spec.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/02-game-spec.md)
- [docs/project/05-build-note.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/05-build-note.md)
- [src/ship.js](/Users/davis.wang/Documents/neon-blaster-x/src/ship.js)
- [src/main.js](/Users/davis.wang/Documents/neon-blaster-x/src/main.js)
- [tests/ship.test.js](/Users/davis.wang/Documents/neon-blaster-x/tests/ship.test.js)

## Artifact Status Inputs

| Artifact | Status | Notes |
| --- | --- | --- |
| Existing-project intake | `reusable` | refreshed for this loop |
| Producer work order | `reusable` | this file is the current source of scope control |
| Canonical game spec | `refresh_required` | still documents a minimal enemy baseline |
| Build note | `refresh_required` | still describes simple pursuit AI |
| Session change log | `refresh_required` | needs the enemy-archetype / AI-personality round |
| README | `refresh_required` | should surface the current runtime roster and AI model |
| Tests | `refresh_required` | must lock the approved roster and personality matrix |

## Required Outputs

- Implemented archetype-based enemy generator with `28` distinct legal ship designs
- Implemented weighted AI personality system with a `~70%` soft-personality majority
- Increased enemy blaster availability through ship design
- Deterministic automated coverage
- Updated runtime docs and harness overlay docs

## Constraints

- Stay within the current part set
- Keep archetypes buildable under live socket / connectivity rules
- Keep the expanded ship pool legible as archetype-inspired variants instead of random unrelated hulls
- The shipped roster should use `4` archetypes with `7` designs each, favor symmetrical layouts, and keep only a small minority of low-yaw or low-thrust outliers
- Preserve existing combat, salvage, and builder behavior outside the enemy-system rewrite
- Keep the solution small enough for the current browser-first runtime

## Escalation Boundary

The owner may decide alone:

- archetype unlock pacing across levels
- exact per-archetype spawn weights
- exact AI threshold tuning, provided the approved soft-vs-hostile identities stay legible

The owner must return to the user if:

- the approved archetype list changes materially
- the enemy system needs new block types or new combat verbs
- the runtime needs a different control model or platform profile

## Done When

- Spawned enemies come from the approved `4` archetypes through `28` distinct legal ship designs
- Spawned enemies roll the approved soft-majority AI personalities through tested weighting rules
- The logic tests cover blueprint validity across the widened design pool, provocation / retaliation rules, and clear behavior contrast between soft and hostile personalities
- README and project docs reflect the new runtime rules

## Next Owner

- Game Developer
