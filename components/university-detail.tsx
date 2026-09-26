import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CircleHelp,
  ExternalLink,
  Globe2,
  GraduationCap,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import type { StructuredContact, UniversityRecord } from "@/types";
import { PageHeading } from "@/components/ui/page-heading";
import { PanelHeading } from "@/components/ui/panel-heading";

type UniversityDetailProps = {
  university: UniversityRecord;
};

function ContactCard({ contact }: { contact: StructuredContact }) {
  const fields = [
    ["Contact", contact.contactName],
    ["Email", contact.email],
    ["Phone", contact.phone],
    ["Contact page", contact.contactUrl],
  ] as const;

  return (
    <article className="contact-card">
      <h3>{contact.department}</h3>
      <dl>
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {value ? (
                label === "Email" ? <a href={`mailto:${value}`}>{value}</a> :
                  label === "Contact page" ? <a href={value} target="_blank" rel="noreferrer">Official page <ExternalLink size={12} aria-hidden="true" /></a> : value
              ) : "Not provided in this mock record"}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function UniversityDetail({ university }: UniversityDetailProps) {
  const officialLinks = [
    ["Official website", university.links.officialWebsite],
    ["Admissions information", university.links.admissionsPage],
    ["International students", university.links.internationalStudentsPage],
    ["Application portal", university.links.applicationPortal],
  ] as const;

  return (
    <div className="workspace-page university-detail">
      <PageHeading
        eyebrow={`${university.country.toUpperCase()} · ${university.institutionType.toUpperCase()}`}
        title={university.name}
        description={university.overview}
        badge="MOCK · UNVERIFIED"
        action={<Link className="text-action" href="/universities"><ArrowLeft size={14} aria-hidden="true" /> Back to universities</Link>}
      />

      <div className="detail-location-line">
        <MapPin size={15} aria-hidden="true" />
        <span>{university.city}, {university.country}</span>
        <span className="detail-divider" />
        <span>{university.studentCount}</span>
        <span className="detail-divider" />
        <span>{university.programs.length} sample programs</span>
      </div>

      <nav className="detail-anchor-nav" aria-label="University profile sections">
        <a href="#overview">Overview</a>
        <a href="#programs">Programs</a>
        <a href="#requirements">Requirements</a>
        <a href="#deadlines">Deadlines</a>
        <a href="#scholarships">Scholarships</a>
        <a href="#contacts">Contacts and sources</a>
      </nav>

      <section className="detail-overview-grid" id="overview">
        <div className="section-card detail-overview-card">
          <PanelHeading eyebrow="AT A GLANCE" title="University overview" />
          <p>{university.overview}</p>
          <div className="study-area-list">
            {university.studyAreas.map((area) => <span key={area}>{area}</span>)}
          </div>
        </div>
        <aside className="verification-card">
          <span className="verification-icon"><CircleHelp size={17} aria-hidden="true" /></span>
          <div>
            <strong>Not verified</strong>
            <p>This is a structured mock profile. Confirm every requirement and date with official sources.</p>
          </div>
        </aside>
      </section>

      <section className="section-card detail-section" id="programs">
        <PanelHeading eyebrow="ACADEMIC OPTIONS" title="Programs" />
        <div className="program-list">
          {university.programs.map((program) => (
            <article className="program-row" key={program.id}>
              <span className="program-icon"><GraduationCap size={17} aria-hidden="true" /></span>
              <div className="program-main">
                <strong>{program.name}</strong>
                <span>{program.credential} · {program.studyMode} · {program.duration}</span>
              </div>
              <div className="program-fact"><span>Tuition</span><strong>{program.annualTuition}</strong></div>
              <div className="program-fact"><span>Language</span><strong>{program.language}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <div className="detail-two-column">
        <section className="section-card detail-section" id="requirements">
          <PanelHeading eyebrow="ADMISSIONS" title="Requirements" />
          <div className="requirement-list">
            {university.requirements.map((requirement) => (
              <article className="requirement-row" key={requirement.id}>
                <span className={requirement.required ? "requirement-mark required" : "requirement-mark"} />
                <div><strong>{requirement.title}</strong><p>{requirement.detail}</p></div>
                <span className="requirement-type">{requirement.required ? "Typical" : "May apply"}</span>
              </article>
            ))}
          </div>
          <p className="data-disclaimer">Requirements are mock guidance, not official admission criteria.</p>
        </section>

        <section className="section-card detail-section" id="deadlines">
          <PanelHeading eyebrow="IMPORTANT DATES" title="Application deadlines" />
          <div className="deadline-list">
            {university.deadlines.map((deadline) => (
              <article className="detail-deadline" key={deadline.id}>
                <span className="detail-deadline-icon"><CalendarDays size={16} aria-hidden="true" /></span>
                <div><strong>{deadline.label}</strong><span>{deadline.intake}</span></div>
                <time dateTime={deadline.date}>{formatDate(deadline.date)}</time>
              </article>
            ))}
          </div>
          <p className="data-disclaimer">Dates are illustrative and must be independently verified.</p>
        </section>
      </div>

      <section className="section-card detail-section" id="scholarships">
        <PanelHeading eyebrow="FUNDING OPTIONS" title="Scholarships" />
        <div className="scholarship-list">
          {university.scholarships.map((scholarship) => (
            <article className="detail-scholarship" key={scholarship.id}>
              <div><strong>{scholarship.name}</strong><p>{scholarship.eligibility}</p></div>
              <div className="program-fact"><span>Illustrative award</span><strong>{scholarship.award}</strong></div>
              <div className="program-fact"><span>Deadline</span><strong>{scholarship.deadline}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section-card detail-section" id="contacts">
        <PanelHeading eyebrow="STRUCTURED CONTACT DATA" title="Contacts and official sources" />
        <div className="contact-grid">
          <ContactCard contact={university.contacts.admissions} />
          <ContactCard contact={university.contacts.internationalStudents} />
        </div>
        <div className="official-links-panel">
          <div className="official-links-title"><Globe2 size={16} aria-hidden="true" /><strong>Official links</strong></div>
          <div className="official-link-list">
            {officialLinks.map(([label, url]) => (
              <div key={label}>
                <span>{label}</span>
                {url ? <a href={url} target="_blank" rel="noreferrer">Open link <ArrowUpRight size={13} aria-hidden="true" /></a> : <span className="unavailable-value">Not provided in this mock record</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="source-metadata">
          <div><span>Source URL</span>{university.sourceUrl ? <a href={university.sourceUrl} target="_blank" rel="noreferrer">{university.sourceUrl}</a> : <strong>Not available</strong>}</div>
          <div><span>Last verified</span><strong>{university.lastVerifiedAt ?? "Not verified"}</strong></div>
          <div><span>Record status</span><strong>{university.verificationStatus === "verified" ? "Verified" : "Mock data · unverified"}</strong></div>
        </div>
      </section>
    </div>
  );
}