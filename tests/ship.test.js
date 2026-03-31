import test from "node:test";
import assert from "node:assert/strict";
import { CELL_SIZE } from "../src/data.js";

import {
  advancePendingGameOver,
  applyCockpitRegen,
  attachLooseBlock,
  buildEnemyBlueprint,
  canAttachLooseBlock,
  canDamageLooseBlock,
  cycleShipVisualQuality,
  chooseBestSnapCandidate,
  chooseEnemyAiProfile,
  chooseEnemyShipDesign,
  chooseEnemyTarget,
  chooseLooseBlockForPickup,
  countShipsWithinSpawnPressureWindow,
  createBlueprintBlock,
  createShipFromBlueprint,
  ENEMY_AI_PROFILE_EARLY_WEIGHTS,
  ENEMY_AI_PROFILE_WEIGHTS,
  ENEMY_SHIP_DESIGN_DEFS,
  getAliveShipPairs,
  getBlockAtLocalPoint,
  getEnemyAiProfileWeights,
  getBlockCells,
  getCenterOfMass,
  getAvailableEnemyArchetypes,
  getAvailableEnemyDesigns,
  getEnemyDifficultyProgress,
  getEnemyQualityForLevel,
  getEnemySpawnMargin,
  getEnemyProgressionLevel,
  getEnemySpawnDirector,
  getOffscreenSpawnPosition,
  findConnectedBlockIds,
  getMass,
  getShipDeathSalvageSpawnState,
  getBlockStats,
  getBuiltInBlaster,
  getProjectileDamageAgainstBlock,
  getShipCellOverlap,
  getBlockPlacementForSocket,
  getShipGlowMultiplier,
  getShipVisualQualityProfile,
  getOpenSockets,
  pickNearestOtherShip,
  prepareShipDeathSalvageBlocks,
  registerEnemyProvocation,
  getShipCollisionOverlap,
  getShipSalvageBlocks,
  makeDefaultBuilderBlueprint,
  makeLooseFromBlock,
  makeDefaultPlayerBlueprint,
  retainEnemiesNearPlayerSpace,
  removeBlock,
  resolveEnemySpawnPressureTimer,
  resolveBuilderBlueprint,
  resolveDraggedLooseDrop,
  resolveEnemyAiPlan,
  resolveRunBlueprint,
  resolveShipBoardPointerAction,
  shouldBulletHitLooseBlock,
  selectThrustersForInput
} from "../src/ship.js";

const QUALITY_IDS = ["grey", "red", "orange", "yellow", "green", "blue", "purple", "white", "rainbow"];

function getShipBoundsArea(ship) {
  const cells = ship.blocks.flatMap((block) => getBlockCells(block));
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  return (Math.max(...xs) - Math.min(...xs) + 1) * (Math.max(...ys) - Math.min(...ys) + 1);
}

function getOccupiedCellCount(ship) {
  return new Set(
    ship.blocks.flatMap((block) => getBlockCells(block).map((cell) => `${cell.x},${cell.y}`))
  ).size;
}

function getHitsToDestroy(targetBlock, attackerQuality) {
  const attacker = createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: attackerQuality, orientation: "north" });
  const targetHp = getBlockStats(targetBlock).hp;
  const shotDamage = getProjectileDamageAgainstBlock(getBlockStats(attacker).damage, attacker.quality, targetBlock);
  return Math.ceil((targetHp - 0.000001) / shotDamage);
}

function mirrorSide(side) {
  if (side === "east") {
    return "west";
  }
  if (side === "west") {
    return "east";
  }
  return side;
}

function getMirroredEnemyBlockGroupKey(block) {
  const normalize = (value) => (block.x < 0 ? mirrorSide(value) : value);
  return [
    block.type,
    block.variant ?? "single",
    Math.abs(block.x),
    block.y,
    normalize(block.orientation ?? "north"),
    normalize(block.attachSide ?? "north")
  ].join("|");
}

test("cockpit-only ship exposes open sockets for attachment", () => {
  const ship = createShipFromBlueprint(makeDefaultPlayerBlueprint());
  assert.equal(ship.blocks.length, 1);
  assert.equal(ship.blocks[0].type, "cockpit");
  const sockets = getOpenSockets(ship);
  assert.equal(sockets.length, 4);
  assert.deepEqual(
    sockets
      .map((socket) => ({ x: socket.x, y: socket.y, side: socket.side }))
      .sort((left, right) => `${left.x},${left.y}`.localeCompare(`${right.x},${right.y}`)),
    [
      { x: -1, y: 0, side: "west" },
      { x: 0, y: -1, side: "north" },
      { x: 0, y: 1, side: "south" },
      { x: 1, y: 0, side: "east" }
    ]
  );
});

test("asymmetric ships yaw under forward thrust because torque uses center of mass", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "yellow" }),
    createBlueprintBlock({ type: "hull", x: 2, y: 0, quality: "yellow" })
  ]);
  const centerOfMass = getCenterOfMass(ship);
  const forward = selectThrustersForInput(ship, {
    up: true,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false
  });

  assert.ok(centerOfMass.x > CELL_SIZE * 0.5);
  assert.equal(forward.localForceY < 0, true);
  assert.equal(forward.torque > 0, true);
});

test("non-hull modules only add quarter mass compared with hull cells", () => {
  const cockpitOnly = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const withHull = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" })
  ]);
  const withThruster = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "thruster", x: 1, y: 0, quality: "red", orientation: "north" })
  ]);
  const withBlaster = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "blaster", x: 1, y: 0, quality: "red", orientation: "north" })
  ]);

  const hullDelta = getMass(withHull) - getMass(cockpitOnly);
  const thrusterDelta = getMass(withThruster) - getMass(cockpitOnly);
  const blasterDelta = getMass(withBlaster) - getMass(cockpitOnly);

  assert.ok(Math.abs(hullDelta - thrusterDelta * 4) < 0.000001);
  assert.ok(Math.abs(hullDelta - blasterDelta * 4) < 0.000001);
});

test("center of mass weights hull cells more heavily than mounted modules", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" }),
    createBlueprintBlock({ type: "thruster", x: -1, y: 0, quality: "red", orientation: "north" })
  ]);
  const centerOfMass = getCenterOfMass(ship);

  assert.ok(centerOfMass.x > 0);
});

