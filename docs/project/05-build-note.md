# Build Note

- Status: `ready_for_review`
- Run command: `python3 -m http.server 4199 --bind 127.0.0.1`
- Browser target: desktop browser at [http://127.0.0.1:4199](http://127.0.0.1:4199)
- Direct smoke pages:
  - title: [http://127.0.0.1:4199/index.html](http://127.0.0.1:4199/index.html)
  - gameplay shell: [http://127.0.0.1:4199/run.html](http://127.0.0.1:4199/run.html)
  - builder shell: [http://127.0.0.1:4199/builder.html](http://127.0.0.1:4199/builder.html)
- Test command: `npm test`
- Evidence summary:
  - title screen renders with branded menu and neon background
  - gameplay shell renders with HUD, centered ship, and browser-safe canvas layout
  - builder renders with the ship palette, quality palette, drag-to-detach builder flow, and sandbox ship
- core ship/connectivity helpers pass local logic tests
- the shared start/reset default is cockpit-only again, while the first builder entry seeds a compact rainbow speed-test rig for targeted builder testing
- current combat rules are free-for-all, enemy spawns now come from five validated archetypes with weighted AI personalities, the opening difficulty ramp now keys off elapsed time plus kills so the player gets calmer early build-up space with roughly `80% Passive` AI at the start, enemies now enter from outside the visible viewport, and ship-death salvage now spawns healthier, stays persistent as collectible loot, no longer silently despawns by player distance, no longer absorbs live combat shots, and uses top-most-first pickup

## Implemented Systems

- static browser shell with title, gameplay, builder, and game-over states
- modular ship data model with cockpit, hull, blaster, thruster, and shield blocks
- cockpit-only shared default starter with open-side cockpit built-ins that disappear when the matching cockpit side is occupied
- first builder entry seeded from a compact rainbow speed-test rig, without changing reset-button behavior
- multi-cell hulls (`1x1`, `1x2`, `1x3`) with footprint-aware sockets, picking, and rendering
- quality tiers that affect durability, weapon power, thrust, and visuals
- rigid-body-like ship motion driven by mounted thrusters, with thrust torque resolved around center of mass
- enemy spawning from the validated `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` archetypes
- weighted enemy AI personalities: `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker`
- a shared enemy director that uses elapsed time plus kills to control spawn cadence, active-cap growth, archetype progression, and an early AI mix that starts around `80% Passive`
- offscreen enemy spawning based on the current browser viewport instead of a generic radial spawn around the player
- free-for-all target selection plus ship collisions across every alive ship pair, including enemy-enemy
- projectile damage, shield reflection, cockpit loss, and limited self-hit friendly fire after muzzle clear
- salvage block ejection plus drag-and-snap attachment logic, with persistent ship-death loot handling for surviving salvage
- builder detach by right-click or by dragging mounted non-cockpit parts away from the ship, with mounted parts taking priority over overlapping loose salvage on the next drag
- loose salvage collision / bullet damage and destruction

## Known Compromises

- the browser smoke pass still does not cover a full end-to-end combat and rebuild session
- combat balance moved closer to the brief but still needs live tuning against player feel
- richer procedural generation and audio remain out of scope

## Next Owner

- `Play Tester`
