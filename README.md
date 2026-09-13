# Appliance Wiz — Appliance Repair Landing Page

A single, dependency-light landing page built as a phone-call funnel for
Google Search Ads traffic:

`Google Search → Landing Page → Phone Call → Lead`

## Design basis

This page's **structure and visual language** were modeled closely on a
full set of mobile screenshots of appliance-pros.com, at the user's
request: dark hero with a light contour-line texture and an image that
bleeds from the hero into the white section below it, blue pill CTA with
a trailing circular-arrow icon, a 2-column checklist, a 5-star rating
graphic, a dashed-divider service list, gray callout boxes, a two-column
brand list, a numbered "how it works" section, a decorative dark divider,
a hero-style repeated final CTA, and a footer built as COMPANY/DISCLAIMER
accordions.

What was **not** copied: their actual HTML/CSS, their stock technician
photo (replaced with an original flat SVG illustration), their exact
color values (recreated independently to the same visual effect), and
their longer body paragraphs (paraphrased in original wording — same
message, length, and position, different sentences). Short labels,
benefit headings, and the service/brand category names are generic
industry terms and are reused as-is.

## The 4.5-star rating

Unlike the first version of this page, a star rating **is** shown — the
user confirmed this business is actually rated 4.5 stars, so it's real
data, not the fabricated social proof the original build brief warned
against. It's centralized as `ratingValue: 4.5` in `js/config.js` and
rendered by `renderStarRating()` in `js/main.js` (full/half/empty stars
computed from that single number — update the number, not the markup).
If you can name the source (e.g. "based on Google reviews"), consider
adding that label next to the stars for credibility.

## ⚠️ Claims to verify before launch

Several lines mirror marketing claims from the reference design:
**"Same & Next-Day Service Available"**, **"24-Hour Support 7 Days a
Week"**, **"Certified Experts"**, **"Factory-Trained Technicians"**.
These are factual claims about business operations and credentials, not
just style — copying the wording doesn't make them true for this
business. Before launch:

- Confirm each one is accurate, or edit/delete it.
- All four are centralized as named strings in `js/config.js`
  (`availabilityClaim`, `supportClaim`, `certifiedClaim`,
  `factoryTrainedClaim`) so this is a one-line edit each, everywhere the
  claim appears.
- The footer's Disclaimer accordion is a **placeholder** — it does not
  assert a specific business model (e.g. "referral service" vs. direct
  repair company) because that wasn't specified. Replace it with real
  legal copy (service terms, licensing, and any conditions on the
  same/next-day and 24-hour claims above) before launch.
- The footer's Company links (About Us, Privacy Policy, How It Works,
  Terms of Service, Contact Us, Do Not Sell My Info) point to `#` —
  they're placeholders for pages that don't exist yet, per "main page
  only for now."

## Stack

Plain HTML, CSS, and vanilla JavaScript, plus one Google Font (Poppins,
loaded with `font-display: swap`) to match the reference's bold/rounded
headline typography. No framework, no build step, no npm dependencies.

```
index.html        Page markup and copy
css/styles.css     Design system + all styling
js/config.js       Centralized business config (phone, brand, claims, rating)
js/main.js         Injects config into the DOM, syncs <title>/meta, renders
                    the star rating, drives the scroll-triggered sticky
                    call bar, and pushes a dataLayer event on call clicks
robots.txt          Allow-all crawling
```

## Editing business info

Every phone number, brand mention, claim string, and the rating value is
driven from **`js/config.js`**:

```js
window.SITE_CONFIG = {
  brandName: "Appliance Wiz",
  phoneDisplay: "(800) 555-5555",
  phoneHref: "tel:+18005555555",
  city: "[CITY]",
  state: "[STATE]",
  serviceArea: "[SERVICE AREA]",
  hours: "[HOURS]",
  availabilityClaim: "Same & Next-Day Service Available",
  supportClaim: "24-Hour Support 7 Days a Week",
  certifiedClaim: "Certified Experts",
  factoryTrainedClaim: "Factory-Trained Technicians",
  ratingValue: 4.5,
};
```

Update these and every mention across the page updates automatically via
`data-cfg`/`data-cfg-href` attributes in `index.html`.

The `<title>` and meta description in `index.html`'s `<head>`, and the
`tel:+18005555555` values hardcoded as the no-JS fallback on every call
link, should also be updated to match if the phone number changes —
`main.js` syncs `<title>`/meta and every `data-cfg-href` at runtime, but
the raw HTML should stay correct for crawlers and ad reviewers that don't
execute JavaScript.

## Mobile sticky call bar

The bottom call bar is hidden until the visitor scrolls past the hero's
"Schedule Service" button (an `IntersectionObserver` in `main.js` toggles
an `is-visible` class), rather than being visible immediately — this was
a deliberate change from the first version, at the user's request. On
browsers without `IntersectionObserver` support (effectively none in
current use), it degrades to simply staying hidden; every other call
button on the page is unaffected.

## Hero image bleed effect

The hero illustration is absolutely positioned and anchored to the
bottom of the dark hero section, then shifted down by 50% of its own
height, so it always straddles the hero/white boundary regardless of
viewport width. The following section reserves matching top padding
(`--hero-overlap` in `css/styles.css`) so its text clears the bottom half
of the image.

## Call tracking / analytics

No tracking IDs are hardcoded or invented.

- Add a GTM container snippet or `gtag.js` in the `<head>` comment block
  in `index.html` marked "Analytics / tag manager placeholder."
- `js/main.js` pushes `{ event: "phone_call_click", call_source: ... }`
  to `window.dataLayer` on every `tel:` link click, if a dataLayer exists.
  Build a GTM trigger on that event — no code changes required.
- Named call buttons have stable, unique `id`s: `header-call-button`,
  `hero-call-button`, `hero-phone-link`, `final-call-button`,
  `footer-call-button`, `mobile-sticky-call-button`. The service-list rows,
  brand-adjacent closing paragraphs, and callout links share
  `data-call-source` values (`service-list`, `callout-1`, `callout-2`,
  `brands-closing`, `how-it-works-closing`, `final-cta-inline`) instead of
  unique IDs, since each group is identical in intent.
- Every `tel:` link shares the selector `a[href^="tel:"]` for any
  call-tracking platform that needs to rewrite phone numbers site-wide
  (e.g. dynamic number insertion).

## What's intentionally not included

- No fabricated reviews, testimonials, or customer counts (the star
  rating is real, confirmed data — see above, not an exception to this).
- No BBB/certification/award badges.
- No `LocalBusiness` structured data — add it once a real business
  address exists, and once the claims above are confirmed accurate.
- No canonical URL — add `<link rel="canonical">` once deployed to a
  real domain.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080/
```

No build step is required; any static file server works. (The Google
Fonts request requires normal internet access — it degrades gracefully
to the system font stack if blocked, as it is in some sandboxed/offline
environments.)
