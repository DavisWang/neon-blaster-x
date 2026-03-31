# Neon Blaster X V1 Todo

## Plan

- [x] Load workspace instructions and the Pwner Studios harness inputs.
- [x] Normalize the brief into a tracked project loop.
- [x] Build the browser-first v1 prototype.
- [x] Verify the build with logic tests and browser checks.
- [x] Record release notes, risks, and future directions.

## Docs + Comments Sync

- [x] Re-read the current runtime and tests to identify stale behavior notes.
- [x] Update the README and project docs so they match the shipped behavior.
- [x] Add targeted source comments for non-obvious runtime contracts.
- [x] Re-run validation before pushing the doc-sync pass.

## Correction Round: Player Death Line Art

- [x] Trace the current player-loss and effects path.
- [x] Add a small line-art death animation that plays for about `2s`.
- [x] Refresh the runtime notes for the new loss presentation and re-run validation.

## Repo Infra: GitHub Pages

- [x] Check the current repo for Pages workflow/config state.
- [x] Add an Actions-based GitHub Pages deploy that publishes the playable site files only.
- [x] Push the workflow and verify the first Pages deployment.

## Correction Round: Enemy Quality Variance Pass

- [x] Refresh the existing-project intake and create the current work order for the mixed-quality enemy pass.
- [x] Let enemy ships roll non-cockpit block qualities at base quality plus or minus `1` while keeping mirrored block pairs matched.
- [x] Add deterministic regression coverage for bounded quality variance and mirrored-quality preservation.
- [x] Refresh only the request-affected runtime docs and change tracking.
- [x] Re-run targeted validation for the enemy-quality pass.

## Repo Push Prep

- [x] Audit local-only artifacts and decide what belongs in the first remote push.
- [x] Add repo hygiene for the first push and keep the harness entrypoint tracked.
- [x] Initialize git on `main`, add the GitHub remote, and verify the repo is ready to push.

## Correction Round: Enemy Archetypes + AI Personalities

- [x] Refresh the harness overlay for this repo's existing-project state and scope the enemy feature pass.
- [x] Replace the old scout / brawler / sniper enemy generator with the approved `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` archetypes.
- [x] Implement the `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker` AI profiles plus the approved archetype-to-profile weighting.
- [x] Add deterministic tests for blueprint validity, AI weighting, and profile behavior differences.
- [x] Refresh README and project docs so the runtime roster and enemy behavior rules are documented.
- [x] Re-run validation after the enemy-system rewrite.

## Correction Round: Early Difficulty Ramp

- [x] Trace the current early-run pressure across spawn cadence, active cap, archetype progression, and AI weighting.
- [x] Introduce a shared enemy difficulty director that ramps off both elapsed time and kills.
- [x] Bias early personality weights toward `Passive` and `Cautious` while preserving the approved late-game mix.
- [x] Slow the opening spawn cadence and hold the early active cap below the late-game maximum so players can build up.
- [x] Add deterministic tests and refresh docs for the new early-game ramp.
- [x] Re-run validation after the difficulty-tuning pass.

## Correction Round: Passive Opening + Offscreen Spawns

- [x] Raise the start-of-run AI mix to roughly `80% Passive` across archetypes, then keep the interpolation down toward the approved late-game mix.
- [x] Make enemy spawn points land outside the visible browser viewport instead of using a generic radial spawn.
- [x] Add regressions and refresh docs for the stronger early calmness and offscreen-entry rule.
- [x] Re-run validation after the spawn + AI tuning pass.

## Correction Round: Modular Enemy Fleet Expansion

- [x] Replace the one-blueprint-per-archetype enemy roster with roughly `20-30` distinct legal ship designs that still read as `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture`.
- [x] Increase enemy blaster density so weapon salvage becomes a common reward instead of a rare drop.
- [x] Add deterministic coverage for expanded roster size, legal builds, and blaster density.
- [x] Refresh the harness/project docs for the widened enemy fleet.
- [x] Re-run validation after the roster-expansion pass.

## Correction Round: Enemy Fleet Diversity Pass

- [x] Rework the `25` enemy designs so the variation inside each archetype is materially larger, not just new gun placements on similar hulls.
- [x] Introduce stronger footprint swings plus some deliberately weak-yaw, weak-thrust, and low-offense variants while keeping every ship buildable.
- [x] Add hollow `Fortress` variants that preserve a large outer outline with an emptier interior.
- [x] Update regression coverage for footprint spread, hollow fortresses, and low-mobility / low-offense ships without losing the blaster-rich salvage pool.
- [x] Refresh the harness/project docs for the diversity pass and regenerate the review gallery from the live roster.

## Correction Round: Offscreen Pressure Stall

- [x] Trace why the diversity pass made runs feel empty even though enemies were technically alive.
- [x] Stop far-offscreen enemies from consuming the visible-pressure cap by counting only nearby threats toward spawn pressure.
- [x] Refill the spawn timer faster when no current enemy has actually reached the viewport pressure window.
- [x] Add deterministic coverage for the pressure-window and refill behavior.

## Correction Round: Soft-Majority AI Revamp

