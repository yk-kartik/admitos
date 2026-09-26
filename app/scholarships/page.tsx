import { ScholarshipWorkspace } from "@/components/scholarship-workspace";
import { scholarshipOpportunities } from "@/data/scholarships";

export default function ScholarshipsPage() {
  return <ScholarshipWorkspace opportunities={scholarshipOpportunities} />;
}