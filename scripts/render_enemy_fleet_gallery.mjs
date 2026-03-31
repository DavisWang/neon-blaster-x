import fs from "node:fs";
import path from "node:path";

import { CELL_SIZE, HALF_CELL, QUALITY_BY_ID } from "../src/data.js";
import {
  buildEnemyBlueprint,
  createShipFromBlueprint,
  ENEMY_SHIP_DESIGN_DEFS,
  getBlockCells,
  getBlockWorldPosition,
  getCockpit,
  getCockpitOpenSides,
  getHullLength,
  selectThrustersForInput
} from "../src/ship.js";

const outputPath = path.resolve("output/enemy-fleet-gallery.svg");
const width = 2400;
const columns = 5;
const margin = 44;
const gutter = 24;
const cardWidth = 432;
const cardHeight = 470;
const cardTopOffset = 170;
const archetypeQualities = {
  needle: "red",
  bulwark: "orange",
  manta: "blue",
  fortress: "purple"
};
const rows = Math.ceil(ENEMY_SHIP_DESIGN_DEFS.length / columns);
const height = cardTopOffset + rows * (cardHeight + gutter) + margin;

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function colorWithAlpha(hex, alpha) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBlockColor(block) {
  return QUALITY_BY_ID[block.quality]?.color ?? "#8a93a1";
}

function getRenderAngleDegrees(block) {
  if (block.type === "cockpit") {
    return 0;
  }
  if (block.type === "hull") {
    return getHullLength(block) > 1 && (block.orientation === "east" || block.orientation === "west") ? 90 : 0;
  }
  return {
    north: 0,
    east: 90,
    south: 180,
    west: 270
  }[block.orientation];
}

function renderHull(block, color) {
  const hullLength = getHullLength(block);
  const hullWidth = HALF_CELL * 1.44;
  const hullHeight = hullWidth + CELL_SIZE * (hullLength - 1);
  const insetX = hullWidth * 0.18;
  const insetY = Math.min(8, hullHeight * 0.16);
  const seams = [];
  if (hullLength > 1) {
    const centerOffset = (hullLength - 1) * CELL_SIZE * 0.5;
    for (let index = 1; index < hullLength; index += 1) {
      const seamY = -centerOffset + CELL_SIZE * (index - 0.5);
      seams.push(
        `<line x1="${(-hullWidth * 0.34).toFixed(2)}" y1="${seamY.toFixed(2)}" x2="${(hullWidth * 0.34).toFixed(2)}" y2="${seamY.toFixed(2)}" />`
      );
    }
  }

  return `
    <g class="block" stroke="${color}" fill="${colorWithAlpha(color, 0.04)}">
      <rect x="${(-hullWidth * 0.5).toFixed(2)}" y="${(-hullHeight * 0.5).toFixed(2)}" width="${hullWidth.toFixed(2)}" height="${hullHeight.toFixed(2)}" />
      <line x1="${(-hullWidth * 0.5 + insetX).toFixed(2)}" y1="${(-hullHeight * 0.5 + insetY).toFixed(2)}" x2="${(hullWidth * 0.5 - insetX).toFixed(2)}" y2="${(hullHeight * 0.5 - insetY).toFixed(2)}" />
      <line x1="${(-hullWidth * 0.5 + insetX).toFixed(2)}" y1="${(hullHeight * 0.5 - insetY).toFixed(2)}" x2="${(hullWidth * 0.5 - insetX).toFixed(2)}" y2="${(-hullHeight * 0.5 + insetY).toFixed(2)}" />
      ${seams.join("")}
    </g>
  `;
}

function renderCockpit(color) {
  return `
    <g class="block" stroke="${color}" fill="${colorWithAlpha(color, 0.04)}">
      <rect x="${(-HALF_CELL * 0.72).toFixed(2)}" y="${(-HALF_CELL * 0.72).toFixed(2)}" width="${(HALF_CELL * 1.44).toFixed(2)}" height="${(HALF_CELL * 1.44).toFixed(2)}" />
      <path d="M 0 -3 C 7 -12 14 -4 0 10 C -14 -4 -7 -12 0 -3" fill="none" />
    </g>
  `;
}

