/**
 * Local-presence number insertion (DNI).
 *
 * After geo resolves, swap the displayed phone for a number in the
 * visitor's area — either from a static pool in SITE_CONFIG, or from a
 * live tracking endpoint (CallRail, Twilio, CallForge, etc.).
 *
 * Until a pool or endpoint is configured, the page keeps the fallback
 * 800 number. See js/config.js.
 */
import { bindConfig } from "./bind-config.js";

export function formatNanpDisplay(e164) {
  const digits = String(e164 || "").replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (national.length !== 10) return "";
  return "(" + national.slice(0, 3) + ") " + national.slice(3, 6) + "-" + national.slice(6);
}

export function toTelHref(e164OrDisplay) {
  const digits = String(e164OrDisplay || "").replace(/\D/g, "");
  if (digits.length === 10) return "tel:+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "tel:+" + digits;
  return "";
}

export function areaCodeFromLocation(location, cfg) {
  if (!location) return "";
  const map = cfg.areaCodeByCity || {};
  const city = location.city || "";
  const code = location.regionCode || "";
  return (
    map[city + "|" + code] ||
    map[city] ||
    (location.areaCode ? String(location.areaCode) : "") ||
    ""
  );
}

export function numberFromPool(areaCode, regionCode, cfg) {
  const pool = cfg.numberPool || {};
  const hit = (areaCode && pool[areaCode]) || (regionCode && pool[regionCode]) || null;
  if (!hit) return null;
  if (typeof hit === "string") {
    const href = toTelHref(hit);
    const display = formatNanpDisplay(hit);
    return href && display ? { display, href, source: "pool" } : null;
  }
  if (hit.display && hit.href) {
    return { display: hit.display, href: hit.href, source: "pool" };
  }
  return null;
}

function applyPhone(cfg, phone) {
  if (!phone || !phone.display || !phone.href) return;
  cfg.phoneDisplay = phone.display;
  cfg.phoneHref = phone.href;
  if (window.SITE_CONFIG) {
    window.SITE_CONFIG.phoneDisplay = phone.display;
    window.SITE_CONFIG.phoneHref = phone.href;
  }
  bindConfig(cfg);
  document.dispatchEvent(new CustomEvent("appliance:phone", { detail: phone }));
}

function requestFromEndpoint(cfg, location, areaCode) {
  return fetch(cfg.dniEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      city: location.city,
      region: location.region,
      regionCode: location.regionCode,
      areaCode: areaCode || null,
      lat: location.lat,
      lon: location.lon,
    }),
  }).then((res) => (res.ok ? res.json() : null));
}

function resolveForLocation(cfg, location) {
  const areaCode = areaCodeFromLocation(location, cfg);
  const pooled = numberFromPool(areaCode, location.regionCode, cfg);
  if (pooled) {
    applyPhone(cfg, { ...pooled, areaCode });
    return;
  }

  if (!cfg.dniEndpoint || typeof fetch !== "function") return;

  requestFromEndpoint(cfg, location, areaCode)
    .then((data) => {
      if (!data) return;
      const href = data.phoneHref || toTelHref(data.phoneNumber || data.e164 || "");
      const display =
        data.phoneDisplay || formatNanpDisplay(data.phoneNumber || data.e164 || href);
      if (!href || !display) return;
      applyPhone(cfg, {
        display,
        href,
        areaCode: data.areaCode || areaCode,
        source: "endpoint",
        leaseId: data.leaseId || null,
      });
    })
    .catch(() => {
      /* Keep the fallback 800 number. */
    });
}

export function initLocalNumber(cfg) {
  if (cfg.dniEnabled === false) return;

  document.addEventListener("appliance:location", (event) => {
    resolveForLocation(cfg, event.detail);
  });
}
