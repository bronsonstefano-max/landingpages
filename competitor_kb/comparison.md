# Side-by-side: static vs dynamically imputed

Both sites sell the same conversion: **tap a phone number**. Almost everything else exists to make that number feel local, urgent, and attributable.

## 1. What is static (same for every visitor)

Shared pattern: brand, layout, service list, brand logos, legal, and a **toll-free fallback number** baked into HTML.

| Element | ART | APT |
| --- | --- | --- |
| Brand / logo / theme | ApplianceRepairToday™ custom WP theme, Tailwind-ish, Elementor | Appliance Pro Today SvelteKit UI, dark hero, brand logos as SVG |
| Hero structure, process steps, service grid, brand grid | Static template | Static Svelte components |
| Appliance types serviced | Cooktop, dishwasher, dryer, freezer, disposal, ice maker, microwave, oven, fridge, stove, washer, wine cooler, trash compactor | Same set, plus exhaust fan/hood |
| Brand names listed | Admiral → Wolf (static UL) | Amana → Wolf (static SVG row) |
| Legal / disclosure | RB Brands LLC referral disclaimer + TCPA consent | Assist Technology LLC referral disclaimer |
| Fallback phone (HTML / crawlers / no-JS) | `(877) 665-4537` | `(888) 892-6676` |
| Contact form (if present) | WPForms on `/contact-us/` | No homepage form; conversion is call-only |
| Sitemap / IA | One homepage + service pages (`/refrigerator-repair/`, etc.) + legal. **No city URLs.** | `/`, `/services`, `/how-it-works`, `/faq`, `/about-us`, `/contact-us`. **No city URLs.** |
| Hosting | WP Engine origin (`x-powered-by: WP Engine`, IPs `141.193.213.10/11`) + Cloudflare | Cloudflare (`cf-cache-status: DYNAMIC`) |
| Analytics always-on | GTM `GTM-P9FNTVCM`, GA4 `G-9GCP2MGTB6`, Meta Pixel `1237537227625700`, Bing UET `187034252`, Clarity | GTM `GTM-T6DL7RWM`, GA4 `G-DDLMGFDK8X` (first-party via `/v436/`), Google Ads `AW-849859258` |

## 2. What is dynamically imputed per visitor

| Element | ART — how | APT — how |
| --- | --- | --- |
| **City name in copy** | PHP/WordPress interpolates city/state into the HTML at request time. This visitor: “Wellington, FL”, “Wellington Appliance Repair”, “technicians in Wellington”. | Cloudflare edge writes `window.__cfGeo`. A tiny interpolator fills `[data-cf-text]` tokens (`%lc`, `%c`, `%l`). This visitor: “Royal Palm Beach”. Fallback if geo missing: “your area” / “Appliance Repair Experts”. |
| **State name** | Same server render (“surrounding area in Florida”). | `__cfGeo.state` / `stateCode`. |
| **ZIP** | Injected as `window._rb_tags.push({rb_zipcode: "33414"})`. Not shown in UI. | In `__cfGeo.zip` (`33421`). Not shown in UI unless zip-popup experiment is on. |
| **Area code** | Hidden DOM: `<div id="areacode">561</div>`. Fed to DNI. | CallForge session JWT: `"areaCode":"561"`. |
| **Displayed phone** | Client DNI: replace `(877) 665-4537` with a leased local number from `POST api.rbbrands.net/api/number/request`. This visitor: `(561) 486-2157`. | CallForge leases a local number; Svelte store swaps every `tel:` href + visible text. This visitor: `(561) 285-0602`. |
| **Google Map** | Server-rendered Google Static Maps URL centered on the geo city. | None on homepage. |
| **Urgency / “Call by …”** | `callby.js` computes “Call by {now+1h, rounded to :00/:30} for Service Today or Priority Next-Day Service”. After 6pm local: next-day only. | No equivalent clock copy. Static “Same & Next Day”. |
| **Impression / session id** | Cookie `rb_impression_id` (UUID), TTL 20 minutes, heartbeat every 10s. | CallForge `sessionToken` + `leaseId` in localStorage, ~30 min TTL. |
| **Ad click IDs** | Heartbeat posts `gclid`, `fbclid`, `msclkid`, `gbraid`, `wbraid`, UTMs, etc. onto the impression. | CallForge session query string captures the same IDs; Google Ads `loc_physical_ms` forces a new lease. |
| **A/B tests** | Statsig Sidecar (shared across RB Brands sites). Appliance-repair geo-map experiment is on sister domain `applianceappointment.com`, not this hostname. | GTM event `experiment_viewed` / `zip-confirmation-popup`. On `main` this visitor got variation `0` (control = no popup). Branch `zip-popup` would show it. |
| **Open / availability chip** | Header “We're Open!” + “Technicians Available!” (appears static, not time-gated in JS). | Static “Available 24/7”. |
| **Sticky mobile CTA** | Scroll-triggered bar (`#scroll` at >200px). Phone is the DNI number. | Fixed bottom bar on mobile after 50px scroll. Phone is the CallForge number. |
| **Call-click attribution** | Relies on the leased number + heartbeat tags. Privacy policy: IVR asks for ZIP then transfers. | `linkPhoneCall` fires immediately before `tel:` navigation; presence-link keeps the lease warm on load/scroll/focus. |

