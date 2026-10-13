import { AdvisorWorkspace } from "@/components/advisor-workspace";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata = noIndexMetadata(
  "AI advisor",
  "Evidence-bound admissions guidance for your private AdmitOS workspace.",
);

export default function AiAdvisorPage() {
  return <AdvisorWorkspace />;
}