- [x] Replace the old combat-capable `Passive` bucket with `Punching Bag`, `Slow Reacting`, and `Won't Attack First`.
- [x] Add provocation / retaliation state so some ships genuinely ignore the player until hit and some fail to retaliate at all.
- [x] Relax early-game sparsity so difficulty comes more from personality mix than from a nearly empty map.
- [x] Update deterministic coverage for soft-personality majority, provocation, and behavior contrast against the hostile profiles.
- [x] Refresh the harness/docs overlay for the new AI model.

## Correction Round: Population + Idle Patrol Pass

- [x] Raise visible enemy pressure slightly so the opening no longer feels under-populated.
- [x] Give the soft personalities explicit idle patrol behavior so docile ships keep moving through player space instead of stalling.
- [x] Add deterministic coverage for the denser director and soft-idle movement.
- [x] Generate a review-only PNG for `10` proposed small early-game ship candidates without enabling them in gameplay yet.
- [x] Refresh runtime docs, the change log, and lessons for this tuning pass.

## Correction Round: Approved Small Ship Additions

- [x] Promote the approved `Dart`, `Ward`, `Skiff`, and `Fan` designs into the live enemy roster.
- [x] Ship `Ward` without the proposed shield so it stays a bare compact guard frame.
- [x] Add deterministic coverage for the larger `29`-ship roster, the new unlock counts, and the compact-footprint contract for the approved small variants.
- [x] Refresh runtime docs and change tracking for the live roster increase.

## Correction Round: Medium AI Counterpunch Rollback

- [x] Make provoked `Slow Reacting` and `Won't Attack First` ships retaliate consistently instead of often absorbing hits without response.
- [x] Shorten the slow-profile target-acquire delay so counterattacks begin soon enough to matter.
- [x] Reduce `Punching Bag` frequency and move that weight mostly into `Cautious` and `Opportunist`.
- [x] Update deterministic AI-weight and provocation coverage for the stronger counterpunch behavior.
- [x] Refresh runtime docs and change tracking for the medium rollback.

## Correction Round: Four-Archetype Fleet Refresh

- [x] Remove the `Vulture` archetype from the live roster and move to a `4`-archetype fleet.
- [x] Replace the live enemy pool with the approved `28`-design lineup: `7` ships each for `Needle`, `Bulwark`, `Manta`, and `Fortress`.
- [x] Add per-design unlock levels so compact `Needle`, `Bulwark`, and `Manta` frames dominate the early game before larger fortress hulls arrive.
- [x] Bring the shipped movement mix back in line with the approved quotas by limiting low-yaw and low-thrust designs in actual live metrics, not just labels.
- [x] Refresh the runtime docs, harness overlay, and fleet artifacts for the new lineup.

## Correction Round: Late AI Weight + Rainbow Quality Pass

- [x] Change `Won't Attack First` so it refuses to open on the player rather than refusing unprovoked combat entirely.
- [x] Rebalance the late-game AI tables so the three soft personalities sum to roughly `45%` per archetype while preserving the archetype skews inside the soft and hard groups.
- [x] Extend enemy quality progression so very late ships can spawn with `rainbow` parts.
- [x] Update deterministic coverage and runtime docs for the new target rule, late-game distribution, and rainbow enemy quality.

## Correction Round: Builder + Cockpit Pass

- [x] Replace text-only builder block buttons with visual block previews.
- [x] Fix block art orientation for blasters, thrusters, and shields.
- [x] Fix socket-based attachment so loose blocks can mount to open attachable sides.
- [x] Make builder previews follow the selected quality color and keep rainbow previews animated.
- [x] Change the default player ship to cockpit-only and keep all four cockpit sockets attachable.
- [x] Render cockpit mini thruster housings on port/starboard/stern edges and drive movement with built-in thrust.
- [x] Change builder copy from `Ship Palette` to `Ship Builder` and remove the clipped builder HUD hint.
- [x] Re-run automated checks and capture a fresh builder verification image.

## Correction Round: Side Thruster Turning

- [x] Reproduce the side-mounted thruster yaw gap from the `A` / `D` turn path.
- [x] Patch mounted port/starboard thrusters so they can contribute yaw even on the ship centerline.
- [x] Re-run automated checks for side-thruster turning coverage.

## Correction Round: Cockpit Side Capabilities

- [x] Trace cockpit built-in systems to the actual open/occupied sides around the cockpit.
- [x] Disable the matching built-in thruster or blaster when a block occupies that cockpit side.
- [x] Re-run validation for cockpit-capability removal and mirrored UI behavior.

## Correction Round: Builder Clarity + Hull Variants

- [x] Fix the dual blaster art so it actually renders two barrels instead of three.
- [x] Rewrite the builder notes so they explain sockets and controls in plain language.
- [x] Add `1x2` and `1x3` hull variants to the palette and ship model.
- [x] Re-run validation and capture a quick builder check for the new hull variants.

## Correction Round: Collision + Snap + Thrust

- [x] Introduce ship collision response against salvageable loose blocks.
- [x] Let `R` switch between valid snap orientations when multiple sockets share the same placement cell.
- [x] Increase thrust across cockpit and mounted thrusters so ships accelerate and rotate faster.
- [x] Re-run validation for loose-block collisions, snap selection, and higher thrust.

## Correction Round: Snap-In-Place + Branch Detach

