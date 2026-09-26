import { notFound } from "next/navigation";
import { UniversityDetail } from "@/components/university-detail";
import { mockUniversityRepository } from "@/repositories/mock";

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