/**
 * Reveal the mobile sticky call bar once the hero CTA scrolls out of view.
 * Adds padding on <body> so page content is not hidden behind the bar.
 */

export function initMobileCallBar() {
  const bar = document.querySelector(".mobile-call-bar");
  const trigger = document.querySelector("#hero-call-button");
  if (!bar || !trigger || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const shouldShow = !entry.isIntersecting;
        bar.classList.toggle("is-visible", shouldShow);
        document.body.classList.toggle("has-mobile-call-bar", shouldShow);
      });
    },
    { rootMargin: "0px" }
  );
  observer.observe(trigger);
}
