# Applianceprotoday.com

- **URL:** http://applianceprotoday.com → https://www.applianceprotoday.com/
- **Legal entity:** Assist Technology, LLC, 218 Main St. Suite 810, Kirkland, WA 98033
- **Governing law:** Washington (terms)
- **Self-description:** “a free service that connects users with appliance repair technicians in their area. All contractors are independent…”
- **Investigated:** 2026-09-13

Same business model as ART (nationwide referral, call-only conversion) but a **modern first-party stack**: SvelteKit + Cloudflare geo + **CallForge**, which is Assist Technology’s own call-tracking product (`@callforge/tracking-client` on npm, publisher `assisttechnology`).

## 1. Stack

| Layer | What we saw |
| --- | --- |
| App | **SvelteKit** (`data-sveltekit-preload-data="hover"`, `/_app/immutable/…`) |
| Deploy branch | `window.__DEPLOYMENT_BRANCH__ = "main"` (zip-popup is a different branch) |
| Host / CDN | Cloudflare (`cf-cache-status: DYNAMIC`, `server: cloudflare`) |
| Call tracking | **CallForge** `https://tracking.callforge.io` (preconnect in `<head>`) |
| Geo | CallForge **geo edge worker** injects `window.__cfGeo` with `source: "cloudflare_geo"` |
| Tagging | GTM `GTM-T6DL7RWM`; GA4 `G-DDLMGFDK8X` via **first-party** path `/v436/` (Google Tag Gateway); Google Ads `AW-849859258` |
| RUM | Cloudflare Web Analytics / Insights beacon |

No WordPress, no Statsig, no Meta/Bing/Clarity on this homepage session.

## 2. Static vs dynamic on the page

### Static

- Dark navy shell, hero photo, logo
- Trust row: All Brands / Same & Next Day / Up-front Quotes / 24-Hrs
- 3-step process: Call Us → Tech Arrives → Appliance Fixed
- Brand SVG row (Amana … Wolf)
- Services grid (washer, dryer, fridge, … trash compactor)
- Why-choose cards
- Footer legal (disclaimer is **not** city-personalized)
- Fallback phone **`(888) 892-6676`** / `tel:+18888926676` (constant `ie` in the CallForge wrapper)

Crawler/fetch of the HTML shows generic copy (“in your area”, “Appliance Repair Experts”) because city tokens have fallbacks and the interpolator is JS.

### Dynamic (this visitor)

| Slot | Template token | Rendered |
| --- | --- | --- |
| Header | `Serving %lc and Surrounding Areas` | Serving **Royal Palm Beach** and Surrounding Areas |
| H1 | `%lc Appliance Repair` (fallback: Appliance Repair Experts) | **Royal Palm Beach Appliance Repair** |
| H2 | `%lc's Trusted Appliance Repair Services` | **Royal Palm Beach's** Trusted… |
| Body | `%lc and surrounding areas` (fallback: “ your area”) | **Royal Palm Beach** and surrounding areas |
| Lower CTA H2 | `%lc Appliance Repair` | Royal Palm Beach Appliance Repair |
| Phone | CallForge lease | **`(561) 285-0602`** / `tel:+15612850602` |
| `__cfGeo` | — | `{city:"Royal Palm Beach", state:"Florida", stateCode:"FL", zip:"33421", zipExact:false, source:"cloudflare_geo"}` |

On homepage, header uses **flexible** location (`%lc` = city only, no state). Other routes use `%c` (city) vs `%lc` depending on `useFlexibleLocation`.

## 3. How city / ZIP are imputed

Two cooperating pieces, both CallForge-branded:

### A. Geo edge worker → `window.__cfGeo`

Injected in `<head>` **before** the app boots:

```html
<script>window.__cfGeo={"city":"Royal Palm Beach","state":"Florida","stateCode":"FL","zip":"33421","zipExact":false,"source":"cloudflare_geo"}</script>
```

`source: "cloudflare_geo"` means the worker reads Cloudflare’s request geo (`CF-IPCity`, region, postal). `zipExact: false` = postal is approximate (typical for CF).

npm docs for `@callforge/tracking-client` v0.16+: display location was **removed** from the tracking client and moved to this worker on purpose.

Svelte store (`DbccMrrx.js`) maps that object to `{city, state: stateCode, stateFullName}` and clears the legacy `cf_location_v1_*` localStorage key.

### B. Token interpolator (`[data-cf-text]`)

Inline IIFE + a Svelte `DynamicText` component. Tokens:

| Token | Meaning |
| --- | --- |
| `%c` | Geo city |
| `%s` | Geo state code |
| `%l` | `City, ST` (or URL `?location=`) |
| `%lc` | City only (URL `?city=` wins) |
| `%ls` | State (URL `?state=` wins) |
| `%khl` etc. | From `data-cf-params` JSON (e.g. `{"khl":"Appliance Repair"}`) |

URL overrides (client-side, unlike ART): `?location=`, `?city=`, `?state=`, plus any other `%name` from the query string.

If a token cannot be resolved, the node falls back to `data-cf-fallback` (crawlers/no-geo see “your area”).

FOUC guard: `[data-cf-hidden]{opacity:0; animation: 3s fade-in}`. After interpolation, the attribute is removed.

**Google Ads location:** `loc_physical_ms` is **not** used for copy. It is used for the **phone lease** (see below). Copy is CF IP geo unless the URL has city/state params.

## 4. How the phone number is imputed (CallForge)

