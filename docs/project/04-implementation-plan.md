# Implementation Plan

## Build Shape

- Browser-first single-page prototype
- Top-down 2D canvas or equivalent lightweight rendering path
- Entity model for player ship, enemy ships, projectiles, loose parts, and attachment sockets
- One core game state plus a minimal title and reset flow
- Optional simple builder overlay if it can stay legible and cheap to maintain

## Assumed Stack

- Static HTML, CSS, and ES module JavaScript
- No framework or engine dependency for v1
- Canvas rendering plus DOM overlays for menus, HUD, and builder tools

## Delivery Order

1. Boot the browser shell, title screen, and game state transitions.
2. Implement the ship model, movement, rotation, and firing loop.
3. Add enemies, projectiles, damage, and cockpit failure.
4. Add salvageable parts, drag pickup, socket attachment, and auto-snap.
5. Add quality tiers and visual differentiation.
6. Add HUD and basic polish for browser readability.
7. Add a minimal builder or sandbox mode only if it does not compromise the core loop.

## Required Evidence

- local run command
- browser-playable build
- screenshot or equivalent browser evidence
- short implementation note that names the core systems and compromises

## Validation Checklist

- title screen starts a run
- player movement and firing are responsive
- enemy damage and defeat are observable
- salvage can be picked up and attached
- cockpit destruction ends the run
- default viewport is readable
- no obvious input lockups or broken state transitions

## Known Risks

- attachment feel may need tuning before it feels reliable
- quality-based readability may need iteration after first visual pass
- the builder can easily expand scope, so it should stay minimal unless it is clearly cheap

## Constraints

- Keep the first build small enough to verify quickly in a browser.
- Do not add systems that do not directly support the core salvage shooter loop.
- Preserve the brief's top-down modular ship fantasy even if the first implementation is stripped down.
- Keep the runtime simple enough to serve from a basic local HTTP server.

## Next Owner

- Game Developer
