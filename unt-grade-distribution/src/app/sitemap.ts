import type { MetadataRoute } from "next";
import { SITE_URL, sitemapPaths } from "@/lib/seo";

// Built from the same manifest that powers search and the course/instructor pages.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return (await sitemapPaths()).map((path) => ({ url: path === "/" ? SITE_URL : `${SITE_URL}${path}` }));
}
