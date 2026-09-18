# Appliance Helpers — Appliance Repair Landing Page

A referral-service landing page built as a phone-call funnel for Google
Search Ads traffic: `Google Search → Landing Page → Phone Call → Lead`.

This codebase merges two branches of the same project: an earlier
single-file build (performance-tuned, later split into three secondary
pages) and a modular rebuild — real brand logos, a componentized CSS/JS
architecture, a Python build pipeline, and city-accurate geo-personalization
backed by real competitor research (`competitor_kb/`) — contributed by a
second collaborator on the project. Both halves describe the same business
and the same disclaimer; this README documents the combined result.

## Layout

```
css/                  stylesheets, one concern per file
  main.src.css        import manifest — edit this to change load order
  main.css            GENERATED bundle of main.src.css's imports (what
                       index.html actually links — see "Performance" below)
  tokens.css          color, type, space, radius
  components/         buttons, chips, service tiles, stars, call bar, …
  sections/           header, hero, content column, footer
js/
  config.js           brand, phone, claims, geo/DNI settings (ES module)
  modules/            bind-config, geo, service-area map, DNI, stars,
                       call bar, tracking
  main.js             boots the modules
src/
  data/content.json   services, brands, benefits, steps, footer links
  partials/           HTML fragments for each region of the page
  layout.html         page shell
scripts/build.py      assembles index.html from layout + partials + data,
                       and publishes dist/ for deployment
assets/               self-hosted Poppins, brand logos, hero photo
competitor_kb/        reverse-engineered notes on two competitors' geo/DNI
                       systems (see "Geo-personalization and DNI" below) —
                       dev-only, excluded from dist/
research/             raw capture data behind competitor_kb/ — dev-only,
                       excluded from dist/
about-us.html          Secondary page (footer "About Us" link)
how-it-works.html      Secondary page (footer "How It Works" link)
do-not-sell.html       Secondary page (footer "Do Not Sell My Info" link)
                        — CCPA request form, see "Do Not Sell form backend"
```

`index.html` and `css/main.css` are generated — edit `src/`, `js/`, and any
`css/` file except `main.css` itself, then rerun the build. The three
secondary pages above are **not** part of this templating system (each is
small enough not to warrant it); they're plain static HTML that load the
same `css/main.css` and `js/main.js` as the generated page, so a config or
CSS change still applies everywhere from one edit.

## Preview

```bash
python3 scripts/build.py
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173). No npm dependencies;
the build script is plain Python 3, the site itself is plain HTML/CSS/JS.

## Performance

Traffic here is primarily mobile (Google Search Ads), so the hero — the
first thing a visitor sees — is tuned for that:

- **`css/main.css` is a generated bundle, not hand-written.** The 24-file
  `@import` chain that used to live there made the browser fetch and parse
  `main.css` before it even knew the other files existed, adding a full
  render-blocking round trip before first paint. `main.src.css` still lists
  the load order; `scripts/build.py` concatenates it into one `main.css`
  file at build time.
- **The hero background ships two sizes.** `assets/images/hero-repair.webp`
  (1672px wide) is for desktop; `assets/images/hero-repair-mobile.webp`
  (1000px wide, ~30KB vs ~77KB) is what phones actually get, via a
  `max-width: 959px` rule in `hero.css` and matching `media` attributes on
  the `<link rel="preload">` tags in `layout.html`. Those two places must
  stay in sync. Regenerate the mobile file if the source ever changes
  (requires `pip3 install Pillow`):
  `python3 -c "from PIL import Image; im = Image.open('assets/images/hero-repair.webp').convert('RGB'); im.resize((1000, round(im.height*1000/im.width)), Image.LANCZOS).save('assets/images/hero-repair-mobile.webp', 'WEBP', quality=72, method=6)"`
- **The sidebar portrait is served at its display size.** The card is 320px
  wide, so `assets/images/appliance-repair-card.webp` (800px, ~20KB) is the
  `srcset` default with the 1672px original as the high-DPI candidate —
  rather than shipping a 1672px file into a 320px slot.
- **`js/main.js`'s module graph is preloaded.** `<link rel="modulepreload">`
  tags in `layout.html` let the browser fetch `config.js` and everything
  under `js/modules/` in parallel with `main.js` itself, instead of
  discovering them one parse-step later.

## ⚠️ Claims to verify before launch

Several lines are marketing claims, not just copy — confirm each one is
actually true for this business before launch, or edit/delete it. All are
centralized in `js/config.js` so each is a one-line edit everywhere it
appears: `availabilityClaim` ("Same & Next-Day Service Available"),
`supportClaim` ("24-Hour Support 7 Days a Week"), `certifiedClaim`
("Certified Experts"), `factoryTrainedClaim` ("Factory-Trained
Technicians"), `availabilityBadge` ("Available 24/7").

**The star rating** (`ratingValue: 5` in `js/config.js`, rendered by
`renderStarRating()`) must reflect real, confirmed rating data — a 5-star
claim is a strong statement, not an aspirational default. Verify it
against an actual source (Google reviews, etc.) before launch. If you can
name the source, consider adding that label next to the stars for
credibility.

The footer's **Disclaimer** section has real, user-supplied legal copy (a
referral-service disclaimer) — this is a lead-generation/referral business,
not a direct repair company, which is why the geo/DNI features below only
ever connect a visitor to *a* local technician, never claim the business
itself is local.

The footer's **Privacy Policy**, **Terms of Service**, and **Contact Us**
links still point to `#` — placeholders for pages that don't exist yet.
**About Us**, **How It Works**, and **Do Not Sell My Info** are real pages
(see "Secondary pages" below).

