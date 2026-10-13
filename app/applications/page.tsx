import { ApplicationTracker } from "@/components/application-tracker";
import { applicationRecords } from "@/data/applications";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata = noIndexMetadata(
  "Applications",
  "Track your private university applications and next steps.",
);

export default function ApplicationsPage() {
  return <ApplicationTracker applications={applicationRecords} />;
}