# Session Change Log

This file captures the cumulative changes made across the iterative correction rounds after the initial v1 build.

## Correction Rounds

| Round | What changed | Main files |
| --- | --- | --- |
| Builder + Cockpit Pass | visual block buttons, corrected mounted-part art rotation, cockpit-only starter ship, built-in cockpit thrusters, animated quality previews, builder copy cleanup | `src/main.js`, `src/ship.js`, `builder.html`, `index.html`, `styles.css` |
| Side Thruster Turning | side-mounted port/starboard thrusters now contribute yaw on `A` / `D` even on the centerline | `src/ship.js`, `tests/ship.test.js` |
| Cockpit Side Capabilities | attaching directly to a cockpit side disables that built-in cockpit blaster / mini-thruster and the cockpit art mirrors the change | `src/ship.js`, `src/main.js`, `tests/ship.test.js` |
| Builder Clarity + Hull Variants | builder notes rewrite, correct dual blaster art, real `1x2` / `1x3` hull parts with footprint-aware sockets and collisions | `src/data.js`, `src/ship.js`, `src/main.js`, `builder.html`, `index.html` |
| Collision + Snap + Thrust | loose salvage collides with ships, `R` respects rotated snap preference, thrusters got a first tuning bump | `src/main.js`, `src/ship.js`, `src/data.js` |
| Snap-In-Place + Branch Detach | `R` stays on the same snap cell for ambiguous placements; detach / destruction use the same cockpit-connectivity eject rule | `src/main.js`, `src/ship.js`, `tests/ship.test.js` |
| Drag + Damage + Tuning Pass | drag-to-detach, larger detach hit target, aligned snapped preview, dragged-part collision without ship slowdown, self-hit edge cases, salvage damage/destruction, synced rainbow pulse, stronger diminishing-return thrust, tougher quality tiers | `src/main.js`, `src/ship.js`, `src/data.js`, `tests/ship.test.js`, `builder.html`, `index.html`, `README.md` |
| Shield Reflection + Ship-Death Salvage | reflected bullets now stay live after shield contact, loose shield salvage reflects too, and destroyed ships only drop attached blocks that still have remaining HP | `src/main.js`, `src/ship.js`, `tests/ship.test.js`, `README.md` |
| Builder Detach + COM Physics | builder drag-detach now prioritizes mounted parts over overlapping loose salvage, the default test rig now matches the screenshot asymmetry, and thrust torque resolves around the true center of mass | `src/main.js`, `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md` |
| Default Blueprint Reset | shared default/load/reset behavior now returns to cockpit-only, while asymmetric COM thrust remains covered by a dedicated regression instead of the default starter | `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md` |
| Builder-Only Default Seed | first builder entry now seeds a screenshot-inspired symmetric purple rig, while the shared default and reset button remain cockpit-only | `src/main.js`, `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md` |
| FFA + Salvage Yield | ship-death salvage now floors surviving block HP upward, enemies target the nearest other ship in free-for-all combat, and collisions now run across every alive ship pair | `src/main.js`, `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md` |
| Builder Rainbow Test Seed | the first builder entry now seeds a compact rainbow test ship with dual forward blasters, triple rear thrust, and flank shields, while reset still returns to cockpit-only | `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Salvage Survivability Investigation | death drops now floor much higher, eject outward from the wreck, and ignore immediate bullet / collision damage long enough to stay collectible after a close-range kill | `src/ship.js`, `src/main.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Salvage Persistence Pass | loose salvage no longer gets silently culled by player-distance cleanup, and death drops now eject less aggressively while staying protected longer | `src/main.js`, `src/ship.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Persistent Death-Drop Loot | ship-destruction salvage now stays persistent as collectible loot instead of taking ordinary loose-world damage, and ship contact no longer catapults it away as hard | `src/main.js`, `src/ship.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Combat + Pickup Fallout Fix | persistent death-drop loot no longer intercepts bullets, simple clicks no longer auto-attach nearby salvage, and persistent loot renders above ships so it stays visible | `src/main.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Loot Selection + Pace Tuning | overlapping loot now picks by visible top-most order, while enemy cap, auto-start count, and reinforcement pacing were reduced for testing | `src/main.js`, `src/data.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Enemy Archetypes + AI Personalities | replaced the old generic enemy pool with validated `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` blueprints, then layered weighted `Passive` through `Berserker` AI personalities on top of those frames | `src/ship.js`, `src/main.js`, `tests/ship.test.js`, `README.md`, `docs/project/00-existing-project-intake.md`, `docs/project/01-producer-work-order.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |
| Early Difficulty Ramp | added a shared enemy director that uses elapsed time plus kills to slow the opening spawn cadence, cap early active enemies, and bias early AI toward passive / cautious behavior before converging on the approved late-game mix | `src/ship.js`, `src/main.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md` |
| Passive Opening + Offscreen Spawns | raised the start-of-run AI mix to roughly `80% Passive` across archetypes and moved enemy entry points outside the visible browser viewport so early threats arrive later and from readable edges | `src/ship.js`, `src/main.js`, `tests/ship.test.js`, `README.md`, `docs/project/02-game-spec.md`, `docs/project/05-build-note.md`, `tasks/todo.md`, `tasks/lessons.md` |

## Runtime Rules That Changed

| Area | Current rule |
| --- | --- |
| Cockpit systems | the cockpit starts bare and only exposes built-in blaster / mini-thrusters on sides that are still open |
| Detach | manual detach and destruction both eject every component that no longer has a valid attachment path to the cockpit |
| Snap rotation | `R` rotates in place when the current snap cell supports multiple legal orientations |
| Builder detach UX | mounted non-cockpit parts can be detached by drag or by right-click |
| Drag collisions | dragged parts collide with ships and blocks, but the ship is not slowed or pushed by the dragged part |
| Friendly fire | a bullet cannot hit its own ship immediately on spawn, but it can hit the firing ship after a short grace window |
| Shield reflection | shield hits now bounce the projectile back into play instead of consuming it, for both mounted shields and loose shield salvage |
| Ship death salvage | when a cockpit dies, only attached non-cockpit blocks with `hp > 0` become loose salvage |
| Ship death salvage yield | surviving death-drop salvage gets a higher health floor and is converted into persistent collectible loot so destroyed ships produce usable scrap |
| Salvage persistence | loose salvage should remain in play until it is collected or truly destroyed, instead of being removed by a generic distance cull |
| Combat vs loot | persistent ship-death loot is collectible, but it should not intercept live projectiles or create shield-reflection spam |
| Loot pickup | when salvage overlaps, pickup should follow visible stack order rather than stale array order |
| Enemy pressure | active enemy count and spawn pacing are intentionally reduced during testing-focused tuning |
| Enemy roster | enemies now spawn from the validated `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` archetypes instead of one small generic template pool |
| Enemy personalities | each archetype now rolls a weighted AI profile from `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker` |
| Thrust physics | force-induced torque now uses the ship's center of mass, so asymmetric ships can yaw under forward or reverse thrust |
| Builder drag priority | in builder mode, mounted-part drag-detach takes precedence over overlapping loose salvage so one detached block cannot trap the next drag |
| Builder default | the first builder entry can seed a special test rig without changing the shared start/reset default; the current builder seed is a compact rainbow speed-test loadout |
| Combat targeting | enemies choose the nearest other alive ship instead of hard-locking onto the player |
| Ship collisions | collision damage and separation now apply to enemy-enemy pairs as well as player-enemy pairs |
| Salvage durability | loose salvage now takes bullet and collision damage and can be destroyed |
| Hull visuals | all hull sizes now carry the `X` motif, not just `1x1` hulls |
| Rainbow timing | rainbow blocks now share one synchronized hue / pulse phase |

## Validation Coverage Added During These Rounds

- socket-derived placement and snap-orientation regressions
- cockpit-only starter and cockpit-side capability regressions
- side-thruster yaw regression
- multi-cell hull footprint / collision regressions
- detach branch regressions, including false connections from non-attachable touching sides
- detach pick-padding regression
- thrust-curve and durability-step regressions
- enemy-archetype blueprint validity and AI-personality behavior regressions

## Remaining Verification Gap

- The automated coverage is strong on the ship model and tuning rules, but the project still needs a longer manual gameplay pass covering live combat feel, salvage under pressure, and extended builder-to-run iteration.