- [x] Keep `R`-rotation anchored to the current snap cell when that cell supports multiple orientations.
- [x] Confirm detached branches follow the same cockpit-connectivity rule as destroyed branches.
- [x] Re-run validation for the snap-in-place rule and manual detach regression.

## Correction Round: Drag + Damage + Tuning Pass

- [x] Add drag-to-detach for mounted builder parts while keeping right-click detach available.
- [x] Increase the mounted-part detach hit target without weakening projectile hit accuracy.
- [x] Fix snapped drag previews so they inherit the ship's current rotation and render offset correctly.
- [x] Make actively dragged loose parts collide without impeding ship flight.
- [x] Allow special self-hit / friendly-fire cases where a ship's own bullet can hit it after a short grace window.
- [x] Let salvageable loose parts take bullet and collision damage, including destruction when their HP reaches zero.
- [x] Add the `X` motif to multi-cell hull visuals.
- [x] Retune thrust and durability curves: stronger thrusters, diminishing thrust gains by quality, and much tougher high-quality blocks.
- [x] Sync rainbow block pulse/glow timing across all rainbow parts.
- [x] Expand code and repo documentation to cover this round and the prior correction rounds.
- [x] Re-run automated validation and a focused browser sanity pass.

## Correction Round: Shield Reflection + Ship-Death Salvage

- [x] Fix shield collisions so reflected projectiles stay alive instead of disappearing on contact.
- [x] Make ship-destruction salvage drops honor remaining HP so only still-intact attached blocks become salvage.
- [x] Add regression coverage for the shared ship-death salvage filter and update docs for the new combat rules.

## Correction Round: Builder Detach + COM Physics

- [x] Fix builder drag-detach so a loose block from the previous detach cannot steal the next mounted-part drag.
- [x] Make forward thrust torque use center-of-mass physics so asymmetric ships can yaw under acceleration.
- [x] Update the default test ship to match the attached screenshot layout closely enough for asymmetry testing.
- [x] Re-run automated validation and refresh the docs for the new builder/physics behavior.

## Correction Round: Default Blueprint Reset

- [x] Restore the shared default/load/reset blueprint to cockpit-only.
- [x] Keep the asymmetric thrust regression, but decouple it from default builder state.
- [x] Re-run automated validation and update docs to match the restored cockpit-only default.

## Correction Round: Builder-Only Default Seed

- [x] Add a builder-only seed blueprint that matches the new screenshot reference more closely.
- [x] Keep the shared run/reset default cockpit-only and leave reset-button behavior unchanged.
- [x] Add regression coverage for the builder seed blueprint and refresh docs for the split-default behavior.

## Correction Round: FFA + Salvage Yield

- [x] Increase ship-destruction salvage yield so surviving attached blocks drop with healthier salvage HP.
- [x] Make combat free-for-all by letting enemies target the nearest other alive ship instead of only the player.
- [x] Add ship-ship collisions for enemy-enemy pairs, not just player-enemy pairs.
- [x] Re-run automated validation and document the new combat/salvage rules.

## Correction Round: Builder Rainbow Test Seed

- [x] Replace the old screenshot-inspired builder seed with a compact rainbow speed-test ship.
- [x] Keep the shared run/reset default cockpit-only and leave reset-button behavior unchanged.
- [x] Re-run automated validation and refresh the builder-seed documentation.

## Correction Round: Salvage Survivability Investigation

- [x] Trace the full ship-death salvage path, including immediate post-drop bullet and collision damage.
- [x] Raise death-drop survivability with a stronger HP floor, outward eject impulse, and a short damage-grace window.
- [x] Add regression coverage for the upgraded floor and eject behavior, then refresh the salvage documentation.

## Correction Round: Salvage Persistence Pass

- [x] Audit all non-damage loose-salvage cleanup paths after the survivability pass.
- [x] Remove the generic player-distance despawn for loose salvage and retune death-drop motion/grace around that rule.
- [x] Refresh the runtime notes so salvage persistence is documented explicitly.

## Correction Round: Persistent Death-Drop Loot

- [x] Separate ship-destruction salvage from ordinary loose scrap in the runtime rules.
- [x] Make ship-death drops persist as collectible loot instead of taking ordinary loose-world damage.
- [x] Retune ship-contact response so persistent loot stays nearby instead of getting launched away.

## Correction Round: Combat + Pickup Fallout Fix

- [x] Stop persistent death-drop loot from intercepting bullets and shield reflections.
- [x] Require a real drag before run-mode salvage can auto-attach to the ship.
- [x] Draw persistent loot above ships so nearby collectible parts stay visible.

## Correction Round: Loot Selection + Pace Tuning

- [x] Make overlapping loot pickup follow visible top-most order instead of stale insertion order.
- [x] Reduce enemy pressure by lowering active cap, auto-start enemy count, and reinforcement pacing.
- [x] Refresh the runtime notes for the calmer test loop and top-most loot selection.

## Correction Round: Loose Re-Selection Regression

- [x] Rework loose-block pickup to prefer the closest hit first, then use visual stack order only as a tiebreaker.
- [x] Add a regression covering the "drag X, then try to drag Y" overlap case.
- [x] Re-run automated validation after the selector change.

## Correction Round: Ship FX Quality Readability

