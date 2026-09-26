import { ApplicationTracker } from "@/components/application-tracker";
import { applicationRecords } from "@/data/applications";

export default function ApplicationsPage() {
  return <ApplicationTracker applications={applicationRecords} />;
}