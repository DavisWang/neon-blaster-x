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
| Run / Builder | Mouse drag on loose salvage | pick up and move salvage |
| Builder | Mouse drag on mounted non-cockpit part | detach and immediately drag that part |
| Builder | Right-click on mounted non-cockpit part | quick detach |
| Run / Builder | `R` while dragging | rotate the dragged part; for ambiguous snaps this now rotates in place |

## Enemy Roster

| Archetype | Shape | Default read |
| --- | --- | --- |
| `Needle` | long centerline with a rear engine cluster | fast interceptor / chaser |
| `Bulwark` | wide shielded shoulders around a compact center | tank / lane holder |
| `Manta` | wing-heavy frame with a spread nose | orbit skirmisher / area denial |
| `Fortress` | closed hull ring with a front battery and heavy stern thrust | slow fortress / wall |
| `Vulture` | asymmetric scavenger body with offset guns and thrust | raider / chaos piece |

## Enemy AI Profiles

| AI profile | Behavior read |
| --- | --- |
| `Passive` | keeps distance, retreats early, low-risk firing |
| `Cautious` | holds a safer mid-range band and retreats when pressured |
| `Opportunist` | prefers weaker or already-engaged targets and looks for windows |
| `Aggressive` | presses into range quickly and fires more freely |
| `Berserker` | over-commits, avoids retreat, and accepts sloppy close fights |

## Current Rules

- Ships disconnect by cockpit connectivity. If a removed or destroyed part splits a ship into disjoint pieces, every piece not still connected to the cockpit becomes salvage.
- Destroying a ship now drops every still-attached non-cockpit block that has `hp > 0` as salvage, and those surviving blocks get a stronger death-drop HP floor plus persistent collectible-loot handling so close-range kills still yield usable salvage.
- Connectivity is attachment-aware. A blaster, thruster, or shield touching another hull on the wrong side does not count as a valid structural connection.
- Ordinary loose salvage takes bullet damage and collision damage. Destroyed salvage is removed from play.
- Ship-destruction salvage is now treated as persistent collectible loot while loose, so it is not chipped away by the loose-world damage rules before you can pick it up.
- Persistent ship-death loot is also ignored by projectile hit tests, so combat shots do not disappear into collectible salvage and shield drops do not create reflection storms.
- Loose salvage no longer silently despawns just because it drifted away from the player. If it disappears now, it was collected or actually destroyed.
- Run-mode salvage pickup now requires a real drag. A simple click on nearby loot no longer auto-attaches it on pointer-up.
- Loot pickup now follows visual stack order, so the top-most visible salvage is the one that gets grabbed when blocks overlap.
- Enemy pressure is lower for testing: fewer auto-spawned enemies, a lower active cap, and slower reinforcement pacing.
- Dragged parts collide with ships and other blocks, but they do not push ships around or slow them down.
- Thrust torque is computed around the ship's actual center of mass, so asymmetric ships can naturally yaw while accelerating forward or backward.
- Combat is free-for-all: enemy bullets can hit other enemies, ship collisions apply to enemy-enemy pairs, and target selection now depends on the active AI personality rather than one shared pursuit rule.
- Enemies now spawn from `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture` blueprints, and each archetype rolls weighted AI personalities from `Passive` through `Berserker`.
- Enemy pressure now ramps from a combined `elapsed time + kills` director, so the opening run favors slower spawns, fewer active enemies, roughly `80% Passive` AI rolls, and offscreen enemy entry before widening later.
- Bullets get a short self-hit grace window after firing. After that, a ship can hit itself with its own blasters in tight or rotating builds.
- `Hull 1x1`, `Hull 1x2`, and `Hull 1x3` are real multi-cell pieces with footprint-aware sockets, picking, rendering, and connectivity.
- Rainbow blocks now share a synchronized hue/pulse timing instead of drifting out of phase.

## Stat Tuning

| System | Current rule |
| --- | --- |
| Thrusters | stronger overall thrust than the original v1, with diminishing incremental gains as quality increases |
| Durability | higher-quality blocks take materially more hits; same-tier hull durability steps upward by quality tier |
| Shields | mounted and loose shields now reflect incoming bullets back into play and only take a reduced share of the impact |

## Docs

- High-level spec: [docs/project/02-game-spec.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/02-game-spec.md)
- Build note: [docs/project/05-build-note.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/05-build-note.md)
- Session change log: [docs/project/10-session-change-log.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/10-session-change-log.md)