test("builder seed blueprint matches the rainbow speed-test rig", () => {
  const ship = createShipFromBlueprint(makeDefaultBuilderBlueprint());
  const centerOfMass = getCenterOfMass(ship);
  const nonCockpitBlocks = ship.blocks.filter((block) => block.type !== "cockpit");

  assert.equal(ship.blocks.length, 11);
  assert.equal(ship.blocks.filter((block) => block.type === "hull").length, 2);
  assert.equal(ship.blocks.filter((block) => block.type === "blaster").length, 3);
  assert.equal(ship.blocks.filter((block) => block.type === "thruster").length, 3);
  assert.equal(ship.blocks.filter((block) => block.type === "shield").length, 2);
  assert.ok(nonCockpitBlocks.every((block) => block.quality === "rainbow"));
  assert.ok(
    ship.blocks
      .filter((block) => block.type === "blaster")
      .every((block) => block.variant === "dual")
  );
  assert.ok(Math.abs(centerOfMass.x) < 0.000001);
  assert.ok(Math.abs(centerOfMass.y) < 0.000001);
});

test("builder seed only applies on first builder entry", () => {
  const firstEntry = resolveBuilderBlueprint(makeDefaultPlayerBlueprint(), false);
  const afterReset = resolveBuilderBlueprint(makeDefaultPlayerBlueprint(), true);

  assert.equal(firstEntry.builderPresetPrimed, true);
  assert.equal(firstEntry.blueprint.length, 11);
  assert.equal(afterReset.builderPresetPrimed, true);
  assert.deepEqual(
    afterReset.blueprint.map((block) => block.type),
    ["cockpit"]
  );
});

test("ship visual quality cycles high, medium, low with distinct glow profiles", () => {
  const high = getShipVisualQualityProfile("high");
  const medium = getShipVisualQualityProfile("medium");
  const low = getShipVisualQualityProfile("low");

  assert.equal(cycleShipVisualQuality("high"), "medium");
  assert.equal(cycleShipVisualQuality("medium"), "low");
  assert.equal(cycleShipVisualQuality("low"), "high");
  assert.equal(getShipGlowMultiplier("low"), 0);
  assert.ok(getShipGlowMultiplier("medium") > 0);
  assert.ok(getShipGlowMultiplier("high") > getShipGlowMultiplier("medium"));
  assert.equal(low.glowPasses.length, 0);
  assert.equal(medium.glowPasses.length, 1);
  assert.equal(high.glowPasses.length, 1);
  assert.ok(high.detailGlowScale > medium.detailGlowScale);
  assert.equal(low.detailGlowScale, 0);
  assert.equal(low.blockHaloAlpha, 0);
  assert.ok(high.blockHaloAlpha > medium.blockHaloAlpha);
  assert.ok(high.blockHaloRadius > medium.blockHaloRadius);
  assert.ok(high.glowPasses.every((pass) => pass.lineScale === 1));
  assert.ok(medium.glowPasses.every((pass) => pass.lineScale === 1));
});

test("new run starts use a bare cockpit unless the builder explicitly launches a ship", () => {
  const customBlueprint = [
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "rainbow" })
  ];

  const defaultRun = resolveRunBlueprint(customBlueprint, false);
  const builderLaunch = resolveRunBlueprint(customBlueprint, true);

  assert.deepEqual(defaultRun.map((block) => block.type), ["cockpit"]);
  assert.deepEqual(builderLaunch.map((block) => block.type), ["cockpit", "hull"]);
});

test("enemy cockpits do not get a built-in blaster", () => {
  const enemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    team: "enemy-a",
    kind: "enemy"
  });

  assert.equal(getBuiltInBlaster(enemy), null);
});

test("enemy design pool exposes 28 distinct cockpit-connected ships across 4 archetypes", () => {
  assert.equal(ENEMY_SHIP_DESIGN_DEFS.length, 28);
  assert.equal(new Set(ENEMY_SHIP_DESIGN_DEFS.map((definition) => definition.id)).size, 28);
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(
        ENEMY_SHIP_DESIGN_DEFS.reduce((counts, definition) => {
          counts[definition.archetypeId] = (counts[definition.archetypeId] ?? 0) + 1;
          return counts;
        }, {})
      ).sort(([left], [right]) => left.localeCompare(right))
    ),
    {
      bulwark: 7,
      fortress: 7,
      manta: 7,
      needle: 7
    }
  );

  for (const definition of ENEMY_SHIP_DESIGN_DEFS) {
    const blueprint = buildEnemyBlueprint(definition.id, "blue");
    const ship = createShipFromBlueprint(blueprint, { kind: "enemy" });
    const connected = findConnectedBlockIds(ship);

    assert.equal(
      ship.blocks.every((block) => block.type === "cockpit" || connected.has(block.id)),
      true
    );
  }
});

test("enemy quality variance stays within one tier and keeps mirrored block pairs matched", () => {
  const rolls = [0.92, 0.08, 0.5, 0.88, 0.12, 0.48, 0.91, 0.09, 0.52, 0.86, 0.14];
  const rng = () => rolls.shift() ?? 0.5;
  const blueprint = buildEnemyBlueprint("fortress-arsenal", "blue", { rng });
  const nonCockpitBlocks = blueprint.filter((block) => block.type !== "cockpit");
  const baseIndex = QUALITY_IDS.indexOf("blue");

  assert.ok(nonCockpitBlocks.some((block) => block.quality === "green"));
  assert.ok(nonCockpitBlocks.some((block) => block.quality === "purple"));
  assert.equal(
    nonCockpitBlocks.every((block) => Math.abs(QUALITY_IDS.indexOf(block.quality) - baseIndex) <= 1),
    true
  );

  const blocksByGroup = nonCockpitBlocks.reduce((groups, block) => {
    const key = getMirroredEnemyBlockGroupKey(block);
    const next = groups.get(key) ?? [];
    next.push(block);
    groups.set(key, next);
    return groups;
  }, new Map());

  assert.equal(
    [...blocksByGroup.values()].every((group) => new Set(group.map((block) => block.quality)).size === 1),
    true
  );
});

test("enemy archetypes now span meaningfully different footprints within each family", () => {
  const areasByArchetype = new Map();

  for (const definition of ENEMY_SHIP_DESIGN_DEFS) {
    const ship = createShipFromBlueprint(buildEnemyBlueprint(definition.id, "blue"), { kind: "enemy" });
    const areas = areasByArchetype.get(definition.archetypeId) ?? new Set();
    areas.add(getShipBoundsArea(ship));
    areasByArchetype.set(definition.archetypeId, areas);
  }

  for (const archetypeId of ["needle", "bulwark", "manta", "fortress"]) {
    assert.ok((areasByArchetype.get(archetypeId)?.size ?? 0) >= 2);
  }
});

test("fortress blueprint closes a hull ring around its core", () => {
  const blueprint = buildEnemyBlueprint("fortress", "purple");
  const ship = createShipFromBlueprint(blueprint, { kind: "enemy" });
  const hullCells = new Set(
    ship.blocks
      .filter((block) => block.type === "hull")
      .flatMap((block) => getBlockCells(block).map((cell) => `${cell.x},${cell.y}`))
  );

  for (const requiredCell of [
    "0,-1",
    "-2,-1",
    "-1,-1",
    "1,-1",
    "2,-1",
    "-2,0",
    "-1,0",
    "1,0",
    "2,0",
    "-2,1",
    "-1,1",
    "0,1",
    "1,1",
    "2,1",
    "-2,2",
    "-1,2",
    "0,2",
    "1,2",
    "2,2"
  ]) {
    assert.equal(hullCells.has(requiredCell), true);
  }
});

