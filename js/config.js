/**
 * Centralized site configuration.
 *
 * Single source of truth for business-specific values used throughout the
 * landing page. Update the values below and every mention across the page
 * updates automatically via data-cfg attributes in index.html
 * (see js/modules/bind-config.js).
 *
 * Operational claim strings (availabilityClaim, supportClaim, certifiedClaim,
 * factoryTrainedClaim) are marketing claims — confirm each one is actually
 * true for this business before launch, or edit/remove it here.
 */
export const SITE_CONFIG = {
  brandName: "Appliance Helpers",
  brandLead: "Appliance",
  brandTail: "Helpers",

  phoneDisplay: "(800) 555-5555",
  phoneHref: "tel:+18005555555",

  city: "[CITY]",
  state: "[STATE]",
  serviceArea: "[SERVICE AREA]",
  hours: "[HOURS]",

  availabilityClaim: "Same & Next-Day Repairs Available",
  supportClaim: "24/7 Support, Every Day of the Week",
  certifiedClaim: "Certified Experts",
  factoryTrainedClaim: "Certified, Factory-Trained Techs",
  availabilityBadge: "Open 24/7",

  // Real, user-confirmed rating (out of 5). Only display a rating here if
  // it reflects actual aggregated review data — never a placeholder value.
  ratingValue: 5,

  /**
   * Dynamic per-visitor city insertion ("{City} Appliance Repair").
   * Only runs when `city` is still the "[CITY]" placeholder.
   *
   * geojs.io is used because it returns MaxMind-class city names (e.g.
   * Wellington, FL) over HTTPS with CORS. ipinfo/Cloudflare often label
   * the same AT&T block as the adjacent town. Optional geoLat/geoLon on a
   * configured city let the service-area map render without an IP lookup.
   */
  geoCityEnabled: true,
  geoCityApiUrl: "https://get.geojs.io/v1/ip/geo.json",
  geoTimeoutMs: 5000,
  geoLat: null,
  geoLon: null,

  mapEnabled: true,
  serviceRadiusMiles: 15,

  /**
   * Local-presence numbers (dynamic number insertion).
   *
   * The page already knows the visitor's city via geo. To show a local
   * phone instead of the 800 fallback:
   *
   * 1. Buy/lease DIDs in the area codes you serve (Twilio, CallRail,
   *    CallTrackingMetrics, or a referral-network pool).
   * 2. Either list them in `numberPool` keyed by NPA ("561") or state
   *    ("FL"), or point `dniEndpoint` at an API that returns
   *    { phoneDisplay, phoneHref, areaCode, leaseId } for the payload
   *    { city, regionCode, areaCode, lat, lon }.
   * 3. Fill `areaCodeByCity` so "Wellington|FL" → "561" (and so on).
   *    The endpoint can also return areaCode itself.
   *
   * With both pool and endpoint empty, every visitor keeps phoneDisplay.
   */
  dniEnabled: true,
  dniEndpoint: null,
  areaCodeByCity: {
    "Wellington|FL": "561",
    "Royal Palm Beach|FL": "561",
    "West Palm Beach|FL": "561",
    "Palm Beach Gardens|FL": "561",
  },
  numberPool: {
    // "561": { display: "(561) 555-0100", href: "tel:+15615550100" },
  },

  // do-not-sell.html's CCPA request form submits here via a background
  // fetch (see the inline script at the bottom of that file). It's a
  // deployed Google Apps Script Web App URL (ends in /exec) -- see the
  // README's "Do Not Sell form backend" section for how it was set up.
  // Leave blank and the form shows a "not yet connected" note instead of
  // submitting anywhere.
  doNotSellSheetEndpoint:
    "https://script.google.com/macros/s/AKfycbxt4fEmct5uQl8ETRdWq0h9OUUPn0Ap3hsdznmsGIVuO5rD9ybD7sGIJAAZe1Ivs06e/exec",

  // Optional shared secret, sent as a hidden `token` field with every
  // submission -- a cheap spam deterrent once the Web App URL leaks, not
  // real authentication. Leave blank to skip it.
  doNotSellSheetToken: "",
};

window.SITE_CONFIG = SITE_CONFIG;
