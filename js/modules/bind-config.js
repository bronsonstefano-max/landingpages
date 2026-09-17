/**
 * Fill every [data-cfg] / [data-cfg-href] node from SITE_CONFIG, and keep
 * <title> / meta description in sync for crawlers that execute JS.
 */

export function bindConfig(cfg) {
  document.querySelectorAll("[data-cfg]").forEach((el) => {
    const key = el.getAttribute("data-cfg");
    if (cfg[key] != null) el.textContent = cfg[key];
  });

  document.querySelectorAll("[data-cfg-href]").forEach((el) => {
    const key = el.getAttribute("data-cfg-href");
    if (cfg[key] != null) el.setAttribute("href", cfg[key]);
  });
}

export function syncHeadMetadata(cfg) {
  const replacements = {
    "\\[BRAND NAME\\]": cfg.brandName,
    "\\[PHONE NUMBER\\]": cfg.phoneDisplay,
    "\\[CITY\\]": cfg.city,
    "\\[STATE\\]": cfg.state,
    "\\[SERVICE AREA\\]": cfg.serviceArea,
  };

  function applyReplacements(text) {
    Object.keys(replacements).forEach((token) => {
      const value = replacements[token];
      if (value == null) return;
      text = text.replace(new RegExp(token, "g"), value);
    });
    return text;
  }

  if (document.title) {
    document.title = applyReplacements(document.title);
  }

  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) {
    metaDescription.setAttribute(
      "content",
      applyReplacements(metaDescription.getAttribute("content") || "")
    );
  }
}
