"use client";

import { ArrowUpRight, CalendarDays, Check, Circle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import type { Application, ApplicationStatus, University } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";

type ApplicationTrackerProps = {
  applications: ApplicationView[];
};

type ApplicationView = Omit<Application, "source"> & { source?: Application["source"] };
type WorkspaceStatus = "loading" | "ready" | "unauthenticated" | "unavailable";

const statusFilters: (ApplicationStatus | "All")[] = [
  "All",
  "Planning",
  "In progress",
  "Ready to submit",
  "Submitted",
];

const statusTone: Record<ApplicationStatus, "positive" | "attention" | "neutral"> = {
  Planning: "neutral",
  "In progress": "attention",
  "Ready to submit": "positive",
  Submitted: "positive",
};

function formatDeadline(value: string | null) {
  if (!value) return "Not provided";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function ApplicationTracker({ applications }: ApplicationTrackerProps) {
  const [visibleApplications, setVisibleApplications] = useState(applications);
  const [dataSource, setDataSource] = useState<"MOCK" | "DATABASE">("MOCK");
  const [workspaceStatus, setWorkspaceStatus] = useState<WorkspaceStatus>("loading");
  const [universities, setUniversities] = useState<University[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "All">("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newUniversitySlug, setNewUniversitySlug] = useState("");
  const [newProgramId, setNewProgramId] = useState("");
  const [newIntake, setNewIntake] = useState("");
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [applicationsResponse, universitiesResponse] = await Promise.all([
          fetch("/api/applications", { cache: "no-store", signal: controller.signal }),
          fetch("/api/universities", { cache: "no-store", signal: controller.signal }),
        ]);
        const applicationBody: unknown = await applicationsResponse.json();
        const universityBody: unknown = await universitiesResponse.json();
        if (applicationsResponse.status === 401) {
          setWorkspaceStatus("unauthenticated");
          return;
        }
        if (!applicationsResponse.ok || !applicationBody || typeof applicationBody !== "object" || !("data" in applicationBody) || !Array.isArray(applicationBody.data)) {
          setWorkspaceStatus("unavailable");
          return;
        }
        setVisibleApplications(applicationBody.data);
        setDataSource("dataSource" in applicationBody && applicationBody.dataSource === "DATABASE" ? "DATABASE" : "MOCK");
        if (universitiesResponse.ok && universityBody && typeof universityBody === "object" && "data" in universityBody && Array.isArray(universityBody.data)) {
          setUniversities(universityBody.data);
        }
        setWorkspaceStatus("ready");
      } catch {
        if (!controller.signal.aborted) setWorkspaceStatus("unavailable");
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const selectedUniversity = universities.find((university) => university.slug === newUniversitySlug);

  async function readError(response: Response, fallback: string) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object" && "error" in body && body.error && typeof body.error === "object" && "message" in body.error && typeof body.error.message === "string") return body.error.message;
    } catch {
      return fallback;
    }
    return fallback;
  }

  async function createApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const university = universities.find((item) => item.slug === newUniversitySlug);
    const program = university?.programs.find((item) => item.id === newProgramId);
    if (!university || !program || !newIntake.trim()) {
      setCreateError("Choose a university, program, and intake.");
      return;
    }
    setCreatePending(true);
    setCreateError(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ universitySlug: university.slug, program: program.name, programId: program.id, intake: newIntake.trim() }),
      });
      if (!response.ok) {
        setCreateError(await readError(response, "Application could not be created."));
        return;
      }
      const body = await response.json() as { data?: ApplicationView };
      if (!body.data) {
        setCreateError("Application could not be created.");
        return;
      }
      setVisibleApplications((current) => [...current, body.data!]);
      setNewIntake("");
      setCreateOpen(false);
    } catch {
      setCreateError("Application could not be created. Check your connection and try again.");
    } finally {
      setCreatePending(false);
    }
  }

  async function updateApplication(applicationId: string, update: Record<string, unknown>) {
    setPendingApplicationId(applicationId);
    setUpdateError(null);
    try {
      const response = await fetch(`/api/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!response.ok) {
        setUpdateError(await readError(response, "Application could not be updated."));
        return;
      }
      const body = await response.json() as { data?: ApplicationView };
      if (!body.data) {
        setUpdateError("Application could not be updated.");
        return;
      }
      setVisibleApplications((current) => current.map((application) => application.id === applicationId ? body.data! : application));
    } catch {
      setUpdateError("Application could not be updated. Check your connection and try again.");
    } finally {
      setPendingApplicationId(null);
    }
  }

  const filteredApplications = visibleApplications.filter(
    (application) => selectedStatus === "All" || application.status === selectedStatus,
  );

  if (workspaceStatus === "loading") {
    return <div className="workspace-page application-tracker"><PageHeading eyebrow="APPLICATION WORKSPACE" title="Application Tracker" description="Keep materials, milestones, and target dates visible across your shortlist." /><div className="empty-state" role="status"><strong>Loading applications</strong><span>Checking your account and application workspace.</span></div></div>;
  }

  if (workspaceStatus === "unauthenticated") {
    return <div className="workspace-page application-tracker"><PageHeading eyebrow="APPLICATION WORKSPACE" title="Application Tracker" description="Keep materials, milestones, and target dates visible across your shortlist." /><div className="empty-state"><strong>Sign in required</strong><span>Sign in to access and manage your private applications.</span><Link className="auth-primary-action" href="/sign-in?returnTo=%2Fapplications">Sign in</Link></div></div>;
  }

  if (workspaceStatus === "unavailable") {
    return <div className="workspace-page application-tracker"><PageHeading eyebrow="APPLICATION WORKSPACE" title="Application Tracker" description="Keep materials, milestones, and target dates visible across your shortlist." /><div className="empty-state" role="alert"><strong>Applications unavailable</strong><span>Persistent application data is temporarily unavailable.</span></div></div>;
  }

  return (
    <div className="workspace-page application-tracker">
      <PageHeading
        eyebrow="APPLICATION WORKSPACE"
        title="Application Tracker"
        description="Keep materials, milestones, and target dates visible across your shortlist."
        badge={dataSource === "DATABASE" ? "YOUR APPLICATIONS" : "SAMPLE APPLICATIONS"}
      />

      {dataSource === "DATABASE" ? (
        <section className="section-card tracker-create-panel">
          <div className="copilot-panel-heading"><div><span className="panel-eyebrow">NEW APPLICATION</span><h2>Start an application</h2></div><button className="secondary-button" type="button" onClick={() => { setCreateOpen((current) => !current); setCreateError(null); }}>{createOpen ? "Close" : "Create application"}</button></div>
          {createOpen && <form className="auth-form" onSubmit={createApplication}>
            <label className="select-control"><span>University</span><select required value={newUniversitySlug} onChange={(event) => { setNewUniversitySlug(event.target.value); setNewProgramId(""); }}><option value="">Choose a university</option>{universities.map((university) => <option key={university.slug} value={university.slug}>{university.name}</option>)}</select></label>
            <label className="select-control"><span>Program</span><select required value={newProgramId} onChange={(event) => setNewProgramId(event.target.value)} disabled={!selectedUniversity}><option value="">Choose a program</option>{selectedUniversity?.programs.map((program) => <option key={program.id} value={program.id}>{program.credential ? `${program.credential} ` : ""}{program.name}</option>)}</select></label>
            <label>Intake<input required value={newIntake} onChange={(event) => setNewIntake(event.target.value)} placeholder="Fall 2027" maxLength={100} /></label>
            {createError && <p className="auth-error" role="alert">{createError}</p>}
            <button className="auth-primary-action" type="submit" disabled={createPending}>{createPending ? "Creating…" : "Create application"}</button>
          </form>}
        </section>
      ) : <p className="data-disclaimer">Mock mode is read-only. Configure PostgreSQL and sign in to create or update applications.</p>}

      {updateError && <p className="auth-error" role="alert">{updateError}</p>}

      <section className="tracker-summary" aria-label="Application summary">
        <div><span>Applications</span><strong>{visibleApplications.length}</strong></div>
        <div><span>Ready to submit</span><strong>{visibleApplications.filter((item) => item.status === "Ready to submit").length}</strong></div>
        <div><span>Completed tasks</span><strong>{visibleApplications.reduce((sum, item) => sum + item.tasks.filter((task) => task.complete).length, 0)}<small> / {visibleApplications.reduce((sum, item) => sum + item.tasks.length, 0)}</small></strong></div>
        <div className="tracker-summary-note"><ClipboardList size={16} aria-hidden="true" /><span>{dataSource === "DATABASE" ? "Persisted to your account." : "All records are local illustrative data."}</span></div>
      </section>

      <div className="tracker-filter-row">
        <div className="status-tabs" role="group" aria-label="Filter applications by status">
          {statusFilters.map((status) => (
            <button
              key={status}
              className={selectedStatus === status ? "status-tab status-tab-active" : "status-tab"}
              type="button"
              aria-pressed={selectedStatus === status}
              onClick={() => setSelectedStatus(status)}
            >
              {status}
            </button>
          ))}
        </div>
        <span>{filteredApplications.length} shown</span>
      </div>

      <div className="application-tracker-list">
        {filteredApplications.map((application) => {
          const completedTasks = application.tasks.filter((task) => task.complete).length;
          return (
            <article className="tracker-application-card" key={application.id}>
              <div className="tracker-card-top">
                <div className="tracker-university">
                  <span className="tracker-monogram" aria-hidden="true">{application.universityName.split(" ").map((word) => word[0]).slice(0, 2).join("")}</span>
                  <div><span>{application.intake} · {dataSource}</span><h2>{application.universityName}</h2><p>{application.program}</p></div>
                </div>
                {dataSource === "DATABASE" ? <label className="select-control"><span className="sr-only">Application status</span><select value={application.status} disabled={pendingApplicationId === application.id} onChange={(event) => void updateApplication(application.id, { status: event.target.value })}>{statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}</select></label> : <StatusPill tone={statusTone[application.status]}>{application.status}</StatusPill>}
              </div>
              <div className="tracker-progress-row">
                <div><span>Preparation progress</span><strong>{application.progress}%</strong></div>
                <ProgressBar value={application.progress} label={`${application.universityName} preparation progress`} />
              </div>
              <div className="tracker-card-bottom">
                <div className="tracker-tasks-count"><Check size={14} aria-hidden="true" /> {completedTasks} of {application.tasks.length} planning steps complete</div>
                <div className="tracker-deadline"><CalendarDays size={14} aria-hidden="true" /><span>{dataSource === "DATABASE" ? "Deadline" : "Sample deadline"}</span>{dataSource === "DATABASE" ? <input type="date" value={application.deadline ?? ""} disabled={pendingApplicationId === application.id} onChange={(event) => void updateApplication(application.id, { deadline: event.target.value || null })} /> : <strong>{formatDeadline(application.deadline)}</strong>}</div>
                <Link href={`/application-copilot?application=${application.id}`}>Prepare draft <ArrowUpRight size={13} aria-hidden="true" /></Link>
                <Link href={`/universities/${application.universitySlug}`}>View profile <ArrowUpRight size={13} aria-hidden="true" /></Link>
              </div>
              <details className="tracker-task-details">
                <summary>Planning checklist <span>{application.tasks.length} items</span></summary>
                <ul>{application.tasks.map((task) => <li key={task.label}>{dataSource === "DATABASE" ? <label><input type="checkbox" checked={task.complete} disabled={pendingApplicationId === application.id} onChange={(event) => void updateApplication(application.id, { tasks: application.tasks.map((item) => item.label === task.label ? { ...item, complete: event.target.checked } : item) })} />{task.label}</label> : <>{task.complete ? <Check size={14} aria-label="Complete" /> : <Circle size={14} aria-label="Not complete" />}{task.label}</>}</li>)}</ul>
              </details>
            </article>
          );
        })}
      </div>
      <p className="data-disclaimer">{dataSource === "DATABASE" ? "Application readiness and deadlines remain subject to verified evidence and your review." : "Progress and deadline values are mock planning examples, not institution-confirmed application status or dates."}</p>
    </div>
  );
}