test("fortress roster includes hollow outline variants instead of only filled bricks", () => {
  const voidshell = createShipFromBlueprint(buildEnemyBlueprint("fortress-voidshell", "purple"), {
    kind: "enemy"
  });
  const gatehouse = createShipFromBlueprint(buildEnemyBlueprint("fortress-gatehouse", "purple"), {
    kind: "enemy"
  });

  assert.ok(getShipBoundsArea(voidshell) - getOccupiedCellCount(voidshell) >= 20);
  assert.ok(getShipBoundsArea(gatehouse) - getOccupiedCellCount(gatehouse) >= 20);
});

test("early enemy archetype pool excludes the larger late-game frames", () => {
  assert.deepEqual(
    getAvailableEnemyArchetypes(1).map((definition) => definition.id),
    ["needle", "bulwark", "manta"]
  );
  assert.deepEqual(
    getAvailableEnemyArchetypes(2).map((definition) => definition.id),
    ["needle", "bulwark", "manta"]
  );
  assert.deepEqual(
    getAvailableEnemyArchetypes(3).map((definition) => definition.id),
    ["needle", "bulwark", "manta", "fortress"]
  );
  assert.equal(getAvailableEnemyDesigns(1).length, 7);
  assert.equal(getAvailableEnemyDesigns(2).length, 21);
  assert.equal(getAvailableEnemyDesigns(3).length, 24);
  assert.equal(getAvailableEnemyDesigns(4).length, 28);
  assert.equal(chooseEnemyShipDesign("needle", 1, () => 0).id, "needle-dart");
});

test("approved small variants stay in the live pool with compact footprints", () => {
  const expectedAreas = {
    "needle-dart": 5,
    "bulwark-ward": 9,
    "manta-skiff": 9,
    "manta-fan": 12
  };

  for (const [designId, expectedArea] of Object.entries(expectedAreas)) {
    const ship = createShipFromBlueprint(buildEnemyBlueprint(designId, "blue"), { kind: "enemy" });
    assert.equal(getShipBoundsArea(ship), expectedArea);
  }

  const ward = createShipFromBlueprint(buildEnemyBlueprint("bulwark-ward", "blue"), { kind: "enemy" });
  assert.equal(ward.blocks.filter((block) => block.type === "shield").length, 0);
});

test("enemy design pool stays blaster-rich while allowing a few weak-offense ships", () => {
  const blasterCounts = ENEMY_SHIP_DESIGN_DEFS.map((definition) => {
    const builtShip = createShipFromBlueprint(buildEnemyBlueprint(definition.id, "blue"), {
      kind: "enemy"
    });
    return builtShip.blocks.filter((block) => block.type === "blaster").length;
  });
  const averageBlasters = blasterCounts.reduce((sum, count) => sum + count, 0) / blasterCounts.length;

  assert.ok(averageBlasters >= 2.4);
  assert.ok(blasterCounts.filter((count) => count >= 3).length >= 12);
  assert.ok(blasterCounts.filter((count) => count <= 1).length >= 8);
});

test("enemy fleet hits the approved mobility quotas instead of overusing sitting ducks", () => {
  const ships = ENEMY_SHIP_DESIGN_DEFS.map((definition) =>
    createShipFromBlueprint(buildEnemyBlueprint(definition.id, "blue"), { kind: "enemy" })
  );
  const lowThrustCount = ships.filter(
    (ship) => ship.blocks.filter((block) => block.type === "thruster").length <= 1
  ).length;
  const zeroYawCount = ships.filter((ship) => {
    const turnLeft = selectThrustersForInput(ship, {
      up: false,
      down: false,
      left: false,
      right: false,
      turnLeft: true,
      turnRight: false
    });
    const turnRight = selectThrustersForInput(ship, {
      up: false,
      down: false,
      left: false,
      right: false,
      turnLeft: false,
      turnRight: true
    });

    return Math.max(Math.abs(turnLeft.torque), Math.abs(turnRight.torque)) === 0;
  }).length;
  const centerlineOnlyCount = ships.filter((ship) => {
    const thrusters = ship.blocks.filter((block) => block.type === "thruster");
    return thrusters.length > 0 && thrusters.every((block) => block.x === 0);
  }).length;

  assert.equal(lowThrustCount, 6);
  assert.equal(zeroYawCount, 3);
  assert.equal(centerlineOnlyCount, 6);
});

test("approved late-game archetype-to-ai weighting stays stable", () => {
  assert.deepEqual(ENEMY_AI_PROFILE_WEIGHTS.needle, {
    punchingBag: 0.064286,
    slowReacting: 0.192857,
    wontAttackFirst: 0.192857,
    cautious: 0.2,
    opportunist: 0.175,
    aggressive: 0.125,
    berserker: 0.05
  });
  assert.deepEqual(ENEMY_AI_PROFILE_WEIGHTS.fortress, {
    punchingBag: 0.091525,
    slowReacting: 0.190678,
    wontAttackFirst: 0.167797,
    cautious: 0.254878,
    opportunist: 0.147561,
    aggressive: 0.093902,
    berserker: 0.053659
  });
  assert.equal(chooseEnemyAiProfile("needle", () => 0.4).id, "wontAttackFirst");
  assert.equal(chooseEnemyAiProfile("fortress", () => 0.9).id, "aggressive");
});

test("enemy director keeps the early game populated and ramps from time plus kills", () => {
  const earlyDirector = getEnemySpawnDirector(0, 0);
  const midDirector = getEnemySpawnDirector(90, 3);
  const lateDirector = getEnemySpawnDirector(240, 8);

  assert.equal(getEnemyDifficultyProgress(0, 0), 0);
  assert.equal(getEnemyProgressionLevel(0, 0), 1);
  assert.equal(earlyDirector.activeCap, 3);
  assert.equal(midDirector.activeCap, 3);
  assert.equal(lateDirector.activeCap, 3);
  assert.equal(getEnemyProgressionLevel(60, 0), 2);
  assert.ok(lateDirector.spawnInterval < earlyDirector.spawnInterval);
  assert.ok(lateDirector.initialSpawnDelay < earlyDirector.initialSpawnDelay);
  assert.ok(lateDirector.progress > midDirector.progress);
});

