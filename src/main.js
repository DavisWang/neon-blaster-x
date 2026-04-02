import {
  BLOCK_DEFS,
  BULLET_RADIUS,
  CAMERA_LERP,
  CELL_SIZE,
  COLLISION_DAMAGE_SCALE,
  HALF_CELL,
  LOOSE_DRAG,
  LOOSE_PICK_RADIUS,
  PALETTE_BLOCKS,
  QUALITY_TIERS,
  QUALITY_BY_ID,
  SHIP_DRAG,
  SIDE_ORDER,
  SIDE_VECTORS,
  SOCKET_SNAP_DISTANCE
} from "./data.js";
import { createAudioDirector } from "./audio.js";
import {
  angleBetween,
  clamp,
  distance,
  hash2D,
  length,
  lerp,
  normalize,
  randInRange,
  rotate,
  wrapAngle
} from "./math.js";
import {
  advancePendingGameOver,
  applyCockpitRegen,
  attachLooseBlock,
  canAttachLooseBlock,
  canDamageLooseBlock,
  cycleShipVisualQuality,
  chooseBestSnapCandidate,
  chooseLooseBlockForPickup,
  countShipsWithinSpawnPressureWindow,
  createBlueprintBlock,
  createShipFromBlueprint,
  ejectDisconnectedBlocks,
  formatShipDesignExport,
  generateEnemyBlueprint,
  generateEnemyLoadout,
  generateEnemyLoadoutForDesign,
  getEnemySpawnMargin,
  getEnemySpawnDirector,
  getOffscreenSpawnPosition,
  getBlockAtLocalPoint,
  getBlockCells,
  getProjectileDamageAgainstBlock,
  getShipCellOverlap,
  getShipCollisionOverlap,
  getBlockStats,
  getBlockWorldPosition,
  getBuiltInBlaster,
  getBlockPlacementForSocket,
  getAliveShipPairs,
  getShipDeathSalvageSpawnState,
  getCockpit,
  getCockpitOpenSides,
  getShipVisualQualityProfile,
  getBlockRenderOffset,
  getHullLength,
  getInertia,
  getMass,
  getOpenSockets,
  getQuality,
  localToWorld,
  makeDefaultPlayerBlueprint,
  makeLooseFromBlock,
  oppositeSide,
  prepareShipDeathSalvageBlocks,
  registerEnemyProvocation,
  removeBlock,
  retainEnemiesNearPlayerSpace,
  resolveEnemySpawnPressureTimer,
  resolveBuilderBlueprint,
  resolveDraggedLooseDrop,
  resolveEnemyAiPlan,
  resolveRunBlueprint,
  resolveShipBoardPointerAction,
  rotateSide,
  selectThrustersForInput,
  serializeShipToBlueprint,
  sideToAngle,
  shouldBulletHitLooseBlock,
  worldToLocal
} from "./ship.js";

const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const query = new URLSearchParams(window.location.search);
const autoMode = window.NBX_BOOT_MODE ?? query.get("mode");
const autoEnemyCount = clamp(
  Number.parseInt(String(window.NBX_AUTO_ENEMIES ?? query.get("enemies") ?? "0"), 10) || 0,
  0,
  2
);
const GAME_OVER_SCREEN_DELAY = 3;

const titleScreen = document.querySelector("#title-screen");
const howToScreen = document.querySelector("#how-to-screen");
const hud = document.querySelector("#hud");
const builderSidebar = document.querySelector("#builder-sidebar");
const gameOverPanel = document.querySelector("#game-over");

const startRunButton = document.querySelector("#start-run");
const startRunHowToButton = document.querySelector("#start-run-howto");
const openBuilderButton = document.querySelector("#open-builder");
const openHowToButton = document.querySelector("#open-howto");
const closeHowToButton = document.querySelector("#close-howto");
const retryRunButton = document.querySelector("#retry-run");
const returnTitleButton = document.querySelector("#return-title");
const launchFromBuilderButton = document.querySelector("#launch-from-builder");
const exportBuilderDesignButton = document.querySelector("#export-builder-design");
const resetBuilderButton = document.querySelector("#reset-builder");
const backToTitleButton = document.querySelector("#back-to-title");
const audioToggleButton = document.querySelector("#audio-toggle");
const builderExportStatus = document.querySelector("#builder-export-status");

const qualityPalette = document.querySelector("#quality-palette");
const blockPalette = document.querySelector("#block-palette");

const hudHealth = document.querySelector("#hud-health");
const hudScore = document.querySelector("#hud-score");
const gameOverStats = document.querySelector("#game-over-stats");
const palettePreviewCanvases = new Map();
const DETACH_PICK_PADDING = 8;
const LOOSE_PICK_PADDING = 7;
const DRAG_COLLISION_PASSES = 3;
const SELF_HIT_GRACE = 0.09;
const DETACHED_LOOSE_DAMAGE_GRACE = 0.32;
const SHIP_DEATH_SALVAGE_DAMAGE_GRACE = 2.4;
const PLAYER_DEATH_ANIMATION_TTL = 2;
const BUILDER_EXPORT_STATUS_DURATION_MS = 3200;
let builderExportStatusTimer = 0;

const state = {
  scene: "title",
  time: 0,
  lastFrame: 0,
  camera: { x: 0, y: 0 },
  mouse: {
    screenX: window.innerWidth * 0.5,
    screenY: window.innerHeight * 0.5,
    worldX: 0,
    worldY: 0,
    vx: 0,
    vy: 0
  },
  input: {
    up: false,
    down: false,
    turnLeft: false,
    turnRight: false,
    fire: false
  },
  drag: null,
  titlePanel: "home",
  visualQuality: "high",
  selectedQuality: "yellow",
  selectedPaletteBlock: PALETTE_BLOCKS[0],
  builderPresetPrimed: false,
  playerBlueprint: makeDefaultPlayerBlueprint(),
  game: null,
  titlePreview: {
    player: createShipFromBlueprint(makeDefaultPlayerBlueprint(), { team: "player" }),
    enemy: createShipFromBlueprint(generateEnemyBlueprint(2), { team: "enemy", x: 220, y: -110 })
  }
};
const audio = createAudioDirector();
const QUALITY_INDEX_BY_ID = Object.fromEntries(QUALITY_TIERS.map((tier, index) => [tier.id, index]));

