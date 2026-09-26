import { UniversityDirectory } from "@/components/university-directory";
import { universities } from "@/data/universities";

export default function UniversitiesPage() {
  return <UniversityDirectory universities={universities} />;
}