test("soft personalities make up the majority of the enemy pool", () => {
  assert.deepEqual(getEnemyAiProfileWeights("needle", 0), ENEMY_AI_PROFILE_EARLY_WEIGHTS.needle);
  assert.deepEqual(getEnemyAiProfileWeights("bulwark", 0), ENEMY_AI_PROFILE_EARLY_WEIGHTS.bulwark);
  const earlyNeedleSoft =
    getEnemyAiProfileWeights("needle", 0).punchingBag +
    getEnemyAiProfileWeights("needle", 0).slowReacting +
    getEnemyAiProfileWeights("needle", 0).wontAttackFirst;
  const lateNeedleSoft =
    getEnemyAiProfileWeights("needle", 1).punchingBag +
    getEnemyAiProfileWeights("needle", 1).slowReacting +
    getEnemyAiProfileWeights("needle", 1).wontAttackFirst;
  assert.ok(earlyNeedleSoft >= 0.6);
  assert.ok(Math.abs(lateNeedleSoft - 0.45) < 0.000001);
  assert.equal(chooseEnemyAiProfile("needle", () => 0.05, 0).id, "punchingBag");
  assert.equal(chooseEnemyAiProfile("needle", () => 0.4, 1).id, "wontAttackFirst");
});

test("enemy spawn helper always places ships outside the viewport bounds", () => {
  const topSpawn = getOffscreenSpawnPosition(100, -60, 800, 600, 180, (() => {
    const rolls = [0.1, 0.5, 0.25];
    return () => rolls.shift() ?? 0;
  })());
  const rightSpawn = getOffscreenSpawnPosition(100, -60, 800, 600, 180, (() => {
    const rolls = [0.3, 0.75, 0.5];
    return () => rolls.shift() ?? 0;
  })());

  assert.equal(topSpawn.y < -60 - 300, true);
  assert.equal(rightSpawn.x > 100 + 400, true);
});

test("early spawn margin pushes passive enemies outside their retreat band", () => {
  assert.equal(getEnemySpawnMargin(0), 460);
  assert.equal(getEnemySpawnMargin(1), 180);
  assert.ok(300 + getEnemySpawnMargin(0) > 720);
});

test("spawn pressure window ignores far offscreen enemies", () => {
  const enemies = [
    createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
      kind: "enemy",
      x: 200,
      y: 0
    }),
    createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
      kind: "enemy",
      x: 900,
      y: 0
    })
  ];

  assert.equal(countShipsWithinSpawnPressureWindow(enemies, 0, 0, 800, 600), 1);
});

test("very distant enemies get recycled before they can stall the spawn loop", () => {
  const director = getEnemySpawnDirector(240, 13);
  const enemies = [
    createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
      kind: "enemy",
      x: 160,
      y: 0
    }),
    createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
      kind: "enemy",
      x: 1700,
      y: 0
    }),
    createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
      kind: "enemy",
      x: -1850,
      y: 0
    })
  ];

  const retained = retainEnemiesNearPlayerSpace(enemies, 0, 0, 800, 600);
  assert.equal(retained.length, 1);
  assert.equal(resolveEnemySpawnPressureTimer(0.05, retained.length, 0, director, 0.1).shouldSpawn, true);
});

test("spawn pressure timer refills quickly when no nearby enemies are in play", () => {
  const director = getEnemySpawnDirector(0, 0);
  const stalled = resolveEnemySpawnPressureTimer(6.2, 1, 0, director, 0.1);
  const engaged = resolveEnemySpawnPressureTimer(6.2, 1, 1, director, 0.1);

  assert.equal(stalled.shouldSpawn, false);
  assert.ok(stalled.timer < engaged.timer);
  assert.ok(stalled.timer <= 1.15);
  assert.equal(
    resolveEnemySpawnPressureTimer(0.05, 1, 0, director, 0.1).nextSpawnTimer <= director.spawnInterval,
    true
  );
});

test("opportunist ai prefers a weaker nearby target over the slightly closer healthy one", () => {
  const opportunist = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-opportunist",
    x: 0,
    y: 0,
    ai: { profileId: "opportunist", orbitSign: 1, targetId: null }
  });
  const healthyTarget = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "healthy-target",
    x: 220,
    y: 0
  });
  const woundedTarget = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "wounded-target",
    x: 260,
    y: 0
  });

  woundedTarget.blocks[0].hp = woundedTarget.blocks[0].maxHp * 0.1;

  assert.equal(
    chooseEnemyTarget(opportunist, [opportunist, healthyTarget, woundedTarget])?.id,
    "wounded-target"
  );
});

test("berserker pushes and fires through sloppier alignment while punching bag stays harmless", () => {
  const punchingBag = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "punching-bag",
    kind: "enemy",
    x: 0,
    y: 0,
    angle: -0.26,
    ai: { profileId: "punchingBag", orbitSign: 1, targetId: null }
  });
  const berserkerEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "berserker-enemy",
    kind: "enemy",
    x: 0,
    y: 0,
    angle: -0.26,
    ai: { profileId: "berserker", orbitSign: 1, targetId: null }
  });
  const target = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "target-ship",
    x: 0,
    y: -500
  });

  const passivePlan = resolveEnemyAiPlan(punchingBag, [punchingBag, target]);
  const berserkerPlan = resolveEnemyAiPlan(berserkerEnemy, [berserkerEnemy, target]);

  assert.equal(registerEnemyProvocation(punchingBag, "target-ship", 1, () => 0), false);
  assert.equal(passivePlan.input.up, false);
  assert.equal(passivePlan.input.down, false);
  assert.equal(passivePlan.shouldFire, false);
  assert.equal(berserkerPlan.input.up, true);
  assert.equal(berserkerPlan.input.down, false);
  assert.equal(berserkerPlan.shouldFire, true);
});

test("soft idle personalities patrol around the player instead of stalling in place", () => {
  const punchingBag = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "idle-bag",
    team: "enemy-idle",
    kind: "enemy",
    x: 620,
    y: 540,
    angle: 0,
    ai: {
      profileId: "punchingBag",
      orbitSign: 1,
      idlePatrolSign: 1,
      idleSeed: 0.15,
      now: 4
    }
  });
  const player = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "player-ship",
    team: "player",
    kind: "player",
    x: 0,
    y: 0
  });

  const plan = resolveEnemyAiPlan(punchingBag, [punchingBag, player], 1 / 60);

  assert.equal(plan.targetId, null);
  assert.ok(Object.values(plan.input).some(Boolean));
  assert.equal(plan.shouldFire, false);
});

