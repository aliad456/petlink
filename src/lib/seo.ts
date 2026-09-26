import { SITE_NAME } from "./site";

// schema.org blocks for Google (rendered as <script type="application/ld+json">).
// "<" is escaped so text can never close the script tag.
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

// Who we are: the site name Google shows above results, and the logo.
export function siteJsonLd(base: string) {
  return jsonLd({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${base}/#website`,
        url: base,
        name: SITE_NAME,
        alternateName: ["קאמי", "Kami ישראל"],
        inLanguage: "he-IL",
        publisher: { "@id": `${base}/#org` },
      },
      {
        "@type": "Organization",
        "@id": `${base}/#org`,
        name: SITE_NAME,
        url: base,
        logo: `${base}/icons/icon-512.png`,
        areaServed: "IL",
      },
    ],
  });
}

// Breadcrumbs under the result title: Kami › וטרינרים › באר שבע.
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  });
}

// The businesses shown on a category page, in order.
export function itemListJsonLd(name: string, urls: string[]) {
  return jsonLd({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: urls.map((url, i) => ({ "@type": "ListItem", position: i + 1, url })),
  });
}
