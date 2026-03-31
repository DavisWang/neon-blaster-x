import { BLOCK_DEFS, CELL_SIZE, HALF_CELL, MAX_ENEMIES, QUALITY_BY_ID, QUALITY_TIERS, SIDE_ORDER, SIDE_VECTORS } from "./data.js";
import { clamp, dot, length, lerp, normalize, rotate, wrapAngle } from "./math.js";

let nextBlockId = 1;
let nextShipId = 1;
const COCKPIT_BUILTIN_THRUST = 1200;
const COCKPIT_BUILTIN_REVERSE_THRUST = 700;
const COCKPIT_BUILTIN_TORQUE = 11000;
const SIDE_THRUSTER_YAW_ARM = CELL_SIZE * 0.75;
const COCKPIT_REGEN_SECONDS = 120;
const BLASTER_BASE_TTL = 1.35;
const BUILT_IN_BLASTER_RANGE_MULTIPLIER = 0.85;
const BUILT_IN_BLASTER_SPEED_MULTIPLIER = 0.9;
const BUILT_IN_BLASTER_COOLDOWN_MULTIPLIER = 1.05;
const SHIP_DEATH_SALVAGE_HP_FLOOR_RATIO = 0.85;
const SHIP_DEATH_SALVAGE_EJECT_OFFSET = CELL_SIZE * 0.55;
const SHIP_DEATH_SALVAGE_EJECT_SPEED = 60;
const SHIP_VISUAL_QUALITY_ORDER = ["high", "medium", "low"];
const HULL_DURABILITY_FACTORS = {
  single: 1,
  double: 1.14,
  triple: 1.28
};
const QUALITY_INDEX_BY_ID = Object.fromEntries(QUALITY_TIERS.map((tier, index) => [tier.id, index]));
const QUALITY_MATCHUP_DAMAGE_MULTIPLIERS = {
  "-8": 0.338,
  "-7": 0.366,
  "-6": 0.41,
  "-5": 0.466,
  "-4": 0.536,
  "-3": 0.618,
  "-2": 0.705,
  "-1": 0.857,
  "0": 1,
  "1": 1.63,
  "2": 3,
  "3": 5.5,
  "4": 5.5,
  "5": 5.5,
  "6": 5.5,
  "7": 5.5,
  "8": 5.5
};
const SHIP_VISUAL_QUALITY_PROFILES = {
  high: {
    glowMultiplier: 0.68,
    detailGlowScale: 0.28,
    blockHaloAlpha: 0.18,
    blockHaloRadius: 30,
    glowPasses: [
      {
        glowScale: 0.68,
        lineScale: 1,
        shadowBoost: 1.35,
        shadowBlur: 20,
        strokeAlphaScale: 0.5,
        fillAlpha: 0
      }
    ]
  },
  medium: {
    glowMultiplier: 0.3,
    detailGlowScale: 0.12,
    blockHaloAlpha: 0.08,
    blockHaloRadius: 22,
    glowPasses: [
      {
        glowScale: 0.3,
        lineScale: 1,
        shadowBoost: 0.9,
        shadowBlur: 14,
        strokeAlphaScale: 0.42,
        fillAlpha: 0
      }
    ]
  },
  low: {
    glowMultiplier: 0,
    detailGlowScale: 0,
    blockHaloAlpha: 0,
    blockHaloRadius: 0,
    glowPasses: []
  }
};

function makeId(prefix, counter) {
  return `${prefix}-${counter}`;
}

export function oppositeSide(side) {
  return SIDE_ORDER[(SIDE_ORDER.indexOf(side) + 2) % SIDE_ORDER.length];
}

export function cycleShipVisualQuality(current = "high") {
  const index = SHIP_VISUAL_QUALITY_ORDER.indexOf(current);
  return SHIP_VISUAL_QUALITY_ORDER[(index + 1 + SHIP_VISUAL_QUALITY_ORDER.length) % SHIP_VISUAL_QUALITY_ORDER.length];
}

export function getShipVisualQualityProfile(mode = "high") {
  return SHIP_VISUAL_QUALITY_PROFILES[mode] ?? SHIP_VISUAL_QUALITY_PROFILES.high;
}

export function getShipGlowMultiplier(mode = "high") {
  return getShipVisualQualityProfile(mode).glowMultiplier;
}

export function rotateSide(side, steps = 1) {
  const index = SIDE_ORDER.indexOf(side);
  return SIDE_ORDER[(index + steps + SIDE_ORDER.length) % SIDE_ORDER.length];
}

export function sideToAngle(side) {
  return {
    north: -Math.PI * 0.5,
    east: 0,
    south: Math.PI * 0.5,
    west: Math.PI
  }[side];
}

export function getDefaultAttachSide(type, orientation = "north") {
  if (type === "thruster") {
    return orientation;
  }
  if (type === "blaster" || type === "shield") {
    return oppositeSide(orientation);
  }
  if (type === "hull") {
    return "north";
  }
  return null;
}

export function createBlueprintBlock({
  type,
  x,
  y,
  quality = "red",
  orientation = "north",
  variant = "single",
  attachSide = getDefaultAttachSide(type, orientation)
}) {
  return {
    id: makeId("block", nextBlockId++),
    type,
    x,
    y,
    quality,
    orientation,
    variant,
    attachSide
  };
}

export function cloneBlueprint(blocks) {
  return blocks.map((block) => ({ ...block }));
}

export function materializeBlock(block) {
  const stats = getBlockStats(block);
  const maxHp = block.maxHp ?? stats.hp;
  return {
    ...block,
    maxHp,
    hp: clampValue(block.hp ?? maxHp, 0, maxHp),
    cooldown: 0,
    active: false,
    flash: 0
  };
}

function clampValue(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function createShipFromBlueprint(blocks, options = {}) {
  return {
    id: options.id ?? makeId("ship", nextShipId++),
    team: options.team ?? "neutral",
    x: options.x ?? 0,
    y: options.y ?? 0,
    vx: options.vx ?? 0,
    vy: options.vy ?? 0,
    angle: options.angle ?? 0,
    omega: options.omega ?? 0,
    ai: options.ai ?? null,
    blocks: cloneBlueprint(blocks).map(materializeBlock),
    builtInThrustersActive: {
      west: false,
      east: false,
      south: false
    },
    alive: true,
    kind: options.kind ?? "ship",
    scrapCollected: 0
  };
}

export function getAliveShipPairs(ships) {
  const aliveShips = ships.filter((ship) => ship?.alive);
  const pairs = [];
  for (let index = 0; index < aliveShips.length; index += 1) {
    for (let next = index + 1; next < aliveShips.length; next += 1) {
      pairs.push([aliveShips[index], aliveShips[next]]);
    }
  }
  return pairs;
}

export function pickNearestOtherShip(ship, ships) {
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (const candidate of ships) {
    if (!candidate?.alive || candidate.id === ship.id) {
      continue;
    }
    const dx = candidate.x - ship.x;
    const dy = candidate.y - ship.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      best = candidate;
      bestDistanceSq = distanceSq;
    }
  }

  return best;
}

export function serializeShipToBlueprint(ship) {
  return ship.blocks.map((block) => ({
    id: block.id,
    type: block.type,
    x: block.x,
    y: block.y,
    quality: block.quality,
    orientation: block.orientation,
    variant: block.variant,
    attachSide: block.attachSide
  }));
}

export function getQuality(block) {
  return QUALITY_BY_ID[block.quality] ?? QUALITY_BY_ID.red;
}

function getReferenceBlasterDamage(quality) {
  return BLOCK_DEFS.blaster.variants.single.damage * quality.powerMultiplier;
}

// Most non-cockpit HP is expressed in "same-tier single-blaster hits" so the durability
// curve stays readable. Cross-tier overmatch is then layered on top through the explicit
// quality matchup multiplier instead of being hidden inside raw HP growth.
function getDurabilityHp(quality, durabilityFactor) {
  return getReferenceBlasterDamage(quality) * quality.durabilityHits * durabilityFactor;
}

function getQualityIndex(qualityId) {
  return QUALITY_INDEX_BY_ID[qualityId] ?? QUALITY_INDEX_BY_ID.red;
}

function getHullDurabilityFactor(block) {
  return HULL_DURABILITY_FACTORS[block.variant ?? "single"] ?? HULL_DURABILITY_FACTORS.single;
}

export function getQualityMatchupDamageMultiplier(attackerQualityId, defenderQualityId, defenderType = "hull") {
  if (!attackerQualityId || !defenderQualityId || defenderType === "cockpit") {
    return 1;
  }
  const delta = clamp(getQualityIndex(attackerQualityId) - getQualityIndex(defenderQualityId), -8, 8);
  return QUALITY_MATCHUP_DAMAGE_MULTIPLIERS[String(delta)] ?? 1;
}

export function getProjectileDamageAgainstBlock(baseDamage, attackerQualityId, block) {
  if (!block) {
    return baseDamage;
  }

  let damage =
    baseDamage * getQualityMatchupDamageMultiplier(attackerQualityId, block.quality, block.type);
  if (block.type === "shield") {
    damage *= getBlockStats(block).damageScale;
  }
  return damage;
}

export function getHullLength(block) {
  if (block.type !== "hull") {
    return 1;
  }
  return {
    single: 1,
    double: 2,
    triple: 3
  }[block.variant ?? "single"] ?? 1;
}

export function getBlockCells(block) {
  const length = getHullLength(block);
  if (length === 1) {
    return [{ x: block.x, y: block.y }];
  }

  const vector = SIDE_VECTORS[block.orientation] ?? SIDE_VECTORS.north;
  return Array.from({ length }, (_, index) => ({
    x: block.x + vector.x * index,
    y: block.y + vector.y * index
  }));
}

export function getBlockRenderOffset(block) {
  const cells = getBlockCells(block);
  const averageX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
  const averageY = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
  return {
    x: (averageX - block.x) * CELL_SIZE,
    y: (averageY - block.y) * CELL_SIZE
  };
}

export function getLooseBlockPickDistanceSq(block, worldX, worldY, padding = 0) {
  const relativeBlock = { ...block, x: 0, y: 0 };
  const cells = getBlockCells(relativeBlock);
  const offset = getBlockRenderOffset(relativeBlock);
  const threshold = CELL_SIZE * 0.47 + padding;
  let bestDistanceSq = Number.POSITIVE_INFINITY;

  for (const cell of cells) {
    const centerX = block.x + cell.x * CELL_SIZE - offset.x;
    const centerY = block.y + cell.y * CELL_SIZE - offset.y;
    const dx = worldX - centerX;
    const dy = worldY - centerY;
    if (Math.abs(dx) <= threshold && Math.abs(dy) <= threshold) {
      bestDistanceSq = Math.min(bestDistanceSq, dx * dx + dy * dy);
    }
  }

  return bestDistanceSq;
}

export function chooseLooseBlockForPickup(blocks, worldX, worldY, padding = 0, centerFallbackRadius = 0) {
  let best = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  let bestLayer = Number.NEGATIVE_INFINITY;
  let bestIndex = Number.NEGATIVE_INFINITY;

  // Overlapping loot should feel spatial first. Prefer the closest valid hit,
  // then break exact ties in favor of persistent death-drop loot and newer draw-order blocks.
  const consider = (block, index, distanceSq) => {
    const layer = block.persistentSalvage ? 1 : 0;
    const beatsByDistance = distanceSq + 0.000001 < bestDistanceSq;
    const tiesOnDistance = Math.abs(distanceSq - bestDistanceSq) <= 0.000001;
    const beatsByLayer = tiesOnDistance && layer > bestLayer;
    const beatsByIndex = tiesOnDistance && layer === bestLayer && index > bestIndex;
    if (beatsByDistance || beatsByLayer || beatsByIndex) {
      best = block;
      bestDistanceSq = distanceSq;
      bestLayer = layer;
      bestIndex = index;
    }
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.destroyed) {
      continue;
    }
    const distanceSq = getLooseBlockPickDistanceSq(block, worldX, worldY, padding);
    if (Number.isFinite(distanceSq)) {
      consider(block, index, distanceSq);
    }
  }

  if (best) {
    return best;
  }

  if (centerFallbackRadius <= 0) {
    return null;
  }

  const radiusSq = centerFallbackRadius * centerFallbackRadius;
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.destroyed) {
      continue;
    }
    const dx = worldX - block.x;
    const dy = worldY - block.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq <= radiusSq) {
      consider(block, index, distanceSq);
    }
  }

  return best;
}

