export const CELL_SIZE = 34;
export const HALF_CELL = CELL_SIZE * 0.5;
export const WORLD_WRAP = 3200;
export const MAX_ENEMIES = 3;
export const SHIP_DRAG = 0.94;
export const LOOSE_DRAG = 0.985;
export const BULLET_RADIUS = 4;
export const CAMERA_LERP = 0.12;
export const SOCKET_SNAP_DISTANCE = 78;
export const LOOSE_PICK_RADIUS = 28;
export const COLLISION_DAMAGE_SCALE = 0.015;

export const SIDE_ORDER = ["north", "east", "south", "west"];

export const SIDE_VECTORS = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

// Durability, thrust, and projectile weapon scaling are tuned explicitly instead of derived from
// one generic curve so combat feel can track the brief more closely as qualities increase.
export const QUALITY_TIERS = [
  { id: "grey", label: "Grey", color: "#8a93a1", durabilityHits: 7, thrustMultiplier: 0.96, powerMultiplier: 0.92, rangeMultiplier: 0.21, speedMultiplier: 0.42, cooldownMultiplier: 1.8, glow: 0.32 },
  { id: "red", label: "Red", color: "#ff5f7f", durabilityHits: 7, thrustMultiplier: 1, powerMultiplier: 1, rangeMultiplier: 0.26, speedMultiplier: 0.5, cooldownMultiplier: 1.72, glow: 0.4 },
  { id: "orange", label: "Orange", color: "#ff9d4a", durabilityHits: 7, thrustMultiplier: 1.36, powerMultiplier: 1.08, rangeMultiplier: 0.31, speedMultiplier: 0.58, cooldownMultiplier: 1.64, glow: 0.45 },
  { id: "yellow", label: "Yellow", color: "#ffd85f", durabilityHits: 7, thrustMultiplier: 1.66, powerMultiplier: 1.18, rangeMultiplier: 0.36, speedMultiplier: 0.68, cooldownMultiplier: 1.56, glow: 0.5 },
  { id: "green", label: "Green", color: "#6cff94", durabilityHits: 7, thrustMultiplier: 1.9, powerMultiplier: 1.3, rangeMultiplier: 0.41, speedMultiplier: 0.78, cooldownMultiplier: 1.48, glow: 0.55 },
  { id: "blue", label: "Blue", color: "#63c7ff", durabilityHits: 7, thrustMultiplier: 2.1, powerMultiplier: 1.42, rangeMultiplier: 0.46, speedMultiplier: 0.88, cooldownMultiplier: 1.39, glow: 0.6 },
  { id: "purple", label: "Purple", color: "#b988ff", durabilityHits: 7, thrustMultiplier: 2.26, powerMultiplier: 1.56, rangeMultiplier: 0.51, speedMultiplier: 0.98, cooldownMultiplier: 1.31, glow: 0.65 },
  { id: "white", label: "White", color: "#f3fbff", durabilityHits: 7, thrustMultiplier: 2.39, powerMultiplier: 1.72, rangeMultiplier: 0.56, speedMultiplier: 1.08, cooldownMultiplier: 1.23, glow: 0.72 },
  { id: "rainbow", label: "Rainbow", color: "#6ef7ff", durabilityHits: 7, thrustMultiplier: 2.5, powerMultiplier: 2, rangeMultiplier: 0.61, speedMultiplier: 1.18, cooldownMultiplier: 1.15, glow: 0.8 }
];

export const QUALITY_BY_ID = Object.fromEntries(QUALITY_TIERS.map((tier) => [tier.id, tier]));

export const BLOCK_DEFS = {
  cockpit: {
    label: "Cockpit",
    baseHp: 84,
    massFactor: 1,
    attachableSides: ["north", "east", "south", "west"]
  },
  hull: {
    label: "Hull",
    durabilityFactor: 1,
    massFactor: 1,
    attachableSides: ["north", "east", "south", "west"]
  },
  blaster: {
    label: "Blaster",
    durabilityFactor: 0.85,
    massFactor: 0.25,
    variants: {
      single: { cooldown: 0.28, damage: 10, speed: 600, spread: [0] },
      dual: { cooldown: 0.36, damage: 9, speed: 600, spread: [0, 0], offsets: [-8, 8] },
      spread: { cooldown: 0.48, damage: 8, speed: 570, spread: [-0.23, 0, 0.23] }
    }
  },
  thruster: {
    label: "Thruster",
    durabilityFactor: 0.85,
    massFactor: 0.25,
    baseThrust: 880
  },
  shield: {
    label: "Shield",
    durabilityFactor: 1.1,
    massFactor: 0.25,
    damageScale: 0.86,
    reflectBoost: 1.22
  }
};

export const PALETTE_BLOCKS = [
  { type: "hull", variant: "single", label: "Hull 1x1", detail: "Single-cell frame" },
  { type: "hull", variant: "double", label: "Hull 1x2", detail: "Two-cell spine" },
  { type: "hull", variant: "triple", label: "Hull 1x3", detail: "Three-cell spine" },
  { type: "blaster", variant: "single", label: "Blaster", detail: "Single forward shot" },
  { type: "blaster", variant: "dual", label: "Dual Blaster", detail: "Twin forward shots" },
  { type: "blaster", variant: "spread", label: "3-Way Blaster", detail: "Fan spread shot" },
  { type: "thruster", label: "Thruster", detail: "Force from mounted direction" },
  { type: "shield", label: "Shield", detail: "Reflects incoming shots" }
];
