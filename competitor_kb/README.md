# Competitor knowledge base

Live investigation of two appliance-repair referral / pay-per-call landing sites, captured **2026-09-13**. Visitor is in **Wellington, FL**, area code **561**. The ISP IP (`66.161.111.244`, AT&T) is registered by ipinfo/Cloudflare as Royal Palm Beach, FL 33421 — an adjacent city. That mismatch is the point of the geo comparison.

Both sites look like local appliance-repair companies. Both are actually **nationwide referral / call-routing businesses** that personalize city copy and swap in a tracking phone number per visitor.

| Site | Operator | Stack | Geo source | Phone system |
| --- | --- | --- | --- | --- |
| [Appliancerepairtoday.net](https://appliancerepairtoday.net/) | **RB Brands LLC** (Charlotte, NC) | WordPress + Elementor on WP Engine + Cloudflare | Server-side IP geo at HTML render | In-house DNI at `api.rbbrands.net` |
| [Applianceprotoday.com](https://www.applianceprotoday.com/) | **Assist Technology, LLC** (Kirkland, WA) | SvelteKit on Cloudflare | Cloudflare edge geo → `window.__cfGeo` | In-house **CallForge** at `tracking.callforge.io` |

## Files

| File | What it covers |
| --- | --- |
| [comparison.md](comparison.md) | Side-by-side static vs dynamic, and how each system works |
| [appliancerepairtoday-net.md](appliancerepairtoday-net.md) | Full ART deep dive: stack, geo, DNI, analytics, call routing |
| [applianceprotoday-com.md](applianceprotoday-com.md) | Full APT deep dive: stack, Cloudflare geo, CallForge, experiments |
| [systems/rb-brands-dni.md](systems/rb-brands-dni.md) | Exact DNI protocol for RB Brands (`api.rbbrands.net`) |
| [systems/callforge.md](systems/callforge.md) | Exact CallForge protocol (`tracking.callforge.io`) |
| [systems/geo-personalization.md](systems/geo-personalization.md) | How each site turns an IP into city/ZIP/area-code copy |
| [evidence/](evidence/) | Captured network lists and observed payloads from the live session |

## What this visitor actually saw

Same physical location, two different geo databases, two different phone numbers:

| | ART (`appliancerepairtoday.net`) | APT (`applianceprotoday.com`) |
| --- | --- | --- |
| Displayed city | **Wellington, FL** | **Royal Palm Beach** |
| ZIP used internally | `33414` (`rb_zipcode_type: 2`) | `33421` (`zipExact: false`) |
| Default / crawl phone | `(877) 665-4537` | `(888) 892-6676` |
| Live swapped phone | **`(561) 486-2157`** | **`(561) 285-0602`** |
| Area code used for pooling | Hidden `#areacode` = `561` | CallForge lease `areaCode: "561"` |

ipinfo + Cloudflare both mapped `66.161.111.244` → Royal Palm Beach, FL 33421. ART/WP Engine mapped the same IP → Wellington, FL 33414. **The visitor’s actual city is Wellington**, so ART’s city copy was the correct one. 561 is the right NPA either way (it covers Wellington and Royal Palm Beach). Lesson: IP-registered city ≠ municipal city at this boundary; ART’s snap was more accurate here, not coarser.

## Method

- Fetched raw HTML (bot/crawler view) and compared it to a real Chrome session (Playwright).
- Captured network: document headers, JS, XHR/fetch, cookies, localStorage.
- Read first-party scripts (`rbbrands-dni.js`, `callby.js`, CallForge preload + `@callforge/tracking-client`).
- Read privacy/terms for stated call-routing and data practices.
- Confirmed personalization is **not** unique city URLs — both sites rewrite a single homepage.
