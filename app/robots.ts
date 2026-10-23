import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/tools/research-studio", "/date/"] },
    sitemap: "https://www.qalamworks.com/sitemap.xml",
  };
}
