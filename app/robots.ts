import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const host = siteUrl ? new URL(siteUrl).origin : undefined;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/universities", "/scholarships", "/pathways"],
      disallow: [
        "/dashboard",
        "/ai-advisor",
        "/applications",
        "/application-copilot",
        "/profile",
        "/sign-in",
        "/api/",
      ],
    },
    ...(host ? { sitemap: `${host}/sitemap.xml` } : {}),
  };
}
