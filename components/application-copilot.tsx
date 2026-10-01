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
import { useEffect } from "react";
import { PageHeading } from "@/components/ui/page-heading";
import { evaluateApplicationReadiness, validateApplicationFieldDrafts, validateApplicationFields } from "@/services/application-copilot";
import { generateApplicationWrittenAnswer } from "@/services/admissions-ai";
import type {
  ApplicationCopilotAssessment,
  ApplicationCopilotInput,
  ApplicationFieldDraft,
  ApplicationWrittenAnswerDraft,
} from "@/types/ai";

type CopilotCase = {
  input: ApplicationCopilotInput;
  assessment: ApplicationCopilotAssessment;
};

type ApplicationCopilotWorkspaceProps = {
  cases: CopilotCase[];
  selectedApplicationId?: string;
};

type AuthenticatedCopilotState =
  | { status: "loading" }
  | { status: "empty" }
  | { status: "unauthenticated" }
  | { status: "not-found" }
  | { status: "error"; message: string }
  | { status: "ready"; item: CopilotCase };

export function AuthenticatedApplicationCopilot({ applicationId }: { applicationId?: string }) {
  const [state, setState] = useState<AuthenticatedCopilotState>(applicationId ? { status: "loading" } : { status: "empty" });

  useEffect(() => {
    if (!applicationId) {
      return;
    }
    const controller = new AbortController();
    fetch(`/api/applications/${encodeURIComponent(applicationId)}/copilot`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setState({ status: "unauthenticated" });
          return;
        }
        if (response.status === 404) {
          setState({ status: "not-found" });
          return;
        }
        if (!response.ok) {
          setState({ status: "error", message: "Application preparation is temporarily unavailable." });
          return;
        }
        const body = await response.json() as {
          data?: {
            applicationId?: string;
            input?: ApplicationCopilotInput;
            assessment?: ApplicationCopilotAssessment;
          };
        };
        if (!body.data?.input || !body.data.assessment || body.data.applicationId !== applicationId) {
          setState({ status: "error", message: "Application preparation data is incomplete." });
          return;
        }
        setState({ status: "ready", item: { input: body.data.input, assessment: body.data.assessment } });
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error", message: "Application preparation could not be loaded. Check your connection and try again." });
      });
    return () => controller.abort();
  }, [applicationId]);

  if (state.status === "loading") return <CopilotMessage title="Loading application" message="Checking your authenticated application workspace…" />;
  if (state.status === "empty") return <CopilotMessage title="Select an application" message="Open Application Copilot from one of your applications to begin." />;
  if (state.status === "unauthenticated") return <CopilotMessage title="Sign in required" message="Sign in to access your private application preparation workspace." signIn />;
  if (state.status === "not-found") return <CopilotMessage title="Application not found" message="That application is unavailable or does not belong to this account." />;
  if (state.status === "error") return <CopilotMessage title="Copilot unavailable" message={state.message} />;

  return <ApplicationCopilotWorkspace cases={[state.item]} selectedApplicationId={applicationId} />;
}

function CopilotMessage({ title, message, signIn = false }: { title: string; message: string; signIn?: boolean }) {
  return (
    <div className="workspace-page application-copilot">
      <PageHeading eyebrow="APPLICATION WORKSPACE" title="Application Copilot" description="Prepare an application draft from your profile and review its evidence." badge="AUTHENTICATED WORKSPACE" />
      <div className="empty-state" role="status"><strong>{title}</strong><span>{message}</span>{signIn && <Link className="auth-primary-action" href="/sign-in?returnTo=%2Fapplication-copilot">Sign in</Link>}</div>
    </div>
  );
}

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
  const [writtenAnswer, setWrittenAnswer] = useState<ApplicationWrittenAnswerDraft | null>(assessment.writtenAnswers[0] ?? null);
  const [humanReviewed, setHumanReviewed] = useState(false);
  const [languagePrompt, setLanguagePrompt] = useState("");
  const validationErrors = validateApplicationFields(fields);
  const readiness = evaluateApplicationReadiness({
    fields,
    documents,
    requirements: assessment.requirements,
    writtenAnswers: writtenAnswer ? [writtenAnswer] : [],
    decision: assessment.decision.result.decision,
    evidence: assessment.decision.evidence,
    evidencePack: assessment.evidencePack,
    validationErrors,
    humanReviewed,
  });

  function updateField(fieldId: string, value: string) {
    setFields((current) => validateApplicationFieldDrafts(current.map((field) => {
      if (field.id !== fieldId) return field;
      const originalField = assessment.fields.find((original) => original.id === fieldId);
      const isOriginalValue = value === (originalField?.value ?? "");
      const status = !value.trim()
        ? "MISSING"
        : isOriginalValue
          ? originalField?.status ?? "MAPPED"
          : "USER_ENTERED";
      const mappedFrom = !value.trim()
        ? null
        : isOriginalValue
          ? originalField?.mappedFrom ?? null
          : "Student draft";
      return {
        ...field,
        value: value || null,
        status,
        mappedFrom,
        provenance: !value.trim() ? null : value.trim() && !isOriginalValue ? {
          sourceId: "user-entered-application-field",
          sourceUrl: null,
          sourceTitle: "Student-entered draft",
          sourceType: "user-entered",
          academicYear: null,
          lastVerified: null,
          evidenceReference: `application-field:${fieldId}`,
          notes: "Entered by the student in this local draft.",
        } : field.provenance,
        validationState: "NOT_VALIDATED",
        reviewState: "NOT_REVIEWED",
        reviewReason: null,
      };
    })));
    setHumanReviewed(false);
  }

  function toggleDocument(documentId: string, prepared: boolean) {
    setDocuments((current) => current.map((document) =>
      document.id === documentId ? {
        ...document,
        prepared,
        status: prepared ? "CONFIRMED" : document.requirementStatus === "REQUIRED" ? "MISSING" : document.requirementStatus === "OPTIONAL" ? "OPTIONAL" : "NEEDS_REVIEW",
      } : document,
    ));
    setHumanReviewed(false);
  }

  async function prepareLanguagePreview() {
    const draft = await generateApplicationWrittenAnswer({
      profile: input.profile,
      prompt: languagePrompt,
      evidence: assessment.decision.evidence,
    });
    setWrittenAnswer(draft);
    setHumanReviewed(false);
  }

  function updateWrittenAnswer(value: string) {
    setWrittenAnswer((current) => current ? {
      ...current,
      value,
      reviewState: "REVIEW_REQUIRED",
      provenance: current.provenance.some((item) => item.sourceType === "user-entered")
        ? current.provenance
        : [...current.provenance, {
          sourceId: "user-edited-written-answer",
          sourceUrl: null,
          sourceTitle: "Student-edited answer",
          sourceType: "user-entered",
          academicYear: null,
          lastVerified: null,
          evidenceReference: `written-answer:${current.id}`,
          notes: "The generated draft was edited by the student.",
        }],
    } : current);
    setHumanReviewed(false);
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
          <strong>{readiness.state.replaceAll("_", " ")}</strong>
        </div>
      </section>

      <div className="copilot-grid">
        <div className="copilot-main-column">
          <section className="section-card copilot-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">PROFILE FIELD MAPPING</span><h2>Application draft</h2></div>
              <span className="copilot-count">{fields.filter((field) => field.status === "AUTO_MAPPED" || field.status === "MAPPED").length} auto-mapped</span>
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
                    <span className="copilot-document-copy">
                      <strong>{document.label}</strong>
                      <small>{document.requirementStatus ?? (document.required ? "REQUIRED" : "NOT ESTABLISHED")}{document.provenance ? ` · ${document.provenance.sourceTitle} · ${document.provenance.academicYear ?? "year not provided"}` : " · No source provenance"}</small>
                    </span>
                    <span className="copilot-document-status">{document.prepared ? "CONFIRMED" : document.status.replaceAll("_", " ")}</span>
                  </label>
                ))}
              </div>
            ) : <p className="copilot-not-established"><strong>NOT ESTABLISHED</strong><span>No document requirement was found in current authoritative evidence.</span></p>}
            <p className="copilot-panel-note copilot-small-note">Checklist confirmations are not document uploads and are not saved.</p>
          </section>

          <section className="section-card copilot-panel copilot-language-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">OPTIONAL LANGUAGE SUPPORT</span><h2>Answer drafting preview</h2></div>
              <Sparkles size={17} aria-hidden="true" />
            </div>
            <label className="copilot-input-label" htmlFor="copilot-language-prompt">Facts and notes for your answer</label>
            <textarea
              id="copilot-language-prompt"
              value={languagePrompt}
              onChange={(event) => setLanguagePrompt(event.target.value)}
              placeholder="Enter only details you can verify. The draft uses only these notes and known profile facts."
              rows={3}
            />
            <button className="secondary-button" type="button" onClick={prepareLanguagePreview} disabled={!languagePrompt.trim()}>
              Build fact-bound draft <Sparkles size={14} aria-hidden="true" />
            </button>
            {writtenAnswer && (
              <div className="copilot-language-result">
                <span>{writtenAnswer.reviewLabel}</span>
                <textarea aria-label="Editable written answer draft" value={writtenAnswer.value} rows={5} onChange={(event) => updateWrittenAnswer(event.target.value)} />
                <label className="copilot-answer-review">
                  <input
                    type="checkbox"
                    checked={writtenAnswer.reviewState === "REVIEWED"}
                    onChange={(event) => {
                      setWrittenAnswer((current) => current ? { ...current, reviewState: event.target.checked ? "REVIEWED" : "REVIEW_REQUIRED" } : current);
                      setHumanReviewed(false);
                    }}
                  />
                  I reviewed this answer and its source facts.
                </label>
              </div>
            )}
          </section>
        </div>

        <aside className="copilot-side-column">
          <section className="section-card copilot-panel copilot-decision-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">DECISION ENGINE</span><h2>JEV decision</h2></div>
              <BadgeCheck size={17} aria-hidden="true" />
            </div>
            <div className="copilot-decision-state"><strong>{assessment.decision.result.decision.replaceAll("_", " ")}</strong><span>MOCK JEV ADAPTER · NOT CONNECTED</span></div>
            <p className="copilot-panel-note">Evidence pack: <strong>{assessment.evidencePack.status.replaceAll("_", " ")}</strong>{assessment.evidencePack.authoritative ? " · VERIFIED AND CURRENT" : " · NOT AUTHORITATIVE"}</p>
            <p className="copilot-panel-note">Application schema: {assessment.schema.source.replaceAll("-", " ")}</p>
            <div className="copilot-confidence"><span>Confidence</span><strong>{Math.round(assessment.decision.result.confidence.score * 100)}% · {assessment.decision.result.confidence.level}</strong></div>
            <p className="copilot-confidence-rationale">{assessment.decision.result.confidence.rationale}</p>
            <ul className="copilot-reason-list">
              {assessment.decision.result.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              {assessment.evidencePack.reasons.map((reason) => <li key={reason}>{reason}</li>)}
              {readiness.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
            {assessment.decision.result.missingInformation.length > 0 && (
              <p className="copilot-panel-note">Missing information: {assessment.decision.result.missingInformation.join("; ")}</p>
            )}
            <div className="copilot-timestamp">Decision timestamp <strong>{new Date(assessment.decision.decisionTimestamp).toLocaleString()}</strong></div>
          </section>

          <section className="section-card copilot-panel">
            <div className="copilot-panel-heading">
              <div><span className="panel-eyebrow">EVIDENCE TO SCHEMA</span><h2>Requirement mapping</h2></div>
              <BookOpen size={16} aria-hidden="true" />
            </div>
            <div className="copilot-requirement-list">
              {assessment.requirements.map((requirement) => (
                <article className="copilot-requirement" key={requirement.id}>
                  <div className="copilot-evidence-heading">
                    <strong>{requirement.label}</strong>
                    <span className={`evidence-status evidence-status-${requirement.evidenceStatus.toLowerCase()}`}>{requirement.evidenceStatus.replaceAll("_", " ")}</span>
                  </div>
                  <p>{requirement.description}</p>
                  <p className="copilot-panel-note">Mapped field: {requirement.fieldId ?? "No application field established"} · Satisfaction: {requirement.decision.toUpperCase()}</p>
                  {requirement.provenance && (
                    <dl>
                      <div><dt>Source</dt><dd>{requirement.provenance.sourceTitle} · {requirement.provenance.sourceId}</dd></div>
                      <div><dt>Academic year</dt><dd>{requirement.provenance.academicYear ?? "Not provided"}</dd></div>
                      <div><dt>Last verified</dt><dd>{requirement.provenance.lastVerified ?? "Not verified"}</dd></div>
                      <div><dt>Evidence reference</dt><dd>{requirement.provenance.evidenceReference ?? "Not provided"}</dd></div>
                      {requirement.provenance.sourceUrl && <div><dt>Source URL</dt><dd><a href={requirement.provenance.sourceUrl} target="_blank" rel="noreferrer">Open source</a></dd></div>}
                    </dl>
                  )}
                </article>
              ))}
            </div>
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
        {field.status === "AUTO_MAPPED" || field.status === "MAPPED" ? <CircleCheck size={12} aria-hidden="true" /> : field.status === "MISSING" || field.status === "NEEDS_REVIEW" ? <CircleAlert size={12} aria-hidden="true" /> : null}
        {statusLabel}{field.mappedFrom ? ` · ${field.mappedFrom}` : ""}
      </span>
      {field.provenance && <span className="copilot-field-provenance">Source: {field.provenance.sourceTitle} · {field.provenance.evidenceReference ?? "reference not provided"}</span>}
    </label>
  );
}