## Correction Round: Blaster Damage Scaling Pass

- [x] Translate the approved review table into a shippable quality-matchup model instead of only raw same-tier HP scaling.
- [x] Flatten same-tier `Hull 1x1` durability to the new `7`-hit baseline across qualities.
- [x] Make `Hull 1x2`, `Hull 1x3`, blasters, thrusters, shields, and cockpit durability line up with the approved relative targets.
- [x] Add deterministic coverage for the shipped cross-quality hit matrix and the new special-case durability targets.
- [x] Refresh runtime notes for the shipped combat-balance pass.

## Correction Round: Empty-Map Mid-Run Fix

- [x] Trace why long runs can still end up with no visible enemies after enough kills.
- [x] Recycle enemies that drift far outside player space before they can keep consuming the alive-enemy budget.
- [x] Add deterministic coverage for the distant-enemy recycle path and the unblocked spawn refill.
- [x] Refresh runtime notes for the recycled-straggler rule.

## Correction Round: Visible Cap + Collision Precision Pass

- [x] Cap active nearby enemy pressure at `3` other ships.
- [x] Tighten ship-ship collision separation so clipped enemies resolve by overlap depth instead of a fixed shove.
- [x] Add deterministic coverage for the visible cap and the collision-overlap helper.
- [x] Refresh runtime notes for the new pressure/collision rules.

- [x] Replace the subtle single-pass ship glow scaling with explicit `high` / `medium` / `low` ship FX profiles.
- [x] Apply the shared quality profile to block halos plus cockpit detail lines so the visual difference is obvious in motion.
- [x] Add regression coverage for distinct ship FX profiles and re-run automated validation.

## Correction Round: Cockpit Weapon Ownership + AI Reaction Speed

- [x] Remove the built-in cockpit blaster from enemy ships while keeping the player cockpit gun available.
- [x] Lock the player cockpit built-in gun to red-tier quality in regression coverage.
- [x] Add personality-scaled steering reaction speed so `Passive` tracks moving targets more slowly than `Aggressive` and `Berserker`.
- [x] Refresh harness-facing docs and re-run automated validation.

## Correction Round: Detached Block Projectile Grace

- [x] Stop freshly detached loose blocks from immediately intercepting the firing ship's shots.
- [x] Route the loose-block projectile predicate through a shared helper and add a regression for detach grace.
- [x] Re-run automated validation after the detach-shot fix.

## Scope Guardrails

- Keep the build browser-first and dependency-light.
- Ship the core fantasy: top-down combat plus real-time salvage attachment.
- Favor a playable, testable v1 over full feature completeness.
- Defer multi-cell hull parts, audio, and richer enemy taxonomy unless they fall out naturally.

## Review

- Browser evidence captured for title, gameplay shell, and builder shell.
- `npm test` passed.
- Manual end-to-end playtest of live salvage attachment and retry flow is still the main remaining gap before approval.

## Review: Correction Round

- Model and render layers now agree on a cockpit-only default ship with built-in stern/side thrust.
- `npm test` passed with the updated cockpit-only starter ship assertions.
- Browser verification passed on `http://127.0.0.1:4201/builder.html`; the only console noise was a missing `favicon.ico` 404.

## Review: Side Thruster Turning

- Mounted port/starboard thrusters now activate on `A` / `D` turns even when their raw centerline torque arm is zero.
- `npm test` passed with the new side-thruster yaw regression.

## Review: Cockpit Side Capabilities

- Built-in cockpit systems now exist only on open cockpit sides, so attaching directly to the cockpit removes the matching blaster or mini-thruster capability.
- `npm test` passed with the new cockpit-side capability regression.
- Browser verification passed on `http://127.0.0.1:4201/builder.html`; dragging a hull onto the cockpit front increased the HUD to `Blocks 2` and removed the built-in front blaster visual.

## Review: Builder Clarity + Hull Variants

- The dual blaster preview now renders two barrels instead of a center barrel plus a pair.
- Builder notes now explain sockets, long-hull behavior, rotation, and detaching in plain language.
- `1x2` and `1x3` hulls now exist as real multi-cell build pieces with footprint-aware sockets and collision checks.
- `npm test` passed with new long-hull coverage, and browser verification on `http://127.0.0.1:4201/builder.html` showed the updated notes, `Hull 1x1 / 1x2 / 1x3` entries, and the corrected dual blaster preview.

## Review: Collision + Snap + Thrust

- Loose salvage blocks now collide with ships and get pushed clear instead of ghosting through them.
- Snap selection now prefers the current rotated orientation when multiple valid sockets share the same snap location.
- Cockpit and mounted thrusters both got a global thrust increase for faster acceleration and rotation.

## Review: Ship FX Quality Readability

- The `Q` toggle now changes actual ship render passes instead of only scaling one subtle blur value.
- `High` renders a strong two-pass halo, `Medium` renders a lighter single halo, and `Low` renders crisp no-glow ship lines.
- `node --check src/main.js`, `node --check src/ship.js`, and `npm test` all passed.
- Follow-up tuning reduced the effect substantially: all ship strokes now stay the same width, `High` is only a subtle halo, `Medium` is barely-there glow, and `Low` remains no-glow.
- Second follow-up fixed the real damping bug: halo strength and halo radius are now decoupled, so `High` and `Medium` can differ visibly without thickening the ship geometry.
- Third follow-up made the quality toggle visibly separable by adding per-block ship aura gradients: `High` gets the strongest aura, `Medium` a smaller lighter aura, and `Low` none.

