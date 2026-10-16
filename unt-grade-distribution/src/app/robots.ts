import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Cloudflare's managed robots.txt prepends its AI-crawler rules to this file.
// Keep /encrypted/ crawlable (pages need it to render) and /cart crawlable (so
// crawlers can see its noindex). /api/ only serves the extension, MCP, and logging.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
