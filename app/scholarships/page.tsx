import { ScholarshipWorkspace } from "@/components/scholarship-workspace";
import { scholarshipOpportunities } from "@/data/scholarships";

export const metadata = {
  title: "Scholarships",
  description:
    "Find scholarship opportunities and organize funding research for your university journey.",
};

export default function ScholarshipsPage() {
  return <ScholarshipWorkspace opportunities={scholarshipOpportunities} />;
}