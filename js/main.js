/**
 * Progressive-enhancement layer.
 *
 * 1. Fills every element tagged with data-cfg / data-cfg-href from the
 *    single SITE_CONFIG object (js/config.js), so the phone number, brand
 *    name, and location only ever need to be edited in one place.
 * 2. Syncs <title> and the meta description with the same config, for
 *    crawlers/ad reviewers that execute JavaScript.
 * 3. Emits a dataLayer event on every call-button click so a future
 *    GTM/GA4/call-tracking integration has a single, consistent hook
 *    to key off of. No tracking IDs are configured here; this only
 *    pushes an event if a dataLayer already exists.
 *
 * No dependencies, no build step.
 */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};

  function fillConfigValues() {
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var key = el.getAttribute("data-cfg");
      if (cfg[key] != null) el.textContent = cfg[key];
    });

    document.querySelectorAll("[data-cfg-href]").forEach(function (el) {
      var key = el.getAttribute("data-cfg-href");
      if (cfg[key] != null) el.setAttribute("href", cfg[key]);
    });
  }

  function syncHeadMetadata() {
    var replacements = {
      "\\[BRAND NAME\\]": cfg.brandName,
      "\\[PHONE NUMBER\\]": cfg.phoneDisplay,
      "\\[CITY\\]": cfg.city,
      "\\[STATE\\]": cfg.state,
      "\\[SERVICE AREA\\]": cfg.serviceArea,
    };

    function applyReplacements(text) {
      Object.keys(replacements).forEach(function (token) {
        var value = replacements[token];
        if (value == null) return;
        text = text.replace(new RegExp(token, "g"), value);
      });
      return text;
    }

    if (document.title) {
      document.title = applyReplacements(document.title);
    }

    var metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        applyReplacements(metaDescription.getAttribute("content") || "")
      );
    }
  }

  function initCallTracking() {
    var callLinks = document.querySelectorAll('a[href^="tel:"]');
    callLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        if (window.dataLayer && typeof window.dataLayer.push === "function") {
          window.dataLayer.push({
            event: "phone_call_click",
            call_source: link.id || link.dataset.callSource || "unlabeled",
          });
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    fillConfigValues();
    syncHeadMetadata();
    initCallTracking();
  });
})();