test("slow reacting ai tracks target movement more slowly than aggressive steering", () => {
  const slowEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "slow-enemy",
    kind: "enemy",
    x: 0,
    y: 0,
    angle: 0,
    ai: {
      profileId: "slowReacting",
      orbitSign: 1,
      targetId: "target-ship",
      trackedShipId: "target-ship",
      trackedX: 0,
      trackedY: -500,
      targetSince: -10,
      now: 1
    }
  });
  const aggressiveEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "aggressive-enemy",
    kind: "enemy",
    x: 0,
    y: 0,
    angle: 0,
    ai: {
      profileId: "aggressive",
      orbitSign: 1,
      targetId: "target-ship",
      trackedShipId: "target-ship",
      trackedX: 0,
      trackedY: -500,
      targetSince: -10,
      now: 1
    }
  });
  const target = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "target-ship",
    x: 360,
    y: -500
  });

  const slowPlan = resolveEnemyAiPlan(slowEnemy, [slowEnemy, target], 1 / 60);
  const aggressivePlan = resolveEnemyAiPlan(aggressiveEnemy, [aggressiveEnemy, target], 1 / 60);

  assert.equal(slowPlan.input.turnRight, true);
  assert.equal(aggressivePlan.input.turnRight, true);
  assert.ok(aggressiveEnemy.ai.trackedX > slowEnemy.ai.trackedX);
});

test("won't attack first can open on enemies but still refuses to attack the player first", () => {
  const neutralEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "neutral-enemy",
    team: "enemy-neutral",
    kind: "enemy",
    x: 0,
    y: 0,
    ai: { profileId: "wontAttackFirst", orbitSign: 1, now: 2 }
  });
  const rivalEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "rival-enemy",
    team: "enemy-rival",
    kind: "enemy",
    x: 120,
    y: 0
  });
  const player = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "player-ship",
    team: "player",
    kind: "player",
    x: 80,
    y: 0
  });

  assert.equal(chooseEnemyTarget(neutralEnemy, [neutralEnemy, rivalEnemy, player])?.id, "rival-enemy");
  assert.equal(registerEnemyProvocation(neutralEnemy, "player-ship", 2, () => 0), true);
  neutralEnemy.ai.now = 2.8;
  assert.equal(chooseEnemyTarget(neutralEnemy, [neutralEnemy, rivalEnemy, player])?.id, "player-ship");
});

test("enemy quality progression can now reach rainbow in very late runs", () => {
  assert.equal(getEnemyQualityForLevel(14), "white");
  assert.equal(getEnemyQualityForLevel(16), "rainbow");
});

test("slow reacting now always enters retaliation state when provoked", () => {
  const slowEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "slow-enemy",
    kind: "enemy",
    ai: { profileId: "slowReacting", now: 3 }
  });

  assert.equal(registerEnemyProvocation(slowEnemy, "player-ship", 3, () => 0.99), true);
  assert.equal(slowEnemy.ai.provokedById, "player-ship");
  assert.equal(slowEnemy.ai.provokedUntil > 3, true);
});

test("free-for-all targeting picks the nearest other ship, not just the player", () => {
  const player = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "player-ship",
    team: "player",
    x: 480
  });
  const enemyA = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-a",
    team: "enemy-a",
    x: 0
  });
  const enemyB = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-b",
    team: "enemy-b",
    x: 120
  });

  assert.equal(pickNearestOtherShip(enemyA, [player, enemyA, enemyB])?.id, "enemy-b");
});

test("alive ship pairing includes enemy-enemy collisions", () => {
  const player = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "player-ship",
    x: 0
  });
  const enemyA = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-a",
    x: 100
  });
  const enemyB = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-b",
    x: 200
  });
  const deadEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "enemy-dead",
    x: 300
  });
  deadEnemy.alive = false;

  const pairIds = getAliveShipPairs([player, enemyA, enemyB, deadEnemy]).map(
    ([left, right]) => `${left.id}:${right.id}`
  );

  assert.deepEqual(pairIds, [
    "player-ship:enemy-a",
    "player-ship:enemy-b",
    "enemy-a:enemy-b"
  ]);
});

test("ship collision overlap reports penetration depth for clipped ships, including yawed contacts", () => {
  const leftShip = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    x: 0,
    y: 0
  });
  const rightShip = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    x: CELL_SIZE * 0.62,
    y: 0
  });
  rightShip.angle = Math.PI * 0.25;

  const overlap = getShipCollisionOverlap(leftShip, rightShip);
  const cellOverlap = getShipCellOverlap(
    leftShip,
    getBlockCells(leftShip.blocks[0])[0],
    rightShip,
    getBlockCells(rightShip.blocks[0])[0]
  );
  assert.ok(overlap);
  assert.ok(cellOverlap);
  assert.ok(overlap.penetration > 0);
  assert.ok(overlap.normalX > 0);
});

test("ship death salvage floors surviving block hp before dropping scrap", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" }),
    createBlueprintBlock({ type: "shield", x: -1, y: 0, quality: "red", orientation: "west" })
  ]);
  const survivingHull = ship.blocks.find((block) => block.type === "hull");
  const destroyedShield = ship.blocks.find((block) => block.type === "shield");

  survivingHull.hp = 1;
  destroyedShield.hp = 0;

  const salvage = prepareShipDeathSalvageBlocks(ship);

  assert.equal(salvage.length, 1);
  assert.equal(salvage[0].type, "hull");
  assert.ok(salvage[0].hp >= salvage[0].maxHp * 0.85);
});

test("ship death salvage spawn state ejects drops outward from the wreck", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" }),
    createBlueprintBlock({ type: "thruster", x: 0, y: 1, quality: "red", orientation: "north" })
  ], {
    x: 120,
    y: -40,
    vx: 30,
    vy: -15
  });
  const hull = ship.blocks.find((block) => block.type === "hull");
  const thruster = ship.blocks.find((block) => block.type === "thruster");

  const hullSpawn = getShipDeathSalvageSpawnState(ship, hull);
  const thrusterSpawn = getShipDeathSalvageSpawnState(ship, thruster);

  assert.ok(hullSpawn.x > ship.x + CELL_SIZE);
  assert.ok(hullSpawn.vx > ship.vx);
  assert.ok(thrusterSpawn.y > ship.y + CELL_SIZE);
  assert.ok(thrusterSpawn.vy > ship.vy);
});

test("loose blocks can preserve persistent salvage flags from ship death drops", () => {
  const loose = makeLooseFromBlock(
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red" }),
    40,
    -20,
    { x: 6, y: -4 },
    { damageGrace: 2.4, persistentSalvage: true }
  );

  assert.equal(loose.damageGrace, 2.4);
  assert.equal(loose.persistentSalvage, true);
});

test("persistent salvage can still be damaged after its grace window ends", () => {
  const loose = makeLooseFromBlock(
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red" }),
    0,
    0,
    { x: 0, y: 0 },
    { damageGrace: 0.25, persistentSalvage: true }
  );
  const bullet = { ownerId: "enemy-ship" };

  assert.equal(canDamageLooseBlock(loose), false);
  assert.equal(shouldBulletHitLooseBlock(bullet, loose), false);
  loose.damageGrace = 0;
  assert.equal(canDamageLooseBlock(loose), true);
  assert.equal(shouldBulletHitLooseBlock(bullet, loose), true);
});

