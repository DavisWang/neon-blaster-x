# Neon Blaster X

Neon Blaster X is a browser-first modular salvage shooter about winning ugly fights and stealing the wreckage.

You start as a bare cockpit in neon space. Every enemy ship is both a threat and a parts bin. Break it apart, drag loose salvage onto your hull in real time, and turn a weak starter frame into a faster, heavier, stranger weapon platform before the next wave closes in.

This repo is the current playable prototype of that loop. It is not just a concept doc or a rendering mockup. The game already runs locally, supports live rebuilding, ships a varied enemy roster, and has enough combat/salvage rules to feel like an actual system instead of a shell.

## What Was Built

| Area | Shipped behavior |
| --- | --- |
| Core loop | title screen, gameplay screen, builder screen, local browser run, and retry flow |
| Player ship | cockpit-only start, built-in cockpit thrust/fire rules, live stat-bearing ship assembly |
| Salvage loop | loose block pickup, drag attachment, snap rotation, mounted-part detach, persistent death-drop loot |
| Combat | free-for-all bullets, shield reflection, collision damage, self-hit grace, per-block damage/destruction |
| Enemy roster | `28` legal enemy designs across `Needle`, `Bulwark`, `Manta`, and `Fortress` |
| Enemy behavior | `7` AI profiles from `Punching Bag` to `Berserker`, with provocation and retaliation rules |
| Progression | elapsed-time-plus-kills spawn director, per-design unlocks, mixed enemy block quality up to `rainbow` |
| Ship building | `Hull 1x1`, `Hull 1x2`, `Hull 1x3`, blasters, thrusters, shields, socket-aware connectivity |
| Presentation | neon line-art rendering, quality-based color system, ship FX quality toggle, player-death line-art animation |
| Validation | automated gameplay/model regressions via `npm test` |

## Why It’s Interesting

- Real-time salvage matters. You are not collecting generic currency. You are stealing functioning ship parts and changing your build in the middle of a run.
- Enemy ships are readable, not random noise. The roster is built from archetypes with controlled variation in silhouette, mobility, and aggression.
- Soft and hostile enemies coexist in the same arena. Some ships ignore you, some counterpunch late, and some commit hard, which gives the battlefield a more legible rhythm than “everything rushes the player.”
- The prototype already supports asymmetric ship physics, mixed-quality enemy parts, persistent loot rules, and builder/gameplay alignment. There is real systems depth here.

## Current Highlights

- New title and retry runs always start from the cockpit-only blueprint.
- The first builder entry seeds a compact rainbow speed-test ship; builder reset still returns to cockpit-only.
- Loot pickup prefers the closest valid hit first, then breaks ties toward persistent loot and newer top-most blocks.
- Ship-destruction loot stays collectible instead of getting chewed up immediately by loose-world damage.
- Enemy spawn pressure is viewport-aware, so far-offscreen stragglers do not starve the visible fight.
- Cockpits regenerate slowly over roughly `120s`.
- Player death now plays a short neon line-art breakup animation during the pending-loss window.
- Pressing `Q` cycles ship-rendering glow quality without changing gameplay.

## Enemy Roster

The runtime currently rolls from `28` distinct legal enemy designs across these `4` archetypes. Each spawn gets one progression-driven base quality, while mirrored non-cockpit block pairs can vary within base quality plus or minus `1`.

| Archetype | Read | Role tendency |
| --- | --- | --- |
| `Needle` | compact darts to stretched lances | interceptors and direct chasers |
| `Bulwark` | compact guards and wide shield barges | tanks and lane holders |
| `Manta` | gliders, nets, and wing-heavy skirmishers | orbit pressure and area denial |
| `Fortress` | dense bastions and hollow outer rings | slow walls and heavy anchors |

## Enemy AI Profiles

| AI profile | Behavior read |
| --- | --- |
| `Punching Bag` | barely retaliates and mostly exists as easy salvage |
| `Slow Reacting` | notices danger late and converts pressure poorly |
| `Won't Attack First` | avoids opening on the player but will fight back and engage enemies |
| `Cautious` | prefers safer spacing and retreats under pressure |
| `Opportunist` | hunts weaker or already-engaged targets |
| `Aggressive` | closes range faster and fires more freely |
| `Berserker` | over-commits, accepts sloppy angles, and pushes hard |

## Run It

```bash
python3 -m http.server 4199 --bind 127.0.0.1
```

Open:

- [http://127.0.0.1:4199](http://127.0.0.1:4199)
- [http://127.0.0.1:4199/run.html](http://127.0.0.1:4199/run.html)
- [http://127.0.0.1:4199/builder.html](http://127.0.0.1:4199/builder.html)

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
| Run / Builder | `R` while dragging | rotate the dragged part; for ambiguous snaps this rotates in place |

## Tuning Snapshot

| System | Current rule |
| --- | --- |
| Blasters | cadence, projectile speed, and effective range all scale by quality, with intentionally short low-tier reach |
| Thrusters | stronger overall thrust than the original v1, with diminishing gains by quality |
| Durability | same-tier blasters destroy `Hull 1x1` in `7` hits across qualities; overmatch damage ramps sharply |
| Shields | reflect bullets and sit closer to `Hull 1x3` durability than fortress-wall durability |
| Enemy pressure | controlled by elapsed time plus kills, with a nearby visible cap of `3` enemy ships |

## Test

```bash
npm test
```

## Project Docs

- High-level spec: [docs/project/02-game-spec.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/02-game-spec.md)
- Build note: [docs/project/05-build-note.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/05-build-note.md)
- Session change log: [docs/project/10-session-change-log.md](/Users/davis.wang/Documents/neon-blaster-x/docs/project/10-session-change-log.md)
