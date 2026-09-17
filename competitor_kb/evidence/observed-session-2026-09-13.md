# Observed session — 2026-09-13

Visitor’s actual city: **Wellington, FL**, area code 561.

Visitor IP as labeled by ipinfo (not the municipal city): `66.161.111.244` — Royal Palm Beach, FL 33421, AT&T, America/New_York. ART displayed Wellington; APT displayed Royal Palm Beach.

Browser: Chrome 152 / macOS, Playwright.

## ART — appliancerepairtoday.net

### Document

```
GET https://appliancerepairtoday.net/
status 200
server: cloudflare
x-powered-by: WP Engine
cache-control: private, proxy-revalidate, s-maxage=0
cf-cache-status: BYPASS
cf-ray: …-MIA
set-cookie: rb_v=1; Max-Age=604800; path=/; domain=.appliancerepairtoday.net
```

Hidden nodes in HTML:

```html
<div id="campaign_name" class="hidden">ApplianceRepairToday</div>
<div id="areacode" class="hidden">561</div>
```

Injected tags:

```js
(window._rb_tags = (window._rb_tags || [])).push({"rb_zipcode": "33414"});
(window._rb_tags = (window._rb_tags || [])).push({"rb_zipcode_type": "2"});
```

Raw HTML still contained `(877) 665-4537` (~53 times). After DNI, 32 `tel:` links were `(561) 486-2157`.

### DNI request

```
POST https://api.rbbrands.net/api/number/request
Content-Type: multipart/form-data

campaign_name=ApplianceRepairToday
areacode=561
```

### DNI response

```json
{
  "impression_id": "71a4fb45-87f4-48ae-85df-771c5ef8d111",
  "status": "VALID",
  "replace_number": "+18776654537",
  "phone_number": "+15614862157",
  "url_parameters": [
    "ad","ag","c","fbclid","gbraid","gclid","kw","msclkid","plat",
    "rdt_cid","tg","utm_campaign","utm_source","wbraid","sbj","svc",
    "loc","device","query","qclid","loc_interest"
  ],
  "heartbeat_rate": 10000
}
```

### DNI heartbeat (first)

```
POST https://api.rbbrands.net/api/number/update
```

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

Response: same VALID payload as request (replace/phone echoed). Subsequent heartbeats at 10s.

### Cookies after load

```
rb_v=1
rb_impression_id=71a4fb45-87f4-48ae-85df-771c5ef8d111
_ga_9GCP2MGTB6=…
_ga=GA1.1.1990858627.1789279819
_uetsid=…  _uetvid=…
_fbp=fb.1.…
_clck=…  _clsk=…   (Clarity)
```

### Geo override tests (curl, same IP)

| URL | City in HTML | ZIP | Areacode |
| --- | --- | --- | --- |
| `/` | Wellington (11) | 33414 | 561 |
| `/?zip=10001` | Wellington (11) | 33414 | 561 |
| `/?loc=Chicago` | Wellington (11) | 33414 | 561 |

`10001` / `Chicago` only appeared because they were in the request URL string, not as geo.

### Analytics IDs

- GTM `GTM-P9FNTVCM`
- GA4 `G-9GCP2MGTB6`
- Meta Pixel `1237537227625700`
- Bing UET / Clarity `187034252`
- Statsig client `client-N7OW4dTAjaFEY20gvnKjqYtcOp49fDQMi2Vdb9NQawT`
- Statsig init `POST https://featureassets.org/v1/initialize`
- Google Static Maps key `AIzaSyCzgF5gn4PSXtDS0yNeg4qpEEI_8k2CoHU` (URL-signed)

## APT — www.applianceprotoday.com

### Document

```
GET https://www.applianceprotoday.com/
status 200
server: cloudflare
cf-cache-status: DYNAMIC
link: <https://tracking.callforge.io>; rel="preconnect", …sveltekit modules…
```

Head inject:

```js
window.__cfGeo={"city":"Royal Palm Beach","state":"Florida","stateCode":"FL","zip":"33421","zipExact":false,"source":"cloudflare_geo"}
window.__DEPLOYMENT_BRANCH__="main"
```

Fallback phone in client bundle: `{tel:"+18888926676", display:"(888) 892-6676"}`.

After CallForge: all `tel:` → `+15612850602` / `(561) 285-0602`.

### CallForge bootstrap

```
GET https://tracking.callforge.io/v1/tracking/bootstrap?categoryId=cat-1769880521403
```

```json
{
  "bootstrapToken": "eyJ…",
  "expiresAt": 1789280042992
}
```

### CallForge session

```
GET https://tracking.callforge.io/v1/tracking/session?categoryId=cat-1769880521403&bootstrapToken=…
```

```json
{
  "sessionToken": "eyJ…",
  "leaseId": "f918f429-1d16-4199-a886-c0e8e3e7d144",
  "phoneNumber": "+15612850602",
  "categoryId": "cat-1769880521403",
  "expiresAt": 1789281723018
}
```

Decoded session JWT:

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

### Presence

```
POST https://tracking.callforge.io/v1/tracking/presence-link
→ 201
```

```json
{
  "sessionToken": "eyJ…",
  "phoneNumber": "+15612850602",
  "signal": "load",
  "ga4ClientId": "1107929520.1789279923"
}
```

### localStorage

- `cf_bootstrap_v1_www.applianceprotoday.com_cat-1769880521403`
- `cf_tracking_v1_www.applianceprotoday.com_cat-1769880521403` → `{locId:null, sessionToken, leaseId, phoneNumber:"+15612850602", …}`

### Experiment

```
dataLayer event experiment_viewed
  experiment_id = zip-confirmation-popup
  variation_id  = 0
```

GA4 also sent `en=experiment_viewed&ep.experiment_id=zip-confirmation-popup&ep.variation_id=0`.

### Analytics IDs

- GTM `GTM-T6DL7RWM`
- GA4 `G-DDLMGFDK8X` (first-party `/v436/`)
- Google Ads `AW-849859258`
- CallForge category `cat-1769880521403`

### `data-cf-text` nodes (7)

```
Serving %lc and Surrounding Areas
%lc Appliance Repair                          fallback: Appliance Repair Experts
Your Same-Day %khl Experts                    fallback: Your Same-Day Appliance Repair Experts  params: {"khl":"Appliance Repair"}
%lc's Trusted Appliance Repair Services       fallback: Trusted Appliance Repair Services
%lc and surrounding areas                     fallback:  your area
%lc Appliance Repair                          (repeat, lower CTA)
Your Same-Day %khl Experts                    (repeat)
```
