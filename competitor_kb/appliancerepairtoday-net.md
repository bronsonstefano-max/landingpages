# ApplianceRepairToday.net

- **URL:** https://appliancerepairtoday.net/ (HTTP redirects to HTTPS)
- **Legal entity:** RB Brands LLC, 301 S McDowell St, Suite 125-1570, Charlotte, NC 28204
- **Privacy / TCPA:** privacy@rbbrands.net, alt phone `(877) 738-1031`
- **Self-description:** “a free referral service operated by RB Brands LLC that helps users connect with local contractors. All contractors are independent… RB Brands LLC is compensated financially by our partners.”
- **Investigated:** 2026-09-13

This is a **pay-per-call / referral mill**, not a local shop. The same company runs a portfolio of home-service microsites that share Statsig, DNI, and the “call by {time}” urgency widget.

## 1. Stack

| Layer | What we saw |
| --- | --- |
| CMS | WordPress 7.1, homepage `page-id-9`, template `page_landing-page.php` |
| Page builder | Elementor 3.35.9 (kit-6), WP Smush, Elementor AI namespaces in `/wp-json/` |
| Theme | Custom `wp-content/themes/appliancerepairtoday/` |
| Forms | WPForms on `/contact-us/` |
| Host | **WP Engine** (`x-powered-by: WP Engine`, `x-cache-group: normal`, origin `141.193.213.10/11`) |
| CDN / WAF | **Cloudflare** (`cf-ray: …-MIA`, `__cf_bm` bot cookie, `/cdn-cgi/challenge-platform`) |
| Cache | **Deliberately uncached.** `cache-control: private, proxy-revalidate, s-maxage=0`, `cf-cache-status: BYPASS`, `x-cacheable: NO:Private`. Required because HTML is geo-personalized per IP. |
| CSS | Theme `style.css?ver=0.1.0` + WP block library. Tailwind-like utility classes in markup (`ff_openSans`, `text-cta`). |
| JS (first party) | `theme/js/rbbrands-dni.js`, `theme/js/callby.js` |

Cookie set on first HTML response:

```
set-cookie: rb_v=1; expires=+7d; path=/; domain=.appliancerepairtoday.net
```

`rb_v` is a vertical/variant flag. DNI comments say clearing it or adding `?v=2` can change which campaign/number pool you get.

## 2. Static vs dynamic on the page

### Static (template)

- Logo, hero background (`hero-bg.webp`), 5-star graphic
- Four trust chips: Local Technicians / Emergency Service / Same-Next Day / Zero Obligation
- Process: Call Us → Schedule Service → Get appliance back
- Full appliance-type lists and brand lists
- Footer legal + Marketing Disclosures modal
- Toll-free **swap target** `(877) 665-4537` — 50+ occurrences in raw HTML
- Service pages (`/washing-machine-repair/`, `/refrigerator-repair/`, …) reuse the same geo + DNI shell

Sitemap is small: homepage, service pages, `/locations/`, `/contact-us/`, legal/privacy variants. **No per-city URLs.** `/locations/` still personalizes (“Technicians available in Wellington, FL”) and lists all 50 states as a static grid.

### Dynamic (per visitor)

Observed for this session:

| Slot | Value |
| --- | --- |
| Header city | `Wellington, FL` |
| Hero pin + H1 area | `Wellington, FL` / “We service Wellington and the surrounding area in Florida” |
| H3 | `Wellington Appliance Repair` |
| Body | “Technicians in Wellington, FL”, “Wellington area” |
| Map | Google Static Maps `center=Wellington,Florida,united states` |
| Hidden campaign | `#campaign_name` = `ApplianceRepairToday` |
| Hidden NPA | `#areacode` = `561` |
| ZIP tag | `rb_zipcode: "33414"`, `rb_zipcode_type: "2"` |
| Phone after DNI | `(561) 486-2157` (32 `tel:` links) |
| Call-by line | `Call by 3:30AM for Service Today or Priority Next-Day Service` (local clock) |

Crawler/no-JS HTML still had Wellington (server-side geo) but kept the **877** number. DNI is client-only.

Other crawls of the same templates have shown **New York, NY**, **Dallas, TX**, **Ashburn, VA** — i.e. whatever city the request IP geolocates to.

## 3. How city / ZIP / area code are imputed