## Review: Cockpit Weapon Ownership + AI Reaction Speed

- Enemy cockpits no longer get the player's built-in blaster, so enemy firepower now comes only from mounted weapon blocks.
- The player cockpit built-in blaster remains explicitly red-tier.
- AI steering now follows a personality-scaled tracked target point, so passive enemies lag movement changes while aggressive personalities correct much faster.
- `npm test` passed with a new snap-selection regression; this round did not include a full manual in-browser collision playtest.

## Review: Snap-In-Place + Branch Detach

- `R` now stays anchored to the current snap cell when that cell supports multiple valid orientations instead of jumping to a different socket.
- Disconnect checks now follow valid attachment boundaries rather than raw cell adjacency, so a manually detached branch cannot stay “connected” just because a thruster, shield, or blaster is touching another hull on the wrong side.
- `npm test` passed with new regressions for same-cell snap rotation, non-attachable-side false connections, and valid alternate hull paths.

## Review: Drag + Damage + Tuning Pass

- Builder parts can now be detached by dragging them off the ship or by right-clicking them, and mounted-part picking uses explicit padding instead of changing combat hit tests.
- Snapped drag previews now inherit the player ship angle and centered render offset, while free-drag parts resolve against ships / loose blocks instead of ghosting through them.
- Bullets can self-hit after a short grace window, loose salvage can be damaged and destroyed by bullets or collisions, and multi-cell hulls now carry the same `X` visual language as `1x1` hulls.
- Thrusters were retuned to a stronger base with diminishing quality gains, block durability now follows a stepped hit-budget curve, and rainbow blocks now pulse in sync.
- `npm test` passed with new regressions for detach pick padding, the thrust curve, and same-tier durability; browser verification on `http://127.0.0.1:4201/builder.html` was limited to a smoke pass plus a fresh viewport capture.

## Review: Shield Reflection + Ship-Death Salvage

- Shield impacts now keep the projectile alive after reflection instead of marking it as fully resolved, and the same bounce logic now applies to loose shield salvage.
- Cockpit destruction now drops only attached non-cockpit blocks with remaining HP, which matches the salvage rule without respawning already-destroyed parts as scrap.

## Review: Builder Detach + COM Physics

- Builder drag-detach now prefers mounted parts over overlapping loose salvage, so dropping one detached block near the ship no longer traps the next detach gesture on that same loose block.
- Force-induced torque now resolves around the actual center of mass, which means asymmetric ships no longer accelerate as if they were perfectly balanced around the cockpit.
- The default test ship now matches the attached screenshot's broad asymmetry: twin yellow side spines, two right-side green vertical hull segments, and green lower thrusters.

## Review: Default Blueprint Reset

- Shared default state is cockpit-only again, which means fresh starts and builder reset both return to just the cockpit.
- The center-of-mass thrust behavior remains covered, but it now lives in an explicit asymmetric-ship regression instead of the default starter layout.

## Review: Builder-Only Default Seed

- The first builder entry now seeds a symmetric purple reference ship, while the run/start default and reset button still resolve to cockpit-only.
- The builder seed no longer depends on the shared default blueprint, so follow-on corrections to reset/start behavior are isolated from builder-specific test rigs.

## Review: FFA + Salvage Yield

- Ship-destruction salvage now floors surviving block HP upward before converting the blocks into loose scrap, which materially raises the chance that a destroyed ship leaves collectible salvage behind.
- Enemy AI now picks the nearest other alive ship, so runs behave more like free-for-all combat instead of enemies always collapsing onto the player.
- Ship collision handling now iterates over every alive ship pair, which means enemy ships can collide with and damage each other too.

## Review: Builder Rainbow Test Seed

- The first builder entry now opens on a compact rainbow loadout built for fast testing: dual forward blasters, triple rear thrust, double side hulls, and flank shields.
- Shared start behavior and the builder `Reset` button still resolve to the cockpit-only blueprint, so the test rig does not leak into the real default flow.

## Review: Salvage Survivability Investigation

- The old fix only guaranteed that attached blocks with `hp > 0` spawned as salvage. It did not protect them from the first few frames after the drop, which is where close-range kills were still deleting most of the loot.
- At ordinary combat speeds, loose-block collision damage was already landing around `1.04` to `2.08` HP per frame before repeated frames or bullet follow-through, so half-HP death drops could still disappear almost instantly.
- Ship-death salvage now spawns with a much stronger HP floor, gets thrown outward from the wreck, and ignores immediate bullet / collision damage briefly so the drop can actually become usable salvage.

## Review: Salvage Persistence Pass

- There was still a completely separate non-damage removal path: loose salvage was being filtered out purely by distance from the player, which explains why drops could survive combat and then vanish anyway.
- Loose salvage now stays in the world until it is collected or actually destroyed, and the death-drop eject/grace tuning was softened around that new persistence rule so the loot remains reachable.

## Review: Persistent Death-Drop Loot

