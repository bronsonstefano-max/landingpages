import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isPlaceholder,
  toStateCode,
  parseGeojsPayload,
  formatCityState,
  formatServiceArea,
} from "./geo-location.js";

test("placeholders", () => {
  assert.equal(isPlaceholder("[CITY]"), true);
  assert.equal(isPlaceholder("Wellington"), false);
  assert.equal(isPlaceholder(""), true);
});

test("state codes", () => {
  assert.equal(toStateCode("Florida"), "FL");
  assert.equal(toStateCode("fl"), "FL");
  assert.equal(toStateCode("New York"), "NY");
  assert.equal(toStateCode("Missouri"), "MO");
});

test("geojs Wellington payload (ART-class city)", () => {
  const loc = parseGeojsPayload({
    city: "Wellington",
    region: "Florida",
    latitude: "26.6598",
    longitude: "-80.2429",
  });
  assert.equal(loc.city, "Wellington");
  assert.equal(loc.regionCode, "FL");
  assert.equal(loc.lat, 26.6598);
  assert.equal(loc.lon, -80.2429);
  assert.equal(formatCityState(loc), "Wellington, FL");
  assert.equal(formatServiceArea(loc), "the Wellington area");
});

test("ignores city-less payloads", () => {
  assert.equal(parseGeojsPayload({ region: "Florida" }), null);
  assert.equal(parseGeojsPayload(null), null);
});
