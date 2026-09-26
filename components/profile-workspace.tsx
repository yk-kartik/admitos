import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Compass,
  GraduationCap,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { StudentProfile } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateProfileCompletion } from "@/utils/profile";

type ProfileWorkspaceProps = {
  profile: StudentProfile;
};

export function ProfileWorkspace({ profile }: ProfileWorkspaceProps) {
  const completion = calculateProfileCompletion(profile);
  const displayName = profile.preferredName ?? profile.fullName ?? "Profile not started";

  return (
    <div className="workspace-page profile-workspace">
      <PageHeading
        eyebrow="STUDENT RECORD"
        title="Student Profile"
        description="Keep academic context and study preferences together as your plans develop."
        badge={profile.isMock ? "MOCK PROFILE" : "PRIVATE PROFILE · EMPTY"}
      />

      <div className="profile-layout">
        <aside className="profile-summary-card">
          <span className="profile-large-avatar" aria-hidden="true"><UserRound size={23} /></span>
          <span className="panel-eyebrow">STUDENT PROFILE</span>
          <h2>{displayName}</h2>
          <p>{profile.intendedStudyLevel ?? "Study level not selected"} · {profile.intendedIntake ?? "Intake not selected"}</p>
          <div className="profile-progress-heading"><span>Profile completion</span><strong>{completion}%</strong></div>
          <ProgressBar value={completion} label="Profile completion" />
          <div className="profile-status-note"><CircleHelp size={14} aria-hidden="true" /> No personal information has been added.</div>
          <Link href="/applications">Go to application tracker <ArrowRight size={14} aria-hidden="true" /></Link>
        </aside>

        <div className="profile-sections">
          <section className="section-card profile-data-section">
            <div className="profile-section-heading"><div><span className="panel-eyebrow">PERSONAL DETAILS</span><h2>About you</h2></div><span className="profile-section-icon"><UserRound size={16} aria-hidden="true" /></span></div>
            <dl className="profile-data-grid">
              <ProfileField label="Full name" value={profile.fullName} />
              <ProfileField label="Preferred name" value={profile.preferredName} />
              <ProfileField label="Citizenship" value={profile.citizenships.join(", ") || null} />
              <ProfileField label="Current location" value={profile.currentLocation} />
            </dl>
          </section>

          <section className="section-card profile-data-section">
            <div className="profile-section-heading"><div><span className="panel-eyebrow">ACADEMIC BACKGROUND</span><h2>Education and results</h2></div><span className="profile-section-icon"><BookOpen size={15} aria-hidden="true" /></span></div>
            <dl className="profile-data-grid">
              <ProfileField label="Academic background" value={profile.academicBackground} />
              <ProfileField label="Current university" value={profile.currentUniversity} />
              <ProfileField label="Degree / program" value={profile.degreeProgram} />
            </dl>
            {profile.grades.length ? (
              <div className="profile-detail-list">{profile.grades.map((grade, index) => <div key={`${grade.subject}-${index}`}><strong>{grade.subject}</strong><span>{grade.result}{grade.scale ? ` · ${grade.scale}` : ""}</span></div>)}</div>
            ) : <EmptyList label="grades" />}
          </section>

          <section className="section-card profile-data-section">
            <div className="profile-section-heading"><div><span className="panel-eyebrow">TESTS AND QUALIFICATIONS</span><h2>Language and test scores</h2></div><span className="profile-section-icon"><GraduationCap size={16} aria-hidden="true" /></span></div>
            {profile.englishQualifications.length || profile.testScores.length ? (
              <div className="profile-detail-list">
                {profile.englishQualifications.map((item) => <div key={`${item.qualification}-${item.date}`}><strong>{item.qualification}</strong><span>{item.score ?? "Score not provided"}</span></div>)}
                {profile.testScores.map((item) => <div key={`${item.testName}-${item.date}`}><strong>{item.testName}</strong><span>{item.score}</span></div>)}
              </div>
            ) : <EmptyList label="test scores or English qualifications" />}
          </section>

          <section className="section-card profile-data-section">
            <div className="profile-section-heading"><div><span className="panel-eyebrow">EXPERIENCE</span><h2>Activities, projects, research, and leadership</h2></div><span className="profile-section-icon"><BookOpen size={15} aria-hidden="true" /></span></div>
            <div className="profile-experience-grid">
              <ExperienceList title="Extracurricular activities" items={profile.extracurricularActivities} />
              <ExperienceList title="Projects" items={profile.projects} />
              <ExperienceList title="Research" items={profile.research} />
              <ExperienceList title="Leadership" items={profile.leadership} />
            </div>
          </section>

          <section className="section-card profile-data-section">
            <div className="profile-section-heading"><div><span className="panel-eyebrow">STUDY GOALS</span><h2>Targets and constraints</h2></div><span className="profile-section-icon"><Compass size={15} aria-hidden="true" /></span></div>
            <dl className="profile-data-grid">
              <ProfileField label="Intended study level" value={profile.intendedStudyLevel} />
              <ProfileField label="Intended intake" value={profile.intendedIntake} />
              <ProfileField label="Target countries" value={profile.targetCountries.join(", ") || null} />
              <ProfileField label="Target universities" value={profile.targetUniversities.join(", ") || null} />
              <ProfileField label="Study areas" value={profile.intendedStudyAreas.join(", ") || null} />
              <ProfileField label="Financial constraints" value={profile.financialConstraints?.notes ?? null} />
            </dl>
          </section>
        </div>
      </div>
      <p className="data-disclaimer">Profile changes are not persisted; this workspace is not connected to an account or backend.</p>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null }) {
  return <div><dt>{label}</dt><dd>{value || <span className="empty-profile-value">Not provided</span>}</dd></div>;
}

function EmptyList({ label }: { label: string }) {
  return <p className="profile-empty-list">No {label} added.</p>;
}

function ExperienceList({
  title,
  items,
}: {
  title: string;
  items: { name: string; role?: string | null; description?: string | null }[];
}) {
  return (
    <div>
      <strong>{title}</strong>
      {items.length ? items.map((item) => <p key={item.name}>{item.name}{item.role ? ` · ${item.role}` : ""}</p>) : <span className="empty-profile-value">Not provided</span>}
    </div>
  );
}