- The remaining issue was that ordinary loose-world damage rules were still hostile to the core reward loop. Even after fixing despawn, ship-death drops could still be chipped away like generic debris before pickup.
- Ship-destruction salvage is now treated as persistent collectible loot while loose, and ship-contact response is softer for those drops so they remain usable after a kill.

## Review: Combat + Pickup Fallout Fix

- Persistent death-drop loot was still sitting in the loose-block bullet path, which meant combat shots could disappear into collectible salvage and shield drops could create visual reflection storms.
- Run-mode pickup also treated a click as a full drag-drop cycle, so nearby salvage could auto-attach on pointer-up without an intentional drag.
- Persistent loot now stays out of the projectile hit path, click-only pickup no longer attaches it, and collectible drops render above ships so they do not feel like random parts appearing from nowhere.

## Review: Loot Selection + Pace Tuning

- Loot pickup now follows the same top-most ordering the player sees on screen, which reduces the “grabbed the wrong block” problem when salvage overlaps.
- Enemy pressure is lower during test runs: fewer immediate enemies, fewer concurrent enemies, and slower reinforcement cadence so there is time to inspect loot behavior.

## Review: Loose Re-Selection Regression

- Top-most-only selection was still too blunt: a previously moved block could keep winning pickup just because it was later in the array, even when the cursor was clearly closer to another overlapping block.
- Loose pickup now prefers the nearest valid hit first and only falls back to stack order when the hit distances tie, and the new regression locks that behavior in.

## Review: Detached Block Projectile Grace

- Freshly detached loose parts were still eligible for projectile hits on the very next frame, so the firing ship's blaster could dump invisible shots straight into the block sitting beside the muzzle.
- Detached loose parts now get a short projectile grace window through the shared loose-block bullet predicate, and the new regression locks that behavior in.

## Review: Shared Drag/Drop Alignment

- The latest drag-to-detach failure was not a builder-only issue. Run mode and builder mode were both flowing through the same drop-finalization branch, but detached drags were still using a source type that the shared drop logic could discard.
- Drop resolution is now centralized behind one shared resolver so detached drags and ordinary loose drags stay in alignment across both modes, and the regression covers the exact detached-without-snap case that previously slipped through.

## Review: Weighted Ship Mass + Thrust Tuning

- The old movement model treated every occupied cell as the same weight, which made blasters, shields, and thrusters slow ships down just as much as hull despite the design goal that hull should dominate speed-affecting mass.
- Ship mass, center of mass, and inertia now use weighted cells so hull and cockpit stay full weight while blasters, shields, and thrusters count as `25%`, and mounted thrusters plus the cockpit forward/reverse built-ins were raised in the same pass so acceleration improves without breaking asymmetric physics.

## Review: Builder vs Gameplay Ship-Edit Alignment

- Drag-to-attach was already shared, but mounted-part pointer handling still diverged: builder mode allowed detach-drag and right-click detach while gameplay skipped that branch entirely.
- Mounted-part canvas interactions now resolve through one shared run/builder helper, so left-drag detach, right-click detach, mounted-vs-loose priority, and loose pickup fallback stay aligned across both modes. Intentional differences remain builder-only: palette spawning, reset, and builder HUD affordances.

## Review: Run Start + Salvage Damage + Cockpit Regen

- Run starts were still inheriting the last saved player blueprint, which made "new game" behavior depend on prior builder edits instead of always starting from the bare cockpit.
- Default run starts now resolve to the cockpit-only blueprint, while explicit builder launches still use the edited ship.
- Ship-death salvage keeps its short spawn grace, but once that grace ends it can again be damaged and destroyed by bullets or collisions.
- Cockpits now regenerate on a fixed `120s` full-refill slope, which is slow enough to matter between fights without overpowering live combat.

## Review: Game Over Delay + Attachment HP Persistence

- The loss panel was still tied directly to the player-death frame, so the game-over screen appeared immediately instead of leaving a short aftermath beat.
- Gameplay now enters a `3s` pending-loss phase before flipping `gameOver`, which delays the panel without changing the actual loss condition.
- Reattached salvage no longer rematerializes at factory HP. Loose `hp/maxHp` now carry through attachment so damaged parts stay damaged after mounting back onto the ship.

## Review: Enemy Archetypes + AI Personalities

- The old enemy system still collapsed multiple threats into a tiny generic template pool plus one shared pursuit rule, so fights lacked readable ship identity even when the salvage loop itself was working.
- Enemy generation now uses the approved `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` archetypes, and each blueprint is built through the live socket / attachment rules rather than by hand-waving a silhouette.
- Runtime AI now layers weighted `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker` personalities on top of those archetypes instead of using one universal chase-and-fire behavior.
- `npm test` passed with new regressions covering blueprint validity, the closed `Fortress` hull ring, early archetype gating, approved AI weighting, opportunist target choice, and passive-vs-berserker behavior contrast.
- `node --check src/main.js` and `node --check src/ship.js` both passed after the enemy-system rewrite.

## Review: Early Difficulty Ramp

