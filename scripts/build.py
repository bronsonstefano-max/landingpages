#!/usr/bin/env python3
"""Assemble index.html from src/layout.html, src/partials/, and src/data/content.json."""

from __future__ import annotations

import base64
import html
import json
import re
import shutil
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PARTIALS = ROOT / "src" / "partials"
CONTENT_PATH = ROOT / "src" / "data" / "content.json"
LAYOUT_PATH = ROOT / "src" / "layout.html"
OUT_PATH = ROOT / "index.html"
DIST = ROOT / "dist"
CSS_DIR = ROOT / "css"
CSS_MANIFEST_PATH = CSS_DIR / "main.src.css"
CSS_OUT_PATH = CSS_DIR / "main.css"
CSS_IMPORT_RE = re.compile(r'@import\s+url\("([^"]+)"\);')

ASSET_SKIP = {
    "352f9175-5376-4533-a023-6ad21752a8d9.png",
    "appliance-repair-image.png",
    "appliance-helpers-logo",
    "favicon-logo-appliance-helpers.png",
    "social-image-appliance-helpers.png",
    "preview.html",
    "README.md",
    "brands.json",
}

PHONE_LINK = (
    '<a href="tel:+18005555555" data-cfg-href="phoneHref" data-call-source="{source}">'
    '<span data-cfg="phoneDisplay">(800) 555-5555</span>'
    "</a>"
)

BRAND_SPAN = '<span data-cfg="brandName">Appliance Helpers</span>'
SERVICE_AREA_SPAN = '<span data-cfg="serviceArea">[SERVICE AREA]</span>'

CHEVRON = '<svg class="icon" aria-hidden="true"><use href="#icon-chevron-right"></use></svg>'


def icon_tile(css_class: str, name: str) -> str:
    """A square icon chip referencing a <symbol> in src/partials/icons.html."""
    return (
        f'<span class="{css_class}" aria-hidden="true">'
        f'<svg class="icon"><use href="#icon-{html.escape(name)}"></use></svg>'
        "</span>"
    )


def minify_css(text: str) -> str:
    """Strip comments and collapse whitespace runs to a single space.

    Deliberately conservative: it never removes a lone space, only ever
    shrinks a run of 2+ whitespace characters down to one. That's what
    keeps it safe to run on this codebase without a real CSS parser —
    calc()/clamp() math (`calc(1px + 2px)`) and any literal spaces inside
    content strings survive untouched; only formatting whitespace goes.
    """
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    text = re.sub(r"[ \t\r\n]+", " ", text)
    return text.strip()


@lru_cache(maxsize=1)
def hero_mobile_avif_data_uri() -> str:
    """Base64 data: URI for the mobile hero AVIF — see the comment on its
    `{{heroMobileAvifDataUri}}` token in css/sections/hero.css for why."""
    data = (ROOT / "assets" / "images" / "hero-repair-mobile.avif").read_bytes()
    return "data:image/avif;base64," + base64.b64encode(data).decode("ascii")


HERO_MOBILE_TOKEN = "{{heroMobileAvifDataUri}}"


def _resolve_hero_token_for_bundle(text: str) -> str:
    """css/main.css's copy of this rule only ever runs *after* the critical
    inline copy already painted the hero (it loads async, well past first
    paint), so inlining the ~18KB data URI here again would just be dead
    weight on every page load, mobile and desktop alike. It gets the plain
    external file instead — same one the WebP fallback next to it uses."""
    return text.replace(HERO_MOBILE_TOKEN, "../assets/images/hero-repair-mobile.avif")


def _resolve_hero_token_for_critical(text: str) -> str:
    if HERO_MOBILE_TOKEN in text:
        text = text.replace(HERO_MOBILE_TOKEN, hero_mobile_avif_data_uri())
    return text


def bundle_css() -> str:
    """Concatenate css/main.src.css's @import chain into one file.

    A render-blocking stylesheet with 24 @import statements makes the
    browser fetch main.css, parse it, then fetch every import before it can
    paint. Shipping one pre-joined, minified file removes that extra round
    trip and cuts the bytes the browser has to download and parse before
    it can apply styles (comments alone are ~40% of the source). Files one
    directory below css/ (components/, sections/) reference assets as
    "../../..."; rewritten into the top-level bundle that becomes "../...",
    so it's adjusted by one level on the way in.
    """
    manifest = CSS_MANIFEST_PATH.read_text()
    parts = []
    for match in CSS_IMPORT_RE.finditer(manifest):
        rel_path = match.group(1)
        text = (CSS_DIR / rel_path).read_text()
        if "/" in rel_path:
            text = text.replace('url("../../', 'url("../')
        text = _resolve_hero_token_for_bundle(text)
        parts.append(text)
    return minify_css("\n".join(parts)) + "\n"


