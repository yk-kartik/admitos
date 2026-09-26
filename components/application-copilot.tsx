"use client";

import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CircleAlert,
  CircleCheck,
  FileText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { evaluateApplicationReadiness, validateApplicationFields } from "@/services/application-copilot";
import { generateOptionalLanguagePreview } from "@/services/admissions-ai";
import type {
  ApplicationCopilotAssessment,
  ApplicationCopilotInput,
  ApplicationFieldDraft,
} from "@/types/ai";

type CopilotCase = {
  input: ApplicationCopilotInput;
  assessment: ApplicationCopilotAssessment;
};

type ApplicationCopilotWorkspaceProps = {
  cases: CopilotCase[];
  selectedApplicationId?: string;
};

export function ApplicationCopilotWorkspace({
  cases,
  selectedApplicationId,
}: ApplicationCopilotWorkspaceProps) {
  const initialCase = cases.find((item) => item.input.application.id === selectedApplicationId) ?? cases[0];
  const [activeApplicationId, setActiveApplicationId] = useState(initialCase?.input.application.id ?? "");
  const activeCase = cases.find((item) => item.input.application.id === activeApplicationId);

  if (!activeCase) {
    return (
      <div className="workspace-page">
        <PageHeading eyebrow="APPLICATION WORKSPACE" title="Application Copilot" description="Prepare an application draft from your profile and review its evidence." badge="MOCK WORKSPACE" />
        <div className="empty-state"><strong>No applications available</strong><span>Add an application to the tracker to begin.</span></div>
      </div>
    );
  }

  return (
    <ApplicationCopilotCase
      key={activeCase.input.application.id}
      item={activeCase}
      cases={cases}
      onSelect={setActiveApplicationId}
    />
  );
}