- The opening run pressure was still front-loaded because spawn timing, active-cap pressure, and AI aggression were all effectively static once the archetype rewrite landed.
- Enemy pacing now runs through one shared director keyed off elapsed time plus kills, so the first part of a run usually presents one slower-spawning, passive-leaning enemy at a time before widening toward the fuller mid/late-game mix.
- The same director now controls archetype progression level, AI aggression interpolation, spawn cadence, and the active enemy cap, which keeps the difficulty ramp coherent instead of tuning each lever in isolation.
- `npm test` passed with new regressions covering the combined progression curve, the early passive-weight bias, and the existing archetype/AI behavior coverage.
- `node --check src/main.js` and `node --check src/ship.js` both passed after the difficulty-tuning pass.

## Review: Passive Opening + Offscreen Spawns

- The earlier difficulty pass still left too much opening threat because the passive bias was not strong enough and enemies could appear within the visible playfield.
- Start-of-run AI weighting now begins at roughly `80% Passive` for every archetype, then scales down through the shared progression curve toward the approved late-game behavior mix.
- Enemy entry now uses viewport-aware offscreen spawning, which makes first contact read as an arrival from outside the screen rather than a pop-in near the player.
- `npm test` passed with new regressions covering the stronger passive opening weights and the offscreen spawn helper.
- `node --check src/main.js` and `node --check src/ship.js` both passed after the passive-opening and spawn-placement pass.

## Review: Modular Enemy Fleet Expansion

- The runtime was still only expressing `5` concrete enemy blueprints, which undercut the modular-build fantasy even after the archetype and AI work landed.
- Enemy generation now expands those `5` archetypes into `25` distinct legal ship designs, chosen within archetype-weighted spawn logic so the roster feels broader without losing identity.
- The expanded pool is much more blaster-heavy, which should materially improve blaster salvage frequency during ordinary combat instead of forcing the player to wait for rare weapon-bearing wrecks.
- `npm test` passed with new regressions covering the `25`-design roster, full-pool build validity, unlock counts by level, and higher blaster density.
- `node --check src/main.js` and `node --check src/ship.js` both passed after the modular-fleet expansion pass.
- The first `25`-design fleet pass still clustered too tightly within each archetype, so ships often read like minor gun swaps instead of genuinely different frames.
- The diversity pass now creates wider size swings inside each archetype, keeps some intentionally weak-yaw / weak-thrust / low-offense ships in the pool, and adds hollow `Fortress` outlines while preserving legal build generation.

## Review: Four-Archetype Fleet Refresh

- The live roster still carried the old `Vulture` family and too many one-thruster or zero-yaw ships, which undercut both the approved proposal and the maneuverability audit.
- The shipped roster now uses `Needle`, `Bulwark`, `Manta`, and `Fortress` only, with `28` legal designs total and `7` designs per archetype.
- Enemy availability now respects per-design unlock levels, so level `1` runs draw from the smaller starter frames while larger `Fortress` hulls come online later.
- The actual live mobility mix now lands on `6` low-thrust ships, `3` zero-yaw ships, and `9` tagged high-mobility ships instead of just claiming those quotas in proposal artifacts.
- `node --test tests/ship.test.js`, `node --check src/ship.js`, and `npm test` all passed after the fleet refresh.

## Review: Late AI Weight + Rainbow Quality Pass

- `Won't Attack First` was still suppressing all unprovoked combat, which made some enemy faceoffs look broken instead of merely soft.
- That profile now only refuses to attack the player first; it can still pick enemy targets before the player gets involved and still retaliates normally when provoked.
- The late-game AI tables now reduce the combined soft share to about `45%` per archetype while preserving each archetype's existing skew toward `Cautious`, `Opportunist`, or `Aggressive` follow-through.
- Enemy quality progression now includes `rainbow`, so very late ships can spawn at the top visual/stat tier.
- `npm test`, `node --check src/ship.js`, and `node --check src/main.js` all passed after this pass.
- `npm test` passed with new regressions covering footprint spread, hollow fortress occupancy gaps, low-mobility ships, and the still-blaster-rich salvage pool.
- `node --check src/ship.js`, `node --check src/main.js`, and `node --check tests/ship.test.js` all passed after the diversity pass.
- The diversity pass also exposed a spawn-pressure bug: slow passive enemies could stay offscreen but still fill the early active cap, leaving the player with nothing visible to fight.
- Enemy spawning now counts only ships near the current viewport toward pressure, and the refill timer accelerates when no enemy has reached that pressure window yet.
- `npm test` passed with new regressions covering the offscreen-pressure window and faster no-pressure refill path.
- The previous `Passive` AI was still too combat-capable, so the game stayed punishing even when the roster mix technically skewed soft.
- The AI model now uses a `~70%` soft majority across `Punching Bag`, `Slow Reacting`, and `Won't Attack First`, plus explicit provocation / retaliation state so docile enemies can actually ignore the player or fail to counterattack.
- Early progression is no longer kept mainly calm through an empty map: the spawn director now starts more populated, while survivability comes from the softer personality mix instead.
- `npm test` passed with new regressions covering the updated weight tables, the more populated early director, punching-bag harmlessness, slow-reacting target lag, and won't-attack-first provocation behavior.

## Review: Population + Idle Patrol Pass

