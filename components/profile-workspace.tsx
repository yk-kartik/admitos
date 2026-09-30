"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Compass,
  GraduationCap,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ApiSuccess } from "@/types/api";
import type { StudentProfile } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";
import { ProgressBar } from "@/components/ui/progress-bar";
import { calculateProfileCompletion, getIncompleteProfileSections, toEditableProfilePayload } from "@/utils/profile";

const textFields = [
  "fullName", "preferredName", "dateOfBirth", "phone", "address", "countryOfResidence",
  "currentLocation", "intendedStudyLevel", "intendedIntake", "academicBackground",
  "currentUniversity", "degreeProgram", "currentAcademicYear", "currentSemester",
] as const;
const numericFields = ["cgpa", "cgpaScale", "percentage"] as const;
const listFields = [
  "citizenships", "targetCountries", "targetUniversities", "targetPrograms", "intendedStudyAreas",
] as const;
const structuredFields = [
  "grades", "schoolYears", "testScores", "englishQualifications", "extracurricularActivities",
  "projects", "research", "leadership", "achievements", "competitions", "volunteering",
  "workExperience", "languages", "financialConstraints",
] as const;

type ProfileState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "unavailable" }
  | { status: "ready"; response: ApiSuccess<StudentProfile> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStudentProfile(value: unknown): value is StudentProfile {
  if (!isRecord(value)) return false;
  const nullableTextFields = [
    "fullName", "preferredName", "currentLocation", "intendedStudyLevel",
    "intendedIntake", "academicBackground", "currentUniversity", "degreeProgram",
  ];
  const listFields = [
    "citizenships", "grades", "testScores", "englishQualifications",
    "extracurricularActivities", "projects", "research", "leadership",
    "targetCountries", "targetUniversities", "intendedStudyAreas", "languages",
  ];
  return (value.id === null || typeof value.id === "string") &&
    nullableTextFields.every((field) => value[field] === null || typeof value[field] === "string") &&
    listFields.every((field) => Array.isArray(value[field])) &&
    typeof value.isMock === "boolean";
}

function isProfileResponse(value: unknown): value is ApiSuccess<StudentProfile> {
  return isRecord(value) &&
    (value.dataSource === "DATABASE" || value.dataSource === "MOCK") &&
    isStudentProfile(value.data);
}

export function ProfileWorkspace() {
  const [state, setState] = useState<ProfileState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profile", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (!response.ok) {
          setState({ status: "unavailable" });
          return;
        }
        const body: unknown = await response.json();
        if (!isProfileResponse(body)) {
          setState({ status: "unavailable" });
          return;
        }
        setState({ status: "ready", response: body });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "unavailable" });
      });

    return () => controller.abort();
  }, []);

  if (state.status === "loading") {
    return <ProfileMessage title="Loading profile" message="Checking your authenticated profile…" />;
  }
  if (state.status === "unauthenticated") {
    return <ProfileMessage title="Sign in required" message="Sign in to access your private student profile." signIn />;
  }
  if (state.status === "unavailable") {
    return <ProfileMessage title="Profile unavailable" message="Persistent profile data is temporarily unavailable." />;
  }

  return <LoadedProfile initialProfile={state.response.data} isMock={state.response.dataSource === "MOCK" || state.response.data.isMock} />;
}

function ProfileMessage({ title, message, signIn = false }: { title: string; message: string; signIn?: boolean }) {
  return (
    <div className="workspace-page profile-workspace">
      <PageHeading eyebrow="STUDENT RECORD" title="Student Profile" description="Keep academic context and study preferences together as your plans develop." />
      <section className="section-card profile-data-section" role="status">
        <h2>{title}</h2>
        <p>{message}</p>
        {signIn && <Link className="auth-primary-action" href="/sign-in?returnTo=%2Fprofile">Sign in</Link>}
      </section>
    </div>
  );
}

function LoadedProfile({ initialProfile, isMock }: { initialProfile: StudentProfile; isMock: boolean }) {
  const [profile, setProfile] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  if (editing) {
    return (
      <ProfileEditor
        profile={profile}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setProfile(updated);
          setEditing(false);
          setSaved(true);
        }}
        isMock={isMock}
      />
    );
  }

  return (
    <>
      {saved && <p className="profile-save-success" role="status">Profile changes saved.</p>}
      <ProfileSummary profile={profile} isEmpty={profile.id === null} isMock={isMock} onEdit={() => { setSaved(false); setEditing(true); }} />
    </>
  );
}