**Server-side, at HTML render, from the visitor IP.** Evidence:

1. City, state, ZIP, and area code are already in the first HTML byte — no XHR for geo.
2. `cache-control: private` + Cloudflare `BYPASS` so every request hits WP Engine PHP.
3. Query params `?zip=10001` and `?loc=Chicago` did **not** change Wellington / 33414 / 561.
4. WP Engine ships MaxMind GeoIP (standard `GEOIP_CITY` / `GEOIP_POSTAL_CODE` style variables). Cloudflare is in front but is not the writer: APT (pure Cloudflare) returned Royal Palm Beach 33421 for the same IP; ART returned Wellington 33414. Different geo databases. The visitor’s actual city is Wellington, so ART’s result was the correct city name.
5. `rb_zipcode_type: "2"` is pushed into `_rb_tags`. Type `2` is consistent with “IP-derived” (vs a user-supplied ZIP, which would be a different type).

Inferred PHP flow:

```
IP → GeoIP (city, region, postal, NPA)
  → template vars: $city, $state, $zip, $areacode
  → interpolate into copy + Static Maps URL
  → emit hidden #campaign_name / #areacode
  → emit _rb_tags { rb_zipcode, rb_zipcode_type }
```

Google Static Maps (server-signed):

```
https://maps.googleapis.com/maps/api/staticmap
  ?center=Wellington,Florida,united%20states
  &zoom=8&size=225x225&maptype=roadmap
  &key=AIzaSyCzgF5gn4PSXtDS0yNeg4qpEEI_8k2CoHU
  &signature=…
```

Privacy policy confirms the **call** path also collects ZIP: “Where you call a designated telephone number… we may ask you to input your zip code and transfer your telephone call to a Third Party Service Provider in your geographical area.” So web geo is a first guess; IVR ZIP is the routing truth.

## 4. How the phone number is imputed (DNI)

Script: `/wp-content/themes/appliancerepairtoday/theme/js/rbbrands-dni.js`  
API: `https://api.rbbrands.net/` (nginx, `access-control-allow-origin: *`)

Full protocol: [systems/rb-brands-dni.md](systems/rb-brands-dni.md).

Short version for this page:

1. On `DOMContentLoaded`, read `#campaign_name` (`ApplianceRepairToday`) and `#areacode` (`561`).
2. `POST https://api.rbbrands.net/api/number/request` as multipart form.
3. Response this session:

```json
{
  "impression_id": "71a4fb45-87f4-48ae-85df-771c5ef8d111",
  "status": "VALID",
  "replace_number": "+18776654537",
  "phone_number": "+15614862157",
  "url_parameters": ["ad","ag","c","fbclid","gbraid","gclid","kw","msclkid","plat","rdt_cid","tg","utm_campaign","utm_source","wbraid","sbj","svc","loc","device","query","qclid","loc_interest"],
  "heartbeat_rate": 10000
}
```

4. Walk the DOM (skip `SCRIPT`/`STYLE`), replace formatted `(877) 665-4537` in text **and** attributes (`href="tel:…"`).
5. Cookie `rb_impression_id` for 20 minutes.
6. Immediately, then every 10s while the tab is visible, `POST /api/number/update` with the impression id plus `_rb_tags`:

```json
{
  "impression_id": "71a4fb45-87f4-48ae-85df-771c5ef8d111",
  "data": {
    "statsig_stableid": "3495f609-9c40-420f-b421-dd18f029d080",
    "http_url": "https://appliancerepairtoday.net/",
    "rb_zipcode": "33414",
    "rb_zipcode_type": "2"
  }
}
```

Later heartbeats also attach `GA4ClientId`, `GA4MeasurementId`, `GA4Property`, `GA4SessionId` once gtag resolves them.

This is classic **dynamic number insertion**: the 877 is the published swap target; the 561 number is a tracking DID from a local pool keyed by campaign + NPA. When the user calls, RB Brands knows which web session (and which ad click IDs, once present) produced it, then IVR-asks ZIP and transfers to a buyer contractor.

## 5. “Call by {time}” urgency

`/wp-content/themes/appliancerepairtoday/theme/js/callby.js`