Full protocol: [systems/callforge.md](systems/callforge.md).

On this site:

```js
const FALLBACK = { tel: "+18888926676", display: "(888) 892-6676" };
const categoryId = "cat-1769880521403";
CallForge.init({ categoryId, ga4MeasurementId: "G-DDLMGFDK8X" });
```

Flow this session:

1. **Preload** in `<head>` (from `getPreloadSnippet`):
   - `GET /v1/tracking/bootstrap?categoryId=cat-1769880521403` → `{bootstrapToken, expiresAt}` (bot suppression / lease hardening). Cached in `localStorage` key `cf_bootstrap_v1_www.applianceprotoday.com_cat-1769880521403`.
   - `GET /v1/tracking/session?categoryId=…&bootstrapToken=…` (+ `gclid`/`fbclid`/… if present, + `loc_physical_ms` if present, + `ga4ClientId` from `_ga`).
2. Session response:

```json
{
  "sessionToken": "eyJ…",
  "leaseId": "f918f429-1d16-4199-a886-c0e8e3e7d144",
  "phoneNumber": "+15612850602",
  "categoryId": "cat-1769880521403",
  "expiresAt": 1789281723018
}
```

Decoded session JWT payload:

```json
{
  "sessionId": "242011ba-69a9-44b8-8e0b-e8dc10e3ac2",
  "categoryId": "cat-1769880521403",
  "leaseId": "f918f429-1d16-4199-a886-c0e8e3e7d144",
  "tokenVersion": "v1",
  "exp": 1789281723,
  "phoneNumber": "+15612850602",
  "areaCode": "561",
  "attributionMode": "leased"
}
```

3. Svelte store `oe` holds `phoneNumber`. Header, footer, mobile sticky bar, and CTAs all do `h ? format(h) : FALLBACK.display`. After the lease arrives, every `tel:` on the page is `+15612850602`.
4. **Presence:** `POST /v1/tracking/presence-link` with `{sessionToken, phoneNumber, signal: "load", ga4ClientId}` (also on scroll/focus/visibility/SPA nav). Keeps the lease associated with an “active visitor” so an inbound call in the next ~30–120s can be matched even without a click.
5. **Click:** `linkPhoneCall({phoneNumber})` runs on CTA click **before** `tel:` navigation (best-effort, does not block dialing). Optional `realtime.webZip` when the zip popup is on.

`attributionMode: "leased"` = visitor-level number from a pool, not a static per-source number. Pool is NPA-aware (561 for this IP). Session TTL ~30 minutes; bootstrap TTL shorter.

If bootstrap is missing/invalid (bots), docs say `phoneNumber` may still return but `leaseId` is `null` — i.e. they still show a number but do not spend a pool lease.

## 5. Experiments

Homepage layout code:

```js
const y = (window.__DEPLOYMENT_BRANCH__ || "main") === "zip-popup" ? 1 : 0;
dataLayer.push({ event: "experiment_viewed", experiment_id: "zip-confirmation-popup", variation_id: String(y) });
```

This session: branch `main` → variation **0** (control). GA4 event `experiment_viewed` with `ep.experiment_id=zip-confirmation-popup`, `ep.variation_id=0`.

The treatment (deploy branch `zip-popup`) is a ZIP confirmation modal. CallForge’s `linkPhoneCall` already accepts `webZip` / `webZipSource: 'manual' | 'suggested'` and `params.zipChoiceMethod: 'picker'` — the popup is wired to feed that.

`qa_mode=1` adds a `qa-mode` class (internal QA).

## 6. Analytics

| Vendor | How |
| --- | --- |
| GA4 `G-DDLMGFDK8X` | First-party collector `https://www.applianceprotoday.com/v436/ag/g/c` (Google Tag Gateway on Cloudflare). `ur=US-FL` on the hit. |
| GTM `GTM-T6DL7RWM` | Loads gtag + Ads |
| Google Ads `AW-849859258` | Remarketing / conversion linker (`_gcl_au`) |
| CallForge | Receives `ga4ClientId` so a later inbound call can be stitched to the GA4 user |

No Facebook, Bing, or Clarity on this load.

## 7. Call handling

Not fully observable from the website. Inferences:

- Assist Technology operates both the landing site **and** the tracker (CallForge). They are not renting CallRail/Invoca.
- Leased local DID → their inbound platform → transfer to an independent tech.
- Privacy policy is a generic generator template (mentions shopping carts, AdSense, DART) and is a poorer description of actual behavior than ART’s. They do state they **sell/transfer** name, address, city, email, phone to third parties.
- Terms dated 2026-02-27; privacy “last edited 09-23-2022” with a header date 8/28/2026.

## 8. Implications

- **APT named the ISP-registered city (Royal Palm Beach), not the visitor’s city (Wellington).** ART got Wellington right. Same 561 NPA, wrong town name on APT. Cloudflare geo is not automatically the better source.
- **Crawler HTML is generic**, so organic SEO city terms are weaker unless they also generate city URLs (they don’t). This site is built for **paid traffic** (gclid, loc_physical_ms, first-party GA4, Ads conversion).
- CallForge is a real productized tracker (leases, bootstrap bot gate, presence, click-link, GA4 stitch, Google Ads location id). Replicating ART’s simpler DNI is easier; replicating CallForge is a full call-tracking build.
- Dormant **zip-confirmation-popup** is the obvious next conversion experiment — they already have the API for it.
