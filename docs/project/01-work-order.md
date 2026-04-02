# Work Order

## Header

- Project: Neon Blaster X
- Work order ID: NBX-007
- Requester: Davis Wang
- Owner: Producer
- Project mode: Existing project
- Phase: Brownfield work order
- Active platform profile: Browser-first

## Objective

Add a builder-driven export path for exact ship layouts without destabilizing the current game. The outcome of this pass is a user-facing builder action that copies the current ship as a stable, prompt-ready `nbx-ship-design-v1` payload, so future custom enemy ships can be built in the browser and handed back without screenshot interpretation errors.

## Requested Change

Implement a builder export workflow for custom ship authoring:

- add a builder-side action that exports the exact current ship design
- standardize the export into one stable schema that preserves the real block layout
- make the exported payload easy to paste back into Codex for future enemy and boss requests
- keep the feature compatible with the current builder flow instead of requiring a separate external authoring tool

## Existing Behavior To Preserve

- Browser-first delivery and current local run/test flow
- Current builder interactions: attach, detach, rotate, reset, and launch
- Current ship blueprint semantics and block-placement rules
- Current run, combat, and spawn behavior

## In Scope

- Standardized ship-design export formatting in `src/ship.js`
- Builder sidebar export button, clipboard flow, and status messaging
- Deterministic regression coverage for the export contract
- Request-affected docs and change tracking

## Out Of Scope

- Ship-design import or round-trip editing from exported JSON
- Enemy ingestion pipelines that automatically convert exports into live enemy definitions
- Backend save slots, cloud storage, or file-based persistence
- Combat, builder physics, or roster rebalance work

## Inputs

- `docs/project/00-existing-project-intake.md`
- `README.md`
- `index.html`
- `run.html`
- `builder.html`
- `styles.css`
- `src/main.js`
- `src/ship.js`
- `tests/ship.test.js`

## Artifact Status Inputs

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/project/00-existing-project-intake.md` | `reusable` | refreshed for the builder-export request |
| `docs/project/01-work-order.md` | `reusable` | this file is the active scope-control artifact |
| `docs/project/02-game-spec.md` | `out_of_scope` | no core game rule or platform assumption is changing |
| `docs/project/05-build-note.md` | `refresh_required` | should describe the builder export utility |
| `docs/project/10-session-change-log.md` | `refresh_required` | needs the builder-export round recorded |
| `README.md` | `refresh_required` | should expose the new builder export workflow |
| `index.html` / `run.html` / `builder.html` | `refresh_required` | shared builder sidebar needs the export action |
| `styles.css` | `refresh_required` | needs status styling for the new action |
| `src/main.js` | `refresh_required` | UI wiring and clipboard behavior live here |
| `src/ship.js` | `refresh_required` | exact ship-spec formatting belongs next to blueprint serialization |
| `tests/ship.test.js` | `refresh_required` | missing export-schema coverage |

## Required Outputs

- A builder action that copies the current ship as a prompt-ready standardized export
- A stable `nbx-ship-design-v1` schema that preserves exact block layout without runtime ids
- Deterministic automated coverage for the export contract
- Updated intake/work order plus request-affected runtime docs

## Constraints

- Preserve the exact current block layout; do not export a lossy silhouette summary
- Strip runtime-only ids and keep the schema stable enough for future Codex handoff
- Keep the workflow browser-local and clipboard-first
- Do not add a second ship-authoring system outside the existing builder
- Keep the change narrowly scoped to the builder/export problem

## Escalation Boundary

The owner may decide alone:

- the exact export schema shape, as long as it preserves exact rebuildable block data
- the button wording and lightweight status messaging
- whether clipboard fallback uses a manual-copy dialog when browser permissions block automatic copy

The owner must return to the user if:

- the requested workflow requires a full import pipeline or external storage system
- the current builder cannot represent the required enemy layouts without broader system changes
- browser clipboard restrictions make a practical local export path impossible

## Done When

- the builder can copy the current ship as a standardized ship-design payload
- the exported payload preserves exact block data and omits runtime-only ids
- deterministic export coverage passes under `npm test`
- request-affected docs reflect the new workflow

## Next Owner

- Game Developer