test("cockpit regen restores health on a 120-second full refill slope", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const cockpit = ship.blocks[0];

  cockpit.hp = 0;
  applyCockpitRegen(ship, 1);
  assert.ok(Math.abs(cockpit.hp - cockpit.maxHp / 120) < 0.000001);

  applyCockpitRegen(ship, 119);
  assert.ok(Math.abs(cockpit.hp - cockpit.maxHp) < 0.000001);
});

test("pending game over waits three seconds before flipping the panel state", () => {
  const game = {
    playerLost: true,
    gameOver: false,
    gameOverTimer: 3
  };

  assert.equal(advancePendingGameOver(game, 2.5, 3), false);
  assert.equal(game.gameOver, false);
  assert.ok(Math.abs(game.gameOverTimer - 0.5) < 0.000001);

  assert.equal(advancePendingGameOver(game, 0.5, 3), true);
  assert.equal(game.gameOver, true);
  assert.equal(game.gameOverTimer, 0);
});

test("freshly detached loose blocks ignore bullets during damage grace", () => {
  const loose = makeLooseFromBlock(
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red" }),
    0,
    0,
    { x: 0, y: 0 },
    { damageGrace: 0.32 }
  );
  const bullet = { ownerId: "player-ship" };

  assert.equal(shouldBulletHitLooseBlock(bullet, loose), false);
  loose.damageGrace = 0;
  assert.equal(shouldBulletHitLooseBlock(bullet, loose), true);
});

test("shared dragged-loose drop resolver keeps run and builder flows aligned", () => {
  assert.equal(
    resolveDraggedLooseDrop({ source: "loose", hasMoved: false, hasSnap: false }),
    "restore-origin"
  );
  assert.equal(
    resolveDraggedLooseDrop({ source: "loose", hasMoved: true, hasSnap: false }),
    "drop-loose"
  );
  assert.equal(
    resolveDraggedLooseDrop({ source: "detached", hasMoved: true, hasSnap: false }),
    "drop-loose"
  );
  assert.equal(
    resolveDraggedLooseDrop({ source: "detached", hasMoved: false, hasSnap: false }),
    "drop-loose"
  );
  assert.equal(
    resolveDraggedLooseDrop({ source: "detached", hasMoved: false, hasSnap: true }),
    "attach"
  );
});

test("run and builder share the same mounted detach and loose pickup rules", () => {
  for (const scene of ["builder", "run"]) {
    assert.equal(
      resolveShipBoardPointerAction({
        scene,
        button: 0,
        mountedType: "hull",
        hasLooseTarget: true
      }),
      "detach-drag"
    );
    assert.equal(
      resolveShipBoardPointerAction({
        scene,
        button: 2,
        mountedType: "thruster",
        hasLooseTarget: true
      }),
      "detach"
    );
    assert.equal(
      resolveShipBoardPointerAction({
        scene,
        button: 0,
        mountedType: "cockpit",
        hasLooseTarget: true
      }),
      "drag-loose"
    );
  }
});

test("loose pickup prefers the closer block over stale top-most order", () => {
  const targetY = makeLooseFromBlock(
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red" }),
    18,
    0
  );
  const staleX = makeLooseFromBlock(
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red" }),
    0,
    0
  );

  const picked = chooseLooseBlockForPickup(
    [targetY, staleX],
    18,
    0,
    7,
    28
  );

  assert.equal(picked?.id, targetY.id);
});

test("attachments derive a valid blaster placement from the socket", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const socket = getOpenSockets(ship).find((entry) => entry.side === "north");
  const block = createBlueprintBlock({
    type: "blaster",
    x: 0,
    y: 0,
    orientation: "west",
    attachSide: "east"
  });
  assert.equal(canAttachLooseBlock(ship, block, socket), true);
  assert.deepEqual(getBlockPlacementForSocket(block, socket), {
    orientation: "north",
    attachSide: "south"
  });
});

test("thrusters auto-orient opposite the socket direction when mounted", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const socket = getOpenSockets(ship).find((entry) => entry.side === "north");
  const thruster = createBlueprintBlock({
    type: "thruster",
    x: 0,
    y: 0,
    orientation: "north"
  });
  assert.deepEqual(getBlockPlacementForSocket(thruster, socket), {
    orientation: "south",
    attachSide: "south"
  });
});

test("removing a bridge ejects disconnected blocks", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: 1, quality: "red" }),
    createBlueprintBlock({ type: "thruster", x: 0, y: 2, quality: "red", orientation: "north" })
  ]);
  const bridge = ship.blocks.find((block) => block.type === "hull");
  const result = removeBlock(ship, bridge.id);
  assert.equal(ship.blocks.length, 1);
  assert.equal(result.looseBlocks.length, 1);
  assert.equal(result.looseBlocks[0].type, "thruster");
});

test("attached loose blocks become live ship blocks", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const socket = getOpenSockets(ship).find((entry) => entry.side === "north");
  const loose = makeLooseFromBlock(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "red", orientation: "north" }),
    0,
    0
  );
  loose.hp = loose.maxHp * 0.35;
  attachLooseBlock(
    ship,
    loose,
    socket
  );
  assert.equal(ship.blocks.length, 2);
  assert.ok(Math.abs(ship.blocks.at(-1).hp - loose.hp) < 0.000001);
});

test("1x3 hulls occupy multiple cells and expose perimeter sockets", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const socket = getOpenSockets(ship).find((entry) => entry.side === "north");
  attachLooseBlock(
    ship,
    createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red", variant: "triple" }),
    socket
  );
  const longHull = ship.blocks.find((block) => block.type === "hull");
  assert.equal(longHull.orientation, "north");
  assert.equal(getBlockAtLocalPoint(ship, 0, -CELL_SIZE * 3)?.id, longHull.id);
  const sockets = getOpenSockets(ship);
  assert.ok(sockets.some((entry) => entry.x === 0 && entry.y === -4 && entry.side === "north"));
  assert.equal(sockets.some((entry) => entry.x === 0 && entry.y === 0 && entry.side === "south"), false);
});

test("1x2 hull placement fails when its footprint would collide", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -2, quality: "red" })
  ]);
  const socket = getOpenSockets(ship).find((entry) => entry.side === "north");
  const hull = createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red", variant: "double" });
  assert.equal(canAttachLooseBlock(ship, hull, socket), false);
});

test("detach picking can use padding without changing base hit accuracy", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" })
  ]);

  assert.equal(getBlockAtLocalPoint(ship, CELL_SIZE * 1.58, 0), null);
  assert.equal(
    getBlockAtLocalPoint(ship, CELL_SIZE * 1.58, 0, 8)?.type,
    "hull"
  );
});