## Configure the business

Edit `js/config.js` — brand, phone, claims, and:

- `mapEnabled` / `serviceRadiusMiles` — once geo resolves coordinates, a
  static street map with a coverage ring renders under "Do you service my
  area?" (Esri tiles, no API key, no Leaflet). `geoLat`/`geoLon` let it
  render for a configured (non-placeholder) `city` too, without an IP call.
- `dniEnabled` / `numberPool` / `areaCodeByCity` / `dniEndpoint` — local
  phone number swap (dynamic number insertion), matched to the visitor's
  detected area code. See the long comment above these fields in
  `config.js` for setup; with no pool or endpoint configured, every
  visitor just keeps `phoneDisplay`.

## Geo-personalization and DNI

`js/config.js` sets `geoCityEnabled: true` — on the generic/national
build of the page (`city` still `[CITY]`), the visitor's city is looked
up via IP (`geojs.io`) and prefixed onto headlines
("`Wellington Appliance Repair`"), with `[data-geo-city-state]` /
`[data-geo-area]` slots and the service-area map filled in alongside it.
A configured (non-placeholder) `city` skips the lookup and shows
immediately. No permission prompt of any kind — this is IP-based, not the
browser's Geolocation API.

**Why geojs, specifically, and why re-enabled at all.** An earlier version
of this project tried IP-based city detection, hit real accuracy problems
reported by real users (a Cape Coral visitor shown "Fort Myers," a
Wellington visitor shown "Royal Palm Beach"), and was removed entirely as
a result. `competitor_kb/systems/geo-personalization.md` documents actual
observed sessions against two competitor sites for the exact same
Wellington, FL visitor: one uses a MaxMind-class geo database and named
the correct city; the other (and, separately, the earlier ipapi.co-based
version of this project) used a coarser database and got the adjacent
town instead. `geojs.io` was chosen because it independently returned the
correct city for that same test case — the failure was the specific
provider, not "IP geolocation" as a category. See that file for the full
comparison, including why neither competitor uses the browser's
Geolocation API or per-city URLs, and why a NPA/ZIP-level signal is more
reliable than the city name alone.

**This is still a best-effort city name, not a verified address.** Keep a
fallback (this page already does — the generic "Appliance Repair"
headline stays if the lookup fails, times out, or is blocked), and don't
trust the city name for anything higher-stakes than a headline. If
ZIP-level accuracy matters (e.g. for the DNI phone routing), consider the
KB's note on a confirm-ZIP step.

**Dynamic number insertion** (`js/modules/local-number.js`) listens for
the resolved geo location and swaps `phoneDisplay`/`phoneHref` for a
local-area-code number, if one is configured in `numberPool` (by NPA or
state) or returned by a `dniEndpoint` you point at a real provider
(Twilio, CallRail, etc.). `competitor_kb/systems/callforge.md` and
`rb-brands-dni.md` document how two competitors run this in production,
if you're setting up a real DID pool.

## Secondary pages

Three of the footer's Company links go to real pages: `about-us.html`,
`how-it-works.html`, and `do-not-sell.html`. Each is a self-contained
static HTML file — not part of the `src/partials` build — that loads the
same `css/main.css` and `js/main.js` as the generated `index.html`, so the
header, footer, mobile call bar, phone number, and brand name all stay in
sync from a single edit. `scripts/build.py`'s `publish_dist()` copies
these three files into `dist/` alongside the generated page.

