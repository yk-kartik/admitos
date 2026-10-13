import { DashboardView } from "@/components/dashboard-view";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata = noIndexMetadata(
  "Dashboard",
  "Your private AdmitOS admissions workspace.",
);

export default function DashboardPage() {
  return <DashboardView />;
}