# The subset of main.src.css needed to render the header + hero (everything
# visible before any scroll or network-idle wait) without a network round
# trip. Order matches main.src.css — tokens before the rules that use them,
# reset before base, etc. Inlined into <head> by render_critical_css(); the
# full css/main.css (which ships this same subset again, plus everything
# else) loads asynchronously afterward, see the print-media swap in
# layout.html.
CRITICAL_CSS_FILES = (
    "fonts.css",
    "tokens.css",
    "reset.css",
    "base.css",
    "layout.css",
    "components/icons.css",
    "components/buttons.css",
    "components/cta-urgency.css",
    "components/star-rating.css",
    "components/skip-link.css",
    "sections/header.css",
    "sections/hero.css",
    "responsive.css",
)


def render_critical_css() -> str:
    parts = []
    for rel_path in CRITICAL_CSS_FILES:
        text = (CSS_DIR / rel_path).read_text()
        if "/" in rel_path:
            text = text.replace('url("../../', 'url("../')
        # This CSS is inlined straight into index.html at the site root,
        # not served from css/ like main.css is, so relative asset URLs
        # need one more "../" stripped than the bundled file uses.
        text = text.replace('url("../', 'url("')
        text = _resolve_hero_token_for_critical(text)
        parts.append(text)
    return minify_css("\n".join(parts))


def load_partial(name: str) -> str:
    return (PARTIALS / f"{name}.html").read_text()


def fill_photo(template: str, photo: dict, prefix: str = "heroPhoto") -> str:
    """Substitute {{<prefix>.src|srcset|width|height|alt}} from a content block."""
    out = template
    for key in ("src", "srcset", "width", "height", "alt"):
        token = "{{%s.%s}}" % (prefix, key)
        if token in out:
            if key not in photo:
                raise SystemExit(f"content.json {prefix} is missing '{key}' for {token}")
            out = out.replace(token, html.escape(str(photo[key]), quote=True))
    return out


def render_hero_checklist(items: list[dict]) -> str:
    """The four proof points, checked off inside the hero over the photo."""
    rows = []
    check = icon_tile("hero-check-icon", "check")
    for item in items:
        text = html.escape(item["text"], quote=False)
        if item.get("cfg"):
            inner = f'<span data-cfg="{html.escape(item["cfg"])}">{text}</span>'
        else:
            inner = f"<span>{text}</span>"
        rows.append(
            f'          <li class="hero-checklist-item">\n'
            f"            {check}\n"
            f"            {inner}\n"
            f"          </li>"
        )
    return "\n".join(rows)


def render_services(names: list[str]) -> str:
    rows = []
    for name in names:
        rows.append(
            '              <a class="service-chip" href="tel:+18005555555" '
            'data-cfg-href="phoneHref" data-call-source="service-list">\n'
            f'                <span><span class="visually-hidden">Call about </span>'
            f"{html.escape(name, quote=False)}</span>\n"
            f"                {CHEVRON}\n"
            "              </a>"
        )
    return "\n".join(rows)


def render_callout(template: str, callout: dict) -> str:
    phone = PHONE_LINK.format(source=callout["source"])
    body = callout["html"].replace("{{phone}}", phone)
    return template.replace("{{calloutHtml}}", body)


CHECK_ICON = (
    '<span class="benefit-check-icon" aria-hidden="true">'
    '<svg class="icon"><use href="#icon-check"></use></svg></span>'
)


def render_benefits(items: list[dict]) -> str:
    rows = []
    for item in items:
        title = html.escape(item["title"], quote=False)
        if item.get("titleCfg"):
            title_html = f'<strong data-cfg="{html.escape(item["titleCfg"])}">{title}:</strong>'
        else:
            title_html = f"<strong>{title}:</strong>"
        body = (
            html.escape(item["body"], quote=False)
            .replace("{{brand}}", BRAND_SPAN)
            .replace("{{serviceArea}}", SERVICE_AREA_SPAN)
        )
        # html.escape would have escaped the replacement if we escaped after.
        # We escaped first, then inserted raw spans — but {{brand}} was in the
        # source as a placeholder, so escape left it intact. Good.
        rows.append(
            '              <li class="benefit-list-item">\n'
            f"                {CHECK_ICON}\n"
            f"                <p>{title_html} {body}</p>\n"
            "              </li>"
        )
    return "\n".join(rows)