- Target node: `#call-by-service-message`
- `callBy = now + 1 hour`, then round up to the next `:00` or `:30`
- If local hour ≥ 18: copy is “for Priority Next-Day Service”; else “for Service Today or Priority Next-Day Service”
- Recomputed every 60s

This is **client clock**, not server time and not geo-TZ from the ZIP. A VPN user sees their device timezone.

Same widget is A/B-tested via Statsig on sister verticals (`rbb-hvac-hero-txt-callby-082826`, `rbb-pestcontrol-hero-rd-callby-082726`, etc.).

## 6. Analytics, ads, experiments

| Vendor | ID / endpoint | Role |
| --- | --- | --- |
| Google Tag Manager | `GTM-P9FNTVCM` | Container |
| GA4 | `G-9GCP2MGTB6` | Pageviews; client_id + session_id copied into `_rb_tags` for call attribution |
| Meta Pixel | `1237537227625700` | PageView |
| Microsoft Advertising / UET | `187034252` | plus Clarity via UET |
| Microsoft Clarity | `clarity.js` | Session recordings |
| Statsig Sidecar v2 | `client-N7OW4dTAjaFEY20gvnKjqYtcOp49fDQMi2Vdb9NQawT` | Feature flags / visual experiments + **session replay** (`enableSessionReplay: true`) |
| Statsig init | `POST https://featureassets.org/v1/initialize` | Config |
| Statsig events | `POST https://prodregistryv2.org/v1/rgstr` | Exposures |
| VWO | Named in privacy policy (Wingify). **Not loaded on this homepage session.** | Historical / other pages |

Statsig is **shared across the RB Brands portfolio**. Experiments returned in this initialize (URL-filtered, so they do not mutate this hostname):

| Experiment | Filtered to |
| --- | --- |
| `int-apprepair-hero-text-nearbygeomap-082526` | `https://www.applianceappointment.com/` |
| `rbb-pestcontrol-hero-rd-callby-082726` | `https://pestfree.co/` |
| `int-plumbing-hero-text-nearbygeomapv2-091126` | plumber sites |
| `rbb-hvac-hero-txt-callby-082826` | `heatingandairtoday.com` |
| locksmith pricing table, garage-door pricing, roofing call-by | matching microsites |

So RB Brands is actively testing a **Leaflet “nearby cities” map** on the appliance vertical — just on `applianceappointment.com`, not on `appliancerepairtoday.net` yet. That experiment loads OSM tiles + a GitHub US-cities CSV and overlays “Plumbing/Appliance Service Near {city}”. Treat it as the direction of travel for ART’s map slot (today: Google Static Maps).

`_rb_tags` also has an empty `needMap` keyed off `?c=` (campaign/need id). Currently `{}` on this site, so unused.

## 7. Call handling (after the tap)

From privacy policy, not from the web session:

1. User dials the DNI number.
2. Call may be recorded (announced).
3. IVR or agent asks for **ZIP**.
4. Call is transferred to a “Third Party Service Provider” in that geography.
5. RB Brands sells/shares the lead (name, phone, etc. are listed as collected and may be sold). TCPA consent is in the footer: autodialed / prerecorded / SMS even if on DNC, until the “Do Not Sell” form is submitted.

EU residents are prohibited.

## 8. Sister properties (same DNI + Statsig brain)

Confirmed live or named in Statsig URL filters:

- https://www.applianceappointment.com/ — appliance, same Wellington geo this session
- https://pestfree.co/
- https://plumbertoday.co/ / plumberappointment.com
- https://heatingandairtoday.com/
- https://roofstoday.net/
- https://local.garageservicenearyou.com/
- https://local.locksmithdirectory.com/
- https://getrbbrands.com/ — corporate

## 9. Implications

- **City copy is a lie of proximity, not a local business.** Same HTML template nationwide.
- **The phone is the product.** Everything else (geo, call-by, DNI, GA4 stitching) exists to (a) raise conversion and (b) attribute the call to a paid click.
- To compete on the same field you need: IP (or ad-location) → city copy, a local-looking DID, and a way to bind that DID to the web session + gclid.
- ART’s city (Wellington) was the right city for this visitor. Cloudflare/ipinfo’s Royal Palm Beach is the ISP-registered city for the same IP, not the municipal one. A confirm-ZIP modal still helps when IP geo and reality disagree — but “finer” IP geo is not automatically more accurate.