## 3. How the two personalization stacks differ

```
ART (RB Brands)
  visitor IP
    → WP Engine origin (cache: private, Cloudflare BYPASS)
    → PHP geo lookup (city, state, ZIP, NPA)
    → HTML already says “Wellington, FL” + hidden areacode 561
    → browser loads rbbrands-dni.js
    → POST api.rbbrands.net/api/number/request {campaign_name, areacode}
    → walk DOM, replace +18776654537 with leased +1561…
    → heartbeat POST /api/number/update every 10s with GA4 + zip + Statsig id

APT (Assist Technology / CallForge)
  visitor IP
    → Cloudflare edge geo headers
    → HTML injects window.__cfGeo = {city, state, zip, source:"cloudflare_geo"}
    → [data-cf-text] interpolator runs (and a Svelte DynamicText component)
    → preload snippet GET tracking.callforge.io/v1/tracking/bootstrap
    → GET /v1/tracking/session?categoryId=cat-1769880521403
    → Svelte store replaces fallback (888) 892-6676 with leased +1561…
    → presence-link + linkPhoneCall on tap
```

Key product differences:

1. **ART personalizes HTML on the server** so crawlers, no-JS, and first paint already show the city (Googlebot may still see a datacenter city — Bing/Google crawls of this site have shown New York, Dallas, Ashburn). **APT personalizes in the browser**, so raw HTML/crawlers see “your area” / “Appliance Repair Experts” and the 888 number.
2. **ART named Wellington** (ZIP 33414). **APT named Royal Palm Beach** (ZIP 33421) because that is what Cloudflare/ipinfo have for this AT&T IP. The visitor’s actual city is **Wellington**, so ART’s city was the correct one. 561 is right for both municipalities. IP-geo city names are noisy at this boundary; do not treat the ISP-registered city as ground truth.
3. **ART DNI is campaign + area-code pool** (one local number shared across concurrent visitors in 561, swapped in the DOM). **APT DNI is a leased number from a category pool**, with a cryptographic session token, bot-suppression bootstrap, and explicit click-to-call linking.
4. **ART is a WordPress clone factory** (same DNI + Statsig + callby.js across pest, plumbing, HVAC, roofing, garage, locksmith). **APT is a purpose-built SvelteKit app** whose call tracker (CallForge) is a first-party product of the same company.

## 4. What neither site does (from this investigation)

- Unique `/city/state` landing URLs for SEO (both rewrite one homepage).
- Browser Geolocation API (`navigator.geolocation`) — neither asked.
- User-typed ZIP on first paint (APT has a dormant zip-confirmation popup experiment).
- Showing a named local contractor. Copy is always “our network of independent technicians”.
- Live chat, quote forms as the primary conversion (ART has a WPForms contact page; homepage is call-only).
- Query-param override of server geo on ART (`?zip=10001` and `?loc=Chicago` did **not** change Wellington). APT **does** honor `?city=`, `?state=`, `?location=` for display copy, and Google Ads `loc_physical_ms` for the phone lease.
