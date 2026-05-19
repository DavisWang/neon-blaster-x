import test from "node:test";
import assert from "node:assert/strict";
import { CELL_SIZE, HALF_CELL } from "../src/data.js";
import {
  getNanoweaveHullInsets,
  getNanoweaveLatticeGeometry,
  iterateNanoweaveLatticeCenters,
  computeNanoweaveLattice
} from "../src/nanoweaveLattice.js";

function hullSizeForLength(hullLength) {
  const hullWidth = HALF_CELL * 1.44;
  const hullHeight = hullWidth + CELL_SIZE * (hullLength - 1);
  return { hullWidth, hullHeight };
}

test("nanoweave lattice inner rect is non-degenerate for 1x1, 1x2, 1x3 hulls", () => {
  for (const lineScale of [1, 0.6]) {
    for (let hullLength = 1; hullLength <= 3; hullLength += 1) {
      const { hullWidth, hullHeight } = hullSizeForLength(hullLength);
      const { insetX, insetY } = getNanoweaveHullInsets(hullWidth, hullHeight);
      const geom = getNanoweaveLatticeGeometry(hullWidth, hullHeight, lineScale, insetX, insetY);
      assert.ok(
        geom.innerRight > geom.innerLeft,
        `innerRight > innerLeft (len=${hullLength}, scale=${lineScale})`
      );
      assert.ok(
        geom.innerBottom > geom.innerTop,
        `innerBottom > innerTop (len=${hullLength}, scale=${lineScale})`
      );
    }
  }
});

test("nanoweave lattice places four X sites per 1×1 hull segment", () => {
  for (let hullLength = 1; hullLength <= 3; hullLength += 1) {
    const { hullWidth, hullHeight } = hullSizeForLength(hullLength);
    const { insetX, insetY } = getNanoweaveHullInsets(hullWidth, hullHeight);
    const geom = getNanoweaveLatticeGeometry(hullWidth, hullHeight, 1, insetX, insetY);
    const centers = iterateNanoweaveLatticeCenters(geom, hullLength);
    assert.equal(centers.length, hullLength * 4, `len=${hullLength}`);
  }
});

test("nanoweave lattice is centered in the hull (mean X/Y near block origin)", () => {
  for (let hullLength = 1; hullLength <= 3; hullLength += 1) {
    const { hullWidth, hullHeight } = hullSizeForLength(hullLength);
    const { insetX, insetY } = getNanoweaveHullInsets(hullWidth, hullHeight);
    const geom = getNanoweaveLatticeGeometry(hullWidth, hullHeight, 1, insetX, insetY);
    const centers = iterateNanoweaveLatticeCenters(geom, hullLength);
    assert.ok(centers.length > 0);
    const ax = centers.reduce((s, c) => s + c.x, 0) / centers.length;
    const ay = centers.reduce((s, c) => s + c.y, 0) / centers.length;
    assert.ok(Math.abs(ax) < 1.25, `mean x=${ax} should be near 0 (len=${hullLength})`);
    assert.ok(Math.abs(ay) < 1.25, `mean y=${ay} should be near 0 (len=${hullLength})`);
  }
});

test("nanoweave lattice X strokes stay inside the hull rectangle (axis-aligned bounds)", () => {
  for (const lineScale of [1, 0.6]) {
    for (let hullLength = 1; hullLength <= 3; hullLength += 1) {
      const { hullWidth, hullHeight } = hullSizeForLength(hullLength);
      const { insetX, insetY } = getNanoweaveHullInsets(hullWidth, hullHeight);
      const patch = computeNanoweaveLattice(hullWidth, hullHeight, lineScale, insetX, insetY, hullLength);
      const halfW = patch.halfW;
      const halfH = patch.halfH;
      const { armX, armY, centers } = patch;
      assert.ok(centers.length > 0, `expected at least one lattice site (len=${hullLength})`);
      for (const { x, y } of centers) {
        assert.ok(x - armX >= -halfW - 1e-4, `left overflow x=${x} len=${hullLength}`);
        assert.ok(x + armX <= halfW + 1e-4, `right overflow x=${x} len=${hullLength}`);
        assert.ok(y - armY >= -halfH - 1e-4, `top overflow y=${y} len=${hullLength}`);
        assert.ok(y + armY <= halfH + 1e-4, `bottom overflow y=${y} len=${hullLength}`);
      }
    }
  }
});
