/**
 * Centralized site configuration.
 *
 * This is the single source of truth for business-specific values used
 * throughout the landing page (phone number, brand name, location, hours).
 * Update the values below and every call button, header, footer, and
 * mention across the page updates automatically via data-cfg attributes
 * in index.html (see js/main.js).
 *
 * To launch a localized version of this page for a new city/brand, copy
 * this file, update the values, and point that city's index.html at the
 * copy. Also update the <title> and meta description placeholders in
 * index.html's <head> to match (main.js updates them at runtime as a
 * progressive enhancement, but search engines and ad reviewers should see
 * correct values in the raw HTML too).
 */
window.SITE_CONFIG = {
  // Business / brand name shown in the header, footer, and copy.
  brandName: "[BRAND NAME]",

  // Phone number as it should be displayed to visitors, e.g. "(555) 123-4567".
  phoneDisplay: "[PHONE NUMBER]",

  // Phone number as a tel: URI for click-to-call links, e.g. "tel:+15551234567".
  // Must use the E.164 format (tel:+1XXXXXXXXXX) once a real number is set.
  phoneHref: "tel:[PHONE NUMBER]",

  // Primary service location.
  city: "[CITY]",
  state: "[STATE]",

  // Broader service area description, e.g. "the Greater [CITY] Area".
  serviceArea: "[SERVICE AREA]",

  // Hours of operation, e.g. "Mon–Sat, 8AM–7PM".
  hours: "[HOURS]",
};