function ProfileEditor({
  profile,
  onCancel,
  onSaved,
  isMock,
}: {
  profile: StudentProfile;
  onCancel: () => void;
  onSaved: (profile: StudentProfile) => void;
  isMock: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "unauthenticated" | "unavailable" | "invalid">("idle");
  const [validationFields, setValidationFields] = useState<string[]>([]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setValidationFields([]);

    const form = new FormData(event.currentTarget);
    const payload: Record<string, unknown> = { ...toEditableProfilePayload(profile) };
    for (const field of textFields) {
      const value = form.get(field);
      payload[field] = typeof value === "string" && value.trim() ? value.trim() : null;
    }
    for (const field of numericFields) {
      const value = form.get(field);
      payload[field] = typeof value === "string" && value.trim() ? Number(value) : null;
    }
    for (const field of listFields) {
      const value = form.get(field);
      payload[field] = typeof value === "string"
        ? value.split("\n").map((item) => item.trim()).filter(Boolean)
        : [];
    }
    try {
      for (const field of structuredFields) {
        const value = form.get(field);
        if (typeof value !== "string") continue;
        payload[field] = JSON.parse(value);
      }
    } catch {
      setStatus("invalid");
      setValidationFields(["Check that each structured field contains valid JSON."]);
      return;
    }

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        setStatus("unauthenticated");
        return;
      }
      const body: unknown = await response.json();
      if (response.status === 400) {
        setStatus("invalid");
        setValidationFields(getValidationFields(body));
        return;
      }
      if (!response.ok || !isProfileResponse(body)) {
        setStatus("unavailable");
        return;
      }
      onSaved(body.data);
    } catch {
      setStatus("unavailable");
    }
  }

  return (
    <div className="workspace-page profile-workspace">
      <PageHeading eyebrow="STUDENT RECORD" title="Edit student profile" description="Only the fields shown here are sent for update." badge={isMock ? "MOCK DATA · NON-AUTHORITATIVE" : "PRIVATE PROFILE"} />
      {isMock && <p className="profile-state-message" role="status">Mock data cannot be saved as an authenticated profile.</p>}
      {status === "unauthenticated" && <p className="profile-state-message" role="alert">Your session has expired. Sign in again to save profile changes.</p>}
      {status === "unavailable" && <p className="profile-state-message" role="alert">Profile storage is unavailable. Your changes have not been saved.</p>}
      {status === "invalid" && <div className="profile-validation-error" role="alert"><strong>Review the highlighted profile data.</strong><ul>{validationFields.map((field) => <li key={field}>{field}</li>)}</ul></div>}
      <form className="section-card profile-editor" onSubmit={save}>
        <fieldset disabled={status === "saving" || isMock}>
          <legend>Personal and study details</legend>
          <div className="profile-editor-grid">
            {textFields.map((field) => <label key={field}>{labelFor(field)}<input name={field} defaultValue={profile[field] ?? ""} /></label>)}
            {numericFields.map((field) => <label key={field}>{labelFor(field)}<input name={field} type="number" min="0" step="any" defaultValue={profile[field] ?? ""} /></label>)}
          </div>
        </fieldset>
        <fieldset disabled={status === "saving" || isMock}>
          <legend>Lists</legend>
          <div className="profile-editor-grid">
            {listFields.map((field) => <label key={field}>{labelFor(field)}<textarea name={field} rows={3} defaultValue={profile[field]?.join("\n") ?? ""} /></label>)}
          </div>
        </fieldset>
        <fieldset disabled={status === "saving" || isMock}>
          <legend>Academic records, tests, experience, and finances</legend>
          <div className="profile-editor-grid">
            {structuredFields.map((field) => <label key={field}>{labelFor(field)}<textarea name={field} rows={field === "schoolYears" || field === "financialConstraints" ? 6 : 4} spellCheck={false} defaultValue={JSON.stringify(profile[field] ?? null, null, 2)} /></label>)}
          </div>
        </fieldset>
        <div className="profile-editor-actions">
          <button type="submit" disabled={status === "saving" || isMock}>{status === "saving" ? "Saving…" : "Save profile"}</button>
          <button type="button" onClick={onCancel} disabled={status === "saving"}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

function getValidationFields(value: unknown): string[] {
  if (!isRecord(value) || !isRecord(value.error) || !Array.isArray(value.error.fields)) return ["Profile values did not pass validation."];
  return value.error.fields.every((field): field is string => typeof field === "string")
    ? value.error.fields
    : ["Profile values did not pass validation."];
}

function labelFor(field: string): string {
  return field.replace(/([A-Z])/g, " $1").replace(/^./, (first) => first.toUpperCase());
}

function ProfileSummary({ profile, isEmpty, isMock, onEdit }: { profile: StudentProfile; isEmpty: boolean; isMock: boolean; onEdit: () => void }) {
  const completion = calculateProfileCompletion(profile);
  const incompleteSections = getIncompleteProfileSections(profile);
  const displayName = profile.preferredName ?? profile.fullName ?? "Profile not started";

  return (
    <div className="workspace-page profile-workspace">
      <PageHeading
        eyebrow="STUDENT RECORD"
        title="Student Profile"
        description="Keep academic context and study preferences together as your plans develop."
        badge={isMock ? "MOCK PROFILE · NON-AUTHORITATIVE" : isEmpty ? "PRIVATE PROFILE · EMPTY" : "PRIVATE PROFILE"}
      />

      <div className="profile-layout">
        <aside className="profile-summary-card">
          <span className="profile-large-avatar" aria-hidden="true"><UserRound size={23} /></span>
          <span className="panel-eyebrow">STUDENT PROFILE</span>
          <h2>{displayName}</h2>
          <p>{profile.intendedStudyLevel ?? "Study level not selected"} · {profile.intendedIntake ?? "Intake not selected"}</p>
          <div className="profile-progress-heading"><span>Profile completion</span><strong>{completion}%</strong></div>
          <ProgressBar value={completion} label="Profile completion" />
          <div className="profile-status-note"><CircleHelp size={14} aria-hidden="true" /> {isEmpty ? "No personal information has been added." : `${completion}% of profile sections are complete.`}</div>
          <button type="button" onClick={onEdit} disabled={isMock}>Edit profile</button>
          {isMock && <p className="profile-state-message">Mock profile data is non-authoritative and cannot be edited here.</p>}
          <details className="profile-incomplete-sections">
            <summary>Incomplete sections ({incompleteSections.length})</summary>
            <ul>{incompleteSections.map((section) => <li key={section}>{section}</li>)}</ul>
          </details>
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