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

  function renderStarRating() {
    var container = document.querySelector("[data-star-rating]");
    if (!container || cfg.ratingValue == null) return;

    var rating = Math.max(0, Math.min(5, cfg.ratingValue));
    var full = Math.floor(rating);
    var remainder = rating - full;
    var hasHalf = remainder >= 0.25 && remainder < 0.75;
    if (remainder >= 0.75) full += 1;
    var empty = 5 - full - (hasHalf ? 1 : 0);

    var starUse = '<svg class="icon icon-filled star-icon"><use href="#icon-star"></use></svg>';
    var html = "";
    for (var i = 0; i < full; i++) {
      html += '<span class="star star-full">' + starUse + "</span>";
    }
    if (hasHalf) {
      html +=
        '<span class="star star-half">' +
        '<span class="star-bg">' + starUse + "</span>" +
        '<span class="star-fill">' + starUse + "</span>" +
        "</span>";
    }
    for (var j = 0; j < empty; j++) {
      html += '<span class="star star-empty">' + starUse + "</span>";
    }

    container.innerHTML = html;
    container.setAttribute("aria-label", "Rated " + rating + " out of 5 stars");
  }

  function initMobileCallBarReveal() {
    var bar = document.querySelector(".mobile-call-bar");
    var trigger = document.querySelector("#hero-call-button");
    if (!bar || !trigger || !("IntersectionObserver" in window)) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var shouldShow = !entry.isIntersecting;
          bar.classList.toggle("is-visible", shouldShow);
          document.body.classList.toggle("has-mobile-call-bar", shouldShow);
        });
      },
      { rootMargin: "0px" }
    );
    observer.observe(trigger);
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
    renderStarRating();
    initMobileCallBarReveal();
    initCallTracking();
  });
})();