function renderBlaster(block, color) {
  const barrelLines =
    block.variant === "dual"
      ? `<line x1="-6" y1="-14" x2="-6" y2="-22" /><line x1="6" y1="-14" x2="6" y2="-22" />`
      : `<line x1="0" y1="-14" x2="0" y2="-22" />`;
  const spreadLines =
    block.variant === "spread"
      ? `<line x1="0" y1="-14" x2="-7" y2="-22" /><line x1="0" y1="-14" x2="7" y2="-22" />`
      : "";
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -10 12 L -9 -6 L -4 -14 L 4 -14 L 9 -6 L 10 12 Z" />
      ${barrelLines}
      ${spreadLines}
    </g>
  `;
}

function renderThruster(color) {
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -11 -12 L 11 -12 L 7 10 L -7 10 Z" />
    </g>
  `;
}

function renderShield(color) {
  return `
    <g class="block" stroke="${color}" fill="none">
      <path d="M -12 18 Q 0 -12 12 18" />
      <line x1="-10" y1="7" x2="10" y2="7" />
    </g>
  `;
}

function renderBlock(block) {
  const color = getBlockColor(block);
  if (block.type === "cockpit") {
    return renderCockpit(color);
  }
  if (block.type === "hull") {
    return renderHull(block, color);
  }
  if (block.type === "blaster") {
    return renderBlaster(block, color);
  }
  if (block.type === "thruster") {
    return renderThruster(color);
  }
  return renderShield(color);
}

function renderCockpitDetails(ship, scale) {
  const cockpit = getCockpit(ship);
  if (!cockpit) {
    return "";
  }
  const cockpitWorld = getBlockWorldPosition(ship, cockpit);
  const cockpitOpenSides = getCockpitOpenSides(ship);
  const color = getBlockColor(cockpit);
  const details = [];

  if (cockpitOpenSides.west) {
    details.push(`<path d="M ${(-HALF_CELL * 0.72).toFixed(2)} -7 L ${(-HALF_CELL * 1.04).toFixed(2)} -4 L ${(-HALF_CELL * 1.04).toFixed(2)} 4 L ${(-HALF_CELL * 0.72).toFixed(2)} 7" />`);
  }
  if (cockpitOpenSides.east) {
    details.push(`<path d="M ${(HALF_CELL * 0.72).toFixed(2)} -7 L ${(HALF_CELL * 1.04).toFixed(2)} -4 L ${(HALF_CELL * 1.04).toFixed(2)} 4 L ${(HALF_CELL * 0.72).toFixed(2)} 7" />`);
  }
  if (cockpitOpenSides.south) {
    details.push(`<path d="M -7 ${(HALF_CELL * 0.72).toFixed(2)} L -4 ${(HALF_CELL * 1.04).toFixed(2)} L 4 ${(HALF_CELL * 1.04).toFixed(2)} L 7 ${(HALF_CELL * 0.72).toFixed(2)}" />`);
  }

  return `
    <g transform="translate(${cockpitWorld.x.toFixed(2)} ${cockpitWorld.y.toFixed(2)}) scale(${scale.toFixed(3)})" stroke="${color}" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${details.join("")}
    </g>
  `;
}

function getShipFootprint(ship) {
  const cells = ship.blocks.flatMap((block) => getBlockCells(block));
  const xs = cells.map((cell) => cell.x);
  const ys = cells.map((cell) => cell.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    occupied: new Set(cells.map((cell) => `${cell.x},${cell.y}`)).size
  };
}

function formatCompactNumber(value) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(Math.round(value));
}

function getMobilityStats(ship) {
  const forward = selectThrustersForInput(ship, {
    up: true,
    down: false,
    left: false,
    right: false,
    turnLeft: false,
    turnRight: false
  });
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

  return {
    forwardThrust: Math.hypot(forward.localForceX, forward.localForceY),
    turnTorque: Math.max(Math.abs(turnLeft.torque), Math.abs(turnRight.torque))
  };
}

