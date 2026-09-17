/**
 * Static service-area map (no Leaflet, no API key).
 *
 * ApplianceRepairToday uses a Google Static Map: a framed picture of the
 * city, not an interactive widget. We do the same with Esri street tiles
 * (no key) plus an SVG coverage ring centered on the visitor.
 */

import { getResolvedLocation, formatCityState } from "./geo-location.js";

const TILE = 256;
const VIEW = 280;
const METERS_PER_MILE = 1609.34;
const EARTH_PX_Z0 = 156543.03392;

export function lonToTileX(lon, zoom) {
  return ((lon + 180) / 360) * 2 ** zoom;
}

export function latToTileY(lat, zoom) {
  const s = Math.sin((lat * Math.PI) / 180);
  const clamped = Math.min(0.9999, Math.max(-0.9999, s));
  return (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * 2 ** zoom;
}

export function metersPerPixel(lat, zoom) {
  return (EARTH_PX_Z0 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}

export function pickZoom(lat, radiusMiles, viewPx) {
  const radiusM = radiusMiles * METERS_PER_MILE;
  const targetR = viewPx * 0.34;
  const z = Math.log2((EARTH_PX_Z0 * Math.cos((lat * Math.PI) / 180) * targetR) / radiusM);
  if (!Number.isFinite(z)) return 9;
  return Math.max(6, Math.min(12, Math.round(z)));
}

export function coverageRadiusPx(lat, zoom, radiusMiles) {
  const mpp = metersPerPixel(lat, zoom);
  return mpp > 0 ? (radiusMiles * METERS_PER_MILE) / mpp : 0;
}

function tileUrl(zoom, x, y) {
  const n = 2 ** zoom;
  const wrappedX = ((x % n) + n) % n;
  return (
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/" +
    zoom +
    "/" +
    y +
    "/" +
    wrappedX
  );
}

function hasCoordinates(location) {
  return location && Number.isFinite(location.lat) && Number.isFinite(location.lon);
}

function renderTiles(layer, lat, lon, zoom, view) {
  const fx = lonToTileX(lon, zoom);
  const fy = latToTileY(lat, zoom);
  const originX = fx * TILE - view / 2;
  const originY = fy * TILE - view / 2;
  const minTx = Math.floor(originX / TILE);
  const minTy = Math.floor(originY / TILE);
  const maxTx = Math.floor((originX + view - 1) / TILE);
  const maxTy = Math.floor((originY + view - 1) / TILE);
  const n = 2 ** zoom;

  layer.replaceChildren();
  layer.style.transform =
    "translate(" + -(originX - minTx * TILE) + "px," + -(originY - minTy * TILE) + "px)";

  for (let ty = minTy; ty <= maxTy; ty++) {
    if (ty < 0 || ty >= n) continue;
    for (let tx = minTx; tx <= maxTx; tx++) {
      const img = document.createElement("img");
      img.src = tileUrl(zoom, tx, ty);
      img.alt = "";
      img.width = TILE;
      img.height = TILE;
      img.decoding = "async";
      img.draggable = false;
      img.style.left = (tx - minTx) * TILE + "px";
      img.style.top = (ty - minTy) * TILE + "px";
      layer.appendChild(img);
    }
  }
}

function renderOverlay(svg, radiusPx, view) {
  const cx = view / 2;
  const cy = view / 2;
  const r = Math.max(18, Math.min(view * 0.46, radiusPx));
  svg.setAttribute("viewBox", "0 0 " + view + " " + view);
  svg.replaceChildren();

  const ringFill = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ringFill.setAttribute("cx", String(cx));
  ringFill.setAttribute("cy", String(cy));
  ringFill.setAttribute("r", String(r));
  ringFill.setAttribute("class", "service-area-ring-fill");

  const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  ring.setAttribute("cx", String(cx));
  ring.setAttribute("cy", String(cy));
  ring.setAttribute("r", String(r));
  ring.setAttribute("class", "service-area-ring");

  const pin = document.createElementNS("http://www.w3.org/2000/svg", "g");
  pin.setAttribute("transform", "translate(" + (cx - 11) + " " + (cy - 28) + ")");
  const pinBody = document.createElementNS("http://www.w3.org/2000/svg", "path");
  pinBody.setAttribute(
    "d",
    "M11 0C5.2 0 .5 4.5.5 10.1.5 17.8 11 30 11 30s10.5-12.2 10.5-19.9C21.5 4.5 16.8 0 11 0z"
  );
  pinBody.setAttribute("fill", "#1657ff");
  const pinDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  pinDot.setAttribute("cx", "11");
  pinDot.setAttribute("cy", "10");
  pinDot.setAttribute("r", "3.6");
  pinDot.setAttribute("fill", "#ffffff");
  pin.append(pinBody, pinDot);

  svg.append(ringFill, ring, pin);
}

function renderMap(cfg, location) {
  const section = document.querySelector("[data-service-area]");
  const layer = document.querySelector("[data-service-area-tiles]");
  const svg = document.querySelector("[data-service-area-overlay]");
  const frame = document.querySelector("[data-service-area-frame]");
  if (!section || !layer || !svg || !frame || !hasCoordinates(location)) return;

  const radiusMiles = Number(cfg.serviceRadiusMiles) > 0 ? Number(cfg.serviceRadiusMiles) : 15;
  section.hidden = false;
  const view = Math.round(frame.getBoundingClientRect().width) || VIEW;
  const zoom = pickZoom(location.lat, radiusMiles, view);
  const radiusPx = coverageRadiusPx(location.lat, zoom, radiusMiles);
  const cityState = formatCityState(location);
  const label = cityState
    ? "Map of the approximate service area around " + cityState
    : "Map of the approximate local service area";

  frame.setAttribute("role", "img");
  frame.setAttribute("aria-label", label);

  renderTiles(layer, location.lat, location.lon, zoom, view);
  renderOverlay(svg, radiusPx, view);
}

export function initServiceAreaMap(cfg) {
  if (cfg.mapEnabled === false) return;
  if (!document.querySelector("[data-service-area-frame]")) return;

  const start = (location) => {
    if (!hasCoordinates(location)) return;
    renderMap(cfg, location);
  };

  const existing = getResolvedLocation();
  if (existing) start(existing);

  document.addEventListener("appliance:location", (event) => {
    start(event.detail);
  });
}
