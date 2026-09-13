/**
 * Centralized site configuration.
 *
 * Single source of truth for business-specific values used throughout the
 * landing page. Update the values below and every mention across the page
 * updates automatically via data-cfg attributes in index.html (see
 * js/main.js).
 *
 * IMPORTANT — operational claim strings (availabilityClaim, supportClaim,
 * certifiedClaim, factoryTrainedClaim below): these mirror language from
 * the reference design this page was modeled on (24/7 support, same/next
 * -day service, "certified"/"factory-trained" technicians). They are
 * marketing claims, not just copy — confirm each one is actually true for
 * this business before launch, or edit/remove it here. Because they're
 * centralized, changing or deleting one updates every place it appears.
 */
window.SITE_CONFIG = {
  brandName: "Appliance Helpers",

  // Phone number as displayed to visitors.
  phoneDisplay: "(800) 555-5555",

  // Phone number as a tel: URI (E.164 format) for click-to-call links.
  phoneHref: "tel:+18005555555",

  // Primary service location.
  city: "[CITY]",
  state: "[STATE]",

  // Broader service area description, e.g. "the Greater [CITY] Area".
  serviceArea: "[SERVICE AREA]",

  // Hours of operation, e.g. "Mon–Sat, 8AM–7PM".
  hours: "[HOURS]",

  // Operational claims — verify before launch (see note above).
  availabilityClaim: "Same & Next-Day Service Available",
  supportClaim: "24-Hour Support 7 Days a Week",
  certifiedClaim: "Certified Experts",
  factoryTrainedClaim: "Factory-Trained Technicians",
  availabilityBadge: "Available 24/7",

  // Real, user-confirmed rating (out of 5). Only display a rating here if
  // it reflects actual aggregated review data — never a placeholder value.
  ratingValue: 4.5,

  // Dynamic per-visitor city insertion ("{City} Appliance Repair" in the
  // H1, the sidebar card heading, the final CTA heading, <title>, and the
  // meta description). Only ever runs when `city` above is still the
  // "[CITY]" placeholder -- i.e. this is the generic/national version of
  // the page. If `city` is set to a real value instead (a single-location
  // business), that static city is shown immediately and this whole
  // feature is skipped: showing a Chicago visitor "Chicago Appliance
  // Repair" on a page for a business that only serves Springfield would
  // misrepresent where the business actually works, not just be a missed
  // personalization.
  //
  // Detects the visitor's city via the browser's own Geolocation API
  // (GPS/Wi-Fi position, reverse-geocoded to a city name) -- not IP
  // address lookup. Real GPS/Wi-Fi position is what makes city-level
  // accuracy possible at all: IP-to-city geolocation is unreliable
  // because ISPs register address blocks against a regional hub rather
  // than the subscriber's actual address, so a smaller city routinely
  // gets attributed to a larger neighboring one (e.g. a Cape Coral
  // visitor reported as "Fort Myers"), especially on mobile carriers.
  // That's true of every IP geolocation provider, so there's no
  // "better API" fix at the city level. If the visitor denies the
  // location permission prompt, or the browser doesn't support it, this
  // falls back to `geoCityApiUrl` below for a *region*-only guess
  // (state/province, e.g. "Florida Appliance Repair") -- IP geolocation
  // is reliably accurate at that broader level, so the fallback never
  // repeats the wrong-city problem.
  //
  // Read the README's "Dynamic city insertion" section before enabling
  // this in production -- it covers the location-permission prompt this
  // shows visitors, the third-party privacy implications (both the
  // browser's own location provider and the reverse-geocoding API see
  // the visitor's coordinates), the layout-shift trade-off, and why none
  // of this could be tested end-to-end from this development environment.
  geoCityEnabled: true,
  geoCityApiUrl: "https://ipapi.co/json/",
};
