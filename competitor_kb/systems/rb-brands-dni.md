# RB Brands DNI — `api.rbbrands.net`

First-party dynamic number insertion used on ApplianceRepairToday.net and the rest of the RB Brands microsite portfolio.

Client: `https://appliancerepairtoday.net/wp-content/themes/appliancerepairtoday/theme/js/rbbrands-dni.js`  
API origin: `https://api.rbbrands.net/` (nginx, CORS `*`)

## Purpose

Bind a **web impression** to a **phone number** so that when the visitor calls, RB Brands can attribute the call to this pageview (and later to gclid/UTM/GA4) and route it.

## Page contract

The WordPress theme must render two hidden nodes:

```html
<div id="campaign_name" class="hidden">ApplianceRepairToday</div>
<div id="areacode" class="hidden">561</div>
```

- `campaign_name` selects the vertical / number pool / buyer campaign.
- `areacode` is the NPA from server-side IP geo. The API returns a DID in that NPA (or a fallback).

Optional cookie `rb_v=1` (7-day, host-only on `.appliancerepairtoday.net`) distinguishes verticals when one site hosts several. DNI comments: clearing `rb_v` or adding `?v=2` can rotate the pool.

## Algorithm

Constants:

- Base URL `https://api.rbbrands.net/`
- Impression cookie `rb_impression_id`, TTL **20 minutes**
- Skip replacing inside `SCRIPT` and `STYLE`

On `DOMContentLoaded`:

1. `POST /api/number/request` as `multipart/form-data`:

   | Field | Example |
   | --- | --- |
   | `campaign_name` | `ApplianceRepairToday` |
   | `areacode` | `561` |
   | `impression_id` | (if cookie already set) |

2. Handle `data.status`:
   - `EXPIRED` → delete cookie, retry `initialize()`
   - not `VALID` → delete cookie, stop (page keeps the 877)
   - `VALID` → continue

3. Format both `replace_number` and `phone_number` as `(AAA) BBB-CCCC` (strip `+1` if present). Tree-walk `document.body` and `replaceAll` in text nodes and **all attributes**.

4. If at least one replacement happened, `setCookie(rb_impression_id, data.impression_id)` and start heartbeat.

5. Heartbeat: `setTimeout` of `0` then every `heartbeat_rate` ms (10_000). If `document.hidden`, skip the network call but keep the timer (so a returning tab can still update inside the 20-minute window).

6. Heartbeat body is JSON:

```http
POST /api/number/update
Accept: application/json
Content-Type: application/json

{
  "impression_id": "<uuid>",
  "data": {
    "<from window._rb_tags>": "...",
    "<from URL params listed in url_parameters>": "..."
  }
}
```

`window._rb_tags` is an array of one-key objects; the client flattens them. On ART they include:

| Key | Source |
| --- | --- |
| `statsig_stableid` | Statsig sidecar |
| `http_url` | hardcoded current URL |
| `rb_zipcode` | PHP-injected |
| `rb_zipcode_type` | PHP-injected (`2` = IP-derived on this session) |
| `GA4ClientId` | `gtag('get', 'G-9GCP2MGTB6', 'client_id')` |
| `GA4MeasurementId` | `G-9GCP2MGTB6` |
| `GA4Property` | `appliancerepairtoday.net` |
| `GA4SessionId` | `gtag('get', …, 'session_id')` |
| `NeedId` | only if `?c=` maps through `needMap` (empty on ART) |

URL params the API asked this session to forward if present:

```
ad, ag, c, fbclid, gbraid, gclid, kw, msclkid, plat, rdt_cid,
tg, utm_campaign, utm_source, wbraid, sbj, svc, loc, device,
query, qclid, loc_interest
```

That list is Google Ads + Microsoft Ads + Meta + Reddit (`rdt_cid`) + some internal (`sbj`, `svc`, `plat`).

Non-`VALID` heartbeat → delete cookie, stop. Errors are swallowed.

## Observed live exchange (2026-09-13)

**Request**

```
campaign_name=ApplianceRepairToday
areacode=561
```

**Response**

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

Result: every visible and `tel:` number on the page became `(561) 486-2157`.

## Comparison to commercial DNI (CallRail, Invoca, CTM)

Same shape: swap-target number in HTML, JS replaces it from a pool, cookie holds the assignment, click IDs get attached.

Differences:

- Pool key is **campaign + area code**, not “source tracker vs session pool” as a first-class UI.
- Attribution payload is a **heartbeat to their own API**, not a vendor pixel.
- 20-minute cookie is short (CallRail defaults are often hours). Good for number-pool efficiency, slightly worse for same-day return visits.
- No public evidence of transcription / conversation intelligence in this script (that would live on the telephony side).

## Failure modes

- API down or non-VALID → user sees the national 877. Privacy policy still routes that call via ZIP IVR.
- Replacement finds zero matches (if the theme ever changes the 877 formatting) → no cookie, no heartbeat, 877 stays.
- Multiple verticals on one hostname rely on `rb_v` / `?v=` to not collide impression ids.