function renderShip(definition, centerX, centerY) {
  const quality = archetypeQualities[definition.archetypeId] ?? "blue";
  const blueprint = buildEnemyBlueprint(definition.id, quality);
  const ship = createShipFromBlueprint(blueprint, {
    team: `gallery-${definition.id}`,
    kind: "enemy",
    x: 0,
    y: 0,
    angle: 0
  });
  const blasterCount = ship.blocks.filter((block) => block.type === "blaster").length;
  const thrusterCount = ship.blocks.filter((block) => block.type === "thruster").length;
  const footprint = getShipFootprint(ship);
  const mobility = getMobilityStats(ship);
  const rawWidth = footprint.width * CELL_SIZE;
  const rawHeight = footprint.height * CELL_SIZE;
  const scale = Math.min(1.12, 0.92 * Math.min(220 / rawWidth, 214 / rawHeight));
  const accent = QUALITY_BY_ID[quality].color;
  const blocks = ship.blocks
    .map((block) => {
      const world = getBlockWorldPosition(ship, block);
      return `
        <g transform="translate(${world.x.toFixed(2)} ${world.y.toFixed(2)}) rotate(${getRenderAngleDegrees(block)})">
          ${renderBlock(block)}
        </g>
      `;
    })
    .join("");

  return `
    <g transform="translate(${centerX} ${centerY})">
      <g transform="scale(${scale.toFixed(3)})">
        ${blocks}
      </g>
      ${renderCockpitDetails(ship, scale)}
      <text class="card-archetype" x="0" y="-162" fill="${accent}" text-anchor="middle">${escapeXml(definition.archetypeId.toUpperCase())}</text>
      <text class="card-blasters" x="0" y="160" text-anchor="middle">B ${blasterCount}  •  T ${thrusterCount}</text>
      <text class="card-meta" x="0" y="184" text-anchor="middle">${footprint.width}x${footprint.height} FOOTPRINT  •  ${footprint.occupied} CELLS</text>
      <text class="card-meta" x="0" y="206" text-anchor="middle">F ${formatCompactNumber(mobility.forwardThrust)}  •  Y ${formatCompactNumber(mobility.turnTorque)}</text>
    </g>
  `;
}

const cardSvgs = ENEMY_SHIP_DESIGN_DEFS.map((definition, index) => {
  const column = index % columns;
  const row = Math.floor(index / columns);
  const left = margin + column * (cardWidth + gutter);
  const top = cardTopOffset + row * (cardHeight + gutter);
  const quality = archetypeQualities[definition.archetypeId] ?? "blue";
  const accent = QUALITY_BY_ID[quality].color;

  return `
    <g transform="translate(${left} ${top})">
      <rect class="card" x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="22" />
      <rect x="16" y="16" width="${cardWidth - 32}" height="46" rx="12" fill="${colorWithAlpha(accent, 0.16)}" />
      <text class="card-title" x="24" y="46">${escapeXml(definition.label)}</text>
      <text class="card-id" x="24" y="${cardHeight - 24}">${escapeXml(definition.id)}</text>
      ${renderShip(definition, cardWidth * 0.5, 248)}
    </g>
  `;
}).join("");

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#07101d" />
      <stop offset="100%" stop-color="#01040a" />
    </linearGradient>
    <pattern id="grid" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M 120 0 L 0 0 0 120" fill="none" stroke="rgba(110, 247, 255, 0.05)" stroke-width="1" />
    </pattern>
    <style>
      text {
        font-family: "SF Mono", "Azeret Mono", "IBM Plex Mono", monospace;
        letter-spacing: 0.02em;
      }
      .title {
        fill: #f3fbff;
        font-size: 44px;
        font-weight: 700;
      }
      .subtitle {
        fill: rgba(179, 214, 255, 0.88);
        font-size: 22px;
        font-weight: 500;
      }
      .card {
        fill: rgba(4, 12, 24, 0.88);
        stroke: rgba(110, 247, 255, 0.25);
        stroke-width: 2;
      }
      .card-title {
        fill: #f3fbff;
        font-size: 22px;
        font-weight: 700;
      }
      .card-id {
        fill: rgba(179, 214, 255, 0.72);
        font-size: 14px;
        font-weight: 500;
      }
      .card-archetype {
        font-size: 16px;
        font-weight: 600;
      }
      .card-blasters {
        fill: rgba(179, 214, 255, 0.92);
        font-size: 16px;
        font-weight: 500;
      }
      .card-meta {
        fill: rgba(179, 214, 255, 0.68);
        font-size: 13px;
        font-weight: 500;
      }
      .block {
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect width="${width}" height="${height}" fill="url(#grid)" />
  <text class="title" x="${margin}" y="62">Neon Blaster X Enemy Fleet Audit</text>
  <text class="subtitle" x="${margin}" y="100">${ENEMY_SHIP_DESIGN_DEFS.length} distinct legal enemy designs built from the live ship generator</text>
  <text class="subtitle" x="${margin}" y="132">Grouped by archetype, with footprint plus live forward-thrust and turn-torque stats for maneuverability audit</text>
  ${cardSvgs}
</svg>
`;

fs.writeFileSync(outputPath, svg, "utf8");
console.log(outputPath);
