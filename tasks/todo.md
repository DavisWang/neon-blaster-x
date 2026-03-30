# Neon Blaster X V1 Todo

## Plan

- [x] Load workspace instructions and the Pwner Studios harness inputs.
- [x] Normalize the brief into a tracked project loop.
- [x] Build the browser-first v1 prototype.
- [x] Verify the build with logic tests and browser checks.
- [x] Record release notes, risks, and future directions.

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

## Review: Repo Push Prep

- Local-only capture clutter is now ignored: `.DS_Store`, `.playwright-cli/`, `output/playwright/`, `node_modules/`, `dist/`, `coverage/`, and `*.log`.
- The repo now has a tracked root `AGENTS.md` that points back to the central Pwner Studios harness and frames this project as an existing-project harness run.
- Git is initialized on `main`, `origin` points at `https://github.com/DavisWang/neon-blaster-x.git`, and `npm test` passed before the first commit.