LOGO_DIRS = (
    ROOT / "assets" / "brands" / "svg",
    ROOT / "assets" / "brands" / "png",
)


def resolve_logo(filename: str) -> Path:
    for folder in LOGO_DIRS:
        path = folder / filename
        if path.is_file():
            return path
    raise SystemExit(f"missing brand logo: {filename}")


def render_brands(brands: list[dict]) -> str:
    rows = []
    for brand in brands:
        name = brand["name"]
        logo = brand["logo"]
        path = resolve_logo(logo)
        rel = path.relative_to(ROOT).as_posix()
        hide_at = brand.get("hideAt") or []
        if isinstance(hide_at, str):
            hide_at = [hide_at]
        classes = []
        if "2col" in hide_at:
            classes.append("brand-logo-wall__omit-2")
        if "4col" in hide_at:
            classes.append("brand-logo-wall__omit-4")
        li_class = f' class="{" ".join(classes)}"' if classes else ""
        escaped_name = html.escape(name, quote=False)
        # The logo image alone carries no text a crawler (or Google Ads'
        # landing-page relevance check) can read. The <img> stays decorative
        # (empty alt — the caption is the accessible name, so a screen
        # reader doesn't announce the brand twice) and this hidden span
        # supplies the real, indexable brand name text.
        rows.append(
            f"              <li{li_class}>\n"
            f'                <img src="{html.escape(rel, quote=True)}" '
            f'alt="" '
            'loading="lazy" decoding="async" />\n'
            f'                <span class="visually-hidden">{escaped_name}</span>\n'
            "              </li>"
        )
    return "\n".join(rows)


def render_steps(items: list[dict]) -> str:
    rows = []
    for i, item in enumerate(items, start=1):
        rows.append(
            '              <li class="step">\n'
            f'                <h3 class="step-title"><span class="step-number">{i}.</span> '
            f'{html.escape(item["title"], quote=False)}</h3>\n'
            f"                <p>{html.escape(item['body'], quote=False)}</p>\n"
            "              </li>"
        )
    return "\n".join(rows)


def render_footer_links(links: list[dict]) -> str:
    return "\n".join(
        f'          <a href="{html.escape(link["href"], quote=True)}">'
        f'{html.escape(link["label"], quote=False)}</a>'
        for link in links
    )


PLUS_ICON = (
    '<svg class="icon faq-toggle-icon" aria-hidden="true">'
    '<use href="#icon-plus"></use></svg>'
)


GEO_AREA_SPAN = "<span data-geo-area>your area</span>"


def _plain_phone(text: str) -> str:
    return text.replace("{{phone}}", "(800) 555-5555").replace("{{geoArea}}", "your area")


def render_faqs(items: list[dict]) -> str:
    rows = []
    for i, item in enumerate(items):
        question = html.escape(item["question"], quote=False)
        answer = (
            html.escape(item["answer"], quote=False)
            .replace("{{phone}}", PHONE_LINK.format(source=f"faq-{i + 1}"))
            .replace("{{geoArea}}", GEO_AREA_SPAN)
        )
        rows.append(
            '              <details class="faq-item">\n'
            f"                <summary><span>{question}</span>{PLUS_ICON}</summary>\n"
            f'                <p class="faq-answer">{answer}</p>\n'
            "              </details>"
        )
    return "\n".join(rows)


