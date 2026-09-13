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
  // meta description). Uses a third-party IP-geolocation API, so it only
  // ever runs when `city` above is still the "[CITY]" placeholder --
  // i.e. this is the generic/national version of the page. If `city` is
  // set to a real value instead (a single-location business), that
  // static city is shown immediately and this whole feature is skipped:
  // showing a Chicago visitor "Chicago Appliance Repair" on a page for a
  // business that only serves Springfield would misrepresent where the
  // business actually works, not just be a missed personalization.
  //
  // Read the README's "Dynamic city insertion" section before enabling
  // this in production -- it covers the third-party privacy implication,
  // the layout-shift trade-off, and why the geo API call could not be
  // tested end-to-end from this development environment.
  geoCityEnabled: true,
  geoCityApiUrl: "https://ipapi.co/json/",
};
