/**
 * Per-visitor city for the generic/national page.
 *
 * ApplianceRepairToday-class accuracy: resolve the *city*, not the state.
 * ipinfo/Cloudflare often label this AT&T block as the adjacent town
 * (Royal Palm Beach). MaxMind-class sources (geojs, ip-api) return
 * Wellington — which is the actual municipality. We use geojs because it
 * is HTTPS + CORS and matches that MaxMind-class city.
 *
 * A configured (non-placeholder) city skips IP lookup and is shown immediately.
 */

const CACHE_KEY = "geoLocation.v2";
const GEOJS_URL = "https://get.geojs.io/v1/ip/geo.json";

const US_STATE_ABBR = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};

let currentLocation = null;

export function isPlaceholder(value) {
  return !value || /^\[.*\]$/.test(String(value).trim());
}

export function toStateCode(region) {
  if (!region) return "";
  const trimmed = String(region).trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return US_STATE_ABBR[trimmed] || trimmed;
}

export function parseGeojsPayload(data) {
  if (!data || typeof data !== "object") return null;
  const city = typeof data.city === "string" ? data.city.trim() : "";
  if (!city) return null;

  const lat = Number(data.latitude);
  const lon = Number(data.longitude);
  const region = typeof data.region === "string" ? data.region.trim() : "";
  const regionCode = toStateCode(region);

  return {
    city,
    region,
    regionCode,
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    source: "geojs",
  };
}

export function formatCityState(location) {
  if (!location || !location.city) return "";
  return location.regionCode ? location.city + ", " + location.regionCode : location.city;
}

export function formatServiceArea(location) {
  if (!location || !location.city) return "";
  return "the " + location.city + " area";
}

export function getResolvedLocation() {
  return currentLocation;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.city) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeCache(location) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(location));
  } catch (e) {
    /* private mode / quota */
  }
}

function locationFromConfig(cfg) {
  const city = cfg.city && !isPlaceholder(cfg.city) ? cfg.city.trim() : "";
  if (!city) return null;
  const region = cfg.state && !isPlaceholder(cfg.state) ? cfg.state.trim() : "";
  const lat = Number(cfg.geoLat);
  const lon = Number(cfg.geoLon);
  return {
    city,
    region,
    regionCode: toStateCode(region),
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    source: "config",
  };
}

export function applyLocation(cfg, location) {
  if (!location || !location.city) return;

  currentLocation = location;
  const cityState = formatCityState(location);
  const area = formatServiceArea(location);
  const prefix = location.city + " ";

  document.querySelectorAll("[data-geo-location-prefix]").forEach((el) => {
    el.textContent = prefix;
  });

  document.querySelectorAll("[data-geo-city-state]").forEach((el) => {
    el.textContent = cityState;
  });

  document.querySelectorAll("[data-geo-area]").forEach((el) => {
    el.textContent = area;
  });

  document.querySelectorAll("[data-geo-reveal]").forEach((el) => {
    el.hidden = false;
  });

  if (isPlaceholder(cfg.serviceArea)) {
    document.querySelectorAll('[data-cfg="serviceArea"]').forEach((el) => {
      el.textContent = area;
    });
  }

  // Keep <title>, meta description, and Open Graph tags static. Rewriting
  // them from the visitor IP makes crawlers index random datacenter cities
  // and makes shared-link previews depend on the sharer's location.

  document.dispatchEvent(new CustomEvent("appliance:location", { detail: location }));
}

function fetchJson(url, timeoutMs) {
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeoutId = controller
    ? setTimeout(() => {
        controller.abort();
      }, timeoutMs)
    : null;

  return fetch(url, { signal: controller ? controller.signal : undefined })
    .then((res) => (res.ok ? res.json() : null))
    .finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
}

export function initGeoLocation(cfg) {
  const configured = locationFromConfig(cfg);
  if (configured) {
    applyLocation(cfg, configured);
    return;
  }

  if (cfg.geoCityEnabled === false || typeof fetch !== "function") {
    return;
  }

  const cached = readCache();
  if (cached) {
    applyLocation(cfg, cached);
    return;
  }

  const timeoutMs = Number(cfg.geoTimeoutMs) > 0 ? Number(cfg.geoTimeoutMs) : 2500;
  const url = cfg.geoCityApiUrl || GEOJS_URL;

  fetchJson(url, timeoutMs)
    .then((data) => {
      const location = parseGeojsPayload(data);
      if (!location) return;
      writeCache(location);
      applyLocation(cfg, location);
    })
    .catch(() => {
      /* Network error, timeout, or blocked. Page already reads correctly. */
    });
}
