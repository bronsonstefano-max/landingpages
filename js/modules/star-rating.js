/**
 * Render the hero star row from cfg.ratingValue (0–5, supports halves).
 * Min-height on .star-rating reserves the row so the rest of the hero
 * does not shift when the stars appear.
 */

const STAR_USE =
  '<svg class="icon icon-filled star-icon"><use href="#icon-star"></use></svg>';

export function renderStarRating(cfg) {
  const container = document.querySelector("[data-star-rating]");
  if (!container || cfg.ratingValue == null) return;

  const rating = Math.max(0, Math.min(5, cfg.ratingValue));
  let full = Math.floor(rating);
  const remainder = rating - full;
  const hasHalf = remainder >= 0.25 && remainder < 0.75;
  if (remainder >= 0.75) full += 1;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  let html = "";
  for (let i = 0; i < full; i++) {
    html += '<span class="star star-full">' + STAR_USE + "</span>";
  }
  if (hasHalf) {
    html +=
      '<span class="star star-half">' +
      '<span class="star-bg">' +
      STAR_USE +
      "</span>" +
      '<span class="star-fill">' +
      STAR_USE +
      "</span>" +
      "</span>";
  }
  for (let j = 0; j < empty; j++) {
    html += '<span class="star star-empty">' + STAR_USE + "</span>";
  }

  container.innerHTML = html;
  container.setAttribute("aria-label", "Rated " + rating + " out of 5 stars");
}
