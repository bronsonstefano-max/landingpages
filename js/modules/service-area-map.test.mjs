import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lonToTileX,
  latToTileY,
  pickZoom,
  coverageRadiusPx,
} from "./service-area-map.js";

test("Wellington projects into the expected OSM tile", () => {
  const z = 9;
  const x = lonToTileX(-80.2429, z);
  const y = latToTileY(26.6598, z);
  assert.equal(Math.floor(x), 141);
  assert.equal(Math.floor(y), 216);
});

test("15-mile ring sits inside a 280px frame around Wellington", () => {
  const z = pickZoom(26.6598, 15, 280);
  const r = coverageRadiusPx(26.6598, z, 15);
  assert.ok(z >= 8 && z <= 10);
  assert.ok(r > 60 && r < 130);
});
