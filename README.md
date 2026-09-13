# Appliance Wiz — Appliance Repair Landing Page

A single, dependency-light landing page built as a phone-call funnel for
Google Search Ads traffic:

`Google Search → Landing Page → Phone Call → Lead`

## Design basis

This page's **structure and visual language** (section order, dark hero
with a light contour-line texture, blue pill CTA with a trailing circular
arrow icon, dashed-divider service list, gray callout boxes, two-column
brand list, split bold/regular section headings) were modeled closely on
screenshots of appliance-pros.com's mobile page, at the user's request.

What was **not** copied: their actual HTML/CSS, their stock technician
photo (replaced with an original flat-illustration), their exact color
values (recreated independently to the same visual effect), and their
longer body paragraphs (paraphrased in original wording — same message,
length, and position, different sentences). Short labels, benefit
headings, and the service/brand category names are generic industry
terms and are reused as-is.

The FAQ, final-CTA, and footer sections are original — the reference
screenshots didn't extend that far down the page, so there was nothing to
model there.

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
  `factoryTrainedClaim`) specifically so this is a one-line edit each,
  everywhere the claim appears.

No fabricated review counts, star ratings, or badges were added — the
reference's 4.5-star graphic was deliberately not replicated, since
displaying a rating implies real aggregated review data this business
doesn't have.

## Stack

Plain HTML, CSS, and vanilla JavaScript, plus one Google Font (Poppins,
loaded with `font-display: swap`) to match the reference's bold/rounded
headline typography. No framework, no build step, no npm dependencies.

```
index.html        Page markup and copy
css/styles.css     Design system + all styling
js/config.js       Centralized business config (phone, brand, claims)
js/main.js         Injects config into the DOM, syncs <title>/meta, and
                    pushes a dataLayer event on call-button clicks
robots.txt          Allow-all crawling
```

## Editing business info

Every phone number, brand mention, and claim string is driven from
**`js/config.js`**:

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

## Call tracking / analytics

No tracking IDs are hardcoded or invented.

- Add a GTM container snippet or `gtag.js` in the `<head>` comment block
  in `index.html` marked "Analytics / tag manager placeholder."
- `js/main.js` pushes `{ event: "phone_call_click", call_source: ... }`
  to `window.dataLayer` on every `tel:` link click, if a dataLayer exists.
  Build a GTM trigger on that event — no code changes required.
- Named call buttons have stable, unique `id`s: `header-call-button`,
  `hero-call-button`, `hero-phone-link`, `final-call-button`,
  `footer-call-button`, `mobile-sticky-call-button`. The 18 service-list
  rows and the 2 gray callout links share `data-call-source` values
  (`service-list`, `callout-1`, `callout-2`) instead of unique IDs, since
  they're identical in intent.
- Every `tel:` link shares the selector `a[href^="tel:"]` for any
  call-tracking platform that needs to rewrite phone numbers site-wide
  (e.g. dynamic number insertion).

## What's intentionally not included

- No reviews, star ratings, testimonials, or customer counts.
- No BBB/certification/award badges.
- No `LocalBusiness` structured data — add it once a real business name,
  address, and phone number exist.
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