If you add a fourth or fifth secondary page, consider folding it into the
`src/partials` system instead of hand-copying header/footer markup again.

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
   share the sheet with, same as any other Google Sheet.)
4. Click **Deploy**, and click through Google's "this app isn't verified"
   warning — expected for a script you just wrote yourself in your own
   account. Google will ask you to authorize it (it needs permission to
   write to your own Sheet).
5. Copy the resulting Web App URL (it ends in `/exec`).
6. Paste that URL into `doNotSellSheetEndpoint` in `js/config.js`. The
   form's submit handler (an inline `<script>` at the bottom of
   `do-not-sell.html`) already checks for it and posts there instead of
   showing the "not yet connected" note.

Two trade-offs worth knowing:

- **The Web App URL itself isn't secret** — anyone who discovers it can
  POST a row to your sheet, since "Anyone" access is required for a
  visitor's browser to reach it at all. `SHARED_TOKEN` paired with
  `doNotSellSheetToken` is a cheap deterrent, not real security. For
  anything more sensitive than a CCPA contact form, use a real backend.
- **The client can't tell success from failure.** Apps Script Web Apps
  don't return CORS headers, so the form submits with `fetch(..., {mode:
  "no-cors"})` — the row still gets appended, but the browser can't read
  a response back, so the same "thanks, we got it" message shows whether
  it worked or the URL is broken. Test the deployed URL for real
  (submit the form, check the sheet) after setup and periodically after.

Until `doNotSellSheetEndpoint` is set, the form shows a "not yet
connected" note instead of submitting anywhere — deliberately not faked
with a success message, since a visitor filing a legal CCPA request needs
to actually know whether it went through.

## A CSS gotcha worth knowing (min-width: auto)

The CCPA form on `do-not-sell.html` overflowed the viewport at 320–360px
until this was fixed: `.ccpa-form` is a CSS grid, and `<input>`/`<textarea>`
elements inside a flex or grid container default to `min-width: auto`,
which stops them shrinking below their own intrinsic content width — so
instead of shrinking to fit a narrow phone, the inputs held their width
and pushed the page into horizontal scroll. Fixed with `min-width: 0` on
the grid container and its items, plus explicit `width: 100%` on the
inputs. Worth remembering anywhere else a form or flex/grid layout gets
added — this is a common, easy-to-miss trap, and the regression suite only
catches it if it actually tests every page at narrow widths (an earlier
version of this suite only ever tested `index.html`).

## Deploy (Cloudflare Pages)

`scripts/build.py` writes `index.html` for local preview and a clean
`dist/` for production (research/competitor-intel docs excluded).

Git-connected production, in your own Cloudflare account:

1. **Workers & Pages → Create → Pages → Connect to Git**, and select this
   repository/branch.
2. Build command: `python3 scripts/build.py`
3. Output directory: `dist`
4. Custom domain: whatever you're deploying to.

Direct CLI (after `npx wrangler login`):

```bash
python3 scripts/build.py
npx wrangler pages deploy dist --project-name=appliance-helpers
```

`dist/_headers` is generated by the build script (`CLOUDFLARE_HEADERS` in
`scripts/build.py`) — security headers, long-lived caching on `assets/*`,
and short caching on `robots.txt`/`sitemap.xml`/`llms.txt`. Cloudflare
Pages reads this file natively; no separate hosting-specific setup needed
beyond connecting the repo.

This project previously deployed to Netlify, then GitHub Pages, before
this move to Cloudflare Pages — if you find leftover references to either
in old commits, they're historical, not current.

## Call tracking / analytics

No tracking IDs are hardcoded or invented.

- `js/modules/call-tracking.js` pushes `{ event: "phone_call_click",
  call_source: ... }` to `window.dataLayer` on every `tel:` link click, if
  a dataLayer exists. Build a GTM trigger on that event — no code changes
  required.
- Every `tel:` link shares the selector `a[href^="tel:"]` for any
  call-tracking platform that needs to rewrite phone numbers site-wide.
- The mobile sticky call bar appears after the hero CTA scrolls out of
  view (`js/modules/mobile-call-bar.js`).

## What's intentionally not included

- No fabricated reviews, testimonials, or customer counts (the star
  rating is real, confirmed data — see "Claims to verify," not an
  exception to this).
- No BBB/certification/award badges.
- No `LocalBusiness` structured data — add it once a real business
  address exists, and once the claims above are confirmed accurate.
