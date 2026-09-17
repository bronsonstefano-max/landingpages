/**
 * Push a dataLayer event on every tel: click so a future GTM/GA4/call-tracking
 * integration has a single hook. No tracking IDs are configured here.
 */

export function initCallTracking() {
  document.querySelectorAll('a[href^="tel:"]').forEach((link) => {
    link.addEventListener("click", () => {
      if (window.dataLayer && typeof window.dataLayer.push === "function") {
        window.dataLayer.push({
          event: "phone_call_click",
          call_source: link.id || link.dataset.callSource || "unlabeled",
        });
      }
    });
  });
}
