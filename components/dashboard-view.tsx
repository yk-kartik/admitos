import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import styles from "@/components/dashboard/dashboard.module.css";
import { PanelHeading } from "@/components/ui/panel-heading";
import { StatePanel } from "@/components/ui/state-panel";
import { navigationItems } from "@/data/navigation";

/**
 * Static product descriptions for each destination. These describe what a
 * page is for. They are not user data and make no claims about its contents.
 */
const destinationDescriptions = [
  {
    href: "/ai-advisor",
    description:
      "Ask admissions questions and review guidance that flags what still needs verifying.",
  },
  {
    href: "/universities",
    description: "Browse institutions, programs and entry requirements.",
  },
  {
    href: "/scholarships",
    description: "Explore funding opportunities and their eligibility criteria.",
  },
  {
    href: "/pathways",
    description: "Compare routes into study and the stages along each one.",
  },
  {
    href: "/applications",
    description: "Keep applications, tasks and target dates in one place.",
  },
  {
    href: "/application-copilot",
    description: "Prepare application drafts and check what is still missing.",
  },
];

const destinations = destinationDescriptions.flatMap((destination) => {
  const item = navigationItems.find(
    (candidate) => candidate.href === destination.href,
  );
  return item
    ? [{ ...destination, label: item.label, Icon: item.icon }]
    : [];
});

/**
 * None of these resources is loaded on the dashboard in this version, so each
 * is shown as "not implemented" rather than "empty".
 */
const summaryPanels = [
  {
    id: "applications",
    eyebrow: "APPLICATIONS",
    title: "Your applications",
    href: "/applications",
    action: "Open tracker",
    description:
      "Your applications, tasks and target dates are managed in the Application Tracker.",
  },
  {
    id: "deadlines",
    eyebrow: "DEADLINES",
    title: "Upcoming deadlines",
    href: "/applications",
    action: "Open tracker",
    description:
      "Deadlines are set on each application. A combined view isn't available on the dashboard yet.",
  },
  {
    id: "funding",
    eyebrow: "FUNDING",
    title: "Scholarships",
    href: "/scholarships",
    action: "Browse all",
    description:
      "Explore funding opportunities on the Scholarships page. Personalized matches aren't shown here yet.",
  },
];

export function DashboardView() {
  return (
    <div className={styles.page}>
      <DashboardGreeting />

      <section className={styles.hero} aria-labelledby="dashboard-profile-title">
        <div className={styles.heroCopy}>
          <span className={styles.heroEyebrow}>START HERE</span>
          <h2 id="dashboard-profile-title">Begin with your student profile</h2>
          <p>
            Your profile is where your academic background, goals and
            preferences live. Keeping it up to date is the best first step
            toward a clear admissions plan.
          </p>
        </div>
        <div className={styles.heroActions}>
          <Link className={styles.heroPrimary} href="/profile">
            Open your profile <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link className={styles.heroSecondary} href="/universities">
            Explore universities
          </Link>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dashboard-tools-title">
        <div className={styles.sectionHeading}>
          <h2 id="dashboard-tools-title">Your workspace</h2>
          <p>Jump into any part of AdmitOS.</p>
        </div>
        <ul className={styles.grid}>
          {destinations.map(({ href, label, description, Icon }) => (
            <li key={href}>
              <Link className={styles.card} href={href}>
                <span className={styles.cardIcon} aria-hidden="true">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className={styles.cardBody}>
                  <strong>{label}</strong>
                  <span>{description}</span>
                </span>
                <ArrowUpRight
                  className={styles.cardArrow}
                  size={16}
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panels} aria-label="Account summary">
        {summaryPanels.map((panel) => (
          <article className={styles.panel} key={panel.id}>
            <PanelHeading
              eyebrow={panel.eyebrow}
              title={panel.title}
              action={
                <Link className={styles.panelAction} href={panel.href}>
                  {panel.action} <ArrowUpRight size={14} aria-hidden="true" />
                </Link>
              }
            />
            <StatePanel
              className={styles.state}
              state={{
                status: "not-implemented",
                description: panel.description,
              }}
            />
          </article>
        ))}
      </section>

      <p className={styles.note}>
        This dashboard shows no sample or illustrative data.
      </p>
    </div>
  );
}