export function shouldBulletHitLooseBlock(bullet, block) {
  if (!bullet || !block) {
    return false;
  }
  return canDamageLooseBlock(block);
}

export function resolveDraggedLooseDrop({ source = "loose", hasMoved = false, hasSnap = false }) {
  if (source === "loose" && !hasMoved) {
    return "restore-origin";
  }
  if (hasSnap) {
    return "attach";
  }
  if (source === "loose" || source === "detached") {
    return "drop-loose";
  }
  return "discard";
}

export function resolveShipBoardPointerAction({
  scene = "run",
  button = 0,
  mountedType = null,
  hasLooseTarget = false
}) {
  if (scene !== "builder" && scene !== "run") {
    return null;
  }

  const canDetachMounted = mountedType && mountedType !== "cockpit";
  if (button === 2 && canDetachMounted) {
    return "detach";
  }
  if (button === 0 && canDetachMounted) {
    return "detach-drag";
  }
  if (button === 0 && hasLooseTarget) {
    return "drag-loose";
  }
  return null;
}

export function canDamageLooseBlock(block) {
  if (!block || block.destroyed) {
    return false;
  }
  return (block.damageGrace ?? 0) <= 0;
}

function getBlockLocalCenter(block) {
  const offset = getBlockRenderOffset(block);
  return {
    x: block.x * CELL_SIZE + offset.x,
    y: block.y * CELL_SIZE + offset.y
  };
}

export function getBlockStats(block) {
  const quality = getQuality(block);
  if (block.type === "cockpit") {
    return { hp: BLOCK_DEFS.cockpit.baseHp };
  }
  if (block.type === "hull") {
    return {
      hp: getDurabilityHp(quality, getHullDurabilityFactor(block))
    };
  }
  if (block.type === "blaster") {
    const variantStats = BLOCK_DEFS.blaster.variants[block.variant ?? "single"];
    const speedMultiplier =
      (quality.speedMultiplier ?? 1) * (block.builtIn ? BUILT_IN_BLASTER_SPEED_MULTIPLIER : 1);
    const rangeMultiplier =
      (quality.rangeMultiplier ?? 1) * (block.builtIn ? BUILT_IN_BLASTER_RANGE_MULTIPLIER : 1);
    const ttlMultiplier = rangeMultiplier / speedMultiplier;
    const cooldownMultiplier =
      (quality.cooldownMultiplier ?? 1) * (block.builtIn ? BUILT_IN_BLASTER_COOLDOWN_MULTIPLIER : 1);
    return {
      hp: getDurabilityHp(quality, BLOCK_DEFS.blaster.durabilityFactor),
      damage: variantStats.damage * quality.powerMultiplier,
      cooldown: variantStats.cooldown * cooldownMultiplier,
      speed: variantStats.speed * speedMultiplier,
      ttl: BLASTER_BASE_TTL * ttlMultiplier,
      spread: variantStats.spread,
      offsets: variantStats.offsets ?? [0]
    };
  }
  if (block.type === "thruster") {
    return {
      hp: getDurabilityHp(quality, BLOCK_DEFS.thruster.durabilityFactor),
      thrust: BLOCK_DEFS.thruster.baseThrust * quality.thrustMultiplier
    };
  }
  if (block.type === "shield") {
    return {
      hp: getDurabilityHp(quality, BLOCK_DEFS.shield.durabilityFactor),
      damageScale: BLOCK_DEFS.shield.damageScale,
      reflectBoost: BLOCK_DEFS.shield.reflectBoost * quality.powerMultiplier
    };
  }
  return { hp: 10 };
}

export function getBlockAttachableSides(block) {
  if (block.type === "cockpit") {
    return BLOCK_DEFS.cockpit.attachableSides;
  }
  if (block.type === "hull") {
    return BLOCK_DEFS.hull.attachableSides;
  }
  return [];
}

export function getOccupiedMap(ship) {
  const occupied = new Map();
  for (const block of ship.blocks) {
    for (const cell of getBlockCells(block)) {
      occupied.set(`${cell.x},${cell.y}`, block);
    }
  }
  return occupied;
}

function getBlockCellSet(block) {
  return new Set(getBlockCells(block).map((cell) => `${cell.x},${cell.y}`));
}

function getBoundaryConnectionFlags(block, cell, side, cellSet) {
  const vector = SIDE_VECTORS[side];
  const outwardKey = `${cell.x + vector.x},${cell.y + vector.y}`;
  const isPerimeter = !cellSet.has(outwardKey);

  if (!isPerimeter) {
    return { attachable: false, attaching: false };
  }

  if (block.type === "cockpit" || block.type === "hull") {
    return {
      attachable: getBlockAttachableSides(block).includes(side),
      attaching: false
    };
  }

  return {
    attachable: false,
    attaching: side === block.attachSide
  };
}

function blocksConnectAcrossBoundary(block, neighbor, cell, side, cellSets) {
  const neighborCell = {
    x: cell.x + SIDE_VECTORS[side].x,
    y: cell.y + SIDE_VECTORS[side].y
  };
  const blockFlags = getBoundaryConnectionFlags(block, cell, side, cellSets.get(block.id));
  const neighborFlags = getBoundaryConnectionFlags(
    neighbor,
    neighborCell,
    oppositeSide(side),
    cellSets.get(neighbor.id)
  );

  return (
    (blockFlags.attachable && (neighborFlags.attachable || neighborFlags.attaching)) ||
    (neighborFlags.attachable && blockFlags.attaching)
  );
}

export function getOpenSockets(ship) {
  const occupied = getOccupiedMap(ship);
  const sockets = [];
  for (const block of ship.blocks) {
    const blockCells = getBlockCells(block);
    const blockKeys = new Set(blockCells.map((cell) => `${cell.x},${cell.y}`));
    for (const side of getBlockAttachableSides(block)) {
      const vector = SIDE_VECTORS[side];
      for (const cell of blockCells) {
        const socketX = cell.x + vector.x;
        const socketY = cell.y + vector.y;
        const key = `${socketX},${socketY}`;
        if (blockKeys.has(key) || occupied.has(key)) {
          continue;
        }
        sockets.push({
          parentId: block.id,
          x: socketX,
          y: socketY,
          side
        });
      }
    }
  }
  return sockets;
}

export function canAttachLooseBlock(ship, looseBlock, socket) {
  if (looseBlock.type === "cockpit") {
    return false;
  }
  const occupied = getOccupiedMap(ship);
  if (occupied.has(`${socket.x},${socket.y}`)) {
    return false;
  }
  const placement = getBlockPlacementForSocket(looseBlock, socket);
  if (!placement) {
    return false;
  }
  const placedBlock = {
    ...looseBlock,
    x: socket.x,
    y: socket.y,
    orientation: placement.orientation,
    attachSide: placement.attachSide
  };
  return getBlockCells(placedBlock).every((cell) => !occupied.has(`${cell.x},${cell.y}`));
}

export function getBlockPlacementForSocket(looseBlock, socket) {
  if (looseBlock.type === "cockpit") {
    return null;
  }

  if (looseBlock.type === "hull") {
    return {
      orientation: looseBlock.variant === "single" ? looseBlock.orientation : socket.side,
      attachSide: oppositeSide(socket.side)
    };
  }

  if (looseBlock.type === "blaster" || looseBlock.type === "shield") {
    return {
      orientation: socket.side,
      attachSide: oppositeSide(socket.side)
    };
  }

  if (looseBlock.type === "thruster") {
    const mountSide = oppositeSide(socket.side);
    return {
      orientation: mountSide,
      attachSide: mountSide
    };
  }

  return null;
}

export function chooseBestSnapCandidate(looseBlock, candidates, preferredPosition = null) {
  if (candidates.length === 0) {
    return null;
  }

  // Keep rotation anchored to the current snap cell when that cell is still legal.
  const positionPool =
    preferredPosition &&
    candidates.some(
      (candidate) => candidate.x === preferredPosition.x && candidate.y === preferredPosition.y
    )
      ? candidates.filter(
          (candidate) => candidate.x === preferredPosition.x && candidate.y === preferredPosition.y
        )
      : candidates;

  const matchingOrientation = positionPool.filter(
    (candidate) => candidate.placement.orientation === looseBlock.orientation
  );
  const pool = matchingOrientation.length > 0 ? matchingOrientation : positionPool;

  return pool.reduce((best, candidate) => {
    if (!best || candidate.gap < best.gap) {
      return candidate;
    }
    return best;
  }, null);
}

export function attachLooseBlock(ship, looseBlock, socket) {
  const placement = getBlockPlacementForSocket(looseBlock, socket);
  if (!placement) {
    return null;
  }
  const occupied = getOccupiedMap(ship);
  const placedBlock = {
    ...looseBlock,
    x: socket.x,
    y: socket.y,
    orientation: placement.orientation,
    attachSide: placement.attachSide
  };
  if (getBlockCells(placedBlock).some((cell) => occupied.has(`${cell.x},${cell.y}`))) {
    return null;
  }
  const block = materializeBlock({
    id: makeId("block", nextBlockId++),
    type: looseBlock.type,
    x: socket.x,
    y: socket.y,
    quality: looseBlock.quality,
    orientation: placement.orientation,
    variant: looseBlock.variant ?? "single",
    attachSide: placement.attachSide,
    maxHp: looseBlock.maxHp,
    hp: looseBlock.hp
  });
  ship.blocks.push(block);
  return block;
}

export function getCockpit(ship) {
  return ship.blocks.find((block) => block.type === "cockpit");
}

export function getCockpitOpenSides(ship) {
  const cockpit = getCockpit(ship);
  const openSides = {
    north: false,
    east: false,
    south: false,
    west: false
  };

  if (!cockpit) {
    return openSides;
  }

  const occupied = getOccupiedMap(ship);
  for (const side of SIDE_ORDER) {
    const vector = SIDE_VECTORS[side];
    openSides[side] = !occupied.has(`${cockpit.x + vector.x},${cockpit.y + vector.y}`);
  }

  return openSides;
}

export function worldToLocal(ship, worldX, worldY) {
  const dx = worldX - ship.x;
  const dy = worldY - ship.y;
  return rotate(dx, dy, -ship.angle);
}

export function localToWorld(ship, localX, localY) {
  const rotated = rotate(localX, localY, ship.angle);
  return { x: ship.x + rotated.x, y: ship.y + rotated.y };
}

export function getBlockWorldPosition(ship, block) {
  const offset = getBlockRenderOffset(block);
  return localToWorld(ship, block.x * CELL_SIZE + offset.x, block.y * CELL_SIZE + offset.y);
}

