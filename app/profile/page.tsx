import { ProfileWorkspace } from "@/components/profile-workspace";
import { noIndexMetadata } from "@/lib/site-metadata";

export const metadata = noIndexMetadata(
  "Student profile",
  "Manage your private AdmitOS student profile.",
);

export default function ProfilePage() {
  return <ProfileWorkspace />;
}