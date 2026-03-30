import { BLOCK_DEFS, CELL_SIZE, HALF_CELL, MAX_ENEMIES, QUALITY_BY_ID, SIDE_ORDER, SIDE_VECTORS } from "./data.js";
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

export function getShipGlowMultiplier(mode = "high") {
  if (mode === "low") {
    return 0;
  }
  if (mode === "medium") {
    return 0.45;
  }
  return 1;
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
// curve stays readable even when weapon quality and block quality both scale upward.
function getDurabilityHp(quality, durabilityFactor) {
  return getReferenceBlasterDamage(quality) * quality.durabilityHits * durabilityFactor;
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
      hp: getDurabilityHp(quality, BLOCK_DEFS.hull.durabilityFactor) * getHullLength(block)
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
      damageScale: BLOCK_DEFS.shield.damageScale / Math.max(1, quality.powerMultiplier * 0.72),
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
  if (!cockpit || !isCockpitFrontOpen(ship)) {
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

const ENEMY_QUALITY_PALETTE = ["grey", "red", "orange", "yellow", "green", "blue", "purple", "white"];

export const ENEMY_ARCHETYPE_DEFS = {
  needle: {
    id: "needle",
    label: "Needle",
    minLevel: 1,
    spawnWeight: 26,
    buildSteps: [
      { type: "hull", variant: "triple", socket: { x: 0, y: 1, side: "south" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "thruster", socket: { x: -1, y: 3, side: "west" } },
      { type: "thruster", socket: { x: 1, y: 3, side: "east" } },
      { type: "thruster", socket: { x: 0, y: 4, side: "south" } }
    ]
  },
  bulwark: {
    id: "bulwark",
    label: "Bulwark",
    minLevel: 1,
    spawnWeight: 24,
    buildSteps: [
      { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
      { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
      { type: "blaster", variant: "single", socket: { x: 0, y: -1, side: "north" } },
      { type: "shield", socket: { x: -3, y: 0, side: "west" } },
      { type: "shield", socket: { x: 3, y: 0, side: "east" } },
      { type: "thruster", socket: { x: -1, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 1, side: "south" } }
    ]
  },
  manta: {
    id: "manta",
    label: "Manta",
    minLevel: 2,
    spawnWeight: 20,
    buildSteps: [
      { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "double", socket: { x: 1, y: 0, side: "east" } },
      { type: "hull", variant: "single", socket: { x: -2, y: -1, side: "north" } },
      { type: "hull", variant: "single", socket: { x: 2, y: -1, side: "north" } },
      { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
      { type: "blaster", variant: "spread", socket: { x: 0, y: -1, side: "north" } },
      { type: "thruster", socket: { x: -2, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 2, y: 1, side: "south" } }
    ]
  },
  fortress: {
    id: "fortress",
    label: "Fortress",
    minLevel: 4,
    spawnWeight: 12,
    buildSteps: [
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
  },
  vulture: {
    id: "vulture",
    label: "Vulture",
    minLevel: 3,
    spawnWeight: 18,
    buildSteps: [
      { type: "hull", variant: "double", socket: { x: -1, y: 0, side: "west" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 0, side: "east" } },
      { type: "hull", variant: "single", socket: { x: 0, y: 1, side: "south" } },
      { type: "hull", variant: "single", socket: { x: 1, y: 1, side: "east" } },
      { type: "blaster", variant: "dual", socket: { x: 1, y: -1, side: "north" } },
      { type: "shield", socket: { x: -3, y: 0, side: "west" } },
      { type: "thruster", socket: { x: -2, y: 1, side: "south" } },
      { type: "thruster", socket: { x: 1, y: 2, side: "south" } },
      { type: "thruster", socket: { x: 2, y: 1, side: "east" } }
    ]
  }
};

export const ENEMY_AI_PROFILE_DEFS = {
  passive: {
    id: "passive",
    label: "Passive",
    preferredRange: 780,
    retreatRange: 520,
    fireRange: 700,
    fireAngle: 0.1,
    turnThreshold: 0.06,
    orbitOffset: 0,
    orbitMinRange: 0,
    orbitMaxRange: 0,
    weakTargetWeight: 30,
    engagedBias: 20,
    targetStickiness: 60,
    woundedRetreatBoost: 220,
    disableReverse: false
  },
  cautious: {
    id: "cautious",
    label: "Cautious",
    preferredRange: 620,
    retreatRange: 380,
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
    disableReverse: false
  },
  opportunist: {
    id: "opportunist",
    label: "Opportunist",
    preferredRange: 540,
    retreatRange: 260,
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
    disableReverse: false
  },
  aggressive: {
    id: "aggressive",
    label: "Aggressive",
    preferredRange: 260,
    retreatRange: 120,
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
    disableReverse: false
  },
  berserker: {
    id: "berserker",
    label: "Berserker",
    preferredRange: 160,
    retreatRange: 0,
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
    disableReverse: true
  }
};

export const ENEMY_AI_PROFILE_WEIGHTS = {
  needle: { passive: 0.05, cautious: 0.15, opportunist: 0.2, aggressive: 0.4, berserker: 0.2 },
  bulwark: { passive: 0.2, cautious: 0.4, opportunist: 0.2, aggressive: 0.15, berserker: 0.05 },
  manta: { passive: 0.2, cautious: 0.25, opportunist: 0.35, aggressive: 0.15, berserker: 0.05 },
  fortress: { passive: 0.3, cautious: 0.4, opportunist: 0.15, aggressive: 0.1, berserker: 0.05 },
  vulture: { passive: 0.05, cautious: 0.1, opportunist: 0.4, aggressive: 0.25, berserker: 0.2 }
};

export const ENEMY_AI_PROFILE_EARLY_WEIGHTS = {
  needle: { passive: 0.8, cautious: 0.12, opportunist: 0.05, aggressive: 0.02, berserker: 0.01 },
  bulwark: { passive: 0.8, cautious: 0.12, opportunist: 0.05, aggressive: 0.02, berserker: 0.01 },
  manta: { passive: 0.8, cautious: 0.12, opportunist: 0.05, aggressive: 0.02, berserker: 0.01 },
  fortress: { passive: 0.8, cautious: 0.12, opportunist: 0.05, aggressive: 0.02, berserker: 0.01 },
  vulture: { passive: 0.8, cautious: 0.12, opportunist: 0.05, aggressive: 0.02, berserker: 0.01 }
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

function buildEnemyBlueprintFromSteps(buildSteps, quality) {
  const ship = createShipFromBlueprint(makeDefaultPlayerBlueprint(), {
    team: "enemy-blueprint",
    kind: "enemy-blueprint"
  });

  for (const step of buildSteps) {
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
      quality,
      orientation: step.orientation ?? "north",
      variant: step.variant ?? "single"
    });
    const placed = attachLooseBlock(ship, looseBlock, socket);

    if (!placed) {
      throw new Error(`Failed to place enemy step ${step.type} at ${JSON.stringify(step.socket)}`);
    }
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

function scoreEnemyTarget(enemy, candidate, ships, profile) {
  const separation = length(candidate.x - enemy.x, candidate.y - enemy.y);
  const currentTargetBonus = enemy.ai?.targetId === candidate.id ? profile.targetStickiness : 0;
  const healthScore = (1 - getShipHealthRatio(candidate)) * profile.weakTargetWeight;
  const engagedScore = getTargetEngagementBonus(candidate, ships, enemy.id) * profile.engagedBias;

  return currentTargetBonus + healthScore + engagedScore - separation;
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

export function getEnemyAiProfileWeights(archetypeId, aggressionProgress = 1) {
  const earlyWeights = ENEMY_AI_PROFILE_EARLY_WEIGHTS[archetypeId] ?? ENEMY_AI_PROFILE_EARLY_WEIGHTS.needle;
  const lateWeights = ENEMY_AI_PROFILE_WEIGHTS[archetypeId] ?? ENEMY_AI_PROFILE_WEIGHTS.needle;
  const mix = clamp(aggressionProgress, 0, 1);
  const weights = {};

  for (const profile of Object.values(ENEMY_AI_PROFILE_DEFS)) {
    weights[profile.id] = lerp(earlyWeights[profile.id] ?? 0, lateWeights[profile.id] ?? 0, mix);
  }

  return weights;
}

export function getEnemySpawnDirector(elapsed = 0, kills = 0) {
  const progress = getEnemyDifficultyProgress(elapsed, kills);

  return {
    progress,
    level: getEnemyProgressionLevel(elapsed, kills),
    aiAggression: progress,
    activeCap: progress < 0.33 ? 1 : progress < 0.7 ? 2 : MAX_ENEMIES,
    initialSpawnDelay: lerp(7.2, 3.1, progress),
    spawnInterval: lerp(6.2, 2.9, progress)
  };
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

export function getAvailableEnemyArchetypes(level = 1) {
  return Object.values(ENEMY_ARCHETYPE_DEFS).filter((definition) => level >= definition.minLevel);
}

export function buildEnemyBlueprint(archetypeId, quality = "red") {
  const definition = ENEMY_ARCHETYPE_DEFS[archetypeId] ?? ENEMY_ARCHETYPE_DEFS.needle;
  return buildEnemyBlueprintFromSteps(definition.buildSteps, quality);
}

export function chooseEnemyArchetype(level = 1, rng = Math.random) {
  const available = getAvailableEnemyArchetypes(level);
  return chooseWeighted(available, (definition) => definition.spawnWeight, rng);
}

export function chooseEnemyAiProfile(archetypeId, rng = Math.random, aggressionProgress = 1) {
  const weights = getEnemyAiProfileWeights(archetypeId, aggressionProgress);
  const profiles = Object.values(ENEMY_AI_PROFILE_DEFS);
  return chooseWeighted(profiles, (profile) => weights[profile.id] ?? 0, rng);
}

export function generateEnemyLoadout(level = 1, rng = Math.random, aggressionProgress = 1) {
  const archetype = chooseEnemyArchetype(level, rng);
  const aiProfile = chooseEnemyAiProfile(archetype.id, rng, aggressionProgress);
  const quality = getEnemyQualityForLevel(level);

  return {
    archetypeId: archetype.id,
    aiProfileId: aiProfile.id,
    orbitSign: rng() < 0.5 ? -1 : 1,
    quality,
    blueprint: buildEnemyBlueprint(archetype.id, quality)
  };
}

export function chooseEnemyTarget(enemy, ships) {
  const profile = ENEMY_AI_PROFILE_DEFS[enemy.ai?.profileId] ?? ENEMY_AI_PROFILE_DEFS.aggressive;
  const candidates = ships.filter((candidate) => candidate?.alive && candidate.id !== enemy.id);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) => {
    const score = scoreEnemyTarget(enemy, candidate, ships, profile);
    if (!best || score > best.score) {
      return { candidate, score };
    }
    return best;
  }, null)?.candidate ?? null;
}

export function resolveEnemyAiPlan(enemy, ships) {
  const profile = ENEMY_AI_PROFILE_DEFS[enemy.ai?.profileId] ?? ENEMY_AI_PROFILE_DEFS.aggressive;
  const target = chooseEnemyTarget(enemy, ships);

  if (!target) {
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

  const toTarget = { x: target.x - enemy.x, y: target.y - enemy.y };
  const targetAngle = Math.atan2(toTarget.y, toTarget.x) + Math.PI * 0.5;
  const separation = length(toTarget.x, toTarget.y);
  let desiredAngle = targetAngle;

  if (
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

  let up = separation > profile.preferredRange;
  let down = !profile.disableReverse && separation < retreatRange;

  if (profile.id === "passive") {
    up = separation > profile.preferredRange + 40;
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
    targetId: target.id,
    separation,
    steeringDiff,
    fireDiff,
    shouldFire:
      Math.abs(fireDiff) < profile.fireAngle &&
      separation < profile.fireRange &&
      !(profile.id === "passive" && separation < retreatRange + 20),
    input: {
      up,
      down,
      turnLeft: steeringDiff < -profile.turnThreshold,
      turnRight: steeringDiff > profile.turnThreshold
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