export function getShipCellOverlap(leftShip, leftCell, rightShip, rightCell, halfExtent = CELL_SIZE * 0.47) {
  const leftWorld = localToWorld(leftShip, leftCell.x * CELL_SIZE, leftCell.y * CELL_SIZE);
  const rightWorld = localToWorld(rightShip, rightCell.x * CELL_SIZE, rightCell.y * CELL_SIZE);
  const leftAxes = [rotate(1, 0, leftShip.angle), rotate(0, 1, leftShip.angle)];
  const rightAxes = [rotate(1, 0, rightShip.angle), rotate(0, 1, rightShip.angle)];
  const testAxes = [...leftAxes, ...rightAxes];
  const betweenX = rightWorld.x - leftWorld.x;
  const betweenY = rightWorld.y - leftWorld.y;
  let minOverlap = Number.POSITIVE_INFINITY;
  let bestAxis = null;

  for (const axis of testAxes) {
    const centerDistance = Math.abs(dot(betweenX, betweenY, axis.x, axis.y));
    const leftRadius =
      halfExtent *
      (Math.abs(dot(axis.x, axis.y, leftAxes[0].x, leftAxes[0].y)) +
        Math.abs(dot(axis.x, axis.y, leftAxes[1].x, leftAxes[1].y)));
    const rightRadius =
      halfExtent *
      (Math.abs(dot(axis.x, axis.y, rightAxes[0].x, rightAxes[0].y)) +
        Math.abs(dot(axis.x, axis.y, rightAxes[1].x, rightAxes[1].y)));
    const overlap = leftRadius + rightRadius - centerDistance;
    if (overlap <= 0) {
      return null;
    }
    if (overlap < minOverlap) {
      minOverlap = overlap;
      const axisSign = dot(betweenX, betweenY, axis.x, axis.y) >= 0 ? 1 : -1;
      bestAxis = { x: axis.x * axisSign, y: axis.y * axisSign };
    }
  }

  return {
    penetration: minOverlap,
    normalX: bestAxis?.x ?? 1,
    normalY: bestAxis?.y ?? 0
  };
}

export function getShipCollisionOverlap(leftShip, rightShip) {
  let bestOverlap = null;

  for (const leftBlock of leftShip.blocks) {
    const leftCells = getBlockCells(leftBlock);
    for (const rightBlock of rightShip.blocks) {
      const rightCells = getBlockCells(rightBlock);
      for (const leftCell of leftCells) {
        for (const rightCell of rightCells) {
          const overlap = getShipCellOverlap(leftShip, leftCell, rightShip, rightCell);
          if (overlap && (!bestOverlap || overlap.penetration > bestOverlap.penetration)) {
            bestOverlap = overlap;
          }
        }
      }
    }
  }

  return bestOverlap;
}

export function getBlockAtLocalPoint(ship, localX, localY, padding = 0) {
  let closest = null;
  let closestDistanceSq = Number.POSITIVE_INFINITY;

  for (const block of ship.blocks) {
    for (const cell of getBlockCells(block)) {
      const centerX = cell.x * CELL_SIZE;
      const centerY = cell.y * CELL_SIZE;
      const dx = localX - centerX;
      const dy = localY - centerY;
      const threshold = CELL_SIZE * 0.47 + padding;
      if (
        Math.abs(dx) <= threshold &&
        Math.abs(dy) <= threshold
      ) {
        const distanceSq = dx * dx + dy * dy;
        if (distanceSq < closestDistanceSq) {
          closest = block;
          closestDistanceSq = distanceSq;
        }
      }
    }
  }
  return closest;
}

export function findConnectedBlockIds(ship) {
  const cockpit = getCockpit(ship);
  if (!cockpit) {
    return new Set();
  }

  const occupied = getOccupiedMap(ship);
  const cellSets = new Map(ship.blocks.map((block) => [block.id, getBlockCellSet(block)]));
  const visited = new Set([cockpit.id]);
  const queue = [cockpit];

  while (queue.length > 0) {
    const block = queue.shift();
    for (const cell of getBlockCells(block)) {
      for (const side of SIDE_ORDER) {
        const vector = SIDE_VECTORS[side];
        const neighbor = occupied.get(`${cell.x + vector.x},${cell.y + vector.y}`);
        // Connectivity follows actual attaching / attachable faces, not raw adjacency.
        if (
          neighbor &&
          neighbor.id !== block.id &&
          !visited.has(neighbor.id) &&
          blocksConnectAcrossBoundary(block, neighbor, cell, side, cellSets)
        ) {
          visited.add(neighbor.id);
          queue.push(neighbor);
        }
      }
    }
  }

  return visited;
}

export function ejectDisconnectedBlocks(ship) {
  const connected = findConnectedBlockIds(ship);
  const ejected = [];
  ship.blocks = ship.blocks.filter((block) => {
    if (block.type === "cockpit" || connected.has(block.id)) {
      return true;
    }
    ejected.push(block);
    return false;
  });
  return ejected;
}

export function removeBlock(ship, blockId) {
  const target = ship.blocks.find((block) => block.id === blockId);
  if (!target) {
    return { destroyed: null, looseBlocks: [] };
  }

  ship.blocks = ship.blocks.filter((block) => block.id !== blockId);
  const looseBlocks = ejectDisconnectedBlocks(ship);
  return {
    destroyed: target,
    looseBlocks
  };
}

export function getShipSalvageBlocks(ship) {
  return ship.blocks.filter((block) => block.type !== "cockpit" && block.hp > 0);
}

export function prepareShipDeathSalvageBlocks(ship, hpFloorRatio = SHIP_DEATH_SALVAGE_HP_FLOOR_RATIO) {
  return getShipSalvageBlocks(ship).map((block) => {
    const maxHp = block.maxHp ?? getBlockStats(block).hp;
    return {
      ...block,
      hp: Math.max(block.hp, maxHp * hpFloorRatio),
      maxHp,
      flash: 0
    };
  });
}

export function getShipDeathSalvageSpawnState(ship, block) {
  const world = getBlockWorldPosition(ship, block);
  let direction = normalize(world.x - ship.x, world.y - ship.y);

  if (Math.abs(world.x - ship.x) < 0.0001 && Math.abs(world.y - ship.y) < 0.0001) {
    const fallbackSide = block.attachSide ?? oppositeSide(block.orientation ?? "north");
    const fallback = rotate(
      SIDE_VECTORS[fallbackSide]?.x ?? 0,
      SIDE_VECTORS[fallbackSide]?.y ?? -1,
      ship.angle
    );
    direction = normalize(fallback.x, fallback.y);
  }

  return {
    x: world.x + direction.x * SHIP_DEATH_SALVAGE_EJECT_OFFSET,
    y: world.y + direction.y * SHIP_DEATH_SALVAGE_EJECT_OFFSET,
    vx: ship.vx + direction.x * SHIP_DEATH_SALVAGE_EJECT_SPEED,
    vy: ship.vy + direction.y * SHIP_DEATH_SALVAGE_EJECT_SPEED
  };
}

export function isCockpitFrontOpen(ship) {
  return getCockpitOpenSides(ship).north;
}

export function getBuiltInBlaster(ship) {
  const cockpit = getCockpit(ship);
  if (!cockpit || !isCockpitFrontOpen(ship) || ship?.team !== "player") {
    return null;
  }

  return {
    parentId: cockpit.id,
    x: cockpit.x,
    y: cockpit.y,
    orientation: "north",
    quality: "red",
    variant: "single",
    type: "blaster",
    builtIn: true
  };
}

export function applyCockpitRegen(ship, dt, secondsToFull = COCKPIT_REGEN_SECONDS) {
  if (!ship?.alive || dt <= 0 || secondsToFull <= 0) {
    return null;
  }

  const cockpit = getCockpit(ship);
  if (!cockpit || cockpit.destroyed) {
    return null;
  }

  const maxHp = cockpit.maxHp ?? getBlockStats(cockpit).hp;
  cockpit.maxHp = maxHp;
  cockpit.hp = Math.min(maxHp, cockpit.hp + (maxHp / secondsToFull) * dt);
  return cockpit;
}

function getBlockMassFactor(block) {
  return BLOCK_DEFS[block.type]?.massFactor ?? 1;
}

export function getMass(ship) {
  const massUnits = ship.blocks.reduce(
    (sum, block) => sum + getBlockCells(block).length * getBlockMassFactor(block),
    0
  );
  return 1.8 + massUnits * 0.75;
}

export function getCenterOfMass(ship) {
  let sumX = 0;
  let sumY = 0;
  let totalWeight = 0;

  for (const block of ship.blocks) {
    const cellWeight = getBlockMassFactor(block);
    for (const cell of getBlockCells(block)) {
      sumX += cell.x * CELL_SIZE * cellWeight;
      sumY += cell.y * CELL_SIZE * cellWeight;
      totalWeight += cellWeight;
    }
  }

  if (totalWeight === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: sumX / totalWeight,
    y: sumY / totalWeight
  };
}

function getTorqueFromForce(pointX, pointY, forceX, forceY, centerOfMass) {
  const offsetX = pointX - centerOfMass.x;
  const offsetY = pointY - centerOfMass.y;
  return offsetX * forceY - offsetY * forceX;
}

export function getInertia(ship) {
  const centerOfMass = getCenterOfMass(ship);
  let inertia = 1800;
  for (const block of ship.blocks) {
    const cellWeight = getBlockMassFactor(block);
    for (const cell of getBlockCells(block)) {
      const dx = cell.x * CELL_SIZE - centerOfMass.x;
      const dy = cell.y * CELL_SIZE - centerOfMass.y;
      const distanceSq = (dx * dx + dy * dy) / (CELL_SIZE * CELL_SIZE) + 1;
      inertia += distanceSq * 160 * cellWeight;
    }
  }
  return inertia;
}

export function selectThrustersForInput(ship, input) {
  const desiredMove = {
    x: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    y: (input.down ? 1 : 0) - (input.up ? 1 : 0)
  };
  const desiredTorque = (input.turnRight ? 1 : 0) - (input.turnLeft ? 1 : 0);
  const active = [];
  let localForceX = 0;
  let localForceY = 0;
  let torque = 0;
  ship.builtInThrustersActive = {
    west: false,
    east: false,
    south: false
  };
  const centerOfMass = getCenterOfMass(ship);

  const cockpit = getCockpit(ship);
  const cockpitOpenSides = getCockpitOpenSides(ship);
  if (cockpit) {
    if (input.up && cockpitOpenSides.south) {
      ship.builtInThrustersActive.south = true;
      const forceY = -COCKPIT_BUILTIN_THRUST;
      localForceY += forceY;
      torque += getTorqueFromForce(
        cockpit.x * CELL_SIZE,
        cockpit.y * CELL_SIZE + HALF_CELL * 0.9,
        0,
        forceY,
        centerOfMass
      );
      active.push(`${cockpit.id}-builtin-south`);
    }
    if (input.down && cockpitOpenSides.south) {
      ship.builtInThrustersActive.south = true;
      const forceY = COCKPIT_BUILTIN_REVERSE_THRUST;
      localForceY += forceY;
      torque += getTorqueFromForce(
        cockpit.x * CELL_SIZE,
        cockpit.y * CELL_SIZE + HALF_CELL * 0.9,
        0,
        forceY,
        centerOfMass
      );
      active.push(`${cockpit.id}-builtin-reverse`);
    }
    if (input.turnLeft && cockpitOpenSides.east) {
      ship.builtInThrustersActive.east = true;
      torque -= COCKPIT_BUILTIN_TORQUE;
      active.push(`${cockpit.id}-builtin-east`);
    }
    if (input.turnRight && cockpitOpenSides.west) {
      ship.builtInThrustersActive.west = true;
      torque += COCKPIT_BUILTIN_TORQUE;
      active.push(`${cockpit.id}-builtin-west`);
    }
  }

  for (const block of ship.blocks) {
    block.active = false;
    if (block.type !== "thruster") {
      continue;
    }

    const vector = SIDE_VECTORS[block.orientation];
    const stats = getBlockStats(block);
    const forceX = vector.x * stats.thrust;
    const forceY = vector.y * stats.thrust;
    const translationScore = dot(forceX, forceY, desiredMove.x, desiredMove.y);
    const blockCenter = getBlockLocalCenter(block);
    const blockTorque = getTorqueFromForce(
      blockCenter.x,
      blockCenter.y,
      forceX,
      forceY,
      centerOfMass
    );
    const sideMountedYawTorque =
      Math.abs(blockTorque) <= 1 &&
      (block.orientation === "east" || block.orientation === "west") &&
      (block.attachSide === "east" || block.attachSide === "west")
        ? (block.attachSide === "west" ? -1 : 1) * stats.thrust * SIDE_THRUSTER_YAW_ARM
        : 0;
    const effectiveTorque = Math.abs(blockTorque) > 1 ? blockTorque : sideMountedYawTorque;
    const torqueScore = desiredTorque === 0 ? 0 : effectiveTorque * desiredTorque;
    const activateForTranslation = translationScore > 1;
    const activateForTorque = torqueScore > 1;

    if (activateForTranslation || activateForTorque) {
      block.active = true;
      active.push(block.id);
      if (activateForTranslation || Math.abs(blockTorque) > 1) {
        localForceX += forceX;
        localForceY += forceY;
      }
      if (activateForTranslation) {
        torque += blockTorque;
      } else if (activateForTorque) {
        torque += effectiveTorque;
      }
    }
  }

  return {
    active,
    localForceX,
    localForceY,
    torque
  };
}