- Visible enemy pressure now opens slightly denser, with the shared director ramping from `3` nearby enemies to the `4`-enemy late-game cap instead of holding the opener at `2`.
- Soft personalities now generate idle patrol targets around player space, which keeps docile ships moving through the arena without making them more eager to attack.
- `npm test` passed with new regressions for the denser director, smaller offscreen spawn margin, faster no-pressure refill, and non-stationary idle plans for soft ships.
- Proposal-only review artifact generated: [enemy-small-candidates-review.png](/Users/davis.wang/Documents/neon-blaster-x/output/enemy-small-candidates-review.png) from [render_small_enemy_candidates.mjs](/Users/davis.wang/Documents/neon-blaster-x/scripts/render_small_enemy_candidates.mjs).

## Review: Approved Small Ship Additions

- The live enemy roster now includes `needle-dart`, `bulwark-ward`, `manta-skiff`, and `manta-fan`, bringing the total pool to `29` legal ships.
- Those approved additions stay compact in regression coverage: `Dart` is `1x5`, while `Ward`, `Skiff`, and `Fan` all stay within `3x3` footprints.
- `Ward` shipped without the proposed shield, so the runtime version remains a stripped-down compact guard instead of a mini shield-barge.
- `npm test` passed with updated roster-count and level-unlock coverage after the new ships were added.

## Review: Medium AI Counterpunch Rollback

- The soft AI pass had gone too far: provoked ships often still felt inert because `Slow Reacting` could fail retaliation and then waited too long to become combat-ready.
- `Slow Reacting` now always retaliates and starts its counterattack faster, while `Won't Attack First` now also retaliates reliably once provoked.
- `Punching Bag` is still present as the safest salvage profile, but its spawn share is materially lower and that weight now mostly reinforces `Cautious` / `Opportunist` ships.
- `npm test` passed with updated AI-weight expectations plus a dedicated regression that `Slow Reacting` now enters retaliation state reliably.

## Review: Cockpit Survival Buff

- Early-game survivability was still too fragile because the bare cockpit start did not have enough built-in acceleration to create real disengage space before the player found salvage.
- The cockpit's built-in forward and reverse thrust were both raised sharply so cockpit-only starts and stripped-down rebuild states remain mobile without changing the general mounted-thruster curve.
- The cockpit's built-in turn torque is now raised in the same targeted pass so cockpit-only ships can also break angle and evade more aggressively, rather than only accelerating faster in a straight line.

## Review: Blaster Range Curve

- Projectile range was still effectively too flat because every blaster shared the same base lifetime, so grey and cockpit shots were traveling far beyond the intended early-game space.
- Projectile visuals now render as short streaks instead of glowing balls, which makes direction and speed easier to read in live combat.
- Blaster range now follows an explicit effective-range curve: grey lands around the old red reach, rainbow lands around the old green reach, and the intervening qualities interpolate between those endpoints.
- Projectile speed now follows the same pattern: grey and cockpit shots are much slower, and higher-quality blasters climb back up by tier instead of every weapon feeling equally fast.
- Blaster cadence now follows an explicit quality cooldown curve too, so cockpit and grey weapons fire much more slowly while higher tiers earn faster follow-up shots instead of all qualities sharing roughly the same shots-per-second feel.

## Review: Visual Quality Toggle

- Ship glow was previously hard-coded at one quality level, which made it impossible to trade prettiness for frame rate when many ships or effects were on screen.
- Pressing `Q` now cycles `High`, `Medium`, and `Low` ship-visual quality. `High` preserves the current glow-heavy look, `Medium` reduces ship glow substantially, and `Low` disables ship glow entirely while leaving gameplay unchanged.

## Review: Docs + Comments Sync

- Re-read the current runtime plus the live regression suite and corrected the docs where they had drifted from behavior, especially around overlapping-loot pickup precedence, cockpit regen, delayed loss flow, the `Q` visual-quality toggle, and the difference between title/retry starts versus builder launches.
- Added concise source comments around the matching non-obvious helpers in `src/ship.js`, so the runtime contracts are easier for a fresh agent to trace without re-deriving them from tests.
- `npm test` passed with `69` passing tests, and `node --check src/ship.js` passed after the doc-sync pass.

## Review: Player Death Line Art

- Player cockpit death now emits a dedicated `~2s` neon line-art breakup effect during the existing pending-loss window instead of only flashing one short burst.
- The effect reuses the ship's own block silhouettes as drifting fragments, so the loss read stays in the same visual language as the rest of the game.

## Review: GitHub Pages

- Added an Actions-based Pages workflow in `.github/workflows/deploy-pages.yml` that publishes the playable static bundle instead of the whole repo tree.
- The initial workflow failed because the repository did not have a Pages site yet, so Pages was created explicitly through the GitHub API with `build_type=workflow`.
- The deployment rerun succeeded, and the live site is now reachable at [daviswang.github.io/neon-blaster-x](https://daviswang.github.io/neon-blaster-x/).

## Review: Repo Push Prep

- Local-only capture clutter is now ignored: `.DS_Store`, `.playwright-cli/`, `output/playwright/`, `node_modules/`, `dist/`, `coverage/`, and `*.log`.
- The repo now has a tracked root `AGENTS.md` that points back to the central Pwner Studios harness and frames this project as an existing-project harness run.
- Git is initialized on `main`, `origin` points at `https://github.com/DavisWang/neon-blaster-x.git`, and `npm test` passed before the first commit.
