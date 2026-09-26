import { notFound } from "next/navigation";
import { UniversityDetail } from "@/components/university-detail";
import { getUniversityBySlug, universities } from "@/data/universities";

export function generateStaticParams() {
  return universities.map((university) => ({ slug: university.slug }));
}

export default async function UniversityProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const university = getUniversityBySlug(slug);

  if (!university) notFound();

  return <UniversityDetail university={university} />;
}