test("thruster quality gains diminish while thrust keeps increasing", () => {
  const qualities = ["red", "orange", "yellow", "green", "blue", "purple", "white", "rainbow"];
  const thrusts = qualities.map(
    (quality) => getBlockStats(createBlueprintBlock({ type: "thruster", x: 0, y: 0, quality })).thrust
  );

  assert.equal(thrusts[0], 880);

  for (let index = 1; index < thrusts.length; index += 1) {
    assert.ok(thrusts[index] > thrusts[index - 1]);
  }

  const deltas = thrusts.slice(1).map((value, index) => value - thrusts[index]);
  for (let index = 1; index < deltas.length; index += 1) {
    assert.ok(deltas[index] < deltas[index - 1]);
  }
});

test("quality matchup pass keeps same-tier hulls at seven hits and speeds up real overmatch", () => {
  const expectedHits = [
    [7, 9, 12, 15, 19, 24, 29, 36, 46],
    [4, 7, 9, 12, 15, 19, 24, 30, 39],
    [2, 4, 7, 9, 12, 15, 19, 24, 32],
    [1, 2, 4, 7, 9, 12, 15, 20, 26],
    [1, 1, 2, 4, 7, 9, 12, 15, 21],
    [1, 1, 1, 2, 4, 7, 9, 13, 16],
    [1, 1, 1, 1, 2, 4, 7, 10, 13],
    [1, 1, 1, 1, 1, 2, 4, 7, 10],
    [1, 1, 1, 1, 1, 1, 2, 4, 7]
  ];

  for (let attackerIndex = 0; attackerIndex < QUALITY_IDS.length; attackerIndex += 1) {
    const attackerQuality = QUALITY_IDS[attackerIndex];
    for (let defenderIndex = 0; defenderIndex < QUALITY_IDS.length; defenderIndex += 1) {
      const defenderQuality = QUALITY_IDS[defenderIndex];
      const hits = getHitsToDestroy(
        createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: defenderQuality }),
        attackerQuality
      );
      assert.equal(hits, expectedHits[attackerIndex][defenderIndex]);
    }
  }
});

test("same-tier larger hulls and shields stay only slightly tougher than hull 1x1", () => {
  for (const quality of ["red", "blue", "rainbow"]) {
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "hull", x: 0, y: 0, quality, variant: "single" }), quality),
      7
    );
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "hull", x: 0, y: 0, quality, variant: "double" }), quality),
      8
    );
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "hull", x: 0, y: 0, quality, variant: "triple" }), quality),
      9
    );
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality, orientation: "north" }), quality),
      6
    );
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "thruster", x: 0, y: 0, quality, orientation: "north" }), quality),
      6
    );
    assert.equal(
      getHitsToDestroy(createBlueprintBlock({ type: "shield", x: 0, y: 0, quality, orientation: "north" }), quality),
      9
    );
  }
});

test("cockpit now folds faster to higher-quality blasters", () => {
  const expectedHits = {
    grey: 10,
    red: 9,
    orange: 8,
    yellow: 8,
    green: 7,
    blue: 6,
    purple: 6,
    white: 5,
    rainbow: 5
  };

  const cockpit = createBlueprintBlock({ type: "cockpit", x: 0, y: 0 });
  for (const [quality, hits] of Object.entries(expectedHits)) {
    assert.equal(getHitsToDestroy(cockpit, quality), hits);
  }
});

test("blaster cadence, speed, and range scale on the compressed early-game curve", () => {
  const grey = getBlockStats(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "grey", orientation: "north" })
  );
  const red = getBlockStats(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "red", orientation: "north" })
  );
  const green = getBlockStats(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "green", orientation: "north" })
  );
  const rainbow = getBlockStats(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "rainbow", orientation: "north" })
  );
  const ship = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    team: "player",
    kind: "player"
  });
  const builtInBlaster = getBuiltInBlaster(ship);
  const builtIn = getBlockStats(builtInBlaster);

  assert.ok(grey.cooldown > red.cooldown);
  assert.ok(red.cooldown > green.cooldown);
  assert.ok(green.cooldown > rainbow.cooldown);
  assert.ok(Math.abs(grey.cooldown - 0.504) < 0.000001);
  assert.ok(Math.abs(rainbow.cooldown - 0.322) < 0.000001);
  assert.ok(builtIn.cooldown >= 0.5);
  assert.ok(grey.speed < red.speed);
  assert.ok(red.speed < green.speed);
  assert.ok(green.speed < rainbow.speed);
  const greyRange = grey.speed * grey.ttl;
  const redRange = red.speed * red.ttl;
  const greenRange = green.speed * green.ttl;
  const rainbowRange = rainbow.speed * rainbow.ttl;
  assert.ok(greyRange < redRange);
  assert.ok(redRange < greenRange);
  assert.ok(greenRange < rainbowRange);
  assert.ok(Math.abs(greyRange - redRange * (0.21 / 0.26)) < 0.000001);
  assert.ok(Math.abs(rainbowRange - greenRange * (0.61 / 0.41)) < 0.000001);
  assert.equal(builtInBlaster.quality, "red");
  assert.ok(Math.abs(builtIn.cooldown - red.cooldown * 1.05) < 0.000001);
  assert.ok(Math.abs(builtIn.speed - grey.speed) < 25);
  assert.ok(Math.abs(builtIn.speed * builtIn.ttl - greyRange) < 12);
});

test("dual blaster keeps both projectiles parallel", () => {
  const dual = getBlockStats(
    createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality: "red", variant: "dual", orientation: "north" })
  );

  assert.deepEqual(dual.spread, [0, 0]);
  assert.deepEqual(dual.offsets, [-8, 8]);
});

test("snap candidate selection prefers the orientation chosen by rotation", () => {
  const block = createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red", variant: "double", orientation: "north" });
  const northCandidate = {
    x: 1,
    y: -1,
    gap: 8,
    placement: { orientation: "north", attachSide: "south" }
  };
  const eastCandidate = {
    x: 1,
    y: -1,
    gap: 8,
    placement: { orientation: "east", attachSide: "west" }
  };

  assert.equal(chooseBestSnapCandidate(block, [eastCandidate, northCandidate]), northCandidate);
  const rotated = { ...block, orientation: "east" };
  assert.equal(chooseBestSnapCandidate(rotated, [northCandidate, eastCandidate]), eastCandidate);
});

