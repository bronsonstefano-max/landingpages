# Geo personalization — how each site turns an IP into “your town”

Neither site uses the browser Geolocation API. Neither has `/city/state` URLs. Both rewrite a single homepage.

Visitor’s actual city: **Wellington, FL**, area code **561**.

What IP databases said for the same address (`66.161.111.244`, AT&T):

```
IP       66.161.111.244
City     Royal Palm Beach   ← ISP-registered / CF+ipinfo; NOT the visitor’s city
Region   Florida
Postal   33421
Org      AS7018 AT&T
Timezone America/New_York
```

561 covers both Wellington and Royal Palm Beach. City name is the thing that split.

## ART — server-side IP geo at HTML render

**Where:** WP Engine PHP, every request (`cache-control: private`, Cloudflare `BYPASS`).

**What gets written into HTML:**

- City + state in ~11 copy slots (“Wellington, FL”, “Wellington Appliance Repair”, …)
- Google Static Maps `center={City},{State},united states`
- Hidden `#areacode` (NPA)
- `window._rb_tags` → `rb_zipcode`, `rb_zipcode_type`

**This session:** city **Wellington**, ZIP **33414**, NPA **561**.

That city name is correct for this visitor. 33414 is a Wellington ZIP; ipinfo/Cloudflare had the adjacent Royal Palm Beach 33421 for the same AT&T IP. ART did not “snap to a market city” in a sloppy way here — it named the actual town.

**Not overridable** via `?zip=` or `?loc=` (tested). Paid-click location (`gclid` loc) is only forwarded on the DNI *heartbeat*, not used to re-render copy.

**Crawler behavior:** Googlebot IPs produce other cities (observed in public crawls: New York, Dallas, Ashburn). There is no canonical “nationwide” HTML. That is an SEO risk (inconsistent title/H1) and why they keep the `<title>` generic: “Top Local Appliance Repair Experts Near You”.

**Call-time correction:** privacy policy says the IVR asks for ZIP and then transfers. Web geo is a conversion/attribution hint; routing ZIP is collected on the phone.

Likely vendor: **MaxMind GeoIP2 via WP Engine** (standard on that host). Not Cloudflare’s geo — proven because APT, on Cloudflare for the same IP, returned Royal Palm Beach 33421.

`rb_zipcode_type: "2"` on this session is consistent with “derived from IP” (a user-entered ZIP would be a different type; we did not observe type 1).

## APT — Cloudflare edge geo + client interpolation

**Where:** Cloudflare worker/snippet on the HTML response, then JS in the browser.

**Injected blob:**

```js
window.__cfGeo = {
  city: "Royal Palm Beach",
  state: "Florida",
  stateCode: "FL",
  zip: "33421",
  zipExact: false,
  source: "cloudflare_geo"
}
```

This **matched ipinfo exactly, and both were wrong on city**. The visitor is in Wellington. `zipExact: false` is Cloudflare’s usual “this postal is a best guess,” which is doing real work at this municipal boundary.

**How copy updates:**

1. Svelte `DynamicText` nodes emit `<span data-cf-text="…" data-cf-fallback="…" data-cf-params="…">`.
2. An inline interpolator (and the Svelte component) substitute tokens from `__cfGeo` and from the query string.
3. Tokens: `%c` city, `%s` state code, `%l` “City, ST”, `%lc` city (flexible), `%ls` state, plus named params (`%khl` = “Appliance Repair”).
4. URL overrides: `?city=`, `?state=`, `?location=` — **this is how they QA / force a market** (`qa_mode=1` exists too).
5. If a token is missing, `data-cf-fallback` is used (“your area”, “Appliance Repair Experts”). That is why `curl`/crawlers look un-localized.

**Phone geo is separate.** CallForge session does not take city/ZIP for the DID; it NPA-matches (JWT `areaCode: "561"`) and optionally keys the lease off Google Ads `loc_physical_ms`. A user in 561 who clicked a Miami-targeted ad can get a different leased number than a direct visitor.

**ZIP confirmation (dormant):** experiment `zip-confirmation-popup`. On deploy branch `zip-popup` this would show a modal; `linkPhoneCall` already accepts `webZip` + `webZipSource`. On `main`, variation 0, not shown. This is how they would fix Cloudflare’s `zipExact: false` when they care.

## Why the two cities diverged

| | ART | APT |
| --- | --- | --- |
| Geo vendor | WP Engine / MaxMind-class | Cloudflare |
| When | Origin PHP, before HTML | Edge, then client JS |
| City this session | Wellington | Royal Palm Beach |
| ZIP this session | 33414 | 33421 |
| Shown to user | Yes (many slots + map) | Yes (header/H1/H2/body) |
| User-correctable | No (until IVR) | URL params now; ZIP modal later |
| Crawler sees city | Yes (whatever bot IP is) | No (fallbacks) |

For this Wellington visitor, **ART’s copy named the right town**. APT’s named Royal Palm Beach because that is what Cloudflare has for the AT&T IP. 561 was correct on both. IP-geo city ≠ municipal city here.

## Practical notes if we build this

1. **Do not cache HTML** if city is server-rendered (ART’s `private`/`BYPASS` pattern), **or** cache a generic shell and fill city in the client (APT’s pattern). Client fill is cheaper at the edge and better for CDN; worse for SEO city terms.
2. Prefer **Cloudflare / MaxMind GeoIP2-City** over coarser country/region. Surface city, region, postal, and NPA. Then **do not trust city name blindly** — this session, Cloudflare and ipinfo agreed with each other and still named the wrong adjacent town. NPA (561) was the reliable signal; city needs a ZIP confirm or a better local assignment.
3. Keep a **fallback** (“your area”, national 800/888) for unknown/VPN/datacenter IPs.
4. Paid traffic should prefer **ad location** (`loc_physical_ms`, or the targeting ZIP on the click) over IP when they disagree (snowbirds, travelers, office Wi-Fi). APT already does this for the **number**; not for the **headline**. Doing both is the tighter product.
5. A **confirm-ZIP** step (APT’s unused experiment) is the highest-leverage accuracy fix and gives the call router a real ZIP before the phone rings.
6. Do not create thousands of city URLs unless you also have unique content; both competitors skipped that and still convert on ads.
