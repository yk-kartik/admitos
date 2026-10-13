import { notFound } from "next/navigation";
import { UniversityDetail } from "@/components/university-detail";
import { mockUniversityRepository } from "@/repositories/mock";
import { publicPageMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = await mockUniversityRepository.getBySlug(slug);
  return {
    ...publicPageMetadata(
      `/universities/${slug}`,
      university?.name ?? "University",
      university
        ? `Explore ${university.name} programs, requirements, deadlines, and source status.`
        : "Explore university programs and admissions information.",
    ),
  };
}

export async function generateStaticParams() {
  const universities = await mockUniversityRepository.list();
  return universities.map((university) => ({ slug: university.slug }));
}

export default async function UniversityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = await mockUniversityRepository.getBySlug(slug);

  if (!university) notFound();

  return <UniversityDetail university={university} />;
}