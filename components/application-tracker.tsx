"use client";

import { ArrowUpRight, CalendarDays, Check, Circle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Application, ApplicationStatus } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";

type ApplicationTrackerProps = {
  applications: ApplicationView[];
};

type ApplicationView = Omit<Application, "source"> & { source?: Application["source"] };

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
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | "All">("All");
  useEffect(() => {
    let active = true;
    fetch("/api/applications")
      .then(async (response) => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (active && response.ok && Array.isArray(body.data)) {
          setVisibleApplications(body.data);
          setDataSource(body.dataSource === "DATABASE" ? "DATABASE" : "MOCK");
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const filteredApplications = visibleApplications.filter(
    (application) => selectedStatus === "All" || application.status === selectedStatus,
  );

  return (
    <div className="workspace-page application-tracker">
      <PageHeading
        eyebrow="APPLICATION WORKSPACE"
        title="Application Tracker"
        description="Keep materials, milestones, and target dates visible across your shortlist."
        badge={dataSource === "DATABASE" ? "YOUR APPLICATIONS" : "SAMPLE APPLICATIONS"}
      />

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
                <StatusPill tone={statusTone[application.status]}>{application.status}</StatusPill>
              </div>
              <div className="tracker-progress-row">
                <div><span>Preparation progress</span><strong>{application.progress}%</strong></div>
                <ProgressBar value={application.progress} label={`${application.universityName} preparation progress`} />
              </div>
              <div className="tracker-card-bottom">
                <div className="tracker-tasks-count"><Check size={14} aria-hidden="true" /> {completedTasks} of {application.tasks.length} planning steps complete</div>
                <div className="tracker-deadline"><CalendarDays size={14} aria-hidden="true" /><span>{dataSource === "DATABASE" ? "Deadline" : "Sample deadline"}</span><strong>{formatDeadline(application.deadline)}</strong></div>
                <Link href={`/application-copilot?application=${application.id}`}>Prepare draft <ArrowUpRight size={13} aria-hidden="true" /></Link>
                <Link href={`/universities/${application.universitySlug}`}>View profile <ArrowUpRight size={13} aria-hidden="true" /></Link>
              </div>
              <details className="tracker-task-details">
                <summary>Planning checklist <span>{application.tasks.length} items</span></summary>
                <ul>{application.tasks.map((task) => <li key={task.label}>{task.complete ? <Check size={14} aria-label="Complete" /> : <Circle size={14} aria-label="Not complete" />}{task.label}</li>)}</ul>
              </details>
            </article>
          );
        })}
      </div>
      <p className="data-disclaimer">{dataSource === "DATABASE" ? "Application readiness and deadlines remain subject to verified evidence and your review." : "Progress and deadline values are mock planning examples, not institution-confirmed application status or dates."}</p>
    </div>
  );
}