test("snap rotation stays in place when the same cell supports multiple orientations", () => {
  const block = createBlueprintBlock({ type: "hull", x: 0, y: 0, quality: "red", variant: "double", orientation: "east" });
  const sameCellNorth = {
    x: 1,
    y: -1,
    gap: 12,
    placement: { orientation: "north", attachSide: "south" }
  };
  const sameCellEast = {
    x: 1,
    y: -1,
    gap: 12,
    placement: { orientation: "east", attachSide: "west" }
  };
  const otherEast = {
    x: 2,
    y: 0,
    gap: 10,
    placement: { orientation: "east", attachSide: "west" }
  };

  assert.equal(
    chooseBestSnapCandidate(block, [otherEast, sameCellNorth, sameCellEast], sameCellNorth),
    sameCellEast
  );
});

test("manual detach ejects the full branch that depended on the removed part", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -1, quality: "red" }),
    createBlueprintBlock({ type: "hull", x: 1, y: -1, quality: "red" }),
    createBlueprintBlock({ type: "blaster", x: 2, y: -1, quality: "red", orientation: "east" })
  ]);
  const parent = ship.blocks.find((block) => block.type === "hull" && block.x === 0 && block.y === -1);
  const result = removeBlock(ship, parent.id);

  assert.deepEqual(
    ship.blocks.map((block) => block.type),
    ["cockpit"]
  );
  assert.equal(result.destroyed.type, "hull");
  assert.deepEqual(
    result.looseBlocks.map((block) => block.type).sort(),
    ["blaster", "hull"]
  );
});

test("detaching a bridge ejects blocks that only touch the ship on a non-attachable side", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -1, quality: "red" }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" }),
    createBlueprintBlock({ type: "thruster", x: 1, y: -1, quality: "red", orientation: "west" })
  ]);
  const bridge = ship.blocks.find((block) => block.type === "hull" && block.x === 0 && block.y === -1);
  const thruster = ship.blocks.find((block) => block.type === "thruster");
  const result = removeBlock(ship, bridge.id);

  assert.deepEqual(
    ship.blocks.map((block) => block.type).sort(),
    ["cockpit", "hull"]
  );
  assert.equal(ship.blocks.some((block) => block.id === thruster.id), false);
  assert.ok(result.looseBlocks.some((block) => block.id === thruster.id));
});

test("detach keeps blocks that still have another valid hull path to the cockpit", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -1, quality: "red" }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red" }),
    createBlueprintBlock({ type: "hull", x: 1, y: -1, quality: "red" })
  ]);
  const bridge = ship.blocks.find((block) => block.type === "hull" && block.x === 0 && block.y === -1);
  const corner = ship.blocks.find((block) => block.type === "hull" && block.x === 1 && block.y === -1);
  const result = removeBlock(ship, bridge.id);

  assert.equal(result.looseBlocks.length, 0);
  assert.equal(ship.blocks.some((block) => block.id === corner.id), true);
});

test("cockpit built-in stern thruster provides forward motion", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const result = selectThrustersForInput(ship, {
    up: true,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false
  });
  assert.deepEqual(ship.builtInThrustersActive, {
    west: false,
    east: false,
    south: true
  });
  assert.ok(result.active.includes(`${ship.blocks[0].id}-builtin-south`));
  assert.equal(result.localForceY, -1200);
  assert.equal(result.torque, 0);
});

test("cockpit side thrusters provide turn torque without consuming sockets", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })
  ]);
  const result = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: true,
    turnRight: false
  });
  assert.deepEqual(ship.builtInThrustersActive, {
    west: false,
    east: true,
    south: false
  });
  assert.ok(result.active.includes(`${ship.blocks[0].id}-builtin-east`));
  assert.equal(result.torque, -11000);
  assert.equal(getOpenSockets(ship).length, 4);
});

test("port and starboard mounted thrusters engage on A/D turns", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "thruster", x: -1, y: 0, orientation: "east" }),
    createBlueprintBlock({ type: "thruster", x: 1, y: 0, orientation: "west" })
  ]);
  const portThruster = ship.blocks.find((block) => block.type === "thruster" && block.x === -1);
  const starboardThruster = ship.blocks.find((block) => block.type === "thruster" && block.x === 1);

  const turnLeft = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: true,
    turnRight: false
  });
  assert.equal(starboardThruster.active, true);
  assert.equal(portThruster.active, false);
  assert.ok(turnLeft.active.includes(starboardThruster.id));
  assert.equal(turnLeft.localForceX, 0);
  assert.equal(turnLeft.torque < 0, true);

  const turnRight = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: true
  });
  assert.equal(portThruster.active, true);
  assert.equal(starboardThruster.active, false);
  assert.ok(turnRight.active.includes(portThruster.id));
  assert.equal(turnRight.localForceX, 0);
  assert.equal(turnRight.torque > 0, true);
});

test("occupying cockpit sides removes the matching built-in systems", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -1, quality: "red", attachSide: "south" }),
    createBlueprintBlock({ type: "hull", x: 1, y: 0, quality: "red", attachSide: "west" }),
    createBlueprintBlock({ type: "hull", x: 0, y: 1, quality: "red", attachSide: "north" })
  ], {
    team: "player",
    kind: "player"
  });

  assert.equal(getBuiltInBlaster(ship), null);

  const forward = selectThrustersForInput(ship, {
    up: true,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false
  });
  assert.deepEqual(ship.builtInThrustersActive, {
    west: false,
    east: false,
    south: false
  });
  assert.equal(forward.localForceY, 0);
  assert.equal(forward.active.some((id) => id.includes("builtin")), false);

  const turnLeft = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: true,
    turnRight: false
  });
  assert.deepEqual(ship.builtInThrustersActive, {
    west: false,
    east: false,
    south: false
  });
  assert.equal(turnLeft.torque, 0);
  assert.equal(turnLeft.active.some((id) => id.includes("builtin")), false);

  const turnRight = selectThrustersForInput(ship, {
    up: false,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: true
  });
  assert.deepEqual(ship.builtInThrustersActive, {
    west: true,
    east: false,
    south: false
  });
  assert.ok(turnRight.active.includes(`${ship.blocks[0].id}-builtin-west`));
  assert.equal(turnRight.torque > 0, true);
});

test("ship-destruction salvage only includes attached blocks that still have hp", () => {
  const ship = createShipFromBlueprint([
    createBlueprintBlock({ type: "cockpit", x: 0, y: 0 }),
    createBlueprintBlock({ type: "hull", x: 0, y: -1, quality: "red" }),
    createBlueprintBlock({ type: "shield", x: 1, y: 0, quality: "red", orientation: "east" })
  ]);
  const destroyedHull = ship.blocks.find((block) => block.type === "hull");
  const survivingShield = ship.blocks.find((block) => block.type === "shield");

  destroyedHull.hp = 0;
  survivingShield.hp = Math.max(1, survivingShield.hp - 7);

  assert.deepEqual(
    getShipSalvageBlocks(ship).map((block) => block.type),
    ["shield"]
  );
});
