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

## The star rating

Unlike the first version of this page, a star rating **is** shown —
currently `ratingValue: 5` in `js/config.js`, rendered at a larger size
(`.star-rating`'s `font-size` was bumped to `var(--fs-xl)`) than the
original build. `renderStarRating()` in `js/main.js` computes full/half/
empty stars from that single number — update the number there, not the
markup, and the aria-label fallback in `index.html`'s static HTML
(`aria-label="Rated 5 out of 5 stars"`) to match if it changes again.
**This must reflect real, confirmed rating data** — a 5-star claim is a
stronger statement than the original 4.5, so before launch, verify it
against an actual source (Google reviews, etc.) rather than displaying
it as aspirational. If you can name the source, consider adding that
label next to the stars for credibility.

## ⚠️ Claims to verify before launch

Several lines mirror marketing claims from the reference design:
**"Same & Next-Day Service Available"**, **"24-Hour Support 7 Days a
Week"**, **"Certified Experts"**, **"Factory-Trained Technicians"**, and
now also **"Available 24/7"** (the header badge added to match the
reference's desktop layout). These are factual claims about business
operations and credentials, not just style — copying the wording doesn't
make them true for this business. Before launch:

- Confirm each one is accurate, or edit/delete it.
- All five are centralized as named strings in `js/config.js`
  (`availabilityClaim`, `supportClaim`, `certifiedClaim`,
  `factoryTrainedClaim`, `availabilityBadge`) so this is a one-line edit
  each, everywhere the claim appears.
- The footer's Disclaimer section has real, user-supplied legal copy (a
  referral-service disclaimer). It originally said "Appliance Helpers"
  while the rest of the site said "Appliance Wiz" — that mismatch is now
  resolved; the whole site (including this disclaimer) consistently says
  "Appliance Helpers".
- The Company/Disclaimer sections in the footer are always expanded —
  not togglable `<details>` accordions — at the user's request. They're
  plain `.footer-accordion` blocks in `index.html`; the
  class name is a holdover from when they were collapsible.
- The footer's Company links: **About Us** (`about-us.html`), **How It
  Works** (`how-it-works.html`), and **Do Not Sell My Info**
  (`do-not-sell.html`) are now real pages — see "Secondary pages" below.
  **Privacy Policy**, **Terms of Service**, and **Contact Us** still
  point to `#` — placeholders for pages that don't exist yet.

## Stack

Plain HTML, CSS, and vanilla JavaScript. No framework, no build step, no
npm dependencies, and **no third-party requests at all** — the page loads
entirely from its own origin.

```
index.html         Main landing page. Markup AND the stylesheet (inlined
                    — see Performance) since it's the ad-funnel page.
about-us.html       Secondary page (footer "About Us" link)
how-it-works.html   Secondary page (footer "How It Works" link)
do-not-sell.html    Secondary page (footer "Do Not Sell My Info" link) --
                    CCPA request form, submits to Google Sheets via Apps
                    Script once doNotSellSheetEndpoint is set (see below)
js/config.js        Centralized business config (phone, brand, claims, rating)
js/main.js          Injects config into the DOM, syncs <title>/meta, renders
                    the star rating, drives the scroll-triggered sticky
                    call bar, and pushes a dataLayer event on call clicks
                    -- shared by all four pages
assets/             Hero photo (WebP)
assets/fonts/       Self-hosted Poppins (latin subset) + its OFL license
_headers            Netlify cache lifetimes (see Hosting on GitHub Pages)
.nojekyll           Tells GitHub Pages to serve files as-is (see Hosting)
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
  hours: "[HOURS]",
  availabilityClaim: "Same & Next-Day Service Available",
  supportClaim: "24-Hour Support 7 Days a Week",
  certifiedClaim: "Certified Experts",
  factoryTrainedClaim: "Factory-Trained Technicians",
  availabilityBadge: "Available 24/7",
  ratingValue: 5,
};
```

There's no `city`/`state`/`serviceArea` here anymore — the site
deliberately makes no city- or region-specific claims (see "No local/area
claims" below), so nothing in `index.html` reads those fields.

Update these and every mention across the page updates automatically via
`data-cfg`/`data-cfg-href` attributes — shared identically by `index.html`
and the three secondary pages, since all four load the same
`js/config.js` and `js/main.js`.

The `<title>` and meta description in `index.html`'s `<head>` (and the
equivalent tags in the three secondary pages), and the
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

## Desktop: two-column layout with a sticky sidebar card

At ≥960px, the services/benefits/brands/how-it-works content (previously
four separate full-width sections) shares one `.content-grid`: a left
column (`.content-main`) with everything stacked as before, and a right
column (`.content-sidebar`) holding a single sticky photo+call card that
stays pinned in view for the entire scroll through that content — matching
the reference design's desktop layout. Below 960px, `.content-sidebar` is
`display: none` and `.content-main`'s blocks just stack full-width,
identical to how the page worked before this existed; the mobile sticky
call bar and inline callouts already cover the same job there, so nothing
was lost by not showing a second card.

Two things worth knowing if you touch this:

- **`align-items` on `.content-grid` is deliberately left at its default
  (`stretch`), not `start`.** `start` was the first thing tried, and it
  silently broke the sticky effect: it shrinks the sidebar's grid cell
  down to the card's own short height, so the sticky card has nothing
  left to stay pinned against once the (much taller) main column scrolls
  past it — the card just scrolls away with everything else instead of
  stopping. `stretch` makes the sidebar's grid cell match the main
  column's full height, giving the sticky card room to actually stick.
  This only showed up scrolled all the way down to the last section, not
  at the top of the page, so it's an easy thing to reintroduce without
  noticing.
- The sidebar reuses the hero's own photo (`assets/appliance-technician-blue.webp`,
  `alt=""` since it's decorative repetition of an image already described
  once) rather than a second asset, matching the reference.

