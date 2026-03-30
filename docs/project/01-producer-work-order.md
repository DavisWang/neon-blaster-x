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

Upgrade the current enemy system so the runtime has clear combat identity instead of one generic foe. The output must preserve the existing salvage-and-rebuild loop, but replace the old enemy template pool and one-size-fits-all pursuit logic with the approved ship archetypes and weighted AI personalities.

## Requested Change

Implement the approved enemy roster and behavior matrix:

- `Needle`
- `Bulwark`
- `Manta`
- `Fortress`
- `Vulture`

Each archetype should remain buildable under the current socket / attachment rules, and each spawn should also roll one of the approved AI personalities:

- `Passive`
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
- Enemy spawn metadata
- Runtime AI decision-making
- Enemy-archetype documentation
- Deterministic tests for blueprint validity and AI behavior differences
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

- Implemented archetype-based enemy generator
- Implemented weighted AI personality system
- Deterministic automated coverage
- Updated runtime docs and harness overlay docs

## Constraints

- Stay within the current part set
- Keep archetypes buildable under live socket / connectivity rules
- Preserve existing combat, salvage, and builder behavior outside the enemy-system rewrite
- Keep the solution small enough for the current browser-first runtime

## Escalation Boundary

The owner may decide alone:

- archetype unlock pacing across levels
- exact per-archetype spawn weights
- exact AI threshold tuning, provided the approved identities stay legible

The owner must return to the user if:

- the approved archetype list changes materially
- the enemy system needs new block types or new combat verbs
- the runtime needs a different control model or platform profile

## Done When

- Spawned enemies come from the approved `5` archetypes
- Spawned enemies roll the approved `5` AI personalities through tested weighting rules
- The logic tests cover blueprint validity and at least one clear behavior contrast between personalities
- README and project docs reflect the new runtime rules

## Next Owner

- Game Developer
