# General Appliance Repair Landing Page

A single, dependency-free landing page built as a phone-call funnel for
Google Search Ads traffic:

`Google Search → Landing Page → Phone Call → Lead`

## Stack

Plain HTML, CSS, and vanilla JavaScript. No framework, no build step, no
npm dependencies. This was a deliberate choice: the repository was empty
when this page was built, so there was no existing architecture to extend,
and a call-funnel landing page's top priorities (load speed, reliability,
zero dependency risk) are best served by static files that any static
host (Netlify, Vercel, S3/CloudFront, GitHub Pages, etc.) can serve as-is.

```
index.html        Page markup and copy
css/styles.css     Design system + all styling
js/config.js       Centralized business config (phone, brand, location)
js/main.js         Injects config into the DOM, syncs <title>/meta, and
                    pushes a dataLayer event on call-button clicks
robots.txt          Allow-all crawling
```

## Editing business info (do this before launch)

Everything visitor-facing that's business-specific is a bracketed
placeholder, and every one of them is driven from **`js/config.js`**:

```js
window.SITE_CONFIG = {
  brandName: "[BRAND NAME]",
  phoneDisplay: "[PHONE NUMBER]",   // e.g. "(555) 123-4567"
  phoneHref: "tel:[PHONE NUMBER]",  // e.g. "tel:+15551234567"
  city: "[CITY]",
  state: "[STATE]",
  serviceArea: "[SERVICE AREA]",    // e.g. "the Greater Springfield Area"
  hours: "[HOURS]",                 // e.g. "Mon–Sat, 8AM–7PM"
};
```

Update these six values and every phone number, brand mention, and
location reference across the page updates automatically (header, hero,
appliance cards, footer, mobile sticky bar, FAQ answers, etc. — anything
tagged `data-cfg`/`data-cfg-href` in `index.html`).

The `<title>` and meta description in `index.html`'s `<head>` also contain
the same bracketed placeholders as static text (for crawlers/ad reviewers
that don't execute JavaScript) and are additionally synced at runtime from
`config.js` by `main.js`. **When you set real values, update both** —
`config.js` for the live page, and the literal text in `index.html`'s
`<head>` so the correct title/description are present on first byte.

## Localization (future city pages)

The page is structured so a new city/brand variant is just: copy
`index.html` + `config.js` into a new folder, update the six config
values, update the `<title>`/meta placeholders to match, done. No other
code changes are needed. This intentionally does **not** build out
multiple city pages now — only the infrastructure to do so later.

## Call tracking / analytics

No tracking IDs are hardcoded or invented. To wire up tracking:

- Add your GTM container snippet or `gtag.js` in the `<head>` comment
  block in `index.html` marked "Analytics / tag manager placeholder."
- `js/main.js` already pushes `{ event: "phone_call_click", call_source: ... }`
  to `window.dataLayer` on every `tel:` link click, if a dataLayer exists.
  Build a GTM trigger on that event — no code changes required.
- Every call button has a stable, unique `id` for direct GA4/Ads event
  binding: `header-call-button`, `hero-call-button`,
  `appliance-call-button-{refrigerator|freezer|washer|dryer|dishwasher|oven|stove|range}`,
  `final-call-button`, `footer-call-button`, `mobile-sticky-call-button`.
- All `tel:` links additionally share the selector `a[href^="tel:"]` if a
  call-tracking platform (e.g. dynamic number insertion) needs to rewrite
  every phone link at once.

## What's intentionally NOT included

Per the build brief, nothing here fabricates trust signals:

- No reviews, star ratings, testimonials, or customer counts.
- No BBB/certification/award badges.
- No claims of 24/7 availability, same-day service, or licensing —
  add these only once they're true and you're ready to state them.
- No `LocalBusiness` structured data — add it once a real business name,
  address, and phone number exist; fake structured data violates
  Google's guidelines and this page has no real data yet.
- No canonical URL — add `<link rel="canonical">` in `index.html`'s
  `<head>` once the page has a real deployed domain.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080/
```

No build step is required; any static file server works.
