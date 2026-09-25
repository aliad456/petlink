import { mediaUrl } from "./media";
import type { BusinessView } from "./types";

// schema.org data for a business page, so Google can show it as a local
// business (address, phone, hours). Rendered as <script type="application/ld+json">.

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function businessJsonLd(b: BusinessView, url: string) {
  const hours = Object.entries(b.hours).flatMap(([day, ranges]) =>
    (ranges ?? []).map(([opens, closes]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${DAY[Number(day)]}`,
      opens,
      closes,
    })),
  );
  const sameAs = [
    b.website,
    b.instagram && `https://instagram.com/${b.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`,
    b.facebook && (b.facebook.startsWith("http") ? b.facebook : `https://facebook.com/${b.facebook}`),
  ].filter((v): v is string => !!v && /^https?:\/\//.test(v));

  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    url,
    name: b.name,
    description: b.tagline || b.bio?.slice(0, 300) || undefined,
    image: mediaUrl(b.cover_path) ?? mediaUrl(b.avatar_path) ?? undefined,
    logo: mediaUrl(b.avatar_path) ?? undefined,
    telephone: b.phone ?? undefined,
    email: b.email ?? undefined,
    address:
      b.city || b.address
        ? {
            "@type": "PostalAddress",
            streetAddress: b.address ?? undefined,
            addressLocality: b.city ?? undefined,
            addressCountry: "IL",
          }
        : undefined,
    areaServed: b.service_area ?? undefined,
    openingHoursSpecification: hours.length ? hours : undefined,
    aggregateRating:
      b.review_count && b.rating_avg != null
        ? { "@type": "AggregateRating", ratingValue: Number(b.rating_avg).toFixed(1), reviewCount: b.review_count }
        : undefined,
    sameAs: sameAs.length ? sameAs : undefined,
  };
  // "<" escaped so text can never close the script tag.
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