def absolute_url(canonical: str, path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return canonical.rstrip("/") + "/" + path.lstrip("/")


def render_json_ld(site: dict, faqs: list[dict]) -> str:
    canonical = site["canonicalUrl"]
    org_id = canonical.rstrip("/") + "/#organization"
    website_id = canonical.rstrip("/") + "/#website"
    logo_url = absolute_url(canonical, "assets/images/appliance-helpers-logo.png")
    graph = [
        {
            "@type": "Organization",
            "@id": org_id,
            "name": site["siteName"],
            "url": canonical,
            "logo": {
                "@type": "ImageObject",
                "url": logo_url,
                "width": 800,
                "height": 247,
            },
            "description": site["entityDescription"],
            "areaServed": {"@type": "Country", "name": "United States"},
        },
        {
            "@type": "WebSite",
            "@id": website_id,
            "url": canonical,
            "name": site["siteName"],
            "description": site["entityDescription"],
            "publisher": {"@id": org_id},
            "inLanguage": "en-US",
        },
        {
            "@type": "WebPage",
            "@id": canonical,
            "url": canonical,
            "name": site["title"],
            "description": site["description"],
            "isPartOf": {"@id": website_id},
            "about": {"@id": org_id},
            "primaryImageOfPage": {
                "@type": "ImageObject",
                "url": absolute_url(canonical, site["ogImage"]),
                "width": site["ogImageWidth"],
                "height": site["ogImageHeight"],
            },
        },
        {
            "@type": "Service",
            "name": "Appliance Repair Referral",
            "serviceType": "Appliance repair",
            "provider": {"@id": org_id},
            "areaServed": {"@type": "Country", "name": "United States"},
            "description": site["entityDescription"],
            "url": canonical,
        },
        {
            "@type": "FAQPage",
            "@id": canonical.rstrip("/") + "/#faq",
            "url": canonical.rstrip("/") + "/#faq",
            "mainEntity": [
                {
                    "@type": "Question",
                    "name": item["question"],
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": _plain_phone(item["answer"]),
                    },
                }
                for item in faqs
            ],
        },
    ]
    payload = {"@context": "https://schema.org", "@graph": graph}
    return json.dumps(payload, ensure_ascii=True, separators=(",", ":"))


def apply_seo(html_out: str, site: dict, faqs: list[dict]) -> str:
    og_path = ROOT / site["ogImage"]
    if not og_path.is_file():
        raise SystemExit(f"missing Open Graph image: {site['ogImage']}")
    replacements = {
        "{{seo.title}}": html.escape(site["title"], quote=True),
        "{{seo.description}}": html.escape(site["description"], quote=True),
        "{{seo.canonicalUrl}}": html.escape(site["canonicalUrl"], quote=True),
        "{{seo.siteName}}": html.escape(site["siteName"], quote=True),
        "{{seo.locale}}": html.escape(site["locale"], quote=True),
        "{{seo.ogImageUrl}}": html.escape(
            absolute_url(site["canonicalUrl"], site["ogImage"]), quote=True
        ),
        "{{seo.ogImageAlt}}": html.escape(site["ogImageAlt"], quote=True),
        "{{seo.ogImageWidth}}": str(site["ogImageWidth"]),
        "{{seo.ogImageHeight}}": str(site["ogImageHeight"]),
        "{{seo.ogImageType}}": html.escape(site["ogImageType"], quote=True),
        "{{jsonLd}}": render_json_ld(site, faqs),
        "{{criticalCss}}": render_critical_css(),
    }
    for token, value in replacements.items():
        if token not in html_out:
            raise SystemExit(f"layout is missing {token}")
        html_out = html_out.replace(token, value)
    return html_out


def render_robots(canonical: str) -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "\n"
        f"Sitemap: {canonical.rstrip('/')}/sitemap.xml\n"
    )


def render_sitemap(canonical: str) -> str:
    loc = html.escape(canonical, quote=True)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        "  <url>\n"
        f"    <loc>{loc}</loc>\n"
        "    <changefreq>weekly</changefreq>\n"
        "    <priority>1.0</priority>\n"
        "  </url>\n"
        "</urlset>\n"
    )


def render_llms_txt(site: dict) -> str:
    home = site["canonicalUrl"]
    return (
        f"# {site['siteName']}\n"
        "\n"
        f"> {site['entityDescription']} Same-day and next-day service is generally available.\n"
        "\n"
        "The homepage is a call-to-schedule landing page. Company name, services, "
        "brands, how scheduling works, service-area language, and FAQs are in the "
        "initial HTML.\n"
        "\n"
        "## Pages\n"
        "\n"
        f"- [Home]({home}): Appliance repair referral, services, brands, how it works, FAQ\n"
        f"- [How it works]({home.rstrip('/')}/#how-it-works): Scheduling steps\n"
        f"- [FAQ]({home.rstrip('/')}/#faq): Brands, same-day availability, pricing, service area\n"
        "\n"
        "## Notes\n"
        "\n"
        "- Appliance Helpers does not employ the technicians; they are independent contractors.\n"
        "- Up-front quotes are given before repair work begins.\n"
        "- Primary conversion is a phone call from the page.\n"
    )


