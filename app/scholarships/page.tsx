import { ScholarshipWorkspace } from "@/components/scholarship-workspace";
import { scholarshipOpportunities } from "@/data/scholarships";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata = publicPageMetadata(
  "/scholarships",
  "Scholarships",
  "Find scholarship opportunities and organize funding research for your university journey.",
);

export default function ScholarshipsPage() {
  return <ScholarshipWorkspace opportunities={scholarshipOpportunities} />;
}