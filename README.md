# Appliance Helpers — Appliance Repair Landing Page

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

What was **not** copied: their actual HTML/CSS, their exact color values
(recreated independently to the same visual effect), and their longer
body paragraphs (paraphrased in original wording — same message, length,
and position, different sentences). Short labels, benefit headings, and
the service/brand category names are generic industry terms and are
reused as-is.

The hero photo (`assets/appliance-technician-blue.webp`) is a separate
image the user supplied directly and owns the rights to use — not a copy
of the reference site's photo. It replaced an earlier original SVG
illustration once the user provided it.

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
- The footer's Disclaimer section has real, user-supplied legal copy (a
  referral-service disclaimer). It originally said "Appliance Helpers"
  while the rest of the site said "Appliance Wiz" — that mismatch is now
  resolved; the whole site (including this disclaimer) consistently says
  "Appliance Helpers".
- The Company/Disclaimer sections in the footer are always expanded —
  not togglable `<details>` accordions — at the user's request. They're
  plain `.footer-accordion` blocks in `index.html`; the
  class name is a holdover from when they were collapsible.
- The footer's Company links (About Us, Privacy Policy, How It Works,
  Terms of Service, Contact Us, Do Not Sell My Info) point to `#` —
  they're placeholders for pages that don't exist yet, per "main page
  only for now."

## Stack

Plain HTML, CSS, and vanilla JavaScript. No framework, no build step, no
npm dependencies, and **no third-party requests at all** — the page loads
entirely from its own origin.

```
index.html        Page markup AND the stylesheet (inlined — see Performance)
js/config.js       Centralized business config (phone, brand, claims, rating)
js/main.js         Injects config into the DOM, syncs <title>/meta, renders
                    the star rating, drives the scroll-triggered sticky
                    call bar, and pushes a dataLayer event on call clicks
assets/            Hero photo (WebP)
assets/fonts/      Self-hosted Poppins (latin subset) + its OFL license
_headers            Netlify cache lifetimes
robots.txt          Allow-all crawling
```

> **Where's the CSS?** There is no `css/styles.css` anymore. The
> stylesheet is inlined in a single `<style>` block in `index.html` to
> remove a render-blocking round trip. There's no build step, so that
> block *is* the stylesheet — edit it directly.

## Performance

PageSpeed (mobile, Slow 4G) originally reported FCP 2.4s / LCP 2.6s. The
work done to fix that:

| Change | Why |
| --- | --- |
| Inlined the stylesheet | It was render-blocking; PageSpeed measured 210ms |
| Self-hosted Poppins | The Google Fonts CSS was render-blocking for **750ms**, and pulled in two third-party origins |
| Cut 5 font weights to 3 | Each weight is a separate file; 500 and 600 were used once each, remapped to 400/700 |
| Hero photo 1670px → 800px wide | It displays at 360 CSS px. 98 KiB → 25 KiB, and it's the LCP element |
| Preloaded the hero photo | Starts the LCP request in the first bytes of the document |
| `defer` on both scripts | Fetch during parse instead of blocking it |
| `min-height` on the star rating | It was empty until JS filled it, shifting the hero down |

Measured locally under Lighthouse's Slow 4G profile (1.6 Mbps, 150ms RTT,
4x CPU throttle), median of 3 runs:

```
before   FCP 1.21s   LCP 1.24s   9 requests
after    FCP 0.44s   LCP 0.68s   7 requests, 0 third-party
```

Those absolute numbers are lower than PageSpeed's because a local server
has effectively no TTFB — trust the *relative* improvement (~64% FCP,
~45% LCP) and re-run PageSpeed after deploying to confirm.

Two things deliberately *not* done:
- **`font-display: optional`** would guarantee zero font-related layout
  shift, but only bought ~40ms of LCP while costing first-visit mobile
  visitors the brand typeface entirely. Kept `swap`.
- **Font preloading** made things *worse* (FCP 0.44s → 0.56s): because
  the CSS is inlined, `@font-face` is discovered immediately anyway, so
  the preloads only competed with the LCP image for bandwidth.

### Side effect: a header overflow bug surfaced

Self-hosting made Poppins load locally for the first time (the Google
Fonts request had been silently failing in the dev sandbox, so every
previous screenshot was actually the system fallback). Poppins renders
about 20% wider — "(800) 555-5555" measures 165px in Poppins vs 137px in
Arial — which pushed the header row (brand + phone, both `nowrap`) past
the viewport and gave the page a horizontal scrollbar on phones.

This was almost certainly already happening in production, since the live
site did load Poppins. Fixed with two `max-width` tiers at the bottom of
the stylesheet that scale the header and sticky bar down on narrow
phones; verified clean at 320px, 360px and 390px.

## Editing business info

Every phone number, brand mention, claim string, and the rating value is
driven from **`js/config.js`**:

```js
window.SITE_CONFIG = {
  brandName: "Appliance Helpers",
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
(`--hero-overlap` in the inlined stylesheet) so its text clears the bottom
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
  `mobile-sticky-call-button`. There is no footer call button — the
  footer no longer has a phone link at the user's request; the sticky
  mobile bar and the final CTA above the footer remain reachable. The
  service-list rows, brand-adjacent closing paragraphs, and callout links
  share
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

No build step is required; any static file server works. Everything the
page needs — fonts included — is served from this directory, so it also
works fully offline.
