import { UniversityDirectory } from "@/components/university-directory";
import { universities } from "@/data/universities";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata = publicPageMetadata(
  "/universities",
  "Universities",
  "Explore university programs, admissions requirements, and source-backed details in AdmitOS.",
);

export default function UniversitiesPage() {
  return <UniversityDirectory universities={universities} />;
}