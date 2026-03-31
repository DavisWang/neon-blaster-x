import { CELL_SIZE, HALF_CELL, QUALITY_BY_ID } from "../src/data.js";
import { clamp } from "../src/math.js";
import {
  buildEnemyBlueprint,
  createShipFromBlueprint,
  ENEMY_SHIP_DESIGN_DEFS,
  getBlockWorldPosition,
  getBuiltInBlaster,
  getCockpit,
  getCockpitOpenSides,
  getHullLength
} from "../src/ship.js";

const canvas = document.querySelector("#fleet-gallery");
const ctx = canvas.getContext("2d");
const effectTime = 0;

const columns = 5;
const margin = 44;
const gutter = 24;
const cardWidth = 432;
const cardHeight = 470;
const archetypeQualities = {
  needle: "red",
  bulwark: "orange",
  manta: "blue",
  fortress: "purple",
  vulture: "green"
};

function colorWithAlpha(color, alpha) {
  const hex = color.replace("#", "");
  const normalized = hex.length === 3 ? hex.split("").map((value) => value + value).join("") : hex;
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

function getBlockColor(block) {
  return QUALITY_BY_ID[block.quality]?.color ?? "#8a93a1";
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
  return {
    north: -Math.PI * 0.5,
    east: 0,
    south: Math.PI * 0.5,
    west: Math.PI
  }[block.orientation] + Math.PI * 0.5;
}

function roundRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawBlockShapeOnContext(drawCtx, block, color, hpRatio, options = {}) {
  const glowScale = options.glowScale ?? 1;
  const lineScale = options.lineScale ?? 1;
  const alpha = clamp(0.48 + hpRatio * 0.55, 0.18, 1);
  drawCtx.strokeStyle = colorWithAlpha(color, clamp(alpha * (options.strokeAlphaScale ?? 1), 0.12, 1));
  drawCtx.lineWidth = 2 * lineScale;
  drawCtx.lineCap = "round";
  drawCtx.lineJoin = "round";
  drawCtx.shadowColor =
    glowScale > 0
      ? colorWithAlpha(color, (0.28 + alpha * 0.18) * (options.shadowBoost ?? 1) * glowScale)
      : "rgba(0, 0, 0, 0)";
  drawCtx.shadowBlur = glowScale > 0 ? (options.shadowBlur ?? 16) : 0;
  drawCtx.fillStyle = colorWithAlpha(color, options.fillAlpha ?? 0.04);

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

function drawShip(ship, centerX, centerY, scale = 1) {
  for (const block of ship.blocks) {
    const world = getBlockWorldPosition(ship, block);
    const screenX = centerX + (world.x - ship.x) * scale;
    const screenY = centerY + (world.y - ship.y) * scale;
    const color = getBlockColor(block);
    const hpRatio = 1;
    drawShipHalo(screenX, screenY, color, 0.18, 24 * scale);
    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(scale, scale);
    ctx.rotate(ship.angle + getRenderAngleForBlock(block));
    drawBlockShapeOnContext(ctx, block, color, hpRatio, { glowScale: 1.2, shadowBoost: 1.15 });
    drawBlockShapeOnContext(ctx, block, color, hpRatio, { glowScale: 0, shadowBoost: 0, shadowBlur: 0 });
    ctx.restore();
  }

  const cockpit = getCockpit(ship);
  if (!cockpit) {
    return;
  }

  const cockpitWorld = getBlockWorldPosition(ship, cockpit);
  const cockpitX = centerX + (cockpitWorld.x - ship.x) * scale;
  const cockpitY = centerY + (cockpitWorld.y - ship.y) * scale;
  const cockpitColor = getBlockColor(cockpit);
  const cockpitOpenSides = getCockpitOpenSides(ship);
  ctx.save();
  ctx.translate(cockpitX, cockpitY);
  ctx.scale(scale, scale);
  ctx.rotate(ship.angle);
  applyShipStrokeGlow(ctx, cockpitColor, 0.82, 0.95, 2, 1.45, 20);
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

  const builtIn = getBuiltInBlaster(ship);
  if (builtIn) {
    applyShipStrokeGlow(ctx, "#ff5f7f", 0.85, 1, 2, 1.35, 18);
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(0, -25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#07101d");
  gradient.addColorStop(1, "#01040a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(110, 247, 255, 0.05)";
  ctx.lineWidth = 1;
  const grid = 120;
  for (let x = 0; x < canvas.width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawHeader() {
  ctx.fillStyle = "#f3fbff";
  ctx.font = '700 44px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText("Neon Blaster X Enemy Fleet", margin, 62);
  ctx.fillStyle = "rgba(179, 214, 255, 0.88)";
  ctx.font = '500 22px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText("25 distinct legal enemy designs built from the live ship generator", margin, 100);
  ctx.fillText("Grouped by archetype, rendered with in-game block art", margin, 132);
}

function drawCard(definition, index) {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const left = margin + column * (cardWidth + gutter);
  const top = 170 + row * (cardHeight + gutter);
  const quality = archetypeQualities[definition.archetypeId] ?? "blue";
  const accent = QUALITY_BY_ID[quality].color;
  const blueprint = buildEnemyBlueprint(definition.id, quality);
  const ship = createShipFromBlueprint(blueprint, {
    team: `gallery-${definition.id}`,
    kind: "enemy",
    x: 0,
    y: 0,
    angle: 0
  });
  const blasterCount = ship.blocks.filter((block) => block.type === "blaster").length;
  const scale = definition.archetypeId === "fortress" ? 0.84 : 0.96;

  roundRect(left, top, cardWidth, cardHeight, 22);
  ctx.fillStyle = "rgba(4, 12, 24, 0.88)";
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = colorWithAlpha(accent, 0.34);
  ctx.stroke();

  ctx.fillStyle = colorWithAlpha(accent, 0.16);
  roundRect(left + 16, top + 16, cardWidth - 32, 46, 12);
  ctx.fill();

  ctx.fillStyle = "#f3fbff";
  ctx.font = '700 22px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText(definition.label, left + 24, top + 45);

  ctx.fillStyle = colorWithAlpha(accent, 0.95);
  ctx.font = '600 16px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText(definition.archetypeId.toUpperCase(), left + 24, top + 82);

  ctx.fillStyle = "rgba(179, 214, 255, 0.92)";
  ctx.font = '500 16px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText(`${blasterCount} blaster${blasterCount === 1 ? "" : "s"}`, left + cardWidth - 124, top + 82);

  drawShip(ship, left + cardWidth * 0.5, top + 260, scale);

  ctx.fillStyle = "rgba(179, 214, 255, 0.72)";
  ctx.font = '500 14px "SF Mono", "Azeret Mono", monospace';
  ctx.fillText(definition.id, left + 24, top + cardHeight - 24);
}

function render() {
  drawBackground();
  drawHeader();
  ENEMY_SHIP_DESIGN_DEFS.forEach((definition, index) => drawCard(definition, index));
  window.__enemyFleetGalleryReady = true;
}

render();
