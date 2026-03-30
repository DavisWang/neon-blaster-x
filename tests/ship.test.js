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
  chooseEnemyTarget,
  chooseLooseBlockForPickup,
    createBlueprintBlock,
    createShipFromBlueprint,
    ENEMY_AI_PROFILE_EARLY_WEIGHTS,
    ENEMY_AI_PROFILE_WEIGHTS,
    getAliveShipPairs,
    getBlockAtLocalPoint,
    getEnemyAiProfileWeights,
    getBlockCells,
    getCenterOfMass,
    getAvailableEnemyArchetypes,
  getEnemyDifficultyProgress,
  getEnemyProgressionLevel,
  getEnemySpawnDirector,
  getOffscreenSpawnPosition,
  findConnectedBlockIds,
  getMass,
  getShipDeathSalvageSpawnState,
  getBlockStats,
  getBuiltInBlaster,
  getBlockPlacementForSocket,
  getShipGlowMultiplier,
  getOpenSockets,
  pickNearestOtherShip,
  prepareShipDeathSalvageBlocks,
  getShipSalvageBlocks,
  makeDefaultBuilderBlueprint,
  makeLooseFromBlock,
  makeDefaultPlayerBlueprint,
  removeBlock,
  resolveBuilderBlueprint,
  resolveDraggedLooseDrop,
  resolveEnemyAiPlan,
  resolveRunBlueprint,
  resolveShipBoardPointerAction,
  shouldBulletHitLooseBlock,
  selectThrustersForInput
} from "../src/ship.js";

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

test("ship visual quality cycles high, medium, low and scales glow strength", () => {
  assert.equal(cycleShipVisualQuality("high"), "medium");
  assert.equal(cycleShipVisualQuality("medium"), "low");
  assert.equal(cycleShipVisualQuality("low"), "high");
  assert.equal(getShipGlowMultiplier("low"), 0);
  assert.ok(getShipGlowMultiplier("medium") > 0);
  assert.ok(getShipGlowMultiplier("high") > getShipGlowMultiplier("medium"));
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

test("enemy archetype blueprints stay cockpit-connected with stable block counts", () => {
  const expectedBlockCounts = {
    needle: 6,
    bulwark: 9,
    manta: 9,
    fortress: 22,
    vulture: 10
  };

  for (const [archetypeId, expectedCount] of Object.entries(expectedBlockCounts)) {
    const blueprint = buildEnemyBlueprint(archetypeId, "blue");
    const ship = createShipFromBlueprint(blueprint, { kind: "enemy" });
    const connected = findConnectedBlockIds(ship);

    assert.equal(blueprint.length, expectedCount);
    assert.equal(
      ship.blocks.every((block) => block.type === "cockpit" || connected.has(block.id)),
      true
    );
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

test("early enemy archetype pool excludes the larger late-game frames", () => {
  assert.deepEqual(
    getAvailableEnemyArchetypes(1).map((definition) => definition.id),
    ["needle", "bulwark"]
  );
});

test("approved late-game archetype-to-ai weighting stays stable", () => {
  assert.deepEqual(ENEMY_AI_PROFILE_WEIGHTS.needle, {
    passive: 0.05,
    cautious: 0.15,
    opportunist: 0.2,
    aggressive: 0.4,
    berserker: 0.2
  });
  assert.deepEqual(ENEMY_AI_PROFILE_WEIGHTS.fortress, {
    passive: 0.3,
    cautious: 0.4,
    opportunist: 0.15,
    aggressive: 0.1,
    berserker: 0.05
  });
  assert.equal(chooseEnemyAiProfile("needle", () => 0.6).id, "aggressive");
  assert.equal(chooseEnemyAiProfile("fortress", () => 0.96).id, "berserker");
});

test("enemy director starts slow and ramps from time plus kills", () => {
  const earlyDirector = getEnemySpawnDirector(0, 0);
  const midDirector = getEnemySpawnDirector(90, 3);
  const lateDirector = getEnemySpawnDirector(240, 8);

  assert.equal(getEnemyDifficultyProgress(0, 0), 0);
  assert.equal(getEnemyProgressionLevel(0, 0), 1);
  assert.equal(earlyDirector.activeCap, 1);
  assert.equal(midDirector.activeCap, 2);
  assert.equal(lateDirector.activeCap, 3);
  assert.equal(getEnemyProgressionLevel(60, 0), 2);
  assert.ok(lateDirector.spawnInterval < earlyDirector.spawnInterval);
  assert.ok(lateDirector.initialSpawnDelay < earlyDirector.initialSpawnDelay);
  assert.ok(lateDirector.progress > midDirector.progress);
});

test("early ai weights heavily prefer passive and cautious ships", () => {
  assert.deepEqual(getEnemyAiProfileWeights("needle", 0), ENEMY_AI_PROFILE_EARLY_WEIGHTS.needle);
  assert.deepEqual(getEnemyAiProfileWeights("bulwark", 0), ENEMY_AI_PROFILE_EARLY_WEIGHTS.bulwark);
  assert.equal(getEnemyAiProfileWeights("needle", 0).passive, 0.8);
  assert.equal(chooseEnemyAiProfile("needle", () => 0.5, 0).id, "passive");
  assert.equal(chooseEnemyAiProfile("needle", () => 0.5, 1).id, "aggressive");
  assert.ok(getEnemyAiProfileWeights("needle", 0).passive > getEnemyAiProfileWeights("needle", 1).passive);
  assert.ok(getEnemyAiProfileWeights("needle", 0).aggressive < getEnemyAiProfileWeights("needle", 1).aggressive);
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

test("berserker pushes and fires through sloppier alignment while passive retreats", () => {
  const passiveEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "passive-enemy",
    x: 0,
    y: 0,
    angle: -0.26,
    ai: { profileId: "passive", orbitSign: 1, targetId: null }
  });
  const berserkerEnemy = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })], {
    id: "berserker-enemy",
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

  const passivePlan = resolveEnemyAiPlan(passiveEnemy, [passiveEnemy, target]);
  const berserkerPlan = resolveEnemyAiPlan(berserkerEnemy, [berserkerEnemy, target]);

  assert.equal(passivePlan.input.down, true);
  assert.equal(passivePlan.input.up, false);
  assert.equal(passivePlan.shouldFire, false);
  assert.equal(berserkerPlan.input.up, true);
  assert.equal(berserkerPlan.input.down, false);
  assert.equal(berserkerPlan.shouldFire, true);
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

test("same-tier hull durability steps up by quality", () => {
  const expectedHits = {
    red: 5,
    orange: 10,
    yellow: 15,
    green: 20
  };

  for (const [quality, hits] of Object.entries(expectedHits)) {
    const hullHp = getBlockStats(createBlueprintBlock({ type: "hull", x: 0, y: 0, quality })).hp;
    const blasterDamage = getBlockStats(
      createBlueprintBlock({ type: "blaster", x: 0, y: 0, quality, orientation: "north" })
    ).damage;
    assert.ok(Math.abs(hullHp / blasterDamage - hits) < 0.000001);
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
  const ship = createShipFromBlueprint([createBlueprintBlock({ type: "cockpit", x: 0, y: 0 })]);
  const builtIn = getBlockStats(getBuiltInBlaster(ship));

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
  assert.ok(Math.abs(builtIn.cooldown - red.cooldown * 1.05) < 0.000001);
  assert.ok(Math.abs(builtIn.speed - grey.speed) < 25);
  assert.ok(Math.abs(builtIn.speed * builtIn.ttl - greyRange) < 12);
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
  ]);

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
