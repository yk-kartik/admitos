import { UniversityDirectory } from "@/components/university-directory";
import { universities } from "@/data/universities";

export const metadata = {
  title: "Universities",
  description:
    "Explore university programs, admissions requirements, and source-backed details in AdmitOS.",
};

export default function UniversitiesPage() {
  return <UniversityDirectory universities={universities} />;
}