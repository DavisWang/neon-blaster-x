# Neon Blaster X

## Overview

- Neon Blaster X (NBX), is a single player, grid based, top down, real time shooter game where you control a spaceship in space and shoot other computer controlled spaceships.  
- What’s special about NBX is that it combines shooter dynamics with real time modular building mechanics. The player starts barebone with a simple spaceship, by defeating other enemies, they can pick up parts from the defeated spaceship and attach desirable parts to their own spaceship to make it more powerful.  
- The game is inspired by Captain Forever.

## Controls

- W to thrust in the direction the spaceship is facing  
- S to reverse relative to the direction the spaceship is facing  
- A and D to use thrusters to rotate left / right  
- Space to shoot, hold space to continuously shoot with a cooldown  
- Mouse click and drag to pick up loose parts and attach to your spaceship.

## Game Mechanics

- Every spaceship in NBX is made up of many 1x1 blocks of different types that serve a purpose, they are all modular and can be attached to another block in any orientation, provided there’s not another block there. See below for the different block types:  
- Block Types:  
  - Cockpit  The heart of your spaceship, has a health pool, if destroyed, player loses. You can attach parts to all 4 sides of the cockpit unless already occupied by a part. Unless a part is attached to the front of the cockpit, it has a built in blaster that can shoot projectiles.  
  - Hull  The basic building block for spaceships, other blocks can be attached to the hull on all 4 sides as long as it’s not already occupied. Hull blocks are the only blocks that don't fit the 1x1 description, can be 1x1, 1x2, 1x3.
  - Blaster  Used to fire projectiles straight forward (simple lines) at other spaceships to do damage to them  
    - 3-way blaster: There is also a 3-way blaster that fires in 45 degree angles left / right relative to the straight projectile, in addition to the straight projectile.  
    - Dual blaster: There is also a dual blaster that fires two projectiles in a straight line forward.
  - Thruster  Used to provide thrust, thrust is provided in the direction the tail of the thruster is pointed at. Hence symmetrical spaceship design is paramount to steer the ship effectively.  
  - Shield  Used to reflect enemy projectiles, shield also incur a significantly lower amount of damage relative to other blocks.
- Quality, Each block (except Cockpit) has a quality associated with it, the higher quality the block, the higher health and harder to destroy it. Higher quality blasters shoot faster, shoot harder, Higher quality thrusters provide higher thrust. Higher quality shields reflect projectiles further.  
  - Quality is visualized via different colored blocks. In order from low to high quality: Grey  Red  Orange  Yellow  Green  Blue  Purple  White  Rainbow
- Building / Constructing your ship  
  - Players use their mouse to drag and drop salvageable parts to construct their ships.
  - All Salvageable parts has exactly one attaching side and can only be of length 1. Attaching side refers to the side that autosnaps to the player's spaceship on drag and drop, this ensures that there's a predictable block orientation / building experience.
    - The only attaching side for blaster blocks is the side on the opposite side of where the projectile is coming from  
    - The only attaching side for thruster blocks is the opposite side of where the thrust is coming from.  
    - There is only one attachable side for shields which is the opposite side of the surface that reflects projectiles.
  - Blocks may have more than one attachable side. Attachable side refers to the side(s) that another block may attach to. attachable sides can only be of length 1, to ensure that it's a perfect match between attaching sides, and attachable sides.
    - All 4 sides of the cockpit is attachable
    - All sides of hull blocks are attachable , attachable sides are length 1 so 1x1 blocks has a total of 4 attachable sides, 1x2 blocks has a total of 6 attachable sides, and so on.  
    - Blasters/thrusters/shields have no attachable sides (which means that they can be attached to another block, and no more blocks can be attached to them)
  - The blocks autosnap to attachable areas of the player’s spaceship, dragging the block away stops the autosnap behavior.

## UI/Look and feel

- The look and feel of the game is extremely simple, there are no sprites and everything can be rendered with simple line art.  
- Per the name of the game, each block glows and pulses neon of different colors against the backdrop of the dark space.  
- Block appearance  
  - Block design takes on an extremely simple design, colored outlines depending on the quality, with a transparent center unless otherwise mentioned.  
  - Cockpit: a simple square with a red heart in the middle, a line sticking out from the top of the square represents a very basic blaster.  
  - Hull: a simple square or rectangle, if a rectangle, the side that is attachable to other  
  - Blaster: a symmetrical, gun shaped simple shape  
  - Thruster: a symmetrical, thruster shaped simple shape  
  - Shield: a symmetrical, bowl shaped simple shape  
  - Each block is a colored outline depending on the quality.
- Low health  
  - At low health, the brightness of the block is reduced and there is a flickering effect, like static on a TV.

## Screens

- Title Screen  
  - New game
  - Spaceship builder
  - Footer text: “By Pwner Studios”
- Gameplay screen  
  - The cockpit of the player spaceship is always centered.

## Spaceship builder

- In spaceship builder. A player can use a sidebar to see all block types and qualities in a visual interface and drag and drop desired  blocks and qualities to build their spaceship. The player may fly this spaceship using existing control schemes. The goal of build test mode is to test out the spaceship building aspect of the game in a sandbox / creative environment.
- TODO: Add enemy ships later

## Level generation

- The map is endlessly scrolling in all directions and procedurally generated in the direction the player is flying towards. And garbage collected for other directions.

## Enemy spaceship types

- TODO

## Physics

- Although the game is simple and drawn with line art. Realistic physics is an integral part of the game.   
- Thrusting forward/backwards and Rotating left/right  
  - The amount of thrust is dependant on the number and quality of boosters that can help thrust in the intended direction. Only thrusters that can help thrust in the intended direction, whether forwards, backwards, rotating left or right, will animate to show thrust. Irrelevant thrusters will stay disengaged.
- Collisions  
  - Collisions between spaceships will incur damage to the parts of the spaceship involving the collision, damage is determined by collision speed, a hard enough collision can break spaceship parts.
- Block destruction vs salvageable parts  
  - A part is destroyed and thus cannot be used to construct a player’s spaceship if the health of that part is zero.  
  - A para is salvageable (ie. can be used to construct a player’s spaceship) if the part is not connected to another spaceship and has health greater than zero.  
  - Whenever a part is destroyed that separates a spaceship into two or more completely disjoint parts. All blocks on the side that is not connected to the cockpit will disconnect from every other part and become salvageable.
- Dragging parts  
  - Dragging salvageable parts will generate very slow velocity in the direction of the mouse movement. It will bump aside other salvageable parts but is not strong enough to move past another spaceship that is in its way. This is to ensure that players cannot use draggable blocks as an offensive weapon against enemies.

## Music/FX

- TODO later