function ApplicationCopilotCase({
  item,
  cases,
  onSelect,
}: {
  item: CopilotCase;
  cases: CopilotCase[];
  onSelect: (id: string) => void;
}) {
  const { input, assessment } = item;
  const [fields, setFields] = useState(assessment.fields);
  const [documents, setDocuments] = useState(assessment.documents);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [languagePrompt, setLanguagePrompt] = useState("");
  const [languagePreview, setLanguagePreview] = useState("");
  const [languageModelLabel, setLanguageModelLabel] = useState("");
  const validationErrors = validateApplicationFields(fields);
  const readiness = evaluateApplicationReadiness({
    fields,
    documents,
    decision: assessment.decision.result.decision,
    evidence: assessment.decision.evidence,
    validationErrors,
    humanReviewed,
  });

  function updateField(fieldId: string, value: string) {
    setFields((current) => current.map((field) => {
      if (field.id !== fieldId) return field;
      const originalField = assessment.fields.find((original) => original.id === fieldId);
      const isOriginalValue = value === (originalField?.value ?? "");
      const status = !value.trim()
        ? "MISSING"
        : isOriginalValue
          ? originalField?.status ?? "MAPPED"
          : "STUDENT_PROVIDED";
      const mappedFrom = !value.trim()
        ? null
        : isOriginalValue
          ? originalField?.mappedFrom ?? null
          : "Student draft";
      return { ...field, value: value || null, status, mappedFrom };
    }));
    setHumanReviewed(false);
  }

  function toggleDocument(documentId: string, prepared: boolean) {
    setDocuments((current) => current.map((document) =>
      document.id === documentId ? { ...document, prepared } : document,
    ));
    setHumanReviewed(false);
  }

  async function prepareLanguagePreview() {
    const response = await generateOptionalLanguagePreview({
      task: "natural_language_explanation",
      prompt: languagePrompt,
      context: { providedByStudent: true },
    });
    setLanguagePreview(response.text);
    setLanguageModelLabel(response.modelLabel);
  }

  return (
    <div className="workspace-page application-copilot">
      <PageHeading
        eyebrow="JEV-FIRST APPLICATION WORKSPACE"
        title="Application Copilot"
        description="Prepare a local draft from profile information, inspect evidence, and review every field before taking action."
        badge="MOCK PROVIDERS · NO SUBMISSION"
      />

      <div className="copilot-controls">
        <label className="copilot-application-select">
          <span>Selected application</span>
          <select
            value={input.application.id}
            onChange={(event) => onSelect(event.target.value)}
          >
            {cases.map(({ input: applicationInput }) => (
              <option key={applicationInput.application.id} value={applicationInput.application.id}>
                {applicationInput.application.universityName} · {applicationInput.application.program}
              </option>
            ))}
          </select>
        </label>
        <Link className="copilot-back-link" href="/applications"><ArrowLeft size={14} aria-hidden="true" /> Application tracker</Link>
      </div>

      <section className="copilot-overview" aria-label="Selected application summary">
        <div>
          <span className="panel-eyebrow">{input.application.intake} · ILLUSTRATIVE RECORD</span>
          <h2>{input.university.name}</h2>
          <p>{input.application.program}</p>
        </div>
        <div className={`copilot-readiness-badge copilot-readiness-${readiness.status.toLowerCase()}`}>
          <span>APPLICATION READINESS</span>
          <strong>{readiness.status.replaceAll("_", " ")}</strong>
        </div>
      </section>

      <div className="copilot-grid">
        <div className="copilot-main-column">
          <section className="section-card copilot-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">PROFILE FIELD MAPPING</span><h2>Application draft</h2></div>
              <span className="copilot-count">{fields.filter((field) => field.status === "MAPPED").length} mapped</span>
            </div>
            <p className="copilot-panel-note">Known values are copied from your profile. Add missing information only if it is accurate; edits stay in this browser view.</p>
            <div className="copilot-fields">
              {fields.map((field) => <ApplicationField key={field.id} field={field} onChange={updateField} />)}
            </div>
            {validationErrors.length > 0 && (
              <ul className="copilot-validation-list" aria-label="Validation results">
                {validationErrors.map((error) => <li key={error}><CircleAlert size={13} aria-hidden="true" />{error}</li>)}
              </ul>
            )}
          </section>

          <section className="section-card copilot-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">DOCUMENT CHECKLIST</span><h2>Requirements and preparation</h2></div>
              <FileText size={17} aria-hidden="true" />
            </div>
            {documents.length ? (
              <div className="copilot-document-list">
                {documents.map((document) => (
                  <label className="copilot-document" key={document.id}>
                    <input
                      type="checkbox"
                      checked={document.prepared}
                      onChange={(event) => toggleDocument(document.id, event.target.checked)}
                    />
                    <span className="copilot-checkmark" aria-hidden="true">{document.prepared ? <CircleCheck size={16} /> : <span />}</span>
                    <span className="copilot-document-copy"><strong>{document.label}</strong><small>{document.required ? "Required · confirm the actual portal requirement" : "Optional · confirm with the institution"}</small></span>
                    <span className="copilot-document-status">{document.prepared ? "CONFIRMED" : "NOT CONFIRMED"}</span>
                  </label>
                ))}
              </div>
            ) : <p className="copilot-panel-note">No verified document requirements were retrieved. Check the institution&apos;s official application portal.</p>}
            <p className="copilot-panel-note copilot-small-note">Checklist confirmations are not document uploads and are not saved.</p>
          </section>

          <section className="section-card copilot-panel copilot-language-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">OPTIONAL LANGUAGE SUPPORT</span><h2>Answer drafting preview</h2></div>
              <Sparkles size={17} aria-hidden="true" />
            </div>
            <label className="copilot-input-label" htmlFor="copilot-language-prompt">What would you like help phrasing?</label>
            <textarea
              id="copilot-language-prompt"
              value={languagePrompt}
              onChange={(event) => setLanguagePrompt(event.target.value)}
              placeholder="Enter your own notes. The preview will not add facts."
              rows={3}
            />
            <button className="secondary-button" type="button" onClick={prepareLanguagePreview} disabled={!languagePrompt.trim()}>
              Prepare mock preview <Sparkles size={14} aria-hidden="true" />
            </button>
            {languagePreview && <div className="copilot-language-result"><span>{languageModelLabel}</span><p>{languagePreview}</p></div>}
          </section>
        </div>

        <aside className="copilot-side-column">
          <section className="section-card copilot-panel copilot-decision-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">DECISION ENGINE</span><h2>JEV decision</h2></div>
              <BadgeCheck size={17} aria-hidden="true" />
            </div>
            <div className="copilot-decision-state"><strong>{assessment.decision.result.decision.replaceAll("_", " ")}</strong><span>MOCK JEV ADAPTER · NOT CONNECTED</span></div>
            <div className="copilot-confidence"><span>Confidence</span><strong>{Math.round(assessment.decision.result.confidence.score * 100)}% · {assessment.decision.result.confidence.level}</strong></div>
            <p className="copilot-confidence-rationale">{assessment.decision.result.confidence.rationale}</p>
            <ul className="copilot-reason-list">
              {assessment.decision.result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              {readiness.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            {assessment.decision.result.missingInformation.length > 0 && (
              <p className="copilot-panel-note">Missing information: {assessment.decision.result.missingInformation.join("; ")}</p>
            )}
            <div className="copilot-timestamp">Decision timestamp <strong>{new Date(assessment.decision.decisionTimestamp).toLocaleString()}</strong></div>
          </section>

          <section className="section-card copilot-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">SOURCE RECORD</span><h2>Evidence and provenance</h2></div>
              <BookOpen size={16} aria-hidden="true" />
            </div>
            <div className="copilot-evidence-list">
              {assessment.decision.evidence.length ? assessment.decision.evidence.map((evidence) => (
                <article className="copilot-evidence" key={`${evidence.sourceId}-${evidence.evidenceReference}`}>
                  <div className="copilot-evidence-heading"><strong>{evidence.sourceTitle}</strong><span className={`evidence-status evidence-status-${evidence.verificationStatus}`}>{evidence.verificationStatus.replaceAll("-", " ")}</span></div>
                  <p>{evidence.evidenceSnippet}</p>
                  {evidence.sourceNotes && <p className="copilot-panel-note">{evidence.sourceNotes}</p>}
                  <dl>
                    <div><dt>Source ID</dt><dd>{evidence.sourceId}</dd></div>
                    <div><dt>Type</dt><dd>{evidence.sourceType}</dd></div>
                    <div><dt>Academic year</dt><dd>{evidence.academicYear ?? "Not provided"}</dd></div>
                    <div><dt>Last verified</dt><dd>{evidence.lastVerified ?? "Not verified"}</dd></div>
                    <div><dt>Reference</dt><dd>{evidence.evidenceReference ?? "Not provided"}</dd></div>
                    {evidence.sourceUrl && <div><dt>URL</dt><dd><a href={evidence.sourceUrl} target="_blank" rel="noreferrer">Open source</a></dd></div>}
                  </dl>
                </article>
              )) : <p className="copilot-panel-note">No evidence was retrieved for this application.</p>}
            </div>
            <p className="copilot-panel-note copilot-small-note">Mock records are illustrative and are not official university information.</p>
          </section>

          <section className="section-card copilot-review-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">HUMAN REVIEW</span><h2>Review before action</h2></div>
              <ShieldCheck size={17} aria-hidden="true" />
            </div>
            <label className="copilot-review-check">
              <input type="checkbox" checked={humanReviewed} onChange={(event) => setHumanReviewed(event.target.checked)} />
              <span>I reviewed the mapped fields, requirement checklist, and available evidence.</span>
            </label>
            <div className={`copilot-final-status copilot-final-${readiness.status.toLowerCase()}`}>
              {readiness.status === "READY_FOR_SUBMISSION" ? <CircleCheck size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
              <span>{readiness.status === "READY_FOR_SUBMISSION" ? "Ready for your final confirmation" : "Review or complete the items above"}</span>
            </div>
            <p>No application is submitted or stored here. Final submission must be made by you through the institution’s official portal with your explicit confirmation.</p>
          </section>
        </aside>
      </div>

      <p className="data-disclaimer">This is a local mock workspace. It does not connect to JEV, an LLM, an application portal, or a backend.</p>
    </div>
  );
}

function ApplicationField({
  field,
  onChange,
}: {
  field: ApplicationFieldDraft;
  onChange: (id: string, value: string) => void;
}) {
  const statusLabel = field.status.replaceAll("_", " ");
  const inputType = field.id === "email" ? "email" : field.id === "phone" ? "tel" : field.id === "dateOfBirth" ? "date" : "text";

  return (
    <label className="copilot-field" htmlFor={`copilot-field-${field.id}`}>
      <span className="copilot-field-label">{field.label}<small>{field.required ? "Required" : "Optional"}</small></span>
      {field.id === "academicQualifications" ? (
        <textarea
          id={`copilot-field-${field.id}`}
          value={field.value ?? ""}
          rows={3}
          onChange={(event) => onChange(field.id, event.target.value)}
        />
      ) : (
        <input
          id={`copilot-field-${field.id}`}
          type={inputType}
          inputMode={field.id === "graduationYear" ? "numeric" : undefined}
          value={field.value ?? ""}
          onChange={(event) => onChange(field.id, event.target.value)}
        />
      )}
      <span className={`copilot-field-status copilot-field-${field.status.toLowerCase()}`}>
        {field.status === "MAPPED" ? <CircleCheck size={12} aria-hidden="true" /> : field.status === "MISSING" ? <CircleAlert size={12} aria-hidden="true" /> : null}
        {statusLabel}{field.mappedFrom ? ` · ${field.mappedFrom}` : ""}
      </span>
    </label>
  );
}
