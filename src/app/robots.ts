import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private areas, previews and redirects — nothing for search engines there.
      disallow: ["/admin", "/account", "/business/", "/api/", "/auth/", "/preview", "/go/", "/claim/", "/pet/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
