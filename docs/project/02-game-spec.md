# Canonical Game Spec

## Core Fantasy

Pilot a compact modular spaceship through neon-lit space, defeat hostile ships, salvage their parts, and rebuild your own ship in real time to stay alive longer and hit harder.

## Core Loop

1. Spawn as a bare cockpit with built-in front fire and mini thrusters on the open port/starboard/stern cockpit edges.
2. Fly through a top-down space field and engage enemy ships.
3. Destroy or disable enemy parts.
4. Pick up salvageable loose blocks with the mouse.
5. Drag and attach those blocks to valid ship sockets.
6. Use the upgraded ship to survive longer and defeat stronger enemies.
7. Repeat until the cockpit is destroyed.

## Controls

- `W`: thrust forward relative to ship facing
- `S`: reverse thrust
- `A`: rotate left
- `D`: rotate right
- `Space`: fire blaster
- Mouse click and drag: pick up salvageable parts and attach them to open sockets
- Builder-only mouse drag on mounted non-cockpit part: detach and drag that part immediately
- Builder-only right-click on mounted non-cockpit part: quick detach
- `R` while dragging: rotate the dragged part in place when the current snap cell supports multiple orientations

## World And Presentation

- The game is top-down and set in open space.
- The playable area should feel continuous rather than level-based.
- The camera should keep the player ship readable at all times.
- The cockpit is the primary visual anchor for the player ship.

## Ship Model

Every ship is built from 1x1 block units unless a block type explicitly spans multiple cells.

### Block Types

- Cockpit
- Hull
- Blaster
- Thruster
- Shield

### Block Rules

- The cockpit is the ship's core and failure point.
- The cockpit begins with built-in front fire plus built-in stern/side thrust on any cockpit side that is still open.
- Attaching directly to a cockpit side removes the matching built-in cockpit capability on that side.
- Hull blocks provide structure and attachment points.
- Hulls may be `1x1`, `1x2`, or `1x3`.
- Blasters fire forward from their mounted orientation.
- Thrusters provide thrust in the opposite direction of their exhaust.
- Thruster torque is computed around the ship's actual center of mass instead of the cockpit origin, so asymmetric builds can veer under acceleration.
- Shields reduce projectile damage and are better at deflecting shots than other blocks.
- Salvageable blocks must have exactly one attachment side for drag-and-drop rebuilding.
- A block can only be attached if the destination socket is open.
- If a ship disconnects into separate pieces, the piece that is not connected to the cockpit becomes salvageable if its blocks still have health remaining.
- Connectivity follows real attachment boundaries rather than raw cell adjacency.

## Quality

- Each non-cockpit block has a quality tier.
- Higher quality means more durability and a stronger effect for that block type.
- Thruster gains taper by quality tier instead of scaling linearly.
- Durability steps up sharply by quality tier so higher-quality blocks survive materially more hits.
- Quality tiers are visually distinct and map from low to high as: grey, red, orange, yellow, green, blue, purple, white, rainbow.

## Combat

- Ships fire in the direction their mounted weapons face.
- Combatants are free-for-all by default; enemies should be able to fight each other instead of only focusing the player.
- Enemy ships should spawn from a readable roster of validated archetypes: `Needle`, `Bulwark`, `Manta`, `Fortress`, and `Vulture`.
- Each enemy spawn should also roll one AI personality from `Passive`, `Cautious`, `Opportunist`, `Aggressive`, and `Berserker`, with weighting that preserves each archetype's identity instead of flattening every ship into the same behavior.
- The opening run should leave room to salvage and build, so enemy pacing should ramp off both elapsed time and kills instead of starting at the full mid-game pressure level, with a heavily passive early AI mix and enemies entering from outside the visible browser viewport.
- Weapons should have a short cooldown so holding `Space` creates continuous fire.
- Projectiles damage exposed blocks on impact.
- After a short muzzle-clear grace window, a ship can be hit by its own bullets in edge cases.
- Collisions between any ships cause damage based on impact speed, including enemy-enemy pairs.
- Loose salvage can also take projectile and collision damage.
- Shields mitigate projectile damage more effectively than hull or weapon blocks.

## Building And Salvage

- Salvageable parts float in space after being detached or destroyed off the main structure.
- Ship-destruction salvage should bias toward meaningful drops: surviving attached blocks can be floored upward in HP and converted into persistent collectible loot, rather than being chewed up by loose-world damage before the player can reach them.
- Persistent death-drop loot should stay out of the combat hit path so bullets still reach ships and shields instead of being consumed by collectible salvage.
- Salvage should persist until collected or genuinely destroyed; it should not quietly despawn just because it drifted away from the player.
- The player can pick up salvageable parts with the mouse and drag them toward an open socket.
- A simple click should not count as a pickup-and-attach gesture; the player must actually drag the salvage.
- If salvage overlaps, pickup should prefer the top-most visible loot rather than an older hidden block underneath.
- Current implementation note: the first builder entry seeds a compact rainbow speed-test ship, but reset still returns to the bare cockpit default.
- In the builder, mounted non-cockpit parts can be detached either by dragging them off the ship or by right-clicking them.
- Auto-snap should occur when a dragged part approaches a valid attachment point.
- Enemy pressure should stay low enough that the salvage-and-rebuild loop is testable during balancing passes.
- The dragged part should stop auto-snapping when the player pulls it away.
- Drag previews should follow the ship's current orientation when snapped.
- Dragged parts should collide with ships and blocks, but they should not slow ships down or become an abuseable mouse weapon.

## Failure State

- The run ends when the cockpit health reaches zero.

## V1 Scope

- one playable title screen
- one gameplay mode
- one minimal builder or salvage attachment loop
- five enemy ship archetypes built from the current part set
- five AI personalities with weighted archetype-to-personality mapping
- one shared early-game difficulty ramp that starts calmer and widens over time plus kills
- one loss condition
- simple on-screen HUD for health, attached parts, and basic controls
- browser-playable local build

## Later Ideas

- boss-tier or scripted enemy archetypes
- expanded procedural generation
- longer progression or campaign structure
- music and sound polish
- advanced group tactics and wave scripting
- boss encounters
- economy or meta-progression

## Assumptions

- The browser-first profile is the delivery target for v1.
- Keyboard and mouse are the primary input model.
- The brief's line-art, neon look is intentional and should not be replaced with sprites for v1.
- The initial build can stay small if the core salvage-and-rebuild loop is clear and playable.

## Testable Acceptance Criteria

- A browser build launches from a local command.
- The title screen can start a run.
- The player can move, rotate, and fire.
- At least one enemy can be defeated or damaged.
- Salvageable parts can be dragged and attached to the ship.
- The ship can become stronger through attached parts.
- The cockpit can be destroyed and the run can end.
- The default viewport remains readable without clipped controls or obscured HUD.

## Next Owner

- Visual/Interaction Designer
- Game Developer
- Play Tester
