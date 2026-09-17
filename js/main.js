/**
 * Progressive-enhancement entry point.
 *
 * 1. Bind SITE_CONFIG into the DOM
 * 2. Sync document title / meta description
 * 3. Optional city prefix + service-area map via IP geolocation
 * 4. Star rating
 * 5. Mobile sticky call bar
 * 6. Call-click dataLayer hook
 * 7. Local-presence number (after geo), when a pool or DNI endpoint is set
 */
import { SITE_CONFIG } from "./config.js";
import { bindConfig, syncHeadMetadata } from "./modules/bind-config.js";
import { initGeoLocation } from "./modules/geo-location.js";
import { initServiceAreaMap } from "./modules/service-area-map.js";
import { initLocalNumber } from "./modules/local-number.js";
import { renderStarRating } from "./modules/star-rating.js";
import { initMobileCallBar } from "./modules/mobile-call-bar.js";
import { initCallTracking } from "./modules/call-tracking.js";

document.addEventListener("DOMContentLoaded", () => {
  bindConfig(SITE_CONFIG);
  syncHeadMetadata(SITE_CONFIG);
  initServiceAreaMap(SITE_CONFIG);
  initLocalNumber(SITE_CONFIG);
  initGeoLocation(SITE_CONFIG);
  renderStarRating(SITE_CONFIG);
  initMobileCallBar();
  initCallTracking();
});
