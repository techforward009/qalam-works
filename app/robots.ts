import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/my/", "/api/my/"] },
    sitemap: "https://www.qalamworks.com/sitemap.xml",
  };
}
