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
 * 4. On the generic/national build of the page (config.city still the
 *    "[CITY]" placeholder), best-effort inserts the visitor's detected
 *    city into every [data-geo-location-prefix] element plus
 *    <title>/meta description ("{City} Appliance Repair"). Detection
 *    order: (a) the browser's own Geolocation API (GPS/Wi-Fi position),
 *    reverse-geocoded to a city name -- this is real city-accurate,
 *    since it doesn't depend on IP address registration; (b) if that's
 *    denied, unsupported, or fails, falls back to an IP-geolocation
 *    API's *region* (state/province), never its city guess, since
 *    IP-to-city is unreliable (see fallbackToIpRegion's comment).
 *    Silently does nothing further if both fail, geo is disabled, or
 *    config.city is already a real value -- see config.js's
 *    geoCityEnabled comment.
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

  function isPlaceholder(value) {
    return !value || /^\[.*\]$/.test(value);
  }

  function applyLocationPrefix(location) {
    if (!location) return;

    document.querySelectorAll("[data-geo-location-prefix]").forEach(function (el) {
      el.textContent = location + " ";
    });

    if (cfg.brandName) {
      document.title = location + " Appliance Repair | " + cfg.brandName;
    }

    var metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription && cfg.brandName && cfg.phoneDisplay) {
      metaDescription.setAttribute(
        "content",
        cfg.brandName +
          " provides " +
          location +
          " appliance repair — refrigerators, washers, dryers, dishwashers, ovens, and more. Call " +
          cfg.phoneDisplay +
          " to get help fast."
      );
    }
  }

  function cacheLocation(value) {
    try {
      sessionStorage.setItem("geoLocationDetected", value);
    } catch (e) {
      /* no caching this visit -- not fatal */
    }
  }

  // IP-based fallback: only reaches for the *region* (state/province), not
  // the city. Straight IP-to-city geolocation is unreliable -- ISPs
  // register address blocks against a regional hub, not the subscriber's
  // actual address, so a smaller city routinely gets attributed to a
  // larger neighboring one (e.g. a Cape Coral visitor reported as "Fort
  // Myers"), especially on mobile carriers where traffic funnels through
  // a handful of regional gateways. That's true of every IP geolocation
  // provider, not just this one, so there's no "better API" fix at the
  // city level -- only the region is reliably accurate from IP alone.
  function fallbackToIpRegion() {
    if (!cfg.geoCityApiUrl || typeof fetch !== "function") return;

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = controller
      ? setTimeout(function () {
          controller.abort();
        }, 2000)
      : null;

    fetch(cfg.geoCityApiUrl, { signal: controller ? controller.signal : undefined })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (timeoutId) clearTimeout(timeoutId);
        var region = data && data.region;
        if (!region) return;
        applyLocationPrefix(region);
        cacheLocation(region);
      })
      .catch(function () {
        // Network error, timeout, blocked by an ad/privacy blocker, or a
        // non-OK response. Fail silently -- the page already reads
        // correctly with the generic "Appliance Repair" headline.
      });
  }

  // Reverse-geocodes the browser's actual GPS/Wi-Fi position into a city
  // name via BigDataCloud's free, key-less, CORS-enabled endpoint made for
  // exactly this client-side use case. This is what makes *city*-level
  // accuracy possible at all -- it doesn't depend on IP address
  // registration, so it isn't fooled by the neighboring-city problem that
  // affects every IP-only approach.
  function reverseGeocode(latitude, longitude) {
    if (typeof fetch !== "function") {
      fallbackToIpRegion();
      return;
    }

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = controller
      ? setTimeout(function () {
          controller.abort();
        }, 3000)
      : null;
    var url =
      "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" +
      latitude +
      "&longitude=" +
      longitude +
      "&localityLanguage=en";

    fetch(url, { signal: controller ? controller.signal : undefined })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (data) {
        if (timeoutId) clearTimeout(timeoutId);
        var city = data && (data.city || data.locality);
        if (!city) {
          fallbackToIpRegion();
          return;
        }
        applyLocationPrefix(city);
        cacheLocation(city);
      })
      .catch(function () {
        fallbackToIpRegion();
      });
  }

  function attemptDeviceGeolocation() {
    if (!("geolocation" in navigator)) {
      fallbackToIpRegion();
      return;
    }

    function requestPosition() {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          reverseGeocode(position.coords.latitude, position.coords.longitude);
        },
        function () {
          // Permission denied, position unavailable, or timed out.
          // Fall back to the (safe, region-only) IP-based guess rather
          // than showing no personalization at all.
          fallbackToIpRegion();
        },
        { timeout: 5000, maximumAge: 300000 }
      );
    }

    // Checking permission state first (where supported) avoids a wasted
    // round trip through getCurrentPosition's own async permission flow
    // when we already know the answer -- doesn't change behavior, since
    // getCurrentPosition would reach the same result, but avoids
    // triggering it at all when the visitor has already said no.
    if (navigator.permissions && typeof navigator.permissions.query === "function") {
      navigator.permissions.query({ name: "geolocation" }).then(
        function (status) {
          if (status.state === "denied") {
            fallbackToIpRegion();
          } else {
            requestPosition();
          }
        },
        function () {
          requestPosition();
        }
      );
    } else {
      requestPosition();
    }
  }

  function initGeoCity() {
    // A real configured city means this page is for one fixed service
    // area -- show it immediately (no network call, no layout-shift
    // risk) and skip detection entirely. See the long comment on
    // geoCityEnabled in config.js for why these two are mutually
    // exclusive rather than "static first, then upgrade to detected."
    if (!isPlaceholder(cfg.city)) {
      applyLocationPrefix(cfg.city);
      return;
    }

    if (cfg.geoCityEnabled === false) return;

    var cachedLocation = null;
    try {
      cachedLocation = sessionStorage.getItem("geoLocationDetected");
    } catch (e) {
      /* sessionStorage unavailable (private browsing, locked-down
         browser settings, etc.) -- just skip caching, not fatal. */
    }
    if (cachedLocation) {
      applyLocationPrefix(cachedLocation);
      return;
    }

    attemptDeviceGeolocation();
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
    initGeoCity();
    renderStarRating();
    initMobileCallBarReveal();
    initCallTracking();
  });
})();