## Desktop header: availability badge

At ≥900px, a divider appears after the logo, then a pulsing-dot "Available
24/7" badge (`data-cfg="availabilityBadge"`), then another divider before
the phone number — matching the reference's desktop header. Below 900px
the header is unchanged from before this existed (no badge, no dividers,
dot sits after the phone number instead) — that layout went through two
rounds of overflow debugging already, so it was left alone rather than
folded into the new desktop treatment.

## No local/area claims

At the user's request, the page makes no claim about a specific city,
neighborhood, or defined service area. Two spots on the main page used to
say otherwise and were reworded:

- The "Why Choose" benefit list's last item was "In Your Neighborhood:
  With technicians serving `[SERVICE AREA]`..." (a `[SERVICE AREA]`
  placeholder that was never filled in). It's now "Statewide Coverage:
  With technicians throughout the state, Appliance Helpers is your best
  option for quick service, no matter where you're located."
- The brands section heading "Your **Local** Appliance Service Center"
  is now "Your **Go-To** Appliance Service Center."

The `city`, `state`, and `serviceArea` fields were removed from
`js/config.js` entirely (along with their `[CITY]`/`[STATE]`/
`[SERVICE AREA]` bracket-replacement logic in `syncHeadMetadata()` in
`js/main.js`) since nothing in the markup reads them anymore — keeping
them would've been dead config that looked like it needed filling in.
The footer's Disclaimer text still says "local appliance repair experts"
in one place; that's real, user-supplied legal copy describing how the
referral-service model works generically, not a specific-area marketing
claim, so it was left as-is.

## Secondary pages

Three of the footer's Company links now go to real pages instead of `#`:
`about-us.html`, `how-it-works.html`, and `do-not-sell.html`. Each is a
fully self-contained HTML file (same pattern as `index.html`: no build
step, so the file itself is fully readable/editable) that duplicates
`index.html`'s entire inlined stylesheet plus the icon sprite, header,
footer, and mobile sticky call bar verbatim, so all four pages look and
behave identically. All four load the same `js/config.js` and
`js/main.js`, so the phone number, brand name, and claim strings stay in
sync across every page from one edit.

This does mean the ~1,200-line stylesheet is duplicated four times
rather than shared from one file. That trade-off was deliberate: these
pages aren't Google Ads traffic destinations, so the render-blocking-
stylesheet concern that justified inlining CSS on `index.html` doesn't
apply here, but correctness does — the header/mobile-call-bar responsive
behavior went through two rounds of hard-won overflow debugging (see
Performance), and copying the whole block verbatim guarantees these
pages can't drift out of sync with it. If you add a fourth or fifth
secondary page, consider extracting a shared `css/pages.css` instead of
copying the block a third time.

## Do Not Sell form backend

`do-not-sell.html`'s CCPA request form (Name, Email, State, Street
Address, City, Zip Code, Message) submits to a Google Sheet via Google
Apps Script — no third-party service, no server of our own, and the data
lands directly in a spreadsheet you own. This is a Google-account setup
step that has to happen in your own account (nothing here can create or
authorize it remotely), but it's about five minutes:

