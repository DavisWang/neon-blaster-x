/** Nanoweave hull interior lattice: seam-aligned segments, 2×2 X grid per 1×1 cell. */

import { CELL_SIZE } from "./data.js";

/** Insets for nanoweave lattice (looser than standard hull diagonals so crosses can breathe). */
export function getNanoweaveHullInsets(hullWidth, hullHeight) {
  return {
    insetX: hullWidth * 0.13,
    insetY: Math.min(6, hullHeight * 0.11)
  };
}

/**
 * Reference inner rect + line width for tests. `armX`/`armY` here are placeholders only;
 * real stroke arms come from {@link computeNanoweaveLattice}.
 */
export function getNanoweaveLatticeGeometry(hullWidth, hullHeight, lineScale = 1, insetX, insetY) {
  const lineWidth = 1.1 * lineScale;
  const halfW = hullWidth * 0.5;
  const halfH = hullHeight * 0.5;
  const refArm = 2;
  const capPadX = lineWidth * 0.5 + refArm;
  const capPadY = lineWidth * 0.5 + refArm;

  return {
    halfW,
    halfH,
    insetX,
    insetY,
    innerLeft: -halfW + insetX + capPadX,
    innerRight: halfW - insetX - capPadX,
    innerTop: -halfH + insetY + capPadY,
    innerBottom: halfH - insetY - capPadY,
    armX: refArm,
    armY: refArm,
    lineWidth
  };
}

/**
 * Vertical spans of each 1×1 hull segment (same seam Y math as hull seam drawing).
 * @returns {Array<[number, number]>} [y0, y1] in block-local space
 */
export function getNanoweaveHullSegmentYRanges(hullLength, hullHeight) {
  const halfH = hullHeight * 0.5;
  const top = -halfH;
  const bottom = halfH;
  if (hullLength <= 1) {
    return [[top, bottom]];
  }
  const centerOffset = (hullLength - 1) * CELL_SIZE * 0.5;
  const ranges = [];
  let y0 = top;
  for (let index = 1; index < hullLength; index += 1) {
    const seamY = -centerOffset + CELL_SIZE * (index - 0.5);
    ranges.push([y0, seamY]);
    y0 = seamY;
  }
  ranges.push([y0, bottom]);
  return ranges;
}

const ARM_MAX = 2.38;
const ARM_MIN = 1.22;

/**
 * Square crosses (armX === armY), one arm for the whole block.
 * Per segment: symmetric 2×2 with gap g between stroke extents and margin μ = (span − 4·arm − g) / 2.
 *
 * @returns {{ halfW: number, halfH: number, lineWidth: number, armX: number, armY: number, centers: Array<{x:number,y:number}> }}
 */
export function computeNanoweaveLattice(hullWidth, hullHeight, lineScale, insetX, insetY, hullLength) {
  const lineWidth = 1.1 * lineScale;
  const halfW = hullWidth * 0.5;
  const halfH = hullHeight * 0.5;
  const cap = lineWidth * 0.5 + 0.75;

  const cellLeft = -halfW + insetX + cap;
  const cellRight = halfW - insetX - cap;
  const innerW = cellRight - cellLeft;
  const segments = getNanoweaveHullSegmentYRanges(hullLength, hullHeight);

  const cellBoxes = [];
  for (const [y0, y1] of segments) {
    const cellH = y1 - y0;
    const vPad = Math.min(5.5, cellH * 0.1) + cap;
    let top = y0 + vPad;
    let bottom = y1 - vPad;
    if (bottom <= top) {
      continue;
    }
    const innerH = bottom - top;
    cellBoxes.push({ top, bottom, innerH });
  }

  if (cellBoxes.length === 0 || innerW <= 1) {
    return { halfW, halfH, lineWidth, armX: ARM_MIN, armY: ARM_MIN, centers: [] };
  }

  const minH = Math.min(...cellBoxes.map((b) => b.innerH));
  const g = Math.max(0.95, Math.min(innerW, minH) * 0.06);

  let arm = ARM_MAX;
  for (const box of cellBoxes) {
    const aW = (innerW - 3 * g) / 4;
    const aH = (box.innerH - 3 * g) / 4;
    arm = Math.min(arm, aW, aH);
  }
  arm = Math.min(ARM_MAX, Math.max(ARM_MIN, arm));

  for (let iter = 0; iter < 14; iter += 1) {
    let ok = true;
    for (const box of cellBoxes) {
      const μx = (innerW - 4 * arm - g) * 0.5;
      const μy = (box.innerH - 4 * arm - g) * 0.5;
      if (μx < -1e-4 || μy < -1e-4) {
        ok = false;
        break;
      }
    }
    if (ok) {
      break;
    }
    arm *= 0.93;
  }
  arm = Math.max(ARM_MIN * 0.82, arm);

  const centers = [];
  for (const box of cellBoxes) {
    const μx = (innerW - 4 * arm - g) * 0.5;
    const μy = (box.innerH - 4 * arm - g) * 0.5;
    if (μx < -1e-3 || μy < -1e-3) {
      continue;
    }
    const cx0 = cellLeft + μx + arm;
    const cx1 = cellRight - μx - arm;
    const cy0 = box.top + μy + arm;
    const cy1 = box.bottom - μy - arm;

    for (const y of [cy0, cy1]) {
      for (const x of [cx0, cx1]) {
        if (
          x - arm < -halfW - 1e-5 ||
          x + arm > halfW + 1e-5 ||
          y - arm < -halfH - 1e-5 ||
          y + arm > halfH + 1e-5
        ) {
          continue;
        }
        centers.push({ x, y });
      }
    }
  }

  return {
    halfW,
    halfH,
    lineWidth,
    armX: arm,
    armY: arm,
    centers
  };
}

export function iterateNanoweaveLatticeCenters(geom, hullLength = 1) {
  return computeNanoweaveLattice(
    geom.halfW * 2,
    geom.halfH * 2,
    geom.lineWidth / 1.1,
    geom.insetX,
    geom.insetY,
    hullLength
  ).centers;
}
