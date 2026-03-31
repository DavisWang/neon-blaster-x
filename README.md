# Neon Blaster X

Browser-first v1 prototype for a neon modular salvage shooter.

The shared start/reset default is cockpit-only. On the first builder entry only, the builder seeds a compact rainbow speed-test rig; the `Reset` button still returns that ship to cockpit-only.

## Run

```bash
python3 -m http.server 4199 --bind 127.0.0.1
```

Open:

- [http://127.0.0.1:4199](http://127.0.0.1:4199)
- [http://127.0.0.1:4199/run.html](http://127.0.0.1:4199/run.html)
- [http://127.0.0.1:4199/builder.html](http://127.0.0.1:4199/builder.html)

## Test

```bash
npm test
```

## Controls

| Context | Input | Result |
| --- | --- | --- |
| Run / Builder | `W` | thrust forward |
| Run / Builder | `S` | reverse thrust |
| Run / Builder | `A` / `D` | rotate left / right |
| Run / Builder | `Space` | fire |
| Run / Builder | `Q` | cycle ship glow quality: `High` -> `Medium` -> `Low` |
| Run / Builder | Mouse drag on loose salvage | pick up and move salvage |
| Builder | Mouse drag on mounted non-cockpit part | detach and immediately drag that part |
| Builder | Right-click on mounted non-cockpit part | quick detach |
| Run / Builder | `R` while dragging | rotate the dragged part; for ambiguous snaps this now rotates in place |

## Enemy Roster

The runtime now rolls from `28` distinct legal enemy ship designs spread across these `4` archetypes. Each spawn still gets one base quality from the progression curve, but mirrored non-cockpit block pairs can now land at base quality plus or minus `1` instead of forcing one flat tier across the whole hull.

| Archetype | Shape | Default read |
| --- | --- | --- |
| `Needle` | compact-to-long spear frames, from tiny darts to stretched lances | interceptor / chaser |
| `Bulwark` | compact guards and wide wall-like shield barges | tank / lane holder |
| `Manta` | wing-heavy frames ranging from tight gliders to broad nets | orbit skirmisher / area denial |
| `Fortress` | dense bastions plus hollow outer-ring citadels | slow fortress / wall |

## Enemy AI Profiles

| AI profile | Behavior read |
| --- | --- |
| `Punching Bag` | drifts into the fight but is effectively free salvage; does not really retaliate |
| `Slow Reacting` | notices fights late, tracks poorly, and often fails to convert a retaliation into real danger |
| `Won't Attack First` | will not open on the player, but can still get into enemy-vs-enemy fights and will retaliate if provoked |
| `Cautious` | holds a safer mid-range band, retreats when pressured, and tracks targets a bit faster than passive |
| `Opportunist` | prefers weaker or already-engaged targets and uses a medium reaction speed to look for windows |
| `Aggressive` | presses into range quickly, fires more freely, and tracks player movement faster |
| `Berserker` | over-commits, avoids retreat, accepts sloppy close fights, and has the fastest steering reaction |

## Current Rules

- Ships disconnect by cockpit connectivity. If a removed or destroyed part splits a ship into disjoint pieces, every piece not still connected to the cockpit becomes salvage.
- Destroying a ship now drops every still-attached non-cockpit block that has `hp > 0` as salvage, and those surviving blocks get a stronger death-drop HP floor plus persistent collectible-loot handling so close-range kills still yield usable salvage.
- Connectivity is attachment-aware. A blaster, thruster, or shield touching another hull on the wrong side does not count as a valid structural connection.
- Ordinary loose salvage takes bullet damage and collision damage. Destroyed salvage is removed from play.
- Ship-destruction salvage is now treated as persistent collectible loot while loose, so it is not chipped away by the loose-world damage rules before you can pick it up.
- Persistent ship-death loot is also ignored by projectile hit tests, so combat shots do not disappear into collectible salvage and shield drops do not create reflection storms.
- Loose salvage no longer silently despawns just because it drifted away from the player. If it disappears now, it was collected or actually destroyed.
- Run-mode salvage pickup now requires a real drag. A simple click on nearby loot no longer auto-attaches it on pointer-up.
- Loot pickup now prefers the closest valid hit first; ties break toward persistent loot and then the newer top-most block.
- New title / retry runs always start from the cockpit-only blueprint; launching from the builder uses the current builder ship instead.
- Cockpits regenerate gradually while the ship is alive, reaching full health over roughly `120s` if left undamaged.
- Player death enters a short pending-loss state, so the game-over panel appears about `3s` after cockpit destruction instead of on the exact death frame.
- Player cockpit death now also plays a short neon line-art breakup animation that lasts about `2s` inside that pending-loss window.
- Pressing `Q` cycles `High`, `Medium`, and `Low` ship-visual quality. This is rendering-only: it changes glow / halo intensity, not gameplay.
- Enemy pressure now comes more from personality mix than sparseness: the opening is more populated, and the roster still skews soft, but provoked soft ships now counterattack more reliably and truly inert `Punching Bag` ships are less common than before.
- Visible enemy pressure now allows up to `3` other ships in the active viewport instead of widening to `4` later.
- Enemy spawn pressure now counts ships near the viewport instead of every alive enemy globally, so slow offscreen stragglers do not leave the player with an empty screen.
- Very distant enemies are now recycled out of the spawn loop entirely instead of lingering forever off-map and eventually starving later reinforcements.
- Soft personalities now patrol around the player space when idle instead of stalling near their spawn or just range-managing offscreen, so docile ships still move through the fight.
- Dragged parts collide with ships and other blocks, but they do not push ships around or slow them down.
- Thrust torque is computed around the ship's actual center of mass, so asymmetric ships can naturally yaw while accelerating forward or backward.
- Combat is free-for-all: enemy bullets can hit other enemies, ship collisions apply to enemy-enemy pairs, and target selection now depends on the active AI personality rather than one shared pursuit rule.
- Only the player cockpit gets the built-in forward blaster; enemy cockpits rely entirely on attached weapon parts.
- Enemies now spawn from `Needle`, `Bulwark`, `Manta`, and `Fortress` blueprints, and each archetype rolls weighted AI personalities from `Punching Bag` through `Berserker`.
- Those `4` archetypes now expand into `28` distinct legal ship designs, with `7` ships per archetype, smaller early-game frames, symmetry-first thruster layouts, hollow `Fortress` outlines, and deliberately controlled mobility quotas instead of a grab bag of sitting ducks.
- Approved small-frame additions now include `Dart`, `Ward`, `Skiff`, and `Fan`, with `Ward` shipped as a no-shield compact guard variant.
- Early fleet progression now uses per-design unlocks instead of only archetype unlocks, so the opening pool is mostly compact `Needle`, `Bulwark`, and `Manta` ships before the larger fortress hulls arrive.
- AI personalities now also encode provocation, retaliation, and attack-first rules, so many enemies legitimately ignore the player, fail to retaliate, or only fight after being hit.
- `Won't Attack First` now means "won't attack the player first" rather than "won't attack anyone first", so those ships can still participate in enemy-vs-enemy combat before the player provokes them.
- The current late-game AI mix is less soft than before: each archetype now lands at roughly `45%` across `Punching Bag`, `Slow Reacting`, and `Won't Attack First`, with the remaining `55%` redistributed proportionally into `Cautious` through `Berserker`.
- Enemy quality progression now extends up to `rainbow`, so very late enemy ships can spawn with rainbow parts, and each enemy can now mix mirrored non-cockpit blocks within base quality plus or minus `1`.
- Enemy pressure still ramps from a combined `elapsed time + kills` director, but the early run is no longer kept calm mainly through sparsity; instead it stays survivable because the soft personalities dominate the spawn mix.
- Bullets get a short self-hit grace window after firing. After that, a ship can hit itself with its own blasters in tight or rotating builds.
- `Hull 1x1`, `Hull 1x2`, and `Hull 1x3` are real multi-cell pieces with footprint-aware sockets, picking, rendering, and connectivity.
- Rainbow blocks now share a synchronized hue/pulse timing instead of drifting out of phase.

## Stat Tuning

| System | Current rule |
| --- | --- |
| Blasters | cadence, projectile speed, and effective range now all scale by quality, with intentionally short low-tier reach and a compressed early-game curve |
| Thrusters | stronger overall thrust than the original v1, with diminishing incremental gains as quality increases |
| Cockpit survivability | cockpits slowly regenerate to full over `120s`, and the player loss panel waits about `3s` after cockpit death |
| Durability | a same-tier blaster now destroys a `Hull 1x1` in `7` hits across qualities; `Hull 1x2` / `Hull 1x3` and shields are only slightly tougher, blasters / thrusters slightly softer, and quality overmatch now accelerates damage sharply |
| Shields | mounted and loose shields still reflect incoming bullets back into play, but their effective durability now sits closer to a `Hull 1x3` than to a fortress-tier wall |

## Docs

- High-level spec: [docs/project/02-game-spec.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/02-game-spec.md)
- Build note: [docs/project/05-build-note.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/05-build-note.md)
- Session change log: [docs/project/10-session-change-log.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/10-session-change-log.md)