1. **Create a blank Google Sheet.** Name it whatever you like. In row 1,
   add headers so the data's readable later: `Timestamp | Name | Email |
   State | Street Address | City | Zip Code | Message`.
2. **Extensions → Apps Script.** Delete the placeholder code and paste
   this in:

   ```javascript
   // Optional: set this to any secret string, and set the same value as
   // doNotSellSheetToken in js/config.js, to reject submissions that
   // don't include it. Leave blank to skip the check entirely.
   var SHARED_TOKEN = "";

   function doPost(e) {
     var params = e.parameter;

     if (SHARED_TOKEN && params.token !== SHARED_TOKEN) {
       return ContentService
         .createTextOutput(JSON.stringify({ result: "error", message: "invalid token" }))
         .setMimeType(ContentService.MimeType.JSON);
     }

     var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
     sheet.appendRow([
       new Date(),
       params.name || "",
       params.email || "",
       params.state || "",
       params.street_address || "",
       params.city || "",
       params.zip_code || "",
       params.message || "",
     ]);

     return ContentService
       .createTextOutput(JSON.stringify({ result: "success" }))
       .setMimeType(ContentService.MimeType.JSON);
   }
   ```

3. **Deploy → New deployment → type "Web app".** Execute as **Me**; who
   has access **Anyone**. (This has to be "Anyone" for the visitor's
   browser to reach it — the URL is what's protected, not the sheet
   itself. The sheet's actual contents are only visible to whoever you
   share the sheet with, same as any other Google Sheet. See the caveat
   below about that public-URL trade-off.)
4. Click **Deploy**, and click through Google's "this app isn't
   verified" warning — expected for a script you just wrote yourself in
   your own account. Google will ask you to authorize it (it needs
   permission to write to your own Sheet).
5. Copy the resulting Web App URL (it ends in `/exec`).
6. Paste that URL into `doNotSellSheetEndpoint` in `js/config.js`. That's
   the only code change needed — the form's submit handler (an inline
   `<script>` at the bottom of `do-not-sell.html`) already checks for it
   and posts there instead of showing the "not yet connected" note.

Two trade-offs worth knowing about this approach:

- **The Web App URL itself isn't secret** — anyone who discovers it can
  POST a row to your sheet, since "Anyone" access is required for a
  visitor's browser (not logged into your Google account) to reach it at
  all. `SHARED_TOKEN` in the script above, paired with
  `doNotSellSheetToken` in `config.js`, is a cheap deterrent (a
  visitor's browser sends it as a hidden field) — not real security,
  since anyone who views the page source can read it too, but enough to
  stop opportunistic spam against a leaked or guessed URL. For anything
  more sensitive than a CCPA contact form, use a real backend instead.
- **The client can't tell success from failure.** Apps Script Web Apps
  don't return CORS headers, so the form submits with `fetch(..., {mode:
  "no-cors"})` — this still delivers the row, but the browser can't read
  a response back, so the same "thanks, we got it" message shows whether
  the row was appended or the URL is broken. Test the deployed URL for
  real (submit the form, check the sheet) after setup, and periodically
  afterward — nothing here would surface a silent failure.

Until `doNotSellSheetEndpoint` is set, the form shows its "not yet
connected" note instead of submitting anywhere — deliberately not faked
with a JS success message, since a visitor filing a legal CCPA request
needs to actually know whether it went through, not be told it did when
it didn't.

## Call tracking / analytics

No tracking IDs are hardcoded or invented.

- Add a GTM container snippet or `gtag.js` in the `<head>` comment block
  in `index.html` marked "Analytics / tag manager placeholder."
- `js/main.js` pushes `{ event: "phone_call_click", call_source: ... }`
  to `window.dataLayer` on every `tel:` link click, if a dataLayer exists.
  Build a GTM trigger on that event — no code changes required.
- Named call buttons have stable, unique `id`s: `header-call-button`,
  `hero-call-button`, `hero-phone-link`, `final-call-button`,
  `mobile-sticky-call-button`, `sidebar-call-button` (desktop-only sticky
  card). There is no footer call button — the
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

## Hosting on GitHub Pages

The site is currently deployed via GitHub Pages rather than Netlify.
Enable it once per repo: **Settings → Pages → Source: "Deploy from a
branch" → Branch: the branch you want live, folder `/` (root) → Save.**
GitHub rebuilds automatically on every push to that branch, usually live
within a minute.

Two things that differ from the Netlify setup described above:

- **`.nojekyll`** (empty file, repo root) tells GitHub Pages to serve
  files as-is instead of running them through Jekyll first. Without it,
  Jekyll's default behavior excludes any file or folder starting with
  `_` from the published output — which would silently drop `_headers`
  below.
- **`_headers` has no effect here.** It's Netlify-specific syntax for
  setting `Cache-Control`; GitHub Pages doesn't support a custom-headers
  file, so it just falls back to GitHub's own defaults instead (short,
  reasonable cache lifetimes — not the fine-grained per-path tuning in
  the Performance section above). If cache staleness ever causes
  confusion again (e.g. a code change not showing up after a normal
  refresh), hard-refresh or use a private window first — that rules out
  the browser's own cache before assuming anything server-side is wrong.

All paths in `index.html` are relative, so the site works correctly
whether it's served from a domain root (Netlify) or a repo subpath like
`https://<username>.github.io/<repo>/` (GitHub Pages) — no path changes
needed either way.