export function makeLooseFromBlock(block, worldX, worldY, velocity = { x: 0, y: 0 }, options = {}) {
  return {
    id: makeId("loose", nextBlockId++),
    sourceBlockId: block.id,
    type: block.type,
    quality: block.quality,
    orientation: block.orientation,
    variant: block.variant ?? "single",
    attachSide: block.attachSide ?? getDefaultAttachSide(block.type, block.orientation),
    x: worldX,
    y: worldY,
    vx: velocity.x,
    vy: velocity.y,
    maxHp: block.maxHp ?? getBlockStats(block).hp,
    hp: block.hp ?? getBlockStats(block).hp,
    flash: 0,
    damageGrace: options.damageGrace ?? 0,
    persistentSalvage: options.persistentSalvage ?? false
  };
}

const ENEMY_QUALITY_PALETTE = ["grey", "red", "orange", "yellow", "green", "blue", "purple", "white", "rainbow"];
const ENEMY_QUALITY_VARIANCE_WEIGHTS = {
  "-1": 0.22,
  "0": 0.56,
  "1": 0.22
};

function mirrorEnemySymmetrySide(side) {
  if (side === "east") {
    return "west";
  }
  if (side === "west") {
    return "east";
  }
  return side;
}

function getEnemyQualitySymmetryKey(step) {
  const normalizedSide =
    step.socket.x < 0 ? mirrorEnemySymmetrySide(step.socket.side) : step.socket.side;
  return [
    step.type,
    step.variant ?? "single",
    Math.abs(step.socket.x),
    step.socket.y,
    normalizedSide
  ].join("|");
}

function getEnemyQualityIdForOffset(baseQualityId, offset = 0) {
  const baseIndex = getQualityIndex(baseQualityId);
  const resolvedIndex = clamp(baseIndex + offset, 0, QUALITY_TIERS.length - 1);
  return QUALITY_TIERS[resolvedIndex]?.id ?? baseQualityId;
}

function chooseEnemyQualityOffset(baseQualityId, rng) {
  const baseIndex = getQualityIndex(baseQualityId);
  const allowedOffsets = [-1, 0, 1].filter((offset) => {
    const nextIndex = baseIndex + offset;
    return nextIndex >= 0 && nextIndex < ENEMY_QUALITY_PALETTE.length;
  });

  return chooseWeighted(
    allowedOffsets,
    (offset) => ENEMY_QUALITY_VARIANCE_WEIGHTS[String(offset)] ?? 0,
    rng
  );
}

function resolveEnemyStepQualities(buildSteps, baseQualityId, rng = null) {
  if (typeof rng !== "function") {
    return buildSteps.map(() => baseQualityId);
  }

  const symmetryKeys = buildSteps.map((step) => getEnemyQualitySymmetryKey(step));
  const uniqueKeys = [...new Set(symmetryKeys)];
  const offsetsByKey = new Map();
  const baseIndex = getQualityIndex(baseQualityId);
  const allowedNonZeroOffsets = [-1, 1].filter((offset) => {
    const nextIndex = baseIndex + offset;
    return nextIndex >= 0 && nextIndex < ENEMY_QUALITY_PALETTE.length;
  });
  let hasVariance = false;

  for (const key of uniqueKeys) {
    const offset = chooseEnemyQualityOffset(baseQualityId, rng);
    offsetsByKey.set(key, offset);
    hasVariance ||= offset !== 0;
  }

  if (!hasVariance && allowedNonZeroOffsets.length > 0 && uniqueKeys.length > 0) {
    const forcedKey = uniqueKeys[Math.floor(rng() * uniqueKeys.length)];
    const forcedOffset = chooseWeighted(
      allowedNonZeroOffsets,
      (offset) => ENEMY_QUALITY_VARIANCE_WEIGHTS[String(offset)] ?? 0,
      rng
    );
    offsetsByKey.set(forcedKey, forcedOffset);
  }

  return symmetryKeys.map((key) => getEnemyQualityIdForOffset(baseQualityId, offsetsByKey.get(key) ?? 0));
}

function cloneEnemyBuildStep(step) {
  return {
    ...step,
    socket: { ...step.socket }
  };
}

function cloneEnemyBlockRef(ref) {
  return {
    ...ref
  };
}

function cloneEnemyBuildSteps(buildSteps) {
  return buildSteps.map((step) => cloneEnemyBuildStep(step));
}

function matchesEnemySocket(left, right) {
  return left.x === right.x && left.y === right.y && left.side === right.side;
}

function buildEnemyVariant(baseSteps, extraSteps = [], replacements = []) {
  const steps = cloneEnemyBuildSteps(baseSteps);

  for (const replacement of replacements) {
    const index = steps.findIndex((step) => matchesEnemySocket(step.socket, replacement.socket));
    if (index === -1) {
      throw new Error(`Missing enemy variant socket ${JSON.stringify(replacement.socket)}`);
    }
    steps[index] = {
      ...steps[index],
      ...replacement.updates,
      socket: {
        ...steps[index].socket,
        ...(replacement.updates.socket ?? {})
      }
    };
  }

  return steps.concat(cloneEnemyBuildSteps(extraSteps));
}

function makeEnemyShipDesign({
  id,
  archetypeId,
  label,
  spawnWeight = 1,
  minLevel = 1,
  tags = [],
  buildSteps,
  removeBlocks = [],
  aiProfileWeightMultipliers = null
}) {
  return {
    id,
    archetypeId,
    label,
    spawnWeight,
    minLevel,
    tags: [...tags],
    buildSteps: cloneEnemyBuildSteps(buildSteps),
    removeBlocks: removeBlocks.map((ref) => cloneEnemyBlockRef(ref)),
    aiProfileWeightMultipliers: aiProfileWeightMultipliers ? { ...aiProfileWeightMultipliers } : null
  };
}

const ENEMY_ARCHETYPE_BASE_STEPS = {
  needle: [
    { type: "hull", variant: "triple", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: -1, y: 3, side: "west" } },
    { type: "thruster", socket: { x: 1, y: 3, side: "east" } },
    { type: "thruster", socket: { x: 0, y: 4, side: "south" } }
  ],
  bulwark: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -3, y: 0, side: "west" } },
    { type: "shield", socket: { x: 3, y: 0, side: "east" } },
    { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
  ],
  manta: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 2, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: -2, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 2, y: 1, side: "south" } }
  ],
  fortress: [
    { type: "hull", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "hull", variant: "double", socket: { x: -1, y: -1, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: -1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 2, y: 1, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 2, side: "south" } },
    { type: "hull", variant: "double", socket: { x: -1, y: 2, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 2, side: "east" } },
    { type: "blaster", variant: "single", socket: { x: -2, y: -2, side: "north" } },
    { type: "blaster", variant: "dual", socket: { x: 0, y: -2, side: "north" } },
    { type: "blaster", variant: "single", socket: { x: 2, y: -2, side: "north" } },
    { type: "shield", socket: { x: -3, y: 0, side: "west" } },
    { type: "shield", socket: { x: 3, y: 0, side: "east" } },
    { type: "thruster", socket: { x: -1, y: 3, side: "south" } },
    { type: "thruster", socket: { x: 0, y: 3, side: "south" } },
    { type: "thruster", socket: { x: 1, y: 3, side: "south" } }
  ]
};

