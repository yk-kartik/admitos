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
import type { OfficialSource, University, UniversityContact } from "@/types/domain";
import { PageHeading } from "@/components/ui/page-heading";
import { PanelHeading } from "@/components/ui/panel-heading";
import { resolveVerificationStatus } from "@/services/evidence-retriever";

type UniversityDetailProps = {
  university: University;
};

function verificationStatus(source: OfficialSource) {
  return resolveVerificationStatus(source);
}

function verificationLabel(source: OfficialSource) {
  const status = verificationStatus(source);
  if (status === "missing-source") return "SOURCE UNAVAILABLE";
  return status.replaceAll("-", " ").toUpperCase();
}

function SourceDetails({ source }: { source: OfficialSource }) {
  return (
    <dl className="claim-source-meta">
      <div><dt>Verification</dt><dd><span className={`evidence-status evidence-status-${verificationStatus(source)}`}>{verificationLabel(source)}</span></dd></div>
      <div><dt>Source title</dt><dd>{source.sourceTitle}</dd></div>
      <div><dt>Source URL</dt><dd>{source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.sourceUrl}</a> : "Not provided"}</dd></div>
      <div><dt>Academic year</dt><dd>{source.academicYear ?? "Unknown / not provided"}</dd></div>
      <div><dt>Last verified</dt><dd>{source.lastVerified ?? "Not verified"}</dd></div>
      <div><dt>Evidence reference</dt><dd>{source.evidenceReference ?? "Not provided"}</dd></div>
      {source.notes && <div className="claim-source-note"><dt>Notes</dt><dd>{source.notes}</dd></div>}
    </dl>
  );
}

function ContactCard({ contact }: { contact: UniversityContact }) {
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
              ) : "Not provided"}
            </dd>
          </div>
        ))}
      </dl>
      <SourceDetails source={contact.source} />
    </article>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not provided";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function UniversityDetail({ university }: UniversityDetailProps) {
  const officialLinks = university.officialSources;

  return (
    <div className="workspace-page university-detail">
      <PageHeading
        eyebrow={`${university.country.toUpperCase()} · ${university.institutionType.toUpperCase()}`}
        title={university.name}
        description={university.overview.value}
        badge={verificationLabel(university.source)}
        action={<Link className="text-action" href="/universities"><ArrowLeft size={14} aria-hidden="true" /> Back to universities</Link>}
      />

      <div className="detail-location-line">
        <MapPin size={15} aria-hidden="true" />
        <span>{university.city}, {university.country}</span>
        <span className="detail-divider" />
        <span>{university.studentCount.value ?? "Student count not provided"}</span>
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
          <p>{university.overview.value}</p>
          <div className="study-area-list">
            {university.studyAreas.value.map((area) => <span key={area}>{area}</span>)}
          </div>
          <SourceDetails source={university.overview.source} />
        </div>
        <aside className="verification-card">
          <span className="verification-icon"><CircleHelp size={17} aria-hidden="true" /></span>
          <div>
            <strong>{verificationLabel(university.source)}</strong>
            <p>{university.source.notes ?? "Check the linked source and academic year before relying on this record."}</p>
            <SourceDetails source={university.source} />
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
                <SourceDetails source={program.source} />
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
            {university.requirements.length ? university.requirements.map((requirement) => (
              <article className="requirement-row" key={requirement.id}>
                <span className={requirement.required ? "requirement-mark required" : "requirement-mark"} />
                <div><strong>{requirement.title}</strong><p>{requirement.detail}</p><SourceDetails source={requirement.source} /></div>
                <span className="requirement-type">{requirement.required ? "Marked required" : "Marked optional"}</span>
              </article>
            )) : <p className="data-disclaimer">No source-backed admission requirements are provided.</p>}
          </div>
          <p className="data-disclaimer">Only VERIFIED source records can support an admissions decision. Mock and unverified records require review.</p>
        </section>

        <section className="section-card detail-section" id="deadlines">
          <PanelHeading eyebrow="IMPORTANT DATES" title="Application deadlines" />
          <div className="deadline-list">
            {university.deadlines.length ? university.deadlines.map((deadline) => (
              <article className="detail-deadline" key={deadline.id}>
                <span className="detail-deadline-icon"><CalendarDays size={16} aria-hidden="true" /></span>
                <div><strong>{deadline.label}</strong><span>{deadline.intake}</span></div>
                {deadline.date ? <time dateTime={deadline.date}>{formatDate(deadline.date)}</time> : <span>{formatDate(null)}</span>}
                <SourceDetails source={deadline.source} />
              </article>
            )) : <p className="data-disclaimer">No source-backed application deadlines are provided.</p>}
          </div>
          <p className="data-disclaimer">Dates are not authoritative unless their source, academic year, and verification status are current.</p>
        </section>
      </div>

      <section className="section-card detail-section" id="scholarships">
        <PanelHeading eyebrow="FUNDING OPTIONS" title="Scholarships" />
        <div className="scholarship-list">
          {university.scholarships.length ? university.scholarships.map((scholarship) => (
            <article className="detail-scholarship" key={scholarship.id}>
              <div><strong>{scholarship.name}</strong><p>{scholarship.summary}</p><SourceDetails source={scholarship.officialSource} /></div>
              <div className="program-fact"><span>Award</span><strong>{scholarship.amount.display ?? "Not provided"}</strong></div>
              <div className="program-fact"><span>Deadline</span><strong>{scholarship.deadline ?? "Not provided"}</strong></div>
            </article>
          )) : <p className="data-disclaimer">No source-backed scholarships are provided.</p>}
        </div>
      </section>

      <section className="section-card detail-section" id="contacts">
        <PanelHeading eyebrow="STRUCTURED CONTACT DATA" title="Contacts and official sources" />
        <div className="contact-grid">
          {university.contacts.length ? university.contacts.map((contact) => <ContactCard key={contact.id} contact={contact} />) : <p className="data-disclaimer">No contacts are provided.</p>}
        </div>
        <div className="official-links-panel">
          <div className="official-links-title"><Globe2 size={16} aria-hidden="true" /><strong>Official links</strong></div>
          <div className="official-link-list">
            {officialLinks.map((source) => (
              <div key={source.sourceId}>
                <span>{source.sourceTitle}</span>
                {source.sourceUrl ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">Open link <ArrowUpRight size={13} aria-hidden="true" /></a> : <span className="unavailable-value">Not provided</span>}
                <SourceDetails source={source} />
              </div>
            ))}
          </div>
        </div>
        <div className="source-metadata">
          <div><span>Source title</span><strong>{university.source.sourceTitle}</strong></div>
          <div><span>Source URL</span>{university.source.sourceUrl ? <a href={university.source.sourceUrl} target="_blank" rel="noreferrer">{university.source.sourceUrl}</a> : <strong>Not provided</strong>}</div>
          <div><span>Academic year</span><strong>{university.source.academicYear ?? "Unknown / not provided"}</strong></div>
          <div><span>Last verified</span><strong>{university.source.lastVerified ?? "Not verified"}</strong></div>
          <div><span>Record status</span><strong className={`evidence-status evidence-status-${verificationStatus(university.source)}`}>{verificationLabel(university.source)}</strong></div>
        </div>
      </section>
    </div>
  );
}