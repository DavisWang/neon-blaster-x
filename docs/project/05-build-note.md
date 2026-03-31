# Build Note

- Status: `ready_to_ship`
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
- current automated coverage passes at `73/73`
- the shared start/reset default is cockpit-only again, while the first builder entry seeds a compact rainbow speed-test rig for targeted builder testing
- browser audio now unlocks on first user gesture, plays a chill procedural `~30s` ambient loop, maps blaster fire up the quality ladder as melodic notes, and exposes one small corner toggle that mutes music and SFX together
- current combat rules are free-for-all, enemy spawns now come from four validated archetypes expanded into the standard `28`-ship roster plus `Warheart`, a late custom fortress boss; the roster now has much larger within-archetype variation in footprint, thrust layout, yaw authority, weapon density, hollow `Fortress` outlines, mirrored base-quality-plus-or-minus-`1` block accents, and a dedicated boss-class fortress frame whose AI weighting stays fortress-derived but skews harder into `Aggressive` and `Berserker`; enemy cockpits do not get the player's built-in blaster; AI steering, provocation, retaliation, idle patrol, and attack-first rules now vary by personality; the roster still opens soft, but the late-game mix has been rebalanced down to roughly `45%` total soft personalities, `Won't Attack First` now refuses to open on the player rather than on everyone, very late enemies can now reach `rainbow` quality, visible enemy pressure now opens a bit denser instead of stalling at `2`; enemies enter from outside the visible viewport; the enemy pool remains blaster-rich so weapon salvage appears often; ship-death salvage now spawns healthier, stays persistent as collectible loot, no longer silently despawns by player distance, no longer absorbs live combat shots, and uses closest-hit-first pickup; cockpit health now regenerates slowly while ships remain alive; player cockpit death now gets a short `~2s` neon line-art breakup animation before the loss panel fully takes over; the player loss panel waits about `3s` after cockpit destruction; and `Q` cycles rendering-only ship glow quality

## Implemented Systems

- static browser shell with title, gameplay, builder, and game-over states
- procedural browser audio module for music and SFX, with a persistent mute toggle
- modular ship data model with cockpit, hull, blaster, thruster, and shield blocks
- cockpit-only shared default starter with open-side cockpit built-ins that disappear when the matching cockpit side is occupied
- first builder entry seeded from a compact rainbow speed-test rig, without changing reset-button behavior
- multi-cell hulls (`1x1`, `1x2`, `1x3`) with footprint-aware sockets, picking, and rendering
- quality tiers that affect durability, weapon power, thrust, and visuals
- rigid-body-like ship motion driven by mounted thrusters, with thrust torque resolved around center of mass
- enemy spawning from the validated `Needle`, `Bulwark`, `Manta`, and `Fortress` archetypes
- `28` distinct legal enemy ship designs distributed across those `4` archetypes, with `7` designs per archetype
- `Warheart`, a late custom fortress boss that sits outside the standard `28`-ship roster and uses fortress-derived but more aggressive AI weighting
- enemy non-cockpit block qualities that can vary within base quality plus or minus `1`, while mirrored block pairs stay matched
- approved compact additions now include `Dart`, `Ward`, `Skiff`, and `Fan`, with `Ward` intentionally shipping without the proposed shield
- materially different within-archetype enemy variants, including small early-game hulls, a limited set of low-yaw or low-thrust ships, and hollow `Fortress` frames
- weighted enemy AI personalities: `Punching Bag`, `Slow Reacting`, `Won't Attack First`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker`
- a shared enemy director that uses elapsed time plus kills to control spawn cadence, active-cap growth, archetype progression, and a more populated early game that relies on soft personalities instead of a nearly empty map
- soft personalities now patrol around player space when idle, so docile ships still drift through the arena instead of parking offscreen
- offscreen enemy spawning based on the current browser viewport instead of a generic radial spawn around the player
- viewport-aware spawn pressure counting so far-offscreen enemies do not block new visible threats from entering
- free-for-all target selection plus ship collisions across every alive ship pair, including enemy-enemy
- projectile damage, shield reflection, cockpit loss, and limited self-hit friendly fire after muzzle clear
- cockpit regeneration on a `120s` full-refill slope for any alive ship
- pending-loss flow that delays the game-over panel by about `3s`
- salvage block ejection plus drag-and-snap attachment logic, with persistent ship-death loot handling for surviving salvage
- builder detach by right-click or by dragging mounted non-cockpit parts away from the ship, with mounted parts taking priority over overlapping loose salvage on the next drag
- closest-hit-first salvage pickup, with persistent-loot and draw-order tie-breaks when blocks overlap
- loose salvage collision / bullet damage and destruction
- `Q`-driven ship visual quality toggle (`High` / `Medium` / `Low`) that only changes rendering intensity

## Known Compromises

- manual balance and feel tuning can still continue after ship, but they are no longer blocking the repo sync requested in this loop
- the repo still relies mainly on deterministic model/runtime tests rather than a recorded long-form browser playthrough
- richer adaptive music layers and mixer controls remain out of scope

## Next Owner

- `Producer`
