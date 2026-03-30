# Visual Direction Brief

## Direction Summary

Use a neon, high-contrast, line-art space aesthetic. The game should feel crisp, technical, and readable rather than painterly or realistic. The ship is the star of the screen, and the cockpit must remain visually dominant.

## Style Pillars

- Dark space background with subtle atmospheric texture
- Bright neon outlines for all ship parts
- Clear quality-based color coding
- Minimal geometry with strong silhouette readability
- Motion that communicates thrust, firing, damage, and salvage state without clutter

## Readability Rules

- Keep the player's ship centered in the visual field as much as possible.
- Use strong contrast between blocks and background.
- Reserve the brightest effects for cockpit, weapons, damage, and pickup feedback.
- Never let particle effects or glow obscure collision boundaries.
- HUD elements should sit outside the combat focal point and stay readable at small size.

## Ship Visual Language

- Cockpit: simple square form with a red heart motif or other small central core marker
- Hull: clean rectangular or square outline segments
- Blaster: compact gun-like outline
- Thruster: symmetric exhaust-facing shape with active glow when firing
- Shield: bowl-like or arc-like outline that suggests protection

## Quality Language

- Low quality should look dimmer and rougher.
- High quality should look cleaner, brighter, and more saturated.
- Quality must remain readable at a glance without relying only on text.

## Interaction Feedback

- Active thrust should flash or glow from the thruster side.
- Firing should produce a short, directional muzzle flare.
- Damage should reduce brightness and introduce flicker or static-like instability.
- Salvageable parts should clearly indicate that they can be dragged.
- Auto-snap should have a subtle visual cue so attachment feels deliberate rather than sticky.

## Animation Rules

- Keep animation simple and purposeful.
- Use small pulsing or flicker effects instead of heavy sprite-based animation for v1.
- Do not add a placeholder sprite style that conflicts with the line-art brief.
- If a later feature requires richer animation, generate frames that match the neon line-art style rather than substituting a cheaper fallback.

## HUD And Screen States

- Title screen should feel minimal and immediate.
- Gameplay HUD should show health, the current ship state, and only the controls needed for first-session play.
- Builder or salvage mode, if included, should use the same visual language and not introduce a separate art style.

## Risks

- Excessive glow can hide part boundaries.
- Too many colors can make quality unreadable.
- Salvage drag feedback can become noisy if the snap state is not visually restrained.

## Next Owner

- Game Developer
