/**
 * Centralized site configuration.
 *
 * Single source of truth for business-specific values used throughout the
 * site. Update the values below and every mention updates automatically
 * via data-cfg attributes -- shared identically by index.html and the
 * three secondary pages (about-us.html, how-it-works.html,
 * do-not-sell.html), since all four load this file (see js/main.js).
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
  ratingValue: 5,

  // do-not-sell.html's CCPA request form submits here via a background
  // fetch (see the inline script at the bottom of that file). Leave blank
  // and the form shows its "not yet connected" note instead of
  // submitting anywhere. Point this at a deployed Google Apps Script Web
  // App URL (ends in /exec) to have submissions land as new rows in a
  // Google Sheet you own -- see the README's "Do Not Sell form backend"
  // section for the exact script to paste in and how to deploy it.
  doNotSellSheetEndpoint: "",

  // Optional shared secret, sent as a hidden `token` field with every
  // submission. Only useful if the same value is also set as SHARED_TOKEN
  // in the Apps Script -- it's a cheap deterrent against spam once the
  // Web App URL leaks or gets guessed, not real authentication (visible
  // to anyone who views this file's source). Leave blank to skip it.
  doNotSellSheetToken: "",
};