const ENEMY_ARCHETYPE_ALT_STEPS = {
  needleCompact: [
    { type: "hull", variant: "double", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
  ],
  needleLong: [
    { type: "hull", variant: "triple", socket: { x: 0, y: 1, side: "south" } },
    { type: "hull", variant: "triple", socket: { x: 0, y: 4, side: "south" } },
    { type: "blaster", variant: "dual", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 7, side: "south" } }
  ],
  bulwarkCompact: [
    { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -2, y: 0, side: "west" } },
    { type: "shield", socket: { x: 2, y: 0, side: "east" } },
    { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 1, y: 1, side: "south" } },
    { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
  ],
  bulwarkWall: [
    { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
    { type: "hull", variant: "double", socket: { x: -3, y: 0, side: "west" } },
    { type: "hull", variant: "double", socket: { x: 3, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
    { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
    { type: "shield", socket: { x: -5, y: 0, side: "west" } },
    { type: "shield", socket: { x: 5, y: 0, side: "east" } },
    { type: "thruster", socket: { x: 0, y: 2, side: "south" } }
  ],
  mantaCompact: [
    { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
    { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
    { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
  ],
  mantaWide: buildEnemyVariant(ENEMY_ARCHETYPE_BASE_STEPS.manta, [
    { type: "hull", variant: "single", socket: { x: -3, y: 0, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 0, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 3, y: -1, side: "north" } },
    { type: "hull", variant: "single", socket: { x: 0, y: 2, side: "south" } }
  ]),
  fortressOuter: buildEnemyVariant(ENEMY_ARCHETYPE_BASE_STEPS.fortress, [
    { type: "hull", variant: "single", socket: { x: -3, y: -1, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: -1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: 1, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 1, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -3, y: 2, side: "west" } },
    { type: "hull", variant: "single", socket: { x: 3, y: 2, side: "east" } },
    { type: "hull", variant: "single", socket: { x: -2, y: 3, side: "south" } },
    { type: "hull", variant: "single", socket: { x: 2, y: 3, side: "south" } },
    { type: "shield", socket: { x: -4, y: 1, side: "west" } },
    { type: "shield", socket: { x: 4, y: 1, side: "east" } }
  ])
};

const FORTRESS_BOSS_BUILD_STEPS = [
  { type: "hull", variant: "triple", socket: { x: -1, y: 0, side: "west" } },
  { type: "hull", variant: "triple", socket: { x: 1, y: 0, side: "east" } },
  { type: "hull", variant: "double", socket: { x: -3, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: -2, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: -1, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: 0, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: 1, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: 2, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: 3, y: -1, side: "north" } },
  { type: "hull", variant: "double", socket: { x: -3, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: -2, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: -1, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: 0, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: 1, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: 2, y: 1, side: "south" } },
  { type: "hull", variant: "double", socket: { x: 3, y: 1, side: "south" } },
  { type: "hull", variant: "single", socket: { x: -4, y: -2, side: "west" } },
  { type: "hull", variant: "single", socket: { x: -4, y: -1, side: "west" } },
  { type: "hull", variant: "single", socket: { x: -4, y: 0, side: "west" } },
  { type: "hull", variant: "single", socket: { x: -4, y: 1, side: "west" } },
  { type: "hull", variant: "single", socket: { x: -4, y: 2, side: "west" } },
  { type: "hull", variant: "single", socket: { x: 4, y: -2, side: "east" } },
  { type: "hull", variant: "single", socket: { x: 4, y: -1, side: "east" } },
  { type: "hull", variant: "single", socket: { x: 4, y: 0, side: "east" } },
  { type: "hull", variant: "single", socket: { x: 4, y: 1, side: "east" } },
  { type: "hull", variant: "single", socket: { x: 4, y: 2, side: "east" } },
  { type: "blaster", variant: "single", socket: { x: -3, y: -3, side: "north" } },
  { type: "blaster", variant: "dual", socket: { x: -2, y: -3, side: "north" } },
  { type: "blaster", variant: "single", socket: { x: -1, y: -3, side: "north" } },
  { type: "blaster", variant: "spread", socket: { x: 0, y: -3, side: "north" } },
  { type: "blaster", variant: "single", socket: { x: 1, y: -3, side: "north" } },
  { type: "blaster", variant: "dual", socket: { x: 2, y: -3, side: "north" } },
  { type: "blaster", variant: "single", socket: { x: 3, y: -3, side: "north" } },
  { type: "hull", variant: "single", socket: { x: -3, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: -2, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: -1, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: 0, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: 1, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: 2, y: 3, side: "south" } },
  { type: "hull", variant: "single", socket: { x: 3, y: 3, side: "south" } },
  { type: "thruster", socket: { x: -3, y: 4, side: "south" } },
  { type: "thruster", socket: { x: -2, y: 4, side: "south" } },
  { type: "thruster", socket: { x: -1, y: 4, side: "south" } },
  { type: "thruster", socket: { x: 0, y: 4, side: "south" } },
  { type: "thruster", socket: { x: 1, y: 4, side: "south" } },
  { type: "thruster", socket: { x: 2, y: 4, side: "south" } },
  { type: "thruster", socket: { x: 3, y: 4, side: "south" } },
  { type: "thruster", socket: { x: -5, y: -2, side: "west" } },
  { type: "thruster", socket: { x: -5, y: -1, side: "west" } },
  { type: "thruster", socket: { x: -5, y: 0, side: "west" } },
  { type: "thruster", socket: { x: -5, y: 1, side: "west" } },
  { type: "thruster", socket: { x: -5, y: 2, side: "west" } },
  { type: "thruster", socket: { x: 5, y: -2, side: "east" } },
  { type: "thruster", socket: { x: 5, y: -1, side: "east" } },
  { type: "thruster", socket: { x: 5, y: 0, side: "east" } },
  { type: "thruster", socket: { x: 5, y: 1, side: "east" } },
  { type: "thruster", socket: { x: 5, y: 2, side: "east" } }
];

export const ENEMY_ARCHETYPE_DEFS = {
  needle: { id: "needle", label: "Needle", minLevel: 1, spawnWeight: 28, defaultDesignId: "needle-sting" },
  bulwark: { id: "bulwark", label: "Bulwark", minLevel: 1, spawnWeight: 26, defaultDesignId: "bulwark-guard" },
  manta: { id: "manta", label: "Manta", minLevel: 1, spawnWeight: 26, defaultDesignId: "manta-glide" },
  fortress: { id: "fortress", label: "Fortress", minLevel: 3, spawnWeight: 20, defaultDesignId: "fortress-bastion" }
};

export const ENEMY_SHIP_DESIGN_DEFS = [
  makeEnemyShipDesign({
    id: "needle-dart",
    archetypeId: "needle",
    label: "Dart",
    minLevel: 1,
    tags: ["small", "mobile"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.needleCompact
  }),
  makeEnemyShipDesign({
    id: "needle-sting",
    archetypeId: "needle",
    label: "Sting",
    minLevel: 1,
    tags: ["small", "mobile"],
    buildSteps: ENEMY_ARCHETYPE_BASE_STEPS.needle
  }),
  makeEnemyShipDesign({
    id: "needle-razer",
    archetypeId: "needle",
    label: "Razer",
    minLevel: 2,
    tags: ["mobile", "gunline"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_BASE_STEPS.needle,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "east" } },
        { type: "blaster", variant: "single", socket: { x: -1, y: 0, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: 0, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "needle-fork",
    archetypeId: "needle",
    label: "Fork",
    minLevel: 2,
    tags: ["mobile", "forked"],
    buildSteps: buildEnemyVariant(ENEMY_ARCHETYPE_BASE_STEPS.needle, [
      { type: "hull", variant: "single", socket: { x: -1, y: 1, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "east" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: 0, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: 0, side: "north" } },
      { type: "shield", socket: { x: -1, y: 2, side: "west" } },
      { type: "shield", socket: { x: 1, y: 2, side: "east" } }
    ], [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }])
  }),
  makeEnemyShipDesign({
    id: "needle-lance",
    archetypeId: "needle",
    label: "Lance",
    minLevel: 2,
    tags: ["mobile", "long"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.needleLong,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 5, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 5, side: "east" } },
        { type: "thruster", socket: { x: -1, y: 6, side: "south" } },
        { type: "thruster", socket: { x: 1, y: 6, side: "south" } }
      ]
    )
  }),
  makeEnemyShipDesign({
    id: "needle-javelin",
    archetypeId: "needle",
    label: "Javelin",
    minLevel: 2,
    tags: ["balanced", "long"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.needleLong,
      [
        { type: "hull", variant: "single", socket: { x: -1, y: 5, side: "west" } },
        { type: "hull", variant: "single", socket: { x: 1, y: 5, side: "east" } },
        { type: "shield", socket: { x: -2, y: 5, side: "west" } },
        { type: "shield", socket: { x: 2, y: 5, side: "east" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "needle-pike",
    archetypeId: "needle",
    label: "Pike",
    minLevel: 2,
    tags: ["low-yaw", "artillery"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.needleLong
  }),
  makeEnemyShipDesign({
    id: "bulwark-ward",
    archetypeId: "bulwark",
    label: "Ward",
    minLevel: 1,
    tags: ["small", "balanced"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
    ]
  }),
  makeEnemyShipDesign({
    id: "bulwark-guard",
    archetypeId: "bulwark",
    label: "Guard",
    minLevel: 1,
    tags: ["small", "balanced"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.bulwarkCompact
  }),
  makeEnemyShipDesign({
    id: "bulwark-trench",
    archetypeId: "bulwark",
    label: "Trench",
    minLevel: 2,
    tags: ["balanced", "gunline"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_BASE_STEPS.bulwark,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "bulwark-shelter",
    archetypeId: "bulwark",
    label: "Shelter",
    minLevel: 2,
    tags: ["slow", "wall"],
    buildSteps: buildEnemyVariant(ENEMY_ARCHETYPE_ALT_STEPS.bulwarkWall, [
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
    ])
  }),
  makeEnemyShipDesign({
    id: "bulwark-redoubt",
    archetypeId: "bulwark",
    label: "Redoubt",
    minLevel: 2,
    tags: ["balanced", "midwall"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_BASE_STEPS.bulwark,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "bulwark-rampart",
    archetypeId: "bulwark",
    label: "Rampart",
    minLevel: 2,
    tags: ["slow", "wide"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.bulwarkWall,
      [
        { type: "hull", variant: "single", socket: { x: -4, y: 1, side: "south" } },
        { type: "hull", variant: "single", socket: { x: 4, y: 1, side: "south" } },
        { type: "thruster", socket: { x: -4, y: 2, side: "south" } },
        { type: "thruster", socket: { x: 4, y: 2, side: "south" } },
        { type: "blaster", variant: "single", socket: { x: -2, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 2, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "bulwark-anchor",
    archetypeId: "bulwark",
    label: "Anchor",
    minLevel: 2,
    tags: ["slow", "low-yaw"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.bulwarkWall,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "manta-skiff",
    archetypeId: "manta",
    label: "Skiff",
    minLevel: 1,
    tags: ["small", "mobile"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
    ]
  }),
  makeEnemyShipDesign({
    id: "manta-fan",
    archetypeId: "manta",
    label: "Fan",
    minLevel: 1,
    tags: ["small", "balanced"],
    buildSteps: [
      { type: "hull", variant: "single", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "hull", variant: "single", socket: { x: -1, y: -1, side: "north" } },
      { type: "hull", variant: "single", socket: { x: 1, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: -1, y: -2, side: "north" } },
      { type: "blaster", variant: "single", socket: { x: 1, y: -2, side: "north" } },
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 0, y: 1, side: "south" } }
    ]
  }),
  makeEnemyShipDesign({
    id: "manta-glide",
    archetypeId: "manta",
    label: "Glide",
    minLevel: 1,
    tags: ["mobile", "starter"],
    buildSteps: ENEMY_ARCHETYPE_BASE_STEPS.manta
  }),
  makeEnemyShipDesign({
    id: "manta-crescent",
    archetypeId: "manta",
    label: "Crescent",
    minLevel: 2,
    tags: ["mobile", "wide"],
    buildSteps: buildEnemyVariant(ENEMY_ARCHETYPE_ALT_STEPS.mantaWide, [
      { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
    ])
  }),
  makeEnemyShipDesign({
    id: "manta-harrier",
    archetypeId: "manta",
    label: "Harrier",
    minLevel: 2,
    tags: ["mobile", "gunline"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.mantaWide,
      [
        { type: "blaster", variant: "single", socket: { x: -2, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 2, y: -2, side: "north" } },
        { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "dual" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "manta-driftwing",
    archetypeId: "manta",
    label: "Driftwing",
    minLevel: 2,
    tags: ["balanced", "wide"],
    buildSteps: buildEnemyVariant(ENEMY_ARCHETYPE_ALT_STEPS.mantaWide, [
      { type: "shield", socket: { x: -4, y: 0, side: "west" } },
      { type: "shield", socket: { x: 4, y: 0, side: "east" } }
    ])
  }),
  makeEnemyShipDesign({
    id: "manta-net",
    archetypeId: "manta",
    label: "Net",
    minLevel: 2,
    tags: ["slow", "area denial"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.mantaWide,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -1, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: -3, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 3, y: -2, side: "north" } },
        { type: "thruster", socket: { x: 0, y: 3, side: "south" } }
      ],
      [{ socket: { x: 0, y: -1, side: "north" }, updates: { variant: "spread" } }]
    )
  }),
  makeEnemyShipDesign({
    id: "fortress-bastion",
    archetypeId: "fortress",
    label: "Bastion",
    minLevel: 3,
    tags: ["balanced", "brick"],
    buildSteps: ENEMY_ARCHETYPE_BASE_STEPS.fortress
  }),
  makeEnemyShipDesign({
    id: "fortress-keep",
    archetypeId: "fortress",
    label: "Keep",
    minLevel: 3,
    tags: ["balanced", "compact"],
    buildSteps: buildEnemyVariant(ENEMY_ARCHETYPE_BASE_STEPS.fortress, [], [
      { socket: { x: -3, y: 0, side: "west" }, updates: { type: "blaster", variant: "single" } },
      { socket: { x: 3, y: 0, side: "east" }, updates: { type: "blaster", variant: "single" } }
    ])
  }),
  makeEnemyShipDesign({
    id: "fortress-gatehouse",
    archetypeId: "fortress",
    label: "Gatehouse",
    minLevel: 3,
    tags: ["slow", "hollow"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 },
      { type: "blaster", x: -2, y: -2 },
      { type: "blaster", x: 2, y: -2 },
      { type: "thruster", x: -1, y: 3 },
      { type: "thruster", x: 1, y: 3 }
    ]
  }),
  makeEnemyShipDesign({
    id: "fortress-voidshell",
    archetypeId: "fortress",
    label: "Voidshell",
    minLevel: 4,
    tags: ["balanced", "ring"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 },
      { type: "hull", x: 0, y: 2 }
    ]
  }),
  makeEnemyShipDesign({
    id: "fortress-arsenal",
    archetypeId: "fortress",
    label: "Arsenal",
    minLevel: 4,
    tags: ["balanced", "edge guns"],
    buildSteps: buildEnemyVariant(
      ENEMY_ARCHETYPE_ALT_STEPS.fortressOuter,
      [
        { type: "blaster", variant: "single", socket: { x: -1, y: -2, side: "north" } },
        { type: "blaster", variant: "single", socket: { x: 1, y: -2, side: "north" } }
      ],
      [
        { socket: { x: 0, y: -2, side: "north" }, updates: { variant: "spread" } },
        { socket: { x: -3, y: 0, side: "west" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: 3, y: 0, side: "east" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: -4, y: 1, side: "west" }, updates: { type: "blaster", variant: "single" } },
        { socket: { x: 4, y: 1, side: "east" }, updates: { type: "blaster", variant: "single" } }
      ]
    )
  }),
  makeEnemyShipDesign({
    id: "fortress-citadel",
    archetypeId: "fortress",
    label: "Citadel",
    minLevel: 4,
    tags: ["slow", "low-yaw"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.fortressOuter,
    removeBlocks: [
      { type: "thruster", x: -1, y: 3 },
      { type: "thruster", x: 1, y: 3 }
    ]
  }),
  makeEnemyShipDesign({
    id: "fortress-ringwall",
    archetypeId: "fortress",
    label: "Ringwall",
    minLevel: 4,
    tags: ["balanced", "hollow"],
    buildSteps: ENEMY_ARCHETYPE_ALT_STEPS.fortressOuter,
    removeBlocks: [
      { type: "hull", x: -1, y: 1 },
      { type: "hull", x: 0, y: 1 },
      { type: "hull", x: 1, y: 1 }
    ]
  })
];

export const ENEMY_BOSS_SHIP_DESIGN_DEFS = [
  makeEnemyShipDesign({
    id: "fortress-warheart",
    archetypeId: "fortress",
    label: "Warheart",
    spawnWeight: 0.18,
    minLevel: 6,
    tags: ["boss", "aggressive", "broad"],
    buildSteps: FORTRESS_BOSS_BUILD_STEPS,
    aiProfileWeightMultipliers: {
      punchingBag: 0.25,
      slowReacting: 0.4,
      wontAttackFirst: 0.45,
      cautious: 0.85,
      opportunist: 1.05,
      aggressive: 2.8,
      berserker: 2
    }
  })
];

const ALL_ENEMY_SHIP_DESIGN_DEFS = [...ENEMY_SHIP_DESIGN_DEFS, ...ENEMY_BOSS_SHIP_DESIGN_DEFS];

const ENEMY_SHIP_DESIGNS_BY_ID = Object.fromEntries(
  ALL_ENEMY_SHIP_DESIGN_DEFS.map((definition) => [definition.id, definition])
);

export const ENEMY_AI_PROFILE_DEFS = {
  // These profiles shape both feel and social rules: steering speed, range discipline,
  // who opens combat, and whether a ship patrols or retaliates at all.
  punchingBag: {
    id: "punchingBag",
    label: "Punching Bag",
    reactionSpeed: 0.65,
    preferredRange: 860,
    retreatRange: 620,
    cruiseRange: 520,
    fireRange: 320,
    fireAngle: 0.045,
    turnThreshold: 0.08,
    orbitOffset: 0,
    orbitMinRange: 0,
    orbitMaxRange: 0,
    weakTargetWeight: 0,
    engagedBias: 0,
    targetStickiness: 0,
    woundedRetreatBoost: 260,
    disableReverse: false,
    allowUnprovokedCombat: false,
    allowUnprovokedPlayerTargeting: false,
    retaliationChance: 0,
    aggroDuration: 0,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 99,
    playerBias: -220,
    provokedTargetBias: 0,
    idlePatrolMinRange: 160,
    idlePatrolMaxRange: 320,
    idlePatrolAngularSpeed: 0.24,
    idleArrivalRange: 64
  },
  slowReacting: {
    id: "slowReacting",
    label: "Slow Reacting",
    reactionSpeed: 1.15,
    preferredRange: 720,
    retreatRange: 460,
    cruiseRange: 480,
    fireRange: 620,
    fireAngle: 0.09,
    turnThreshold: 0.065,
    orbitOffset: 0.08,
    orbitMinRange: 260,
    orbitMaxRange: 680,
    weakTargetWeight: 40,
    engagedBias: 30,
    targetStickiness: 40,
    woundedRetreatBoost: 220,
    disableReverse: false,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: true,
    retaliationChance: 1,
    aggroDuration: 4,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 0.5,
    playerBias: -120,
    provokedTargetBias: 120,
    idlePatrolMinRange: 220,
    idlePatrolMaxRange: 380,
    idlePatrolAngularSpeed: 0.22,
    idleArrivalRange: 76
  },
  wontAttackFirst: {
    id: "wontAttackFirst",
    label: "Won't Attack First",
    reactionSpeed: 2.3,
    preferredRange: 620,
    retreatRange: 340,
    cruiseRange: 420,
    fireRange: 700,
    fireAngle: 0.14,
    turnThreshold: 0.055,
    orbitOffset: 0.12,
    orbitMinRange: 220,
    orbitMaxRange: 620,
    weakTargetWeight: 70,
    engagedBias: 25,
    targetStickiness: 70,
    woundedRetreatBoost: 180,
    disableReverse: false,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: false,
    retaliationChance: 1,
    aggroDuration: 6,
    retaliatesOnlyAgainstProvoker: true,
    targetAcquireDelay: 0.55,
    playerBias: -160,
    provokedTargetBias: 260,
    idlePatrolMinRange: 260,
    idlePatrolMaxRange: 430,
    idlePatrolAngularSpeed: 0.26,
    idleArrivalRange: 84
  },
  cautious: {
    id: "cautious",
    label: "Cautious",
    reactionSpeed: 2.4,
    preferredRange: 620,
    retreatRange: 380,
    cruiseRange: 420,
    fireRange: 780,
    fireAngle: 0.14,
    turnThreshold: 0.055,
    orbitOffset: 0.18,
    orbitMinRange: 320,
    orbitMaxRange: 760,
    weakTargetWeight: 90,
    engagedBias: 40,
    targetStickiness: 80,
    woundedRetreatBoost: 160,
    disableReverse: false,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: true,
    retaliationChance: 1,
    aggroDuration: 7,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 0.3,
    playerBias: -40,
    provokedTargetBias: 150
  },
  opportunist: {
    id: "opportunist",
    label: "Opportunist",
    reactionSpeed: 4,
    preferredRange: 540,
    retreatRange: 260,
    cruiseRange: 360,
    fireRange: 720,
    fireAngle: 0.18,
    turnThreshold: 0.05,
    orbitOffset: 0.38,
    orbitMinRange: 280,
    orbitMaxRange: 700,
    weakTargetWeight: 260,
    engagedBias: 150,
    targetStickiness: 100,
    woundedRetreatBoost: 120,
    disableReverse: false,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: true,
    retaliationChance: 1,
    aggroDuration: 7,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 0.2,
    playerBias: -30,
    provokedTargetBias: 180
  },
  aggressive: {
    id: "aggressive",
    label: "Aggressive",
    reactionSpeed: 6.4,
    preferredRange: 260,
    retreatRange: 120,
    cruiseRange: 260,
    fireRange: 860,
    fireAngle: 0.24,
    turnThreshold: 0.045,
    orbitOffset: 0.08,
    orbitMinRange: 180,
    orbitMaxRange: 420,
    weakTargetWeight: 110,
    engagedBias: 50,
    targetStickiness: 120,
    woundedRetreatBoost: 40,
    disableReverse: false,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: true,
    retaliationChance: 1,
    aggroDuration: 9,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 0.08,
    playerBias: 0,
    provokedTargetBias: 180
  },
  berserker: {
    id: "berserker",
    label: "Berserker",
    reactionSpeed: 8.5,
    preferredRange: 160,
    retreatRange: 0,
    cruiseRange: 180,
    fireRange: 980,
    fireAngle: 0.34,
    turnThreshold: 0.035,
    orbitOffset: 0,
    orbitMinRange: 0,
    orbitMaxRange: 0,
    weakTargetWeight: 140,
    engagedBias: 30,
    targetStickiness: 180,
    woundedRetreatBoost: 0,
    disableReverse: true,
    allowUnprovokedCombat: true,
    allowUnprovokedPlayerTargeting: true,
    retaliationChance: 1,
    aggroDuration: 12,
    retaliatesOnlyAgainstProvoker: false,
    targetAcquireDelay: 0,
    playerBias: 20,
    provokedTargetBias: 220
  }
};

export const ENEMY_AI_PROFILE_WEIGHTS = {
  needle: {
    punchingBag: 0.064286,
    slowReacting: 0.192857,
    wontAttackFirst: 0.192857,
    cautious: 0.2,
    opportunist: 0.175,
    aggressive: 0.125,
    berserker: 0.05
  },
  bulwark: {
    punchingBag: 0.080357,
    slowReacting: 0.208929,
    wontAttackFirst: 0.160714,
    cautious: 0.225,
    opportunist: 0.15,
    aggressive: 0.125,
    berserker: 0.05
  },
  manta: {
    punchingBag: 0.063158,
    slowReacting: 0.197368,
    wontAttackFirst: 0.189474,
    cautious: 0.17907,
    opportunist: 0.217441,
    aggressive: 0.102326,
    berserker: 0.051163
  },
  fortress: {
    punchingBag: 0.091525,
    slowReacting: 0.190678,
    wontAttackFirst: 0.167797,
    cautious: 0.254878,
    opportunist: 0.147561,
    aggressive: 0.093902,
    berserker: 0.053659
  }
};

export const ENEMY_AI_PROFILE_EARLY_WEIGHTS = {
  needle: { punchingBag: 0.12, slowReacting: 0.28, wontAttackFirst: 0.24, cautious: 0.16, opportunist: 0.1, aggressive: 0.07, berserker: 0.03 },
  bulwark: { punchingBag: 0.14, slowReacting: 0.28, wontAttackFirst: 0.22, cautious: 0.18, opportunist: 0.1, aggressive: 0.06, berserker: 0.02 },
  manta: { punchingBag: 0.12, slowReacting: 0.3, wontAttackFirst: 0.24, cautious: 0.14, opportunist: 0.12, aggressive: 0.06, berserker: 0.02 },
  fortress: { punchingBag: 0.16, slowReacting: 0.28, wontAttackFirst: 0.22, cautious: 0.18, opportunist: 0.08, aggressive: 0.06, berserker: 0.02 }
};

function chooseWeighted(items, getWeight, rng = Math.random) {
  const total = items.reduce((sum, item) => sum + getWeight(item), 0);
  let threshold = rng() * total;

  for (const item of items) {
    threshold -= getWeight(item);
    if (threshold <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

function buildEnemyBlueprintFromSteps(buildSteps, quality, removeBlocks = [], options = {}) {
  const ship = createShipFromBlueprint(makeDefaultPlayerBlueprint(), {
    team: "enemy-blueprint",
    kind: "enemy-blueprint"
  });
  const stepQualities = resolveEnemyStepQualities(buildSteps, quality, options.rng);

  for (let index = 0; index < buildSteps.length; index += 1) {
    const step = buildSteps[index];
    const socket = getOpenSockets(ship).find(
      (entry) =>
        entry.x === step.socket.x &&
        entry.y === step.socket.y &&
        entry.side === step.socket.side
    );

    if (!socket) {
      throw new Error(`Missing socket for enemy step ${step.type} at ${JSON.stringify(step.socket)}`);
    }

    const looseBlock = createBlueprintBlock({
      type: step.type,
      x: 0,
      y: 0,
      quality: stepQualities[index] ?? quality,
      orientation: step.orientation ?? "north",
      variant: step.variant ?? "single"
    });
    const placed = attachLooseBlock(ship, looseBlock, socket);

    if (!placed) {
      throw new Error(`Failed to place enemy step ${step.type} at ${JSON.stringify(step.socket)}`);
    }
  }

  if (removeBlocks.length > 0) {
    for (const ref of removeBlocks) {
      ship.blocks = ship.blocks.filter((block) => {
        if (block.type === "cockpit") {
          return true;
        }
        if (ref.type && block.type !== ref.type) {
          return true;
        }
        if (ref.variant && block.variant !== ref.variant) {
          return true;
        }
        if (typeof ref.x === "number" && block.x !== ref.x) {
          return true;
        }
        if (typeof ref.y === "number" && block.y !== ref.y) {
          return true;
        }
        return false;
      });
    }
    ejectDisconnectedBlocks(ship);
  }

  return serializeShipToBlueprint(ship);
}

function getShipHealthRatio(ship) {
  const cockpit = getCockpit(ship);
  if (!cockpit) {
    return 0;
  }
  return cockpit.hp / cockpit.maxHp;
}

function isPlayerShip(ship) {
  return ship?.kind === "player" || ship?.team === "player";
}

function getEnemyProfile(ship) {
  return ENEMY_AI_PROFILE_DEFS[ship.ai?.profileId] ?? ENEMY_AI_PROFILE_DEFS.aggressive;
}

function isEnemyProvoked(enemy, now = enemy.ai?.now ?? 0) {
  return Number.isFinite(enemy.ai?.provokedUntil) && enemy.ai.provokedUntil > now;
}

export function registerEnemyProvocation(enemy, attackerId, now = 0, rng = Math.random) {
  if (!enemy?.alive || enemy.kind !== "enemy" || !attackerId || attackerId === enemy.id) {
    return false;
  }

  const profile = getEnemyProfile(enemy);
  const retaliationChance = profile.retaliationChance ?? 1;
  enemy.ai = {
    ...enemy.ai,
    lastHitById: attackerId,
    lastHitAt: now
  };

  if (retaliationChance <= 0 || (retaliationChance < 1 && rng() > retaliationChance)) {
    return false;
  }

  enemy.ai = {
    ...enemy.ai,
    lastHitById: attackerId,
    lastHitAt: now,
    provokedById: attackerId,
    provokedAt: now,
    provokedUntil: now + (profile.aggroDuration ?? 0),
    targetSince: now
  };
  return true;
}

function getTargetEngagementBonus(candidate, ships, enemyId) {
  return ships.some(
    (other) =>
      other?.alive &&
      other.id !== enemyId &&
      other.id !== candidate.id &&
      length(candidate.x - other.x, candidate.y - other.y) < 280
  )
    ? 1
    : 0;
}

function canEnemyTargetCandidate(enemy, candidate, profile, now = enemy.ai?.now ?? 0) {
  const provoked = isEnemyProvoked(enemy, now);
  if (provoked) {
    if (profile.retaliatesOnlyAgainstProvoker && candidate.id !== enemy.ai?.provokedById) {
      return false;
    }
    return true;
  }

  if (!profile.allowUnprovokedCombat) {
    return false;
  }
  if (isPlayerShip(candidate) && profile.allowUnprovokedPlayerTargeting === false) {
    return false;
  }
  return true;
}

function scoreEnemyTarget(enemy, candidate, ships, profile, now = enemy.ai?.now ?? 0) {
  const separation = length(candidate.x - enemy.x, candidate.y - enemy.y);
  const currentTargetBonus = enemy.ai?.targetId === candidate.id ? profile.targetStickiness : 0;
  const healthScore = (1 - getShipHealthRatio(candidate)) * profile.weakTargetWeight;
  const engagedScore = getTargetEngagementBonus(candidate, ships, enemy.id) * profile.engagedBias;
  const playerBias = isPlayerShip(candidate) ? profile.playerBias ?? 0 : 0;
  const provokedTargetBias =
    isEnemyProvoked(enemy, now) && candidate.id === enemy.ai?.provokedById
      ? profile.provokedTargetBias ?? 0
      : 0;

  return currentTargetBonus + healthScore + engagedScore + playerBias + provokedTargetBias - separation;
}

export function getEnemyQualityForLevel(level = 1) {
  return ENEMY_QUALITY_PALETTE[Math.min(ENEMY_QUALITY_PALETTE.length - 1, Math.floor(level / 2))];
}

export function getEnemyDifficultyProgress(elapsed = 0, kills = 0) {
  const timeProgress = clamp(elapsed / 210, 0, 1);
  const killProgress = clamp(kills / 10, 0, 1);
  return clamp(timeProgress * 0.4 + killProgress * 0.6, 0, 1);
}

export function getEnemyProgressionLevel(elapsed = 0, kills = 0) {
  return 1 + Math.floor(elapsed / 60) + Math.floor(kills / 4);
}

function normalizeEnemyAiProfileWeights(weights) {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return weights;
  }

  const normalized = {};
  for (const [profileId, value] of Object.entries(weights)) {
    normalized[profileId] = value / total;
  }
  return normalized;
}

function applyEnemyAiProfileWeightMultipliers(weights, multipliers = null) {
  if (!multipliers) {
    return weights;
  }

  const scaled = {};
  for (const profile of Object.values(ENEMY_AI_PROFILE_DEFS)) {
    scaled[profile.id] = (weights[profile.id] ?? 0) * (multipliers[profile.id] ?? 1);
  }
  return normalizeEnemyAiProfileWeights(scaled);
}

export function getEnemyAiProfileWeights(archetypeId, aggressionProgress = 1, designId = null) {
  const earlyWeights = ENEMY_AI_PROFILE_EARLY_WEIGHTS[archetypeId] ?? ENEMY_AI_PROFILE_EARLY_WEIGHTS.needle;
  const lateWeights = ENEMY_AI_PROFILE_WEIGHTS[archetypeId] ?? ENEMY_AI_PROFILE_WEIGHTS.needle;
  const mix = clamp(aggressionProgress, 0, 1);
  const weights = {};

  for (const profile of Object.values(ENEMY_AI_PROFILE_DEFS)) {
    weights[profile.id] = lerp(earlyWeights[profile.id] ?? 0, lateWeights[profile.id] ?? 0, mix);
  }

  const designMultipliers = designId ? ENEMY_SHIP_DESIGNS_BY_ID[designId]?.aiProfileWeightMultipliers : null;
  return applyEnemyAiProfileWeightMultipliers(weights, designMultipliers);
}

export function getEnemySpawnDirector(elapsed = 0, kills = 0) {
  const progress = getEnemyDifficultyProgress(elapsed, kills);

  return {
    progress,
    level: getEnemyProgressionLevel(elapsed, kills),
    aiAggression: progress,
    activeCap: MAX_ENEMIES,
    initialSpawnDelay: lerp(1.9, 1.2, progress),
    spawnInterval: lerp(2.8, 2.05, progress)
  };
}

export function getEnemySpawnMargin(aggressionProgress = 1) {
  // Early runs are mostly soft ships with long preferred / retreat ranges.
  // Spawn them farther out so they move into the viewport instead of instantly reversing away.
  return lerp(460, 180, clamp(aggressionProgress, 0, 1));
}

export function getOffscreenSpawnPosition(cameraX, cameraY, viewportWidth, viewportHeight, margin = 140, rng = Math.random) {
  const halfWidth = viewportWidth * 0.5;
  const halfHeight = viewportHeight * 0.5;
  const side = Math.floor(rng() * 4);
  const horizontal = cameraX + lerp(-halfWidth - margin, halfWidth + margin, rng());
  const vertical = cameraY + lerp(-halfHeight - margin, halfHeight + margin, rng());

  switch (side) {
    case 0:
      return { x: horizontal, y: cameraY - halfHeight - margin };
    case 1:
      return { x: cameraX + halfWidth + margin, y: vertical };
    case 2:
      return { x: horizontal, y: cameraY + halfHeight + margin };
    default:
      return { x: cameraX - halfWidth - margin, y: vertical };
  }
}

export function isShipWithinSpawnPressureWindow(
  ship,
  cameraX,
  cameraY,
  viewportWidth,
  viewportHeight,
  margin = 120
) {
  if (!ship?.alive) {
    return false;
  }

  const halfWidth = viewportWidth * 0.5;
  const halfHeight = viewportHeight * 0.5;
  return (
    ship.x >= cameraX - halfWidth - margin &&
    ship.x <= cameraX + halfWidth + margin &&
    ship.y >= cameraY - halfHeight - margin &&
    ship.y <= cameraY + halfHeight + margin
  );
}

export function countShipsWithinSpawnPressureWindow(
  ships,
  cameraX,
  cameraY,
  viewportWidth,
  viewportHeight,
  margin = 120
) {
  return ships.filter((ship) =>
    isShipWithinSpawnPressureWindow(ship, cameraX, cameraY, viewportWidth, viewportHeight, margin)
  ).length;
}

export function retainEnemiesNearPlayerSpace(
  ships,
  cameraX,
  cameraY,
  viewportWidth,
  viewportHeight,
  margin = 900
) {
  return ships.filter((ship) =>
    isShipWithinSpawnPressureWindow(ship, cameraX, cameraY, viewportWidth, viewportHeight, margin)
  );
}

export function resolveEnemySpawnPressureTimer(
  timer,
  totalEnemyCount,
  nearbyEnemyCount,
  enemyDirector,
  dt
) {
  const refillDelayWhenNoPressure = 1.25;
  let nextTimer = timer;

  // Count nearby pressure separately from total alive enemies so slow offscreen
  // stragglers cannot starve visible reinforcements and leave the screen empty.
  if (nearbyEnemyCount === 0 && totalEnemyCount > 0) {
    nextTimer = Math.min(nextTimer, refillDelayWhenNoPressure);
  }

  nextTimer -= dt;

  return {
    timer: nextTimer,
    shouldSpawn:
      nextTimer <= 0 &&
      nearbyEnemyCount < enemyDirector.activeCap &&
      totalEnemyCount < Math.max(enemyDirector.activeCap + 2, 3),
    nextSpawnTimer:
      nearbyEnemyCount === 0
        ? Math.min(enemyDirector.spawnInterval, refillDelayWhenNoPressure)
        : enemyDirector.spawnInterval
  };
}

export function getAvailableEnemyArchetypes(level = 1) {
  return Object.values(ENEMY_ARCHETYPE_DEFS).filter((definition) => level >= definition.minLevel);
}

export function getEnemyDesignsForArchetype(archetypeId) {
  return ALL_ENEMY_SHIP_DESIGN_DEFS.filter((definition) => definition.archetypeId === archetypeId);
}

export function getAvailableEnemyDesigns(level = 1) {
  return ALL_ENEMY_SHIP_DESIGN_DEFS.filter(
    (definition) =>
      level >= Math.max(
        ENEMY_ARCHETYPE_DEFS[definition.archetypeId]?.minLevel ?? 1,
        definition.minLevel ?? 1
      )
  );
}

export function buildEnemyBlueprint(designOrArchetypeId, quality = "red", options = {}) {
  const design =
    ENEMY_SHIP_DESIGNS_BY_ID[designOrArchetypeId] ??
    ENEMY_SHIP_DESIGNS_BY_ID[
      ENEMY_ARCHETYPE_DEFS[designOrArchetypeId]?.defaultDesignId ?? ENEMY_ARCHETYPE_DEFS.needle.defaultDesignId
    ];
  return buildEnemyBlueprintFromSteps(design.buildSteps, quality, design.removeBlocks ?? [], options);
}

export function chooseEnemyArchetype(level = 1, rng = Math.random) {
  const available = getAvailableEnemyArchetypes(level);
  return chooseWeighted(available, (definition) => definition.spawnWeight, rng);
}

export function chooseEnemyShipDesign(archetypeId, level = 1, rng = Math.random) {
  const designs = getEnemyDesignsForArchetype(archetypeId).filter(
    (definition) =>
      level >= Math.max(
        ENEMY_ARCHETYPE_DEFS[definition.archetypeId]?.minLevel ?? 1,
        definition.minLevel ?? 1
      )
  );
  return chooseWeighted(
    designs.length > 0 ? designs : getEnemyDesignsForArchetype(archetypeId),
    (definition) => definition.spawnWeight,
    rng
  );
}

export function chooseEnemyAiProfile(archetypeId, rng = Math.random, aggressionProgress = 1, designId = null) {
  const weights = getEnemyAiProfileWeights(archetypeId, aggressionProgress, designId);
  const profiles = Object.values(ENEMY_AI_PROFILE_DEFS);
  return chooseWeighted(profiles, (profile) => weights[profile.id] ?? 0, rng);
}

export function generateEnemyLoadout(level = 1, rng = Math.random, aggressionProgress = 1) {
  const archetype = chooseEnemyArchetype(level, rng);
  const design = chooseEnemyShipDesign(archetype.id, level, rng);
  const aiProfile = chooseEnemyAiProfile(archetype.id, rng, aggressionProgress, design.id);
  const quality = getEnemyQualityForLevel(level);

  return {
    archetypeId: archetype.id,
    designId: design.id,
    aiProfileId: aiProfile.id,
    orbitSign: rng() < 0.5 ? -1 : 1,
    idlePatrolSign: rng() < 0.5 ? -1 : 1,
    idleSeed: rng(),
    quality,
    blueprint: buildEnemyBlueprint(design.id, quality, { rng })
  };
}

export function chooseEnemyTarget(enemy, ships) {
  const profile = getEnemyProfile(enemy);
  const now = enemy.ai?.now ?? 0;
  const candidates = ships.filter((candidate) => candidate?.alive && candidate.id !== enemy.id);

  if (candidates.length === 0) {
    return null;
  }

  const eligible = candidates.filter((candidate) => canEnemyTargetCandidate(enemy, candidate, profile, now));
  if (eligible.length === 0) {
    return null;
  }

  return eligible.reduce((best, candidate) => {
    const score = scoreEnemyTarget(enemy, candidate, ships, profile, now);
    if (!best || score > best.score) {
      return { candidate, score };
    }
    return best;
  }, null)?.candidate ?? null;
}

function resolveEnemyIdleNavigationTarget(enemy, ships, profile, now = enemy.ai?.now ?? 0) {
  if (
    !Number.isFinite(profile.idlePatrolMinRange) ||
    !Number.isFinite(profile.idlePatrolMaxRange) ||
    !Number.isFinite(profile.idlePatrolAngularSpeed)
  ) {
    return null;
  }

  const player = ships.find((ship) => ship?.alive && isPlayerShip(ship));
  if (!player) {
    return null;
  }

  const idleSeed = clamp(enemy.ai?.idleSeed ?? 0.5, 0, 1);
  const patrolSign = enemy.ai?.idlePatrolSign ?? enemy.ai?.orbitSign ?? 1;
  const sweep = 0.5 + 0.5 * Math.sin(now * (0.35 + idleSeed * 0.2) + idleSeed * Math.PI * 2);
  const radius = lerp(profile.idlePatrolMinRange, profile.idlePatrolMaxRange, sweep);
  const angle = idleSeed * Math.PI * 2 + now * profile.idlePatrolAngularSpeed * patrolSign;

  return {
    id: `idle-${enemy.id}`,
    x: player.x + Math.cos(angle) * radius,
    y: player.y + Math.sin(angle) * radius
  };
}

export function resolveEnemyAiPlan(enemy, ships, dt = 1 / 60) {
  const profile = getEnemyProfile(enemy);
  const target = chooseEnemyTarget(enemy, ships);
  const idleNavigationTarget = target ? null : resolveEnemyIdleNavigationTarget(enemy, ships, profile);
  const navigationTarget = target ?? idleNavigationTarget ?? pickNearestOtherShip(enemy, ships);
  const now = enemy.ai?.now ?? 0;
  const usingIdlePatrol = !target && Boolean(idleNavigationTarget);

  if (!navigationTarget) {
    return {
      profileId: profile.id,
      targetId: null,
      shouldFire: false,
      input: {
        up: false,
        down: false,
        turnLeft: false,
        turnRight: false
      }
    };
  }

  const trackingAlpha = 1 - Math.exp(-(profile.reactionSpeed ?? 0) * Math.max(dt, 0));
  const hasTrackedTarget =
    enemy.ai?.trackedShipId === navigationTarget.id &&
    Number.isFinite(enemy.ai?.trackedX) &&
    Number.isFinite(enemy.ai?.trackedY);
  const trackedX = hasTrackedTarget ? lerp(enemy.ai.trackedX, navigationTarget.x, trackingAlpha) : navigationTarget.x;
  const trackedY = hasTrackedTarget ? lerp(enemy.ai.trackedY, navigationTarget.y, trackingAlpha) : navigationTarget.y;
  const targetSince =
    target && enemy.ai?.targetId === target.id && Number.isFinite(enemy.ai?.targetSince)
      ? enemy.ai.targetSince
      : now;
  const combatReady = Boolean(target) && now - targetSince >= (profile.targetAcquireDelay ?? 0);
  enemy.ai = {
    ...enemy.ai,
    trackedShipId: navigationTarget.id,
    trackedX,
    trackedY,
    targetSince
  };

  const toTarget = { x: trackedX - enemy.x, y: trackedY - enemy.y };
  const targetAngle = Math.atan2(toTarget.y, toTarget.x) + Math.PI * 0.5;
  const separation = length(toTarget.x, toTarget.y);
  let desiredAngle = targetAngle;

  if (
    !usingIdlePatrol &&
    profile.orbitOffset !== 0 &&
    separation >= profile.orbitMinRange &&
    separation <= profile.orbitMaxRange
  ) {
    desiredAngle += (enemy.ai?.orbitSign ?? 1) * profile.orbitOffset;
  }

  const steeringDiff = wrapAngle(desiredAngle - enemy.angle);
  const fireDiff = wrapAngle(targetAngle - enemy.angle);
  const healthRatio = getShipHealthRatio(enemy);
  const retreatRange = profile.retreatRange + (1 - healthRatio) * profile.woundedRetreatBoost;
  const preferredRange = target
    ? profile.preferredRange
    : usingIdlePatrol
      ? profile.idleArrivalRange ?? 72
      : profile.cruiseRange ?? profile.preferredRange;

  let up = separation > preferredRange;
  let down = !profile.disableReverse && target && separation < retreatRange;

  if (usingIdlePatrol) {
    up = separation > preferredRange;
    down = false;
  } else if (profile.id === "punchingBag") {
    up = separation > preferredRange + 30;
    down = !profile.disableReverse && separation < preferredRange * 0.55;
  } else if (profile.id === "slowReacting") {
    up = separation > preferredRange + 30;
    down = !profile.disableReverse && target && separation < retreatRange + 40;
  } else if (profile.id === "wontAttackFirst") {
    up = separation > preferredRange + 20;
    down = !profile.disableReverse && target && separation < retreatRange;
  } else if (profile.id === "cautious") {
    up = separation > profile.preferredRange + 20;
  } else if (profile.id === "aggressive") {
    up = separation > profile.preferredRange * 0.78;
    down = !profile.disableReverse && separation < retreatRange * Math.max(0.35, 0.65 - healthRatio * 0.3);
  } else if (profile.id === "berserker") {
    up = separation > profile.preferredRange * 0.7;
    down = false;
  }

  return {
    profileId: profile.id,
    targetId: target?.id ?? null,
    separation,
    steeringDiff,
    fireDiff,
    shouldFire:
      combatReady &&
      Math.abs(fireDiff) < profile.fireAngle &&
      separation < profile.fireRange &&
      !(profile.id === "punchingBag") &&
      !((profile.id === "slowReacting" || profile.id === "wontAttackFirst") && separation < retreatRange + 20),
    input: {
      up: combatReady || !target ? up : false,
      down: combatReady || !target ? down : false,
      turnLeft: combatReady || !target ? steeringDiff < -profile.turnThreshold : false,
      turnRight: combatReady || !target ? steeringDiff > profile.turnThreshold : false
    }
  };
}

export function makeDefaultPlayerBlueprint() {
  return [
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ];
}

export function makeDefaultBuilderBlueprint() {
  return [
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({
      type: "hull",
      x: -1,
      y: 0,
      quality: "rainbow",
      variant: "double",
      orientation: "west",
      attachSide: "east"
    }),
    createBlueprintBlock({
      type: "hull",
      x: 1,
      y: 0,
      quality: "rainbow",
      variant: "double",
      orientation: "east",
      attachSide: "west"
    }),
    createBlueprintBlock({
      type: "blaster",
      x: -2,
      y: -1,
      quality: "rainbow",
      orientation: "north",
      variant: "dual",
      attachSide: "south"
    }),
    createBlueprintBlock({
      type: "blaster",
      x: 0,
      y: -1,
      quality: "rainbow",
      orientation: "north",
      variant: "dual",
      attachSide: "south"
    }),
    createBlueprintBlock({
      type: "blaster",
      x: 2,
      y: -1,
      quality: "rainbow",
      orientation: "north",
      variant: "dual",
      attachSide: "south"
    }),
    createBlueprintBlock({
      type: "thruster",
      x: -2,
      y: 1,
      quality: "rainbow",
      orientation: "north",
      attachSide: "north"
    }),
    createBlueprintBlock({
      type: "thruster",
      x: 0,
      y: 1,
      quality: "rainbow",
      orientation: "north",
      attachSide: "north"
    }),
    createBlueprintBlock({
      type: "thruster",
      x: 2,
      y: 1,
      quality: "rainbow",
      orientation: "north",
      attachSide: "north"
    }),
    createBlueprintBlock({
      type: "shield",
      x: -3,
      y: 0,
      quality: "rainbow",
      orientation: "west",
      attachSide: "east"
    }),
    createBlueprintBlock({
      type: "shield",
      x: 3,
      y: 0,
      quality: "rainbow",
      orientation: "east",
      attachSide: "west"
    })
  ];
}

export function resolveBuilderBlueprint(playerBlueprint, builderPresetPrimed) {
  // The first builder visit gets a seeded test rig, but later builder entries and
  // reset flows should preserve or restore the real player blueprint instead.
  if (builderPresetPrimed) {
    return {
      blueprint: cloneBlueprint(playerBlueprint),
      builderPresetPrimed
    };
  }

  return {
    blueprint: makeDefaultBuilderBlueprint(),
    builderPresetPrimed: true
  };
}

export function resolveRunBlueprint(playerBlueprint, useCurrentBlueprint = false) {
  return useCurrentBlueprint
    ? cloneBlueprint(playerBlueprint)
    : makeDefaultPlayerBlueprint();
}

export function advancePendingGameOver(game, dt, delay = 3) {
  // Hold a short aftermath beat after cockpit death so the loss reads in-world
  // before the game-over panel fully takes over the screen.
  if (!game?.playerLost || game.gameOver) {
    return false;
  }

  const startingTimer = game.gameOverTimer > 0 ? game.gameOverTimer : delay;
  game.gameOverTimer = Math.max(0, startingTimer - dt);
  if (game.gameOverTimer <= 0) {
    game.gameOver = true;
    return true;
  }
  return false;
}

export function generateEnemyBlueprint(level = 1, rng = Math.random) {
  return generateEnemyLoadout(level, rng).blueprint;
}
