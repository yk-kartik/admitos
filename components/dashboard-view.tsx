import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  dashboardMetrics,
  sampleApplications,
  scholarshipPreview,
  upcomingTasks,
} from "@/data/dashboard";
import { PanelHeading } from "@/components/ui/panel-heading";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusPill } from "@/components/ui/status-pill";

export function DashboardView() {
  return (
    <div className="dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            STUDENT DASHBOARD
            <span className="eyebrow-separator">/</span>
            FALL 2027 INTAKE
          </div>
          <h1>Welcome back, Maya</h1>
          <p>Here&apos;s a clear view of what&apos;s moving and what&apos;s next.</p>
        </div>
        <span className="demo-tag">
          <CircleDot size={12} aria-hidden="true" />
          DEMO WORKSPACE
        </span>
      </div>

      <div className="dashboard-grid">
        <section className="readiness-panel" aria-labelledby="readiness-title">
          <div className="readiness-top">
            <div className="readiness-copy">
              <span className="panel-eyebrow">PROFILE READINESS</span>
              <h2 id="readiness-title">Build a stronger first impression</h2>
              <p>
                A few more details will help shape a more personal admissions
                plan.
              </p>
            </div>
            <div className="readiness-meter" aria-hidden="true">
              <strong>72%</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="readiness-bottom">
            <ProgressBar value={72} label="Profile readiness" />
            <Link href="/profile">
              Continue profile <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section className="surface-panel deadline-panel">
          <PanelHeading
            eyebrow="UP NEXT"
            title="This week"
            action={
              <Link className="panel-action" href="/applications">
                View plan <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            }
          />
          <div className="task-list">
            {upcomingTasks.map((task) => {
              const Icon = task.icon;
              return (
                <div className="task-row" key={task.title}>
                  <div className="task-date" aria-label={`${task.month} ${task.day}`}>
                    <strong>{task.day}</strong>
                    <span>{task.month}</span>
                  </div>
                  <div className="task-copy">
                    <strong>{task.title}</strong>
                    <span>{task.category}</span>
                  </div>
                  <Icon className="task-icon" size={15} aria-hidden="true" />
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="metrics-grid" aria-label="Admissions plan summary">
        {dashboardMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article className="metric-card" key={metric.label}>
              <div className="metric-topline">
                <span>{metric.label}</span>
                <span className={`metric-icon metric-icon-${metric.tone}`}>
                  <Icon size={15} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <strong className="metric-value">{metric.value}</strong>
              <span className="metric-detail">{metric.detail}</span>
            </article>
          );
        })}
      </section>

      <div className="dashboard-lower-grid">
        <section className="section-card" aria-labelledby="applications-title">
          <PanelHeading
            eyebrow="APPLICATION TRACKER"
            title="Your applications"
            action={
              <Link className="panel-action" href="/applications">
                View all <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            }
          />
          <div className="overview-summary">
            <strong>3 active</strong>
            <span className="summary-dot" />
            <span>Sample applications</span>
          </div>
          <div className="application-list">
            {sampleApplications.map((application) => (
              <div className="application-row" key={application.university}>
                <div className="university-cell">
                  <span
                    className={`university-monogram ${application.color}`}
                    aria-hidden="true"
                  >
                    {application.monogram}
                  </span>
                  <span className="university-copy">
                    <strong>{application.university}</strong>
                    <span>{application.program}</span>
                  </span>
                </div>
                <StatusPill tone={application.tone}>{application.status}</StatusPill>
                <div className="application-progress">
                  <ProgressBar
                    value={application.progress}
                    label={`${application.university} application progress`}
                  />
                  <span>{application.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card scholarship-panel">
          <PanelHeading
            eyebrow="FUNDING TO EXPLORE"
            title="Scholarship shortlist"
            action={
              <Link className="panel-action" href="/scholarships">
                See all <ArrowUpRight size={13} aria-hidden="true" />
              </Link>
            }
          />
          <div className="scholarship-feature">
            <span className="scholarship-feature-label">
              <Sparkles size={13} aria-hidden="true" />
              {scholarshipPreview.category}
            </span>
            <h3>{scholarshipPreview.title}</h3>
            <p>Example match for your illustrative profile</p>
            <strong className="scholarship-award">
              {scholarshipPreview.award}
            </strong>
          </div>
          <div className="scholarship-action">
            <span>{scholarshipPreview.note}</span>
            <Link href="/scholarships">
              Explore matches <ArrowRight size={13} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <p className="sample-note">
        <CalendarDays size={12} aria-hidden="true" />
        All names, figures, and milestones shown are illustrative sample data.
      </p>
    </div>
  );
}