function colorWithAlpha(color, alpha) {
  if (color.startsWith("hsl")) {
    return color.replace(")", ` / ${clamp(alpha, 0, 1)})`).replace("hsl(", "hsl(");
  }

  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((value) => value + value).join("") : hex;
  const value = parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function getBlockColor(block, time) {
  if (block.quality === "rainbow") {
    return `hsl(${(time * 140) % 360} 100% 70%)`;
  }
  return getQuality(block).color;
}

function getRepresentativeShipQuality(blocks) {
  const weightsByQuality = new Map();

  for (const block of blocks) {
    if (block.type === "cockpit" || !block.quality) {
      continue;
    }

    const weight =
      block.type === "blaster" ? 3 : block.type === "shield" ? 2 : 1;
    weightsByQuality.set(block.quality, (weightsByQuality.get(block.quality) ?? 0) + weight);
  }

  let bestQuality = "red";
  let bestScore = Number.NEGATIVE_INFINITY;
  let bestIndex = QUALITY_INDEX_BY_ID.red ?? 1;

  for (const tier of QUALITY_TIERS) {
    const score = weightsByQuality.get(tier.id) ?? 0;
    const index = QUALITY_INDEX_BY_ID[tier.id] ?? 0;
    if (score > bestScore || (score === bestScore && index > bestIndex)) {
      bestQuality = tier.id;
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestQuality;
}

function getRenderAngleForBlock(block) {
  if (block.type === "cockpit") {
    return 0;
  }
  if (block.type === "hull") {
    return getHullLength(block) > 1 && (block.orientation === "east" || block.orientation === "west")
      ? Math.PI * 0.5
      : 0;
  }
  return sideToAngle(block.orientation) + Math.PI * 0.5;
}

function getPalettePreviewScale(block) {
  if (block.type !== "hull") {
    return 1;
  }
  return {
    1: 1,
    2: 0.78,
    3: 0.6
  }[getHullLength(block)] ?? 1;
}

// Loose salvage and dragged parts live in world space, so we rebuild their cell centers
// from a zero-based frame before doing hit tests, collisions, or preview alignment.
function makeFloatingBlockFrame(block) {
  const relativeBlock = { ...block, x: 0, y: 0 };
  return {
    relativeBlock,
    cells: getBlockCells(relativeBlock),
    offset: getBlockRenderOffset(relativeBlock)
  };
}

function getFloatingBlockCellWorldCenters(frame, worldX, worldY) {
  return frame.cells.map((cell) => ({
    x: worldX + cell.x * CELL_SIZE - frame.offset.x,
    y: worldY + cell.y * CELL_SIZE - frame.offset.y
  }));
}

// Dragged parts should collide like loose salvage, but they should never push ships around
// or become a mouse-driven weapon. We resolve the drag position instead of the ship.
function resolveDraggedBlockPosition(block, desiredX, desiredY) {
  if (!state.game) {
    return { x: desiredX, y: desiredY };
  }

  const frame = makeFloatingBlockFrame(block);
  const ships = [state.game.player, ...state.game.enemies].filter((ship) => ship?.alive);
  let x = desiredX;
  let y = desiredY;

  for (let pass = 0; pass < DRAG_COLLISION_PASSES; pass += 1) {
    let corrected = false;
    const dragCells = getFloatingBlockCellWorldCenters(frame, x, y);

    for (const ship of ships) {
      for (const shipBlock of ship.blocks) {
        for (const shipCell of getBlockCells(shipBlock)) {
          const shipWorld = localToWorld(ship, shipCell.x * CELL_SIZE, shipCell.y * CELL_SIZE);
          for (const dragCell of dragCells) {
            const dx = dragCell.x - shipWorld.x;
            const dy = dragCell.y - shipWorld.y;
            const gap = length(dx, dy);
            const minGap = CELL_SIZE * 0.72;
            if (gap >= minGap) {
              continue;
            }

            const normal =
              gap > 0.0001
                ? { x: dx / gap, y: dy / gap }
                : normalize(x - ship.x, y - ship.y);
            const push = minGap - gap + 0.6;
            x += normal.x * push;
            y += normal.y * push;
            corrected = true;
            break;
          }
          if (corrected) {
            break;
          }
        }
        if (corrected) {
          break;
        }
      }
      if (corrected) {
        break;
      }
    }

    if (corrected) {
      continue;
    }

    for (const loose of state.game.looseBlocks) {
      if (loose.destroyed) {
        continue;
      }
      const looseFrame = makeFloatingBlockFrame(loose);
      const looseCells = getFloatingBlockCellWorldCenters(looseFrame, loose.x, loose.y);
      let looseHit = false;
      for (const dragCell of dragCells) {
        for (const looseCell of looseCells) {
          const dx = dragCell.x - looseCell.x;
          const dy = dragCell.y - looseCell.y;
          const gap = length(dx, dy);
          const minGap = CELL_SIZE * 0.72;
          if (gap >= minGap) {
            continue;
          }

          const normal =
            gap > 0.0001
              ? { x: dx / gap, y: dy / gap }
              : normalize(x - loose.x, y - loose.y);
          const push = minGap - gap + 0.6;
          x += normal.x * push;
          y += normal.y * push;
          corrected = true;
          looseHit = true;
          break;
        }
        if (looseHit) {
          break;
        }
      }
      if (looseHit) {
        break;
      }
    }

    if (!corrected) {
      break;
    }
  }

  return { x, y };
}

function getDragRenderState() {
  if (!state.drag || !state.game?.player) {
    return null;
  }

  if (state.drag.snap) {
    const snappedBlock = {
      ...state.drag.block,
      x: state.drag.snap.x,
      y: state.drag.snap.y,
      ...state.drag.snap.placement
    };
    const world = getBlockWorldPosition(state.game.player, snappedBlock);
    return {
      block: snappedBlock,
      worldX: world.x,
      worldY: world.y,
      angle: state.game.player.angle + getRenderAngleForBlock(snappedBlock)
    };
  }

  const resolved = resolveDraggedBlockPosition(state.drag.block, state.drag.worldX, state.drag.worldY);
  return {
    block: state.drag.block,
    worldX: resolved.x,
    worldY: resolved.y,
    angle: getRenderAngleForBlock(state.drag.block)
  };
}

function resizeCanvas() {
  canvas.width = window.innerWidth * window.devicePixelRatio;
  canvas.height = window.innerHeight * window.devicePixelRatio;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function syncTitlePanels() {
  const showingTitle = state.scene === "title";
  titleScreen.classList.toggle("hidden", !showingTitle || state.titlePanel !== "home");
  howToScreen.classList.toggle("hidden", !showingTitle || state.titlePanel !== "howto");
}

function showScene(scene) {
  state.scene = scene;
  syncTitlePanels();
  builderSidebar.classList.toggle("hidden", scene !== "builder");
  hud.classList.toggle("hidden", scene === "title");
  gameOverPanel.classList.toggle("hidden", !state.game?.gameOver);
}

function syncHud() {
  if (!state.game?.player) {
    return;
  }

  const cockpit = getCockpit(state.game.player);
  const cockpitPct = cockpit ? Math.round((cockpit.hp / cockpit.maxHp) * 100) : 0;
  hudHealth.textContent = `Cockpit ${cockpitPct}% | Blocks ${state.game.player.blocks.length}`;
  hudScore.textContent = `Kills ${state.game.kills} | Scrap ${state.game.scrapAttached}`;

  if (state.game.gameOver) {
    gameOverStats.textContent = `Kills ${state.game.kills} | Scrap attached ${state.game.scrapAttached}`;
  }
}

function syncAudioToggle() {
  if (!audioToggleButton) {
    return;
  }

  const enabled = audio.isEnabled();
  audioToggleButton.textContent = enabled ? "Audio On" : "Audio Off";
  audioToggleButton.setAttribute("aria-pressed", String(enabled));
  audioToggleButton.dataset.enabled = enabled ? "true" : "false";
}

function setBuilderExportStatus(message = "", stateName = "idle") {
  if (!builderExportStatus) {
    return;
  }

  builderExportStatus.textContent = message;
  builderExportStatus.dataset.state = stateName;
  window.clearTimeout(builderExportStatusTimer);
  if (!message) {
    return;
  }

  builderExportStatusTimer = window.setTimeout(() => {
    builderExportStatus.textContent = "";
    builderExportStatus.dataset.state = "idle";
  }, BUILDER_EXPORT_STATUS_DURATION_MS);
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}

async function exportBuilderDesign() {
  if (!state.game?.player) {
    setBuilderExportStatus("No builder ship available to export yet.", "error");
    return;
  }

  state.playerBlueprint = serializeShipToBlueprint(state.game.player);
  const exportText = formatShipDesignExport(state.playerBlueprint, {
    source: state.scene === "builder" ? "builder" : "builder-sidebar"
  });

  try {
    await copyTextToClipboard(exportText);
    setBuilderExportStatus("Copied `nbx-ship-design-v1` JSON to the clipboard.", "success");
  } catch (error) {
    window.prompt("Copy ship design JSON:", exportText);
    setBuilderExportStatus("Clipboard was blocked, so the JSON was opened for manual copy.", "warning");
  }
}

function buildPalettes() {
  qualityPalette.innerHTML = "";
  blockPalette.innerHTML = "";
  palettePreviewCanvases.clear();

  for (const tier of QUALITY_TIERS) {
    const button = document.createElement("button");
    button.className = "palette-button";
    button.textContent = tier.label;
    button.style.borderColor = colorWithAlpha(tier.color, 0.55);
    button.style.boxShadow = `0 0 16px ${colorWithAlpha(tier.color, 0.18)}`;
    button.addEventListener("click", () => {
      state.selectedQuality = tier.id;
      updatePaletteSelection();
    });
    qualityPalette.appendChild(button);
  }

  for (const entry of PALETTE_BLOCKS) {
    const button = document.createElement("button");
    button.className = "palette-button palette-button--visual";
    const swatch = document.createElement("span");
    swatch.className = "palette-swatch";
    const preview = document.createElement("canvas");
    preview.width = 60;
    preview.height = 60;
    swatch.appendChild(preview);

    const meta = document.createElement("span");
    meta.className = "palette-meta";
    meta.innerHTML = `${entry.label}<small>${entry.detail}</small>`;

    button.append(swatch, meta);
    palettePreviewCanvases.set(button, { entry, preview });
    button.addEventListener("pointerdown", (event) => {
      if (state.scene !== "builder") {
        return;
      }
      event.preventDefault();
      state.selectedPaletteBlock = entry;
      updatePaletteSelection();
      startPaletteDrag(entry, event.clientX, event.clientY);
    });
    blockPalette.appendChild(button);
  }

  updatePaletteSelection();
}

function updatePaletteSelection() {
  const selectedTier = QUALITY_BY_ID[state.selectedQuality] ?? QUALITY_BY_ID.red;

  [...qualityPalette.children].forEach((button, index) => {
    const tier = QUALITY_TIERS[index];
    const active = tier.id === state.selectedQuality;
    button.style.background = active
      ? `linear-gradient(180deg, ${colorWithAlpha(tier.color, 0.32)}, rgba(7, 12, 20, 0.96))`
      : "rgba(10, 20, 34, 0.92)";
  });

  [...blockPalette.children].forEach((button, index) => {
    const active = PALETTE_BLOCKS[index] === state.selectedPaletteBlock;
    button.style.borderColor = active ? "rgba(110, 247, 255, 0.55)" : "rgba(115, 255, 241, 0.22)";
    const swatch = button.querySelector(".palette-swatch");
    if (swatch) {
      swatch.style.borderColor = colorWithAlpha(selectedTier.color, active ? 0.48 : 0.3);
      swatch.style.boxShadow = `inset 0 0 18px ${colorWithAlpha(selectedTier.color, active ? 0.2 : 0.12)}`;
      swatch.style.background = `linear-gradient(180deg, ${colorWithAlpha(selectedTier.color, 0.08)}, rgba(7, 12, 20, 0.84))`;
    }
    const previewInfo = palettePreviewCanvases.get(button);
    if (previewInfo) {
      renderPalettePreview(previewInfo.preview, previewInfo.entry, active);
    }
  });
}

function renderPalettePreview(canvasEl, entry, active) {
  const previewCtx = canvasEl.getContext("2d");
  const previewBlock = createBlueprintBlock({
    type: entry.type,
    x: 0,
    y: 0,
    quality: state.selectedQuality,
    orientation: entry.type === "hull" ? "north" : "east",
    variant: entry.variant ?? "single"
  });
  previewBlock.flash = 0;
  previewBlock.active = entry.type === "thruster";
  previewCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  previewCtx.save();
  previewCtx.translate(canvasEl.width * 0.5, canvasEl.height * 0.5);
  const previewScale = getPalettePreviewScale(previewBlock);
  previewCtx.scale(previewScale, previewScale);
  previewCtx.rotate(getRenderAngleForBlock(previewBlock));
  drawBlockShapeOnContext(previewCtx, previewBlock, getBlockColor(previewBlock, state.time), 1, {
    time: state.time,
    shadowBoost: active ? 1.25 : 0.9
  });
  previewCtx.restore();
}

function refreshPalettePreviews() {
  for (const { entry, preview } of palettePreviewCanvases.values()) {
    renderPalettePreview(preview, entry, entry === state.selectedPaletteBlock);
  }
}

function createGame(builderMode = false, playerBlueprint = state.playerBlueprint) {
  const player = createShipFromBlueprint(playerBlueprint, {
    team: "player",
    kind: "player"
  });
  const enemyDirector = getEnemySpawnDirector(0, 0);

  return {
    builderMode,
    player,
    enemies: [],
    bullets: [],
    looseBlocks: [],
    effects: [],
    kills: 0,
    scrapAttached: 0,
    elapsed: 0,
    spawnTimer: enemyDirector.initialSpawnDelay,
    nextEnemyOrdinal: 1,
    playerLost: false,
    gameOverTimer: 0,
    gameOver: false
  };
}

function startRun(options = {}) {
  state.titlePanel = "home";
  const runBlueprint = resolveRunBlueprint(
    state.playerBlueprint,
    options.useCurrentBlueprint ?? false
  );
  state.game = createGame(false, runBlueprint);
  const enemyDirector = getEnemySpawnDirector(state.game.elapsed, state.game.kills);
  for (let i = 0; i < Math.min(autoEnemyCount, enemyDirector.activeCap); i += 1) {
    spawnEnemy();
  }
  state.camera.x = state.game.player.x;
  state.camera.y = state.game.player.y;
  state.drag = null;
  showScene("run");
  syncHud();
}

function primeBuilderBlueprint() {
  const next = resolveBuilderBlueprint(state.playerBlueprint, state.builderPresetPrimed);
  state.playerBlueprint = next.blueprint;
  state.builderPresetPrimed = next.builderPresetPrimed;
}

function openBuilder() {
  state.titlePanel = "home";
  primeBuilderBlueprint();
  state.game = createGame(true);
  state.camera.x = state.game.player.x;
  state.camera.y = state.game.player.y;
  state.drag = null;
  showScene("builder");
  syncHud();
}

function openHowTo() {
  state.titlePanel = "howto";
  showScene("title");
}

function closeHowTo() {
  state.titlePanel = "home";
  showScene("title");
}

function returnToTitle() {
  state.game = null;
  state.drag = null;
  state.titlePanel = "home";
  showScene("title");
}

function resetBuilderShip() {
  state.playerBlueprint = makeDefaultPlayerBlueprint();
  state.builderPresetPrimed = true;
  openBuilder();
}

function startPaletteDrag(entry, screenX, screenY) {
  const orientation = entry.type === "hull" ? "north" : "north";
  const block = createBlueprintBlock({
    type: entry.type,
    x: 0,
    y: 0,
    quality: state.selectedQuality,
    orientation,
    variant: entry.variant ?? "single"
  });
  state.drag = {
    source: "palette",
    block,
    screenX,
    screenY,
    worldX: state.mouse.worldX,
    worldY: state.mouse.worldY,
    snap: null
  };
}

function screenToWorld(screenX, screenY) {
  return {
    x: state.camera.x + screenX - window.innerWidth * 0.5,
    y: state.camera.y + screenY - window.innerHeight * 0.5
  };
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX - state.camera.x + window.innerWidth * 0.5,
    y: worldY - state.camera.y + window.innerHeight * 0.5
  };
}

function updateMouse(event) {
  const world = screenToWorld(event.clientX, event.clientY);
  state.mouse.vx = world.x - state.mouse.worldX;
  state.mouse.vy = world.y - state.mouse.worldY;
  state.mouse.screenX = event.clientX;
  state.mouse.screenY = event.clientY;
  state.mouse.worldX = world.x;
  state.mouse.worldY = world.y;

  if (state.drag) {
    state.drag.screenX = event.clientX;
    state.drag.screenY = event.clientY;
    state.drag.worldX = world.x;
    state.drag.worldY = world.y;
    const dragDistance = length(
      event.clientX - (state.drag.startScreenX ?? event.clientX),
      event.clientY - (state.drag.startScreenY ?? event.clientY)
    );
    state.drag.hasMoved ||= dragDistance > 6;
    state.drag.snap = findSnapSocket(state.drag.block);
  }
}

function rotateDraggedBlock() {
  if (!state.drag) {
    return;
  }
  const previousSnap = state.drag.snap;
  state.drag.block.orientation = rotateSide(state.drag.block.orientation, 1);
  if (state.drag.block.attachSide) {
    state.drag.block.attachSide = rotateSide(state.drag.block.attachSide, 1);
  }
  if (state.drag.block.type === "hull") {
    state.drag.block.attachSide = rotateSide(state.drag.block.attachSide ?? "north", 1);
  }
  state.drag.snap = findSnapSocket(state.drag.block, previousSnap);
}

function findLooseBlockAt(worldX, worldY, padding = LOOSE_PICK_PADDING, allowCenterFallback = true) {
  if (!state.game) {
    return null;
  }
  return chooseLooseBlockForPickup(
    state.game.looseBlocks,
    worldX,
    worldY,
    padding,
    allowCenterFallback ? LOOSE_PICK_RADIUS : 0
  );
}

function findPlayerBlockAt(worldX, worldY, padding = 0) {
  if (!state.game?.player) {
    return null;
  }
  const local = worldToLocal(state.game.player, worldX, worldY);
  return getBlockAtLocalPoint(state.game.player, local.x, local.y, padding);
}

function findSnapSocket(block, preferredSnap = null) {
  if (!state.game?.player) {
    return null;
  }

  const sockets = getOpenSockets(state.game.player);
  const candidates = [];
  for (const socket of sockets) {
    const placement = getBlockPlacementForSocket(block, socket);
    if (!placement || !canAttachLooseBlock(state.game.player, block, socket)) {
      continue;
    }
    const world = localToWorld(state.game.player, socket.x * CELL_SIZE, socket.y * CELL_SIZE);
    const gap = distance(world, { x: state.mouse.worldX, y: state.mouse.worldY });
    if (gap < SOCKET_SNAP_DISTANCE) {
      candidates.push({ ...socket, worldX: world.x, worldY: world.y, placement, gap });
    }
  }
  return chooseBestSnapCandidate(block, candidates, preferredSnap);
}

function startDraggingLoose(block, source = "loose") {
  state.game.looseBlocks = state.game.looseBlocks.filter((entry) => entry.id !== block.id);
  state.drag = {
    source,
    block: { ...block },
    origin: {
      x: block.x,
      y: block.y,
      vx: block.vx ?? 0,
      vy: block.vy ?? 0
    },
    startScreenX: state.mouse.screenX,
    startScreenY: state.mouse.screenY,
    hasMoved: false,
    screenX: state.mouse.screenX,
    screenY: state.mouse.screenY,
    worldX: state.mouse.worldX,
    worldY: state.mouse.worldY,
    snap: findSnapSocket(block)
  };
}

function detachPlayerBlock(block) {
  const result = removeBlock(state.game.player, block.id);
  const world = getBlockWorldPosition(state.game.player, result.destroyed);
  const detached = makeLooseFromBlock(
    result.destroyed,
    world.x,
    world.y,
    { x: 0, y: 0 },
    { damageGrace: DETACHED_LOOSE_DAMAGE_GRACE }
  );
  state.game.looseBlocks.push(
    detached
  );
  addLooseBlocksFromShip(state.game.player, result.looseBlocks);
  state.playerBlueprint = serializeShipToBlueprint(state.game.player);
  return detached;
}

function finishDrag() {
  if (!state.drag || !state.game?.player) {
    state.drag = null;
    return;
  }

  const dropVelocity = {
    x: state.mouse.vx * 0.32,
    y: state.mouse.vy * 0.32
  };
  const dropAction = resolveDraggedLooseDrop({
    source: state.drag.source,
    hasMoved: state.drag.hasMoved,
    hasSnap: Boolean(state.drag.snap)
  });

  if (dropAction === "restore-origin") {
    state.game.looseBlocks.push({
      ...state.drag.block,
      x: state.drag.origin?.x ?? state.mouse.worldX,
      y: state.drag.origin?.y ?? state.mouse.worldY,
      vx: state.drag.origin?.vx ?? 0,
      vy: state.drag.origin?.vy ?? 0
    });
  } else if (dropAction === "attach") {
    attachLooseBlock(state.game.player, state.drag.block, state.drag.snap);
    if (!state.game.builderMode) {
      state.game.scrapAttached += 1;
    }
    state.playerBlueprint = serializeShipToBlueprint(state.game.player);
    state.game.effects.push(makeEffect("snap", state.drag.snap.worldX, state.drag.snap.worldY, {
      color: "#6ef7ff"
    }));
  } else if (dropAction === "drop-loose") {
    const dragRender = getDragRenderState();
    state.game.looseBlocks.push({
      ...state.drag.block,
      x: dragRender?.worldX ?? state.mouse.worldX,
      y: dragRender?.worldY ?? state.mouse.worldY,
      vx: dropVelocity.x,
      vy: dropVelocity.y
    });
  }

  state.drag = null;
}

function makeEffect(type, x, y, options = {}) {
  const ttl = options.ttl ?? 0.28;
  return {
    id: `${type}-${Math.random().toString(16).slice(2)}`,
    type,
    x,
    y,
    ...options,
    ttl,
    life: options.life ?? ttl,
    radius: options.radius ?? 18,
    color: options.color ?? "#6ef7ff"
  };
}

function makePlayerDeathEffect(ship) {
  // The loss panel is intentionally delayed, so the player cockpit gets a brief
  // line-art breakup beat that reuses the ship's own block silhouettes first.
  const fragments = ship.blocks.map((block, index) => {
    const world = getBlockWorldPosition(ship, block);
    const relativeX = world.x - ship.x;
    const relativeY = world.y - ship.y;
    const fallbackAngle = ship.angle - Math.PI * 0.5 + index * 1.17;
    const fallbackVector = { x: Math.cos(fallbackAngle), y: Math.sin(fallbackAngle) };
    const outward =
      Math.abs(relativeX) > 0.0001 || Math.abs(relativeY) > 0.0001
        ? normalize(relativeX, relativeY)
        : fallbackVector;
    const tangent = { x: -outward.y, y: outward.x };
    const driftSpeed = 44 + hash2D(block.x + 17, block.y - 9) * 52;
    const tangentDrift = (hash2D(block.x - 11, block.y + 23) - 0.5) * 30;
    const spin = (hash2D(block.x + 41, block.y + 7) - 0.5) * 2.4;
    return {
      block: {
        ...block,
        active: false,
        flash: 0
      },
      color: getBlockColor(block, state.time),
      offsetX: relativeX,
      offsetY: relativeY,
      velocityX: outward.x * driftSpeed + tangent.x * tangentDrift,
      velocityY: outward.y * driftSpeed + tangent.y * tangentDrift,
      spin,
      wobblePhase: hash2D(block.x + 3, block.y + 29) * Math.PI * 2
    };
  });

  return makeEffect("player-death", ship.x, ship.y, {
    ttl: PLAYER_DEATH_ANIMATION_TTL,
    radius: 68,
    color: "#ff8fb8",
    angle: ship.angle,
    fragments
  });
}

function reflectBulletFromShield(bullet, normalX, normalY, reflectBoost, nextTeam, nextOwnerId) {
  const normal = normalize(normalX, normalY);
  const dotValue = bullet.vx * normal.x + bullet.vy * normal.y;
  bullet.vx = (bullet.vx - 2 * dotValue * normal.x) * reflectBoost;
  bullet.vy = (bullet.vy - 2 * dotValue * normal.y) * reflectBoost;

  const exit = normalize(bullet.vx, bullet.vy);
  bullet.x += exit.x * BULLET_RADIUS * 1.8;
  bullet.y += exit.y * BULLET_RADIUS * 1.8;
  bullet.team = nextTeam;
  bullet.ownerId = nextOwnerId;
  bullet.selfHitGrace = SELF_HIT_GRACE * 0.5;
  bullet.ttl = Math.min(1.5, bullet.ttl + 0.18);
}

function addLooseBlocksFromShip(ship, blocks, options = {}) {
  const shipDeathDrop = options.reason === "ship-death";
  for (const block of blocks) {
    const spawn = shipDeathDrop
      ? getShipDeathSalvageSpawnState(ship, block)
      : null;
    const world = spawn ?? getBlockWorldPosition(ship, block);
    state.game.looseBlocks.push(
      makeLooseFromBlock(
        block,
        world.x,
        world.y,
        spawn
          ? { x: spawn.vx, y: spawn.vy }
          : {
              x: ship.vx + randInRange(-20, 20),
              y: ship.vy + randInRange(-20, 20)
            },
        {
          damageGrace: shipDeathDrop ? SHIP_DEATH_SALVAGE_DAMAGE_GRACE : DETACHED_LOOSE_DAMAGE_GRACE,
          persistentSalvage: shipDeathDrop
        }
      )
    );
  }
}

function destroyLooseBlock(block, impact = 0, at = { x: block.x, y: block.y }) {
  if (block.destroyed) {
    return;
  }

  block.destroyed = true;
  state.game.effects.push(
    makeEffect("burst", at.x, at.y, {
      radius: 18 + impact * 0.2,
      ttl: 0.18,
      color: getBlockColor(block, state.time)
    })
  );
}

function applyDamageToLooseBlock(block, damage, at = { x: block.x, y: block.y }) {
  if (damage <= 0 || !canDamageLooseBlock(block)) {
    return false;
  }

  block.flash = Math.max(block.flash ?? 0, 0.22);
  block.hp -= damage;
  if (block.hp <= 0) {
    destroyLooseBlock(block, damage, at);
  }
  return true;
}

function cleanupDestroyedLooseBlocks() {
  state.game.looseBlocks = state.game.looseBlocks.filter((block) => !block.destroyed);
}

function destroyShipBlock(ship, block, bulletDamage = 0) {
  if (block.type === "cockpit") {
    const deathBlocks = ship.blocks.map((entry) => ({ ...entry }));
    ship.alive = false;
    const salvage = prepareShipDeathSalvageBlocks(ship);
    ship.blocks = ship.blocks.filter((entry) => entry.type === "cockpit");
    addLooseBlocksFromShip(ship, salvage, { reason: "ship-death" });
    if (ship.kind === "player") {
      state.game.effects.push(makePlayerDeathEffect({ ...ship, blocks: deathBlocks }));
    }
    state.game.effects.push(makeEffect("burst", ship.x, ship.y, { radius: 54, ttl: 0.45, color: "#ff5f7f" }));
    if (ship.kind === "enemy") {
      state.game.kills += 1;
    }
    audio.playShipDestruction({
      qualityId: getRepresentativeShipQuality(deathBlocks),
      shipId: ship.id,
      isPlayer: ship.kind === "player"
    });
    return;
  }

  const result = removeBlock(ship, block.id);
  addLooseBlocksFromShip(ship, result.looseBlocks);
  state.game.effects.push(
    makeEffect("burst", ship.x, ship.y, {
      radius: 30 + bulletDamage * 0.3,
      ttl: 0.24,
      color: getBlockColor(block, state.time)
    })
  );
}

function fireShipWeapons(ship, isFiring) {
  if (!isFiring || !ship.alive) {
    return;
  }

  const weapons = ship.blocks.filter((block) => block.type === "blaster");
  const builtIn = getBuiltInBlaster(ship);
  if (builtIn) {
    weapons.push(builtIn);
  }

  for (const weapon of weapons) {
    const runtimeBlock = weapon.builtIn
      ? getCockpit(ship)
      : ship.blocks.find((entry) => entry.id === weapon.id);
    if (!runtimeBlock) {
      continue;
    }
    if (runtimeBlock.cooldown > 0) {
      continue;
    }

    const stats = getBlockStats(weapon);
    const forward = rotate(SIDE_VECTORS[weapon.orientation].x, SIDE_VECTORS[weapon.orientation].y, ship.angle);
    const right = { x: -forward.y, y: forward.x };
    const originLocalX = weapon.x * CELL_SIZE + SIDE_VECTORS[weapon.orientation].x * HALF_CELL * 0.85;
    const originLocalY = weapon.y * CELL_SIZE + SIDE_VECTORS[weapon.orientation].y * HALF_CELL * 0.85;
    const originWorld = localToWorld(ship, originLocalX, originLocalY);

    for (let i = 0; i < stats.spread.length; i += 1) {
      const spread = stats.spread[i];
      const rotatedForward = rotate(forward.x, forward.y, spread);
      const offset = stats.offsets?.[i] ?? 0;
      state.game.bullets.push({
        id: `bullet-${Math.random().toString(16).slice(2)}`,
        x: originWorld.x + right.x * offset,
        y: originWorld.y + right.y * offset,
        vx: rotatedForward.x * stats.speed + ship.vx,
        vy: rotatedForward.y * stats.speed + ship.vy,
        damage: stats.damage,
        quality: weapon.quality,
        ttl: stats.ttl,
        selfHitGrace: Math.max(SELF_HIT_GRACE, (CELL_SIZE * 1.1) / stats.speed),
        team: ship.team,
        ownerId: ship.id,
        color: getBlockColor(weapon, state.time)
      });
    }

    runtimeBlock.cooldown = stats.cooldown;
    audio.playBlaster({
      qualityId: weapon.quality,
      variant: weapon.variant ?? "single",
      shipId: ship.id
    });
    state.game.effects.push(makeEffect("muzzle", originWorld.x, originWorld.y, { radius: 16, ttl: 0.1, color: getBlockColor(weapon, state.time) }));
  }
}

function updateShipPhysics(ship, input, dt) {
  if (!ship.alive) {
    return;
  }

  const command = selectThrustersForInput(ship, {
    up: input.up,
    down: input.down,
    left: false,
    right: false,
    turnLeft: input.turnLeft,
    turnRight: input.turnRight
  });

  const worldForce = rotate(command.localForceX, command.localForceY, ship.angle);
  const mass = getMass(ship);
  const inertia = getInertia(ship);

  ship.vx += (worldForce.x / mass) * dt;
  ship.vy += (worldForce.y / mass) * dt;
  ship.omega += (command.torque / inertia) * dt;

  ship.vx *= Math.pow(SHIP_DRAG, dt * 60);
  ship.vy *= Math.pow(SHIP_DRAG, dt * 60);
  ship.omega *= Math.pow(0.9, dt * 60);

  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  ship.angle = wrapAngle(ship.angle + ship.omega * dt);

  for (const block of ship.blocks) {
    block.cooldown = Math.max(0, block.cooldown - dt);
    block.flash = Math.max(0, block.flash - dt * 4);
  }
}

function updateEnemyAi(enemy, dt) {
  enemy.ai = {
    ...enemy.ai,
    now: state.game.elapsed
  };
  const plan = resolveEnemyAiPlan(enemy, [state.game.player, ...state.game.enemies], dt);
  enemy.ai = {
    ...enemy.ai,
    profileId: enemy.ai?.profileId ?? plan.profileId,
    orbitSign: enemy.ai?.orbitSign ?? 1,
    targetId: plan.targetId
  };

  updateShipPhysics(enemy, plan.input, dt);
  fireShipWeapons(enemy, plan.shouldFire);
}

function getBlueprintBounds(blueprint) {
  const cells = blueprint.flatMap((block) => getBlockCells(block));
  if (cells.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 1, height: 1 };
  }

  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  };
}

function spawnEnemy(options = {}) {
  const enemyDirector = getEnemySpawnDirector(state.game.elapsed, state.game.kills);
  const aggressionProgress = options.aggressionProgress ?? enemyDirector.aiAggression;
  const loadout = options.designId
    ? generateEnemyLoadoutForDesign(
        options.designId,
        options.level ?? enemyDirector.level,
        Math.random,
        aggressionProgress,
        options.quality ?? null
      )
    : generateEnemyLoadout(enemyDirector.level, Math.random, aggressionProgress);
  const spawn = getOffscreenSpawnPosition(
    state.camera.x,
    state.camera.y,
    window.innerWidth,
    window.innerHeight,
    getEnemySpawnMargin(enemyDirector.aiAggression),
    Math.random
  );
  const x = spawn.x;
  const y = spawn.y;
  const enemy = createShipFromBlueprint(loadout.blueprint, {
    team: `enemy-${state.game.nextEnemyOrdinal++}`,
    x,
    y,
    angle: Math.atan2(state.game.player.y - y, state.game.player.x - x) + Math.PI * 0.5,
    ai: {
      profileId: loadout.aiProfileId,
      orbitSign: loadout.orbitSign,
      idlePatrolSign: loadout.idlePatrolSign,
      idleSeed: loadout.idleSeed,
      targetId: null
    },
    kind: "enemy"
  });
  enemy.archetypeId = loadout.archetypeId;
  enemy.designId = loadout.designId;
  state.game.enemies.push(enemy);
}

function maybeSpawnEnemies(dt) {
  if (state.game.builderMode || state.game.gameOver) {
    return;
  }
  state.game.enemies = retainEnemiesNearPlayerSpace(
    state.game.enemies,
    state.game.player.x,
    state.game.player.y,
    window.innerWidth,
    window.innerHeight
  );
  const enemyDirector = getEnemySpawnDirector(state.game.elapsed, state.game.kills);
  const nearbyEnemyCount = countShipsWithinSpawnPressureWindow(
    state.game.enemies,
    state.camera.x,
    state.camera.y,
    window.innerWidth,
    window.innerHeight
  );
  const spawnPressure = resolveEnemySpawnPressureTimer(
    state.game.spawnTimer,
    state.game.enemies.length,
    nearbyEnemyCount,
    enemyDirector,
    dt
  );
  state.game.spawnTimer = spawnPressure.timer;

  if (spawnPressure.shouldSpawn) {
    spawnEnemy();
    state.game.spawnTimer = spawnPressure.nextSpawnTimer;
  }
}

function updateBullets(dt) {
  const activeBullets = [];

  for (const bullet of state.game.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.ttl -= dt;
    bullet.selfHitGrace = Math.max(0, (bullet.selfHitGrace ?? 0) - dt);
    if (bullet.ttl <= 0) {
      continue;
    }

    let resolved = false;
    let keepBullet = true;
    const targets = [state.game.player, ...state.game.enemies];
    for (const ship of targets) {
      if (!ship.alive) {
        continue;
      }

      // Bullets get a short grace window to clear the muzzle, then they can re-enter
      // the firing ship and cause self-damage in tight or rotating builds.
      const graceBlocksSelfHit = ship.id === bullet.ownerId && bullet.selfHitGrace > 0;
      const sameTeamNonOwner = ship.id !== bullet.ownerId && ship.team === bullet.team;
      if (graceBlocksSelfHit || sameTeamNonOwner) {
        continue;
      }

      const local = worldToLocal(ship, bullet.x, bullet.y);
      const block = getBlockAtLocalPoint(ship, local.x, local.y);
      if (!block) {
        continue;
      }

      block.flash = 0.3;
      if (block.type === "shield") {
        const shieldStats = getBlockStats(block);
        const impactDamage = getProjectileDamageAgainstBlock(bullet.damage, bullet.quality, block);
        const normalLocal = SIDE_VECTORS[block.orientation];
        const normalWorld = rotate(normalLocal.x, normalLocal.y, ship.angle);
        reflectBulletFromShield(
          bullet,
          normalWorld.x,
          normalWorld.y,
          shieldStats.reflectBoost,
          ship.team,
          ship.id
        );
        registerEnemyProvocation(ship, bullet.ownerId, state.game.elapsed, Math.random);
        block.hp -= impactDamage;
        if (block.hp <= 0) {
          destroyShipBlock(ship, block, impactDamage);
        }
        state.game.effects.push(makeEffect("snap", bullet.x, bullet.y, { radius: 12, ttl: 0.12, color: getBlockColor(block, state.time) }));
        resolved = true;
        keepBullet = true;
        break;
      }

      const impactDamage = getProjectileDamageAgainstBlock(bullet.damage, bullet.quality, block);
      registerEnemyProvocation(ship, bullet.ownerId, state.game.elapsed, Math.random);
      block.hp -= impactDamage;
      if (block.hp <= 0) {
        destroyShipBlock(ship, block, impactDamage);
      }
      state.game.effects.push(makeEffect("burst", bullet.x, bullet.y, { radius: 18, ttl: 0.12, color: getBlockColor(block, state.time) }));
      resolved = true;
      keepBullet = false;
      break;
    }

    if (!resolved) {
      const loose = findLooseBlockAt(bullet.x, bullet.y, BULLET_RADIUS, false);
      if (shouldBulletHitLooseBlock(bullet, loose)) {
        const looseStats = getBlockStats(loose);
        const impactDamage = getProjectileDamageAgainstBlock(bullet.damage, bullet.quality, loose);
        if (loose.type === "shield") {
          const normal = SIDE_VECTORS[loose.orientation];
          reflectBulletFromShield(
            bullet,
            normal.x,
            normal.y,
            looseStats.reflectBoost,
            "neutral",
            loose.id
          );
          applyDamageToLooseBlock(loose, impactDamage, { x: bullet.x, y: bullet.y });
          state.game.effects.push(
            makeEffect("snap", bullet.x, bullet.y, {
              radius: 12,
              ttl: 0.12,
              color: getBlockColor(loose, state.time)
            })
          );
          keepBullet = true;
        } else {
          applyDamageToLooseBlock(loose, impactDamage, { x: bullet.x, y: bullet.y });
          state.game.effects.push(
            makeEffect("burst", bullet.x, bullet.y, {
              radius: 16,
              ttl: 0.12,
              color: getBlockColor(loose, state.time)
            })
          );
          keepBullet = false;
        }
        resolved = true;
      }
    }

    if (!resolved || keepBullet) {
      activeBullets.push(bullet);
    }
  }

  state.game.bullets = activeBullets;
  cleanupDestroyedLooseBlocks();
  state.game.enemies = state.game.enemies.filter((enemy) => enemy.alive && enemy.blocks.some((block) => block.type === "cockpit"));
  if (!state.game.player.alive && !state.game.playerLost) {
    state.game.playerLost = true;
    state.game.gameOverTimer = GAME_OVER_SCREEN_DELAY;
  }
}

function updateLooseBlocks(dt) {
  for (const block of state.game.looseBlocks) {
    if (block.destroyed) {
      continue;
    }
    block.vx *= Math.pow(LOOSE_DRAG, dt * 60);
    block.vy *= Math.pow(LOOSE_DRAG, dt * 60);
    block.x += block.vx * dt;
    block.y += block.vy * dt;
    block.flash = Math.max(0, (block.flash ?? 0) - dt * 4);
    block.damageGrace = Math.max(0, (block.damageGrace ?? 0) - dt);
  }

  const ships = [state.game.player, ...state.game.enemies].filter((ship) => ship.alive);
  for (const loose of state.game.looseBlocks) {
    if (loose.destroyed) {
      continue;
    }
    const relativeBlock = { ...loose, x: 0, y: 0 };
    const looseOffset = getBlockRenderOffset(relativeBlock);
    for (let pass = 0; pass < 2; pass += 1) {
      let resolvedCollision = false;
      for (const ship of ships) {
        for (const shipBlock of ship.blocks) {
          for (const shipCell of getBlockCells(shipBlock)) {
            const shipWorld = localToWorld(ship, shipCell.x * CELL_SIZE, shipCell.y * CELL_SIZE);
            for (const looseCell of getBlockCells(relativeBlock)) {
              const looseWorld = {
                x: loose.x + looseCell.x * CELL_SIZE - looseOffset.x,
                y: loose.y + looseCell.y * CELL_SIZE - looseOffset.y
              };
              const dx = looseWorld.x - shipWorld.x;
              const dy = looseWorld.y - shipWorld.y;
              const gap = length(dx, dy);
              const minGap = CELL_SIZE * 0.72;
              if (gap >= minGap) {
                continue;
              }

              const relativeSpeed = length(loose.vx - ship.vx, loose.vy - ship.vy);
              const collisionDamage = relativeSpeed * COLLISION_DAMAGE_SCALE * dt * 26;

              const normal =
                gap > 0.0001
                  ? { x: dx / gap, y: dy / gap }
                  : normalize(loose.x - ship.x, loose.y - ship.y);
              const push = minGap - gap + 0.6;
              loose.x += normal.x * push;
              loose.y += normal.y * push;
              const pushVelocity = loose.persistentSalvage
                ? 8
                : 28 + Math.max(0, ship.vx * normal.x + ship.vy * normal.y) * 0.2;
              loose.vx += normal.x * pushVelocity;
              loose.vy += normal.y * pushVelocity;
              loose.flash = Math.max(loose.flash ?? 0, 0.14);
              applyDamageToLooseBlock(loose, collisionDamage, looseWorld);
              resolvedCollision = true;
              break;
            }
            if (resolvedCollision) {
              break;
            }
          }
          if (resolvedCollision) {
            break;
          }
        }
        if (resolvedCollision) {
          break;
        }
      }
      if (!resolvedCollision) {
        break;
      }
    }
  }

  cleanupDestroyedLooseBlocks();
}

function updateEffects(dt) {
  for (const effect of state.game.effects) {
    effect.ttl -= dt;
  }
  state.game.effects = state.game.effects.filter((effect) => effect.ttl > 0);
}

function handleShipCollisions(dt) {
  const ships = [state.game.player, ...state.game.enemies];

  for (const [leftShip, rightShip] of getAliveShipPairs(ships)) {
    const overlap = getShipCollisionOverlap(leftShip, rightShip);
    if (!overlap) {
      continue;
    }

    const relativeSpeed = length(leftShip.vx - rightShip.vx, leftShip.vy - rightShip.vy);
    let damaged = false;
    for (const leftBlock of leftShip.blocks) {
      const leftCells = getBlockCells(leftBlock);
      for (const rightBlock of rightShip.blocks) {
        const rightCells = getBlockCells(rightBlock);
        let pairCollided = false;

        for (const leftCell of leftCells) {
          for (const rightCell of rightCells) {
            const pairOverlap = getShipCellOverlap(leftShip, leftCell, rightShip, rightCell);
            if (pairOverlap) {
              pairCollided = true;
              break;
            }
          }
          if (pairCollided) {
            break;
          }
        }

        if (pairCollided && relativeSpeed >= 80) {
          const damage = relativeSpeed * COLLISION_DAMAGE_SCALE * dt * 60;
          registerEnemyProvocation(leftShip, rightShip.id, state.game.elapsed, Math.random);
          registerEnemyProvocation(rightShip, leftShip.id, state.game.elapsed, Math.random);
          leftBlock.hp -= damage;
          rightBlock.hp -= damage;
          damaged = true;
          leftBlock.flash = 0.25;
          rightBlock.flash = 0.25;
          if (leftBlock.hp <= 0) {
            destroyShipBlock(leftShip, leftBlock, damage);
          }
          if (rightBlock.hp <= 0) {
            destroyShipBlock(rightShip, rightBlock, damage);
          }
          if (!leftShip.alive || !rightShip.alive) {
            break;
          }
        }
      }
      if (!leftShip.alive || !rightShip.alive) {
        break;
      }
    }

    const separationDistance = overlap.penetration * 0.55 + 0.75;
    rightShip.x += overlap.normalX * separationDistance;
    rightShip.y += overlap.normalY * separationDistance;
    leftShip.x -= overlap.normalX * separationDistance;
    leftShip.y -= overlap.normalY * separationDistance;

    const relativeAlongNormal =
      (rightShip.vx - leftShip.vx) * overlap.normalX +
      (rightShip.vy - leftShip.vy) * overlap.normalY;
    if (relativeAlongNormal < 0) {
      const correction = -relativeAlongNormal * (damaged ? 0.55 : 0.7);
      rightShip.vx += overlap.normalX * correction * 0.5;
      rightShip.vy += overlap.normalY * correction * 0.5;
      leftShip.vx -= overlap.normalX * correction * 0.5;
      leftShip.vy -= overlap.normalY * correction * 0.5;
    }
  }
}

function updateGame(dt) {
  if (!state.game) {
    state.titlePreview.player.angle = Math.sin(state.time * 0.4) * 0.08;
    state.titlePreview.enemy.angle = Math.PI * 0.2 + Math.sin(state.time * 0.45) * 0.1;
    return;
  }

  state.game.elapsed += dt;
  if (state.game.playerLost && !state.game.gameOver) {
    updateEffects(dt);
    if (advancePendingGameOver(state.game, dt, GAME_OVER_SCREEN_DELAY)) {
      gameOverPanel.classList.remove("hidden");
    }
  } else if (!state.game.gameOver) {
    applyCockpitRegen(state.game.player, dt);
    updateShipPhysics(state.game.player, state.input, dt);
    fireShipWeapons(state.game.player, state.input.fire);
    maybeSpawnEnemies(dt);
    for (const enemy of state.game.enemies) {
      applyCockpitRegen(enemy, dt);
      updateEnemyAi(enemy, dt);
    }
    updateBullets(dt);
    updateLooseBlocks(dt);
    updateEffects(dt);
    handleShipCollisions(dt);
  }

  state.camera.x = lerp(state.camera.x, state.game.player.x, CAMERA_LERP);
  state.camera.y = lerp(state.camera.y, state.game.player.y, CAMERA_LERP);
  syncHud();
}

function drawBackground(cameraX, cameraY) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#07101d");
  gradient.addColorStop(1, "#01040a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(110, 247, 255, 0.05)";
  ctx.lineWidth = 1;
  const grid = 120;
  const startX = ((-cameraX + width * 0.5) % grid + grid) % grid;
  const startY = ((-cameraY + height * 0.5) % grid + grid) % grid;
  for (let x = startX; x < width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = startY; y < height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  const tile = 180;
  const minX = Math.floor((cameraX - width * 0.5) / tile) - 1;
  const maxX = Math.ceil((cameraX + width * 0.5) / tile) + 1;
  const minY = Math.floor((cameraY - height * 0.5) / tile) - 1;
  const maxY = Math.ceil((cameraY + height * 0.5) / tile) + 1;

  for (let tx = minX; tx <= maxX; tx += 1) {
    for (let ty = minY; ty <= maxY; ty += 1) {
      const bright = hash2D(tx, ty);
      const worldX = tx * tile + hash2D(tx + 2, ty + 7) * tile;
      const worldY = ty * tile + hash2D(tx - 5, ty + 3) * tile;
      const screen = worldToScreen(worldX, worldY);
      const size = bright > 0.82 ? 2.6 : bright > 0.55 ? 1.6 : 1;
      ctx.fillStyle = bright > 0.8 ? "rgba(255, 255, 255, 0.85)" : "rgba(110, 247, 255, 0.35)";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBlockShapeOnContext(drawCtx, block, color, hpRatio, options = {}) {
  const effectTime = options.time ?? state.time;
  const flash = block.flash ?? 0;
  const glowScale = options.glowScale ?? 1;
  const lineScale = options.lineScale ?? 1;
  const pulse =
    block.quality === "rainbow"
      ? 0.9 + Math.sin(effectTime * 3.6) * 0.08
      : 0.9 + Math.sin(effectTime * 3.6 + block.x * 0.8 + block.y * 0.45) * 0.08;
  const dimmed = hpRatio < 0.34 && Math.sin(effectTime * 34 + block.x * 3 + block.y * 6) > 0.55 ? 0.22 : 1;
  const alpha = clamp((0.42 + hpRatio * 0.65 + flash * 0.8) * pulse * dimmed, 0.18, 1);
  const stroke = colorWithAlpha(color, clamp(alpha * (options.strokeAlphaScale ?? 1), 0.1, 1));
  drawCtx.strokeStyle = stroke;
  drawCtx.lineWidth = 2 * lineScale;
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.shadowColor =
    glowScale > 0
      ? colorWithAlpha(color, (0.28 + alpha * 0.18) * (options.shadowBoost ?? 1) * glowScale)
      : "rgba(0, 0, 0, 0)";
  drawCtx.shadowBlur = glowScale > 0 ? (options.shadowBlur ?? 16) : 0;
  drawCtx.fillStyle = colorWithAlpha(color, options.fillAlpha ?? (options.isLoose ? 0.06 : 0.04));

  if (block.type === "cockpit") {
    drawCtx.beginPath();
    drawCtx.rect(-HALF_CELL * 0.72, -HALF_CELL * 0.72, HALF_CELL * 1.44, HALF_CELL * 1.44);
    drawCtx.fill();
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(0, -3);
    drawCtx.bezierCurveTo(7, -12, 14, -4, 0, 10);
    drawCtx.bezierCurveTo(-14, -4, -7, -12, 0, -3);
    drawCtx.stroke();
    return;
  }

  if (block.type === "hull") {
    const hullLength = getHullLength(block);
    const hullWidth = HALF_CELL * 1.44;
    const hullHeight = hullWidth + CELL_SIZE * (hullLength - 1);
    const insetX = hullWidth * 0.18;
    const insetY = Math.min(8, hullHeight * 0.16);
    drawCtx.beginPath();
    drawCtx.rect(-hullWidth * 0.5, -hullHeight * 0.5, hullWidth, hullHeight);
    drawCtx.fill();
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(-hullWidth * 0.5 + insetX, -hullHeight * 0.5 + insetY);
    drawCtx.lineTo(hullWidth * 0.5 - insetX, hullHeight * 0.5 - insetY);
    drawCtx.moveTo(-hullWidth * 0.5 + insetX, hullHeight * 0.5 - insetY);
    drawCtx.lineTo(hullWidth * 0.5 - insetX, -hullHeight * 0.5 + insetY);
    drawCtx.stroke();
    if (hullLength > 1) {
      const centerOffset = (hullLength - 1) * CELL_SIZE * 0.5;
      drawCtx.beginPath();
      for (let index = 1; index < hullLength; index += 1) {
        const seamY = -centerOffset + CELL_SIZE * (index - 0.5);
        drawCtx.moveTo(-hullWidth * 0.34, seamY);
        drawCtx.lineTo(hullWidth * 0.34, seamY);
      }
      drawCtx.stroke();
    }
    return;
  }

  if (block.type === "blaster") {
    drawCtx.beginPath();
    drawCtx.moveTo(-10, 12);
    drawCtx.lineTo(-9, -6);
    drawCtx.lineTo(-4, -14);
    drawCtx.lineTo(4, -14);
    drawCtx.lineTo(9, -6);
    drawCtx.lineTo(10, 12);
    drawCtx.closePath();
    drawCtx.stroke();
    drawCtx.beginPath();
    if (block.variant === "dual") {
      drawCtx.moveTo(-6, -14);
      drawCtx.lineTo(-6, -22);
      drawCtx.moveTo(6, -14);
      drawCtx.lineTo(6, -22);
    } else {
      drawCtx.moveTo(0, -14);
      drawCtx.lineTo(0, -22);
    }
    if (block.variant === "spread") {
      drawCtx.moveTo(0, -14);
      drawCtx.lineTo(-7, -22);
      drawCtx.moveTo(0, -14);
      drawCtx.lineTo(7, -22);
    }
    drawCtx.stroke();
    return;
  }

  if (block.type === "thruster") {
    drawCtx.beginPath();
    drawCtx.moveTo(-11, -12);
    drawCtx.lineTo(11, -12);
    drawCtx.lineTo(7, 10);
    drawCtx.lineTo(-7, 10);
    drawCtx.closePath();
    drawCtx.stroke();
    if (block.active) {
      drawCtx.strokeStyle = colorWithAlpha("#ffc664", 0.95);
      drawCtx.shadowColor =
        glowScale > 0 ? colorWithAlpha("#ffc664", 0.42 * glowScale) : "rgba(0, 0, 0, 0)";
      drawCtx.shadowBlur = glowScale > 0 ? (options.shadowBlur ?? 16) : 0;
      drawCtx.beginPath();
      drawCtx.moveTo(-5, 10);
      drawCtx.lineTo(0, 20 + Math.sin(state.time * 24 + block.x) * 4);
      drawCtx.lineTo(5, 10);
      drawCtx.stroke();
    }
    return;
  }

  if (block.type === "shield") {
    drawCtx.beginPath();
    drawCtx.arc(0, 4, 14, Math.PI * 1.15, Math.PI * 1.85);
    drawCtx.stroke();
    drawCtx.beginPath();
    drawCtx.moveTo(-10, 7);
    drawCtx.lineTo(10, 7);
    drawCtx.stroke();
  }
}

function drawBlockShape(block, color, hpRatio, isLoose = false) {
  drawBlockShapeOnContext(ctx, block, color, hpRatio, { isLoose });
}

function applyShipStrokeGlow(drawCtx, color, alpha, glowScale, lineWidth = 2, shadowBoost = 1.3, shadowBlur = 18) {
  drawCtx.strokeStyle = colorWithAlpha(color, alpha);
  drawCtx.lineWidth = lineWidth;
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.shadowColor =
    glowScale > 0
      ? colorWithAlpha(color, (0.24 + alpha * 0.2) * shadowBoost * glowScale)
      : "rgba(0, 0, 0, 0)";
  drawCtx.shadowBlur = glowScale > 0 ? shadowBlur : 0;
}

function drawShipHalo(screenX, screenY, color, alpha, radius) {
  if (alpha <= 0 || radius <= 0) {
    return;
  }
  const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, radius);
  gradient.addColorStop(0, colorWithAlpha(color, alpha));
  gradient.addColorStop(0.55, colorWithAlpha(color, alpha * 0.35));
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawShip(ship, isPlayer = false) {
  const shipVisualProfile = getShipVisualQualityProfile(state.visualQuality);
  for (const block of ship.blocks) {
    const world = getBlockWorldPosition(ship, block);
    const screen = worldToScreen(world.x, world.y);
    const color = getBlockColor(block, state.time);
    const hpRatio = clamp(block.hp / block.maxHp, 0, 1);
    drawShipHalo(
      screen.x,
      screen.y,
      color,
      shipVisualProfile.blockHaloAlpha * clamp(0.55 + hpRatio * 0.45, 0.4, 1),
      shipVisualProfile.blockHaloRadius
    );
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(ship.angle + getRenderAngleForBlock(block));
    for (const glowPass of shipVisualProfile.glowPasses) {
      drawBlockShapeOnContext(ctx, block, color, hpRatio, glowPass);
    }
    drawBlockShapeOnContext(ctx, block, color, hpRatio, {
      glowScale: 0,
      shadowBoost: 0,
      shadowBlur: 0
    });
    ctx.restore();
  }

  const cockpit = getCockpit(ship);
  if (cockpit) {
    const cockpitWorld = getBlockWorldPosition(ship, cockpit);
    const screen = worldToScreen(cockpitWorld.x, cockpitWorld.y);
    const cockpitOpenSides = getCockpitOpenSides(ship);
    const cockpitColor = getBlockColor(cockpit, state.time);
    const thrusters = ship.builtInThrustersActive ?? {};
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(ship.angle);
    applyShipStrokeGlow(
      ctx,
      cockpitColor,
      0.82,
      shipVisualProfile.detailGlowScale,
      2,
      1.45,
      20
    );
    if (cockpitOpenSides.west) {
      ctx.beginPath();
      ctx.moveTo(-HALF_CELL * 0.72, -7);
      ctx.lineTo(-HALF_CELL * 1.04, -4);
      ctx.lineTo(-HALF_CELL * 1.04, 4);
      ctx.lineTo(-HALF_CELL * 0.72, 7);
      ctx.stroke();
    }
    if (cockpitOpenSides.east) {
      ctx.beginPath();
      ctx.moveTo(HALF_CELL * 0.72, -7);
      ctx.lineTo(HALF_CELL * 1.04, -4);
      ctx.lineTo(HALF_CELL * 1.04, 4);
      ctx.lineTo(HALF_CELL * 0.72, 7);
      ctx.stroke();
    }
    if (cockpitOpenSides.south) {
      ctx.beginPath();
      ctx.moveTo(-7, HALF_CELL * 0.72);
      ctx.lineTo(-4, HALF_CELL * 1.04);
      ctx.lineTo(4, HALF_CELL * 1.04);
      ctx.lineTo(7, HALF_CELL * 0.72);
      ctx.stroke();
    }
    applyShipStrokeGlow(
      ctx,
      "#ffc664",
      0.86,
      shipVisualProfile.detailGlowScale * 1.15,
      2,
      1.1,
      16
    );
    if (thrusters.west) {
      ctx.beginPath();
      ctx.moveTo(-HALF_CELL * 1.02, -4);
      ctx.lineTo(-HALF_CELL * 1.28, 0);
      ctx.lineTo(-HALF_CELL * 1.02, 4);
      ctx.stroke();
    }
    if (thrusters.east) {
      ctx.beginPath();
      ctx.moveTo(HALF_CELL * 1.02, -4);
      ctx.lineTo(HALF_CELL * 1.28, 0);
      ctx.lineTo(HALF_CELL * 1.02, 4);
      ctx.stroke();
    }
    if (thrusters.south) {
      ctx.beginPath();
      ctx.moveTo(-4, HALF_CELL * 1.02);
      ctx.lineTo(0, HALF_CELL * 1.34);
      ctx.lineTo(4, HALF_CELL * 1.02);
      ctx.stroke();
    }
    ctx.restore();
  }

  const builtIn = getBuiltInBlaster(ship);
  if (builtIn) {
    const world = getBlockWorldPosition(ship, cockpit);
    const screen = worldToScreen(world.x, world.y);
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(ship.angle);
    applyShipStrokeGlow(
      ctx,
      "#ff5f7f",
      0.85,
      shipVisualProfile.detailGlowScale * 1.05,
      2,
      1.35,
      18
    );
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -25);
    ctx.stroke();
    ctx.restore();
  }

  if (isPlayer) {
    ctx.save();
    ctx.translate(window.innerWidth * 0.5, window.innerHeight * 0.5);
    ctx.strokeStyle = "rgba(110, 247, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawLooseBlock(block) {
  const screen = worldToScreen(block.x, block.y);
  const color = getBlockColor(block, state.time);
  const hpRatio = clamp(block.hp / block.maxHp, 0, 1);
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(getRenderAngleForBlock(block));
  drawBlockShape(block, color, hpRatio, true);
  ctx.restore();

  const salvagePulse =
    block.quality === "rainbow"
      ? Math.sin(state.time * 8)
      : Math.sin(state.time * 8 + block.x * 0.02);
  if (salvagePulse > 0) {
    ctx.strokeStyle = colorWithAlpha("#6ef7ff", 0.28);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 22, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBullets() {
  for (const bullet of state.game?.bullets ?? []) {
    const screen = worldToScreen(bullet.x, bullet.y);
    const direction = normalize(bullet.vx, bullet.vy);
    const halfLength = 7;
    ctx.strokeStyle = colorWithAlpha(bullet.color, 0.96);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.shadowColor = colorWithAlpha(bullet.color, 0.45);
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(screen.x - direction.x * halfLength, screen.y - direction.y * halfLength);
    ctx.lineTo(screen.x + direction.x * halfLength, screen.y + direction.y * halfLength);
    ctx.stroke();
  }
}

function drawEffects() {
  for (const effect of state.game?.effects ?? []) {
    const screen = worldToScreen(effect.x, effect.y);
    const progress = 1 - effect.ttl / effect.life;
    if (effect.type === "player-death") {
      drawPlayerDeathEffect(effect, screen, progress);
      continue;
    }
    const radius = effect.radius * (0.6 + progress);
    ctx.strokeStyle = colorWithAlpha(effect.color, 0.7 * (1 - progress));
    ctx.lineWidth = 2;
    ctx.shadowColor = colorWithAlpha(effect.color, 0.28);
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayerDeathEffect(effect, screen, progress) {
  const fade = 1 - progress;
  const eased = 1 - Math.pow(1 - progress, 2);

  ctx.save();
  ctx.strokeStyle = colorWithAlpha(effect.color, 0.8 * fade);
  ctx.lineWidth = 2.2;
  ctx.shadowColor = colorWithAlpha(effect.color, 0.3 * fade);
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, effect.radius * (0.42 + eased * 0.95), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(screen.x - 10 - eased * 18, screen.y);
  ctx.lineTo(screen.x + 10 + eased * 18, screen.y);
  ctx.moveTo(screen.x, screen.y - 10 - eased * 18);
  ctx.lineTo(screen.x, screen.y + 10 + eased * 18);
  ctx.stroke();
  ctx.restore();

  for (const fragment of effect.fragments ?? []) {
    const wobble = Math.sin(fragment.wobblePhase + progress * Math.PI * 2.2) * 3.5 * fade;
    const fragmentX = screen.x + fragment.offsetX + fragment.velocityX * eased - fragment.velocityY * 0.015 * wobble;
    const fragmentY = screen.y + fragment.offsetY + fragment.velocityY * eased + fragment.velocityX * 0.015 * wobble;
    const shrink = lerp(1, 0.72, progress);
    ctx.save();
    ctx.translate(fragmentX, fragmentY);
    ctx.rotate(effect.angle + getRenderAngleForBlock(fragment.block) + fragment.spin * eased);
    ctx.scale(shrink, shrink);
    drawBlockShapeOnContext(ctx, fragment.block, fragment.color, 1, {
      time: state.time,
      glowScale: 0.55 * fade,
      shadowBoost: 1.1,
      shadowBlur: 18,
      strokeAlphaScale: fade,
      fillAlpha: 0
    });
    ctx.restore();
  }
}

function drawSocketHints() {
  if (!state.drag || !state.game?.player) {
    return;
  }

  const sockets = getOpenSockets(state.game.player);
  for (const socket of sockets) {
    if (!canAttachLooseBlock(state.game.player, state.drag.block, socket)) {
      continue;
    }
    const world = localToWorld(state.game.player, socket.x * CELL_SIZE, socket.y * CELL_SIZE);
    const screen = worldToScreen(world.x, world.y);
    const active = state.drag.snap && state.drag.snap.x === socket.x && state.drag.snap.y === socket.y;
    ctx.strokeStyle = active ? "rgba(110, 247, 255, 0.9)" : "rgba(110, 247, 255, 0.28)";
    ctx.lineWidth = active ? 2.2 : 1.2;
    ctx.beginPath();
    ctx.rect(screen.x - 11, screen.y - 11, 22, 22);
    ctx.stroke();
  }
}

function drawDragPreview() {
  const dragRender = getDragRenderState();
  if (!dragRender) {
    return;
  }

  const screen = worldToScreen(dragRender.worldX, dragRender.worldY);
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(dragRender.angle);
  drawBlockShape(dragRender.block, getBlockColor(dragRender.block, state.time), 1, true);
  ctx.restore();
}

function drawTitlePreview() {
  drawShip(state.titlePreview.player, true);
  drawShip(state.titlePreview.enemy, false);
}

function render() {
  refreshPalettePreviews();
  const cameraX = state.game ? state.camera.x : 0;
  const cameraY = state.game ? state.camera.y : 0;
  drawBackground(cameraX, cameraY);

  if (state.scene === "title") {
    drawTitlePreview();
    return;
  }

  for (const loose of state.game.looseBlocks) {
    if (!loose.persistentSalvage) {
      drawLooseBlock(loose);
    }
  }

  drawShip(state.game.player, true);
  for (const enemy of state.game.enemies) {
    drawShip(enemy, false);
  }
  for (const loose of state.game.looseBlocks) {
    if (loose.persistentSalvage) {
      drawLooseBlock(loose);
    }
  }
  drawBullets();
  drawEffects();
  drawSocketHints();
  drawDragPreview();
}

function loop(timestamp) {
  const deltaSeconds = state.lastFrame === 0 ? 1 / 60 : Math.min(0.033, (timestamp - state.lastFrame) / 1000);
  state.lastFrame = timestamp;
  state.time += deltaSeconds;

  updateGame(deltaSeconds);
  render();
  requestAnimationFrame(loop);
}

startRunButton.addEventListener("click", startRun);
startRunHowToButton?.addEventListener("click", startRun);
openBuilderButton.addEventListener("click", openBuilder);
openHowToButton?.addEventListener("click", openHowTo);
closeHowToButton?.addEventListener("click", closeHowTo);
retryRunButton.addEventListener("click", startRun);
returnTitleButton.addEventListener("click", returnToTitle);
audioToggleButton?.addEventListener("click", async () => {
  await audio.toggleEnabled();
  syncAudioToggle();
});
launchFromBuilderButton.addEventListener("click", () => {
  if (state.game?.player) {
    state.playerBlueprint = serializeShipToBlueprint(state.game.player);
  }
  startRun({ useCurrentBlueprint: true });
});
exportBuilderDesignButton?.addEventListener("click", exportBuilderDesign);
resetBuilderButton.addEventListener("click", resetBuilderShip);
backToTitleButton.addEventListener("click", returnToTitle);

window.addEventListener("resize", resizeCanvas);
window.addEventListener("pointermove", updateMouse);
window.addEventListener("pointerdown", () => {
  audio.ensureUnlocked();
}, { capture: true });

canvas.addEventListener("pointerdown", (event) => {
  if (!state.game || state.game.gameOver || state.game.playerLost) {
    return;
  }

  updateMouse(event);
  const block =
    event.button === 0 || event.button === 2
      ? findPlayerBlockAt(state.mouse.worldX, state.mouse.worldY, DETACH_PICK_PADDING)
      : null;
  const loose = findLooseBlockAt(state.mouse.worldX, state.mouse.worldY);
  const action = resolveShipBoardPointerAction({
    scene: state.scene,
    button: event.button,
    mountedType: block?.type ?? null,
    hasLooseTarget: Boolean(loose)
  });

  if (action === "detach") {
    event.preventDefault();
    detachPlayerBlock(block);
    return;
  }

  if (action === "detach-drag") {
    const detached = detachPlayerBlock(block);
    startDraggingLoose(detached, "detached");
    return;
  }

  if (action === "drag-loose") {
    startDraggingLoose(loose);
    return;
  }
});

window.addEventListener("pointerup", (event) => {
  if (event.button !== 0) {
    return;
  }
  finishDrag();
});

canvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

window.addEventListener("keydown", (event) => {
  audio.ensureUnlocked();
  const key = event.key.toLowerCase();
  if (key === "w") {
    state.input.up = true;
  }
  if (key === "s") {
    state.input.down = true;
  }
  if (key === "a") {
    state.input.turnLeft = true;
  }
  if (key === "d") {
    state.input.turnRight = true;
  }
  if (key === " ") {
    state.input.fire = true;
    event.preventDefault();
  }
  if (key === "q") {
    state.visualQuality = cycleShipVisualQuality(state.visualQuality);
  }
  if (key === "r") {
    rotateDraggedBlock();
  }
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "w") {
    state.input.up = false;
  }
  if (key === "s") {
    state.input.down = false;
  }
  if (key === "a") {
    state.input.turnLeft = false;
  }
  if (key === "d") {
    state.input.turnRight = false;
  }
  if (key === " ") {
    state.input.fire = false;
  }
});

resizeCanvas();
buildPalettes();
syncAudioToggle();
if (autoMode === "run") {
  startRun();
} else if (autoMode === "builder") {
  openBuilder();
} else {
  returnToTitle();
}
requestAnimationFrame(loop);
