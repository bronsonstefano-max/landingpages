# CallForge — `tracking.callforge.io`

In-house call tracking platform of **Assist Technology, LLC** (same company as Appliance Pro Today).

- NPM: [`@callforge/tracking-client`](https://www.npmjs.com/package/@callforge/tracking-client) (v0.16.3 as of this writeup; site bundle is a slightly older but compatible client)
- Publisher npm user: `assisttechnology`
- Production API: `https://tracking.callforge.io`
- Staging / dev: `tracking-staging.callforge.io`, `tracking-dev.callforge.io`
- Self-description: “per-visitor phone number assignment (with deterministic session tokens) plus aggressive caching and preload optimization.”

Display location is **not** in this client anymore (removed in 0.16). City/ZIP rendering is a separate **geo edge worker** that sets `window.__cfGeo`. See [geo-personalization.md](geo-personalization.md).

## Purpose

1. Lease a tracking DID from a **category pool**, preferably in the visitor’s area code.
2. Hold that lease with a signed `sessionToken` so refreshes are deterministic.
3. Stitch the eventual inbound call to the web session (presence + click-link) and to GA4 / Google Ads click IDs.
4. Suppress leases for bots (bootstrap token).

## Site wiring on applianceprotoday.com

```js
const FALLBACK = { tel: "+18888926676", display: "(888) 892-6676" };
const categoryId = "cat-1769880521403";
const ga4MeasurementId = "G-DDLMGFDK8X";
```

`<head>` contains:

1. `rel=preconnect` to `https://tracking.callforge.io`
2. The **preload snippet** (`getPreloadSnippet({ categoryId })`) which starts bootstrap+session immediately and assigns `window.__cfTracking` (a Promise)
3. Later the Svelte app calls `CallForge.init({ categoryId, ga4MeasurementId })` and subscribes the phone store to `session.phoneNumber`

## API

### `GET /v1/tracking/bootstrap?categoryId=`

Lease-hardening / bot gate. Observed:

```json
{
  "bootstrapToken": "eyJ….<sig>",
  "expiresAt": 1789280042992
}
```

Token JWT claims (decoded): `categoryId`, `clientBinding`, `tokenVersion: "b1"`, `exp`, `nonce`.

Cached in `localStorage` as `cf_bootstrap_v1_<hostname>_<categoryId>` with `tokenVersion: "b1"`. Reused if `expiresAt` is more than ~10s away.

Without a valid bootstrap, docs say the session may still return a `phoneNumber` but `leaseId: null` (no pool spend).

### `GET /v1/tracking/session`

Query string (keys sorted for cache consistency):

| Param | Role |
| --- | --- |
| `categoryId` | Pool (required) |
| `bootstrapToken` | From bootstrap |
| `sessionToken` | Refresh an existing lease |
| `loc_physical_ms` | Google Ads location ID; **invalidates cache** if it changes |
| `ga4ClientId` | From `_ga` cookie (`GA1.1.<p>.<I>` → `p.I`) or `gtag('get')` |
| `gclid` `gbraid` `wbraid` `msclkid` `fbclid` `gad_campaignid` `gad_source` | Auto from URL |
| `serviceVariant` | Optional sticky routing metadata, does **not** change pool |

Observed 200:

```json
{
  "sessionToken": "eyJ…",
  "leaseId": "f918f429-1d16-4199-a886-c0e8e3e7d144",
  "phoneNumber": "+15612850602",
  "categoryId": "cat-1769880521403",
  "expiresAt": 1789281723018
}
```

Session JWT payload:

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

`attributionMode: "leased"` = session-level DID from a pool (vs a static source number). `areaCode` shows they NPA-match the visitor.

Cached as `cf_tracking_v1_<hostname>_<categoryId>`:

```json
{
  "locId": null,
  "sessionToken": "…",
  "leaseId": "…",
  "phoneNumber": "+15612850602",
  "expiresAt": …,
  "tokenVersion": "v1",
  "params": { "ga4ClientId": "…" }
}
```

TTL is server `expiresAt` (this session ≈ 30 minutes). Client refuses to reuse a cache entry if:

- `expiresAt` is within 30s
- `loc_physical_ms` changed
- `ga4ClientId` changed
- any of `gclid|gbraid|wbraid|msclkid|fbclid` is new/different
- a `serviceVariant` is set on the cached params (forces refresh)

A later session GET with the same `sessionToken` + newly available `ga4ClientId` was observed (client “sync params” pass).

### `POST /v1/tracking/presence-link` → 201

Keeps a short-lived “this visitor is on this number right now” association so an inbound call can be matched even if they didn’t click.

Observed body:

```json
{
  "sessionToken": "eyJ…",
  "phoneNumber": "+15612850602",
  "signal": "load",
  "ga4ClientId": "1107929520.1789279923"
}
```

Auto signals (defaults): `load`, debounced `scroll` (1200ms, min interval 15s), `focus`, `visibilitychange → visible`, SPA route changes (`pushState`/`replaceState`/`popstate`/`hashchange`).

### `linkPhoneCall` (click-to-call)

Fired from CTA `click` **immediately before** `location.href = tel:…`. Does not block dialing on failure.

```js
await client.linkPhoneCall({
  phoneNumber: "+15612850602",          // exact dialed string
  ttlSeconds: 30,                       // clamped 5–120s
  realtime: {                           // optional
    webZip: "33421",
    webZipSource: "manual" | "suggested",
    params: { zipChoiceMethod: "picker" }
  }
});
```

This is the strict 1:1 web-click → inbound-call consume. Presence is the fuzzy backup.

### Other documented endpoints (not hit this session)

- `createCallIntent()` → short-lived token for **outbound callback** initiated by their backend
- `/v1/tracking/location` — legacy; new sites must use the geo worker

## How the UI swaps the number

Not a DOM text replace (that is RB Brands’ approach). APT:

1. Fallback constant `(888) 892-6676` is what SSR/crawlers see.
2. A Svelte store (`oe`) is `session.phoneNumber ?? null`.
3. Header, footer, mobile bar, hero CTAs: `phone = storeValue || FALLBACK.tel`, `label = format(storeValue) || FALLBACK.display`, `href = tel:${phone}`.
4. `format` pretty-prints `+15612850602` → `(561) 285-0602`.
5. Click handler always calls `linkPhoneCall` with the number that will actually be dialed.

## Google Ads location

`loc_physical_ms` is Google’s numeric location id for the user’s **physical** location (or targeted location, depending on campaign). CallForge treats it as `locId`:

- Passed on session create
- If it changes vs cache, a **new lease** is fetched (so a user who clicked an ad targeted to Miami doesn’t keep a 561 number)

Copy/city interpolation does **not** read `loc_physical_ms`; it reads Cloudflare geo (or `?city=`).

## Product vs CallRail

CallForge is a **narrow, modern DNI** aimed at Assist’s own landers:

- Category pools + NPA matching
- Bootstrap bot gate
- Presence + click-link (CallRail equivalent is DNI cookie + call.js)
- First-class GA4 client id and Google Ads location id
- ZIP as a realtime field (for their zip-popup experiment)
- No public dashboard / agency UI observed — this is infrastructure, not a SaaS they sell in the CallRail sense (weekly npm downloads were ~19)

For a competitor: you can buy CallRail in a week, or you can build this. Assist built it.