CLOUDFLARE_HEADERS = """\
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin

/assets/*
  Cache-Control: public, max-age=31536000, immutable

/assets/images/og-appliance-helpers.jpg
  Cache-Control: public, max-age=604800

/robots.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600

/sitemap.xml
  Content-Type: application/xml; charset=utf-8
  Cache-Control: public, max-age=3600

/llms.txt
  Content-Type: text/plain; charset=utf-8
  Cache-Control: public, max-age=3600
"""


def assemble() -> str:
    content = json.loads(CONTENT_PATH.read_text())
    layout = LAYOUT_PATH.read_text()

    pieces = {
        "icons": load_partial("icons"),
        "header": load_partial("header"),
        "hero": load_partial("hero").replace(
            "{{heroChecklist}}", render_hero_checklist(content["heroChecklist"])
        ),
        "services": load_partial("services").replace(
            "{{services}}", render_services(content["services"])
        ),
        "callout-1": render_callout(load_partial("callout"), content["callouts"][0]),
        "benefits": load_partial("benefits").replace(
            "{{benefits}}", render_benefits(content["benefits"])
        ),
        "callout-2": render_callout(load_partial("callout"), content["callouts"][1]),
        "brands": load_partial("brands").replace(
            "{{brands}}", render_brands(content["brands"])
        ),
        "how-it-works": load_partial("how-it-works").replace(
            "{{steps}}", render_steps(content["steps"])
        ),
        "service-area": load_partial("service-area"),
        "faq": load_partial("faq").replace("{{faqs}}", render_faqs(content["faqs"])),
        "sidebar": fill_photo(load_partial("sidebar"), content["heroPhoto"]),
        "final-cta": load_partial("final-cta"),
        "footer": load_partial("footer")
        .replace("{{footerLinks}}", render_footer_links(content["footerLinks"]))
        .replace("{{disclaimer}}", html.escape(content["disclaimer"], quote=False)),
        "mobile-bar": load_partial("mobile-bar"),
    }

    html_out = layout
    for name, fragment in pieces.items():
        token = f"<!-- include:{name} -->"
        if token not in html_out:
            raise SystemExit(f"layout is missing {token}")
        html_out = html_out.replace(token, fragment.rstrip("\n"))

    leftover = [line for line in html_out.splitlines() if "<!-- include:" in line]
    if leftover:
        raise SystemExit("unresolved includes:\n" + "\n".join(leftover))

    html_out = apply_seo(html_out, content["site"], content["faqs"])

    if "{{" in html_out:
        raise SystemExit("unresolved template tokens remain in index.html")

    return html_out


def _ignore_assets(directory: str, names: list[str]) -> list[str]:
    return [name for name in names if name in ASSET_SKIP or name.startswith(".")]


# Static secondary pages, not part of the src/partials templating system
# (each is small and self-contained enough not to warrant it). They still
# load css/main.css and js/main.js, so they need to ship in dist/ too.
SECONDARY_PAGES = ("about-us.html", "how-it-works.html", "do-not-sell.html")


def publish_dist(html_out: str, site: dict) -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    (DIST / "index.html").write_text(html_out if html_out.endswith("\n") else html_out + "\n")
    for name in SECONDARY_PAGES:
        shutil.copy(ROOT / name, DIST / name)
    shutil.copytree(
        ROOT / "css", DIST / "css", ignore=lambda d, names: {"main.src.css"} & set(names)
    )
    shutil.copytree(ROOT / "js", DIST / "js")
    shutil.copytree(ROOT / "assets", DIST / "assets", ignore=_ignore_assets)
    (DIST / "robots.txt").write_text(render_robots(site["canonicalUrl"]))
    (DIST / "sitemap.xml").write_text(render_sitemap(site["canonicalUrl"]))
    (DIST / "llms.txt").write_text(render_llms_txt(site))
    (DIST / "_headers").write_text(CLOUDFLARE_HEADERS)
    print(f"wrote {DIST.relative_to(ROOT)}/")


def main() -> None:
    content = json.loads(CONTENT_PATH.read_text())
    html_out = assemble()
    OUT_PATH.write_text(html_out if html_out.endswith("\n") else html_out + "\n")
    print(f"wrote {OUT_PATH.relative_to(ROOT)} ({OUT_PATH.stat().st_size} bytes)")

    css_out = bundle_css()
    CSS_OUT_PATH.write_text(css_out)
    print(f"wrote {CSS_OUT_PATH.relative_to(ROOT)} ({CSS_OUT_PATH.stat().st_size} bytes)")

    publish_dist(html_out, content["site"])


if __name__ == "__main__":
    main()
