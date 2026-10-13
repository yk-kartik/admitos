import type { MetadataRoute } from "next";
import { mockUniversityRepository } from "@/repositories/mock";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return [];

  const baseUrl = new URL(siteUrl).origin;
  const universities = await mockUniversityRepository.list();

  return [
    "",
    "/universities",
    "/scholarships",
    "/pathways",
    ...universities.map((university) => `/universities/${university.slug}`),
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
