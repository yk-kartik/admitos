import { ProfileWorkspace } from "@/components/profile-workspace";
import { emptyStudentProfile } from "@/data/profile";

export default function ProfilePage() {
  return <ProfileWorkspace profile={emptyStudentProfile} />;
}