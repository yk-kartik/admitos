import type {
  ApplicationDecision,
  ApplicationDocumentDraft,
  ApplicationFieldDraft,
  ApplicationFieldCategory,
  ApplicationRequirementDraft,
  ApplicationProvenance,
  ApplicationReadinessResult,
  ApplicationSchema,
  ApplicationWrittenAnswerDraft,
  EvidencePack,
  DecisionDomain,
  DecisionEvidence,
  DecisionOutcome,
  DecisionRequest,
  DecisionResponse,
} from "@/types/ai";
import type { StudentProfile } from "@/types/domain";
import { resolveVerificationStatus } from "./evidence-retriever.ts";

function profileProvenance(reference: string, notes: string): ApplicationProvenance {
  return {
    sourceId: "student-profile",
    sourceUrl: null,
    sourceTitle: "Student profile",
    sourceType: "student-profile",
    academicYear: null,
    lastVerified: null,
    evidenceReference: reference,
    notes,
  };
}

function hasConflictingGrades(profile: StudentProfile): boolean {
  const resultsByCourse = new Map<string, Set<string>>();
  for (const grade of profile.grades) {
    const key = `${grade.subject.trim().toLowerCase()}|${grade.academicYear?.trim().toLowerCase() ?? ""}|${grade.scale?.trim().toLowerCase() ?? ""}`;
    const results = resultsByCourse.get(key) ?? new Set<string>();
    results.add(grade.result.trim().toLowerCase());
    resultsByCourse.set(key, results);
  }
  return [...resultsByCourse.values()].some((results) => results.size > 1);
}

function fieldDraft(input: {
  id: string;
  label: string;
  category: ApplicationFieldCategory;
  required: boolean;
  value: string | null;
  mappedFrom: string | null;
  reviewReason?: string;
}): ApplicationFieldDraft {
  const needsReview = Boolean(input.reviewReason);
  const value = needsReview ? null : input.value?.trim() ? input.value : null;
  const status = needsReview ? "NEEDS_REVIEW" : value ? "AUTO_MAPPED" : "MISSING";
  return {
    ...input,
    value,
    status,
    provenance: value ? profileProvenance(input.id, input.mappedFrom ?? "Exact profile value") : null,
    validationState: needsReview ? "NEEDS_REVIEW" : "NOT_VALIDATED",
    reviewState: needsReview ? "REVIEW_REQUIRED" : "NOT_REVIEWED",
    ...(input.reviewReason ? { reviewReason: input.reviewReason } : {}),
  };
}

function isAuthoritativeEvidence(evidence: DecisionEvidence, now = new Date()): boolean {
  return resolveVerificationStatus(evidence, now) === "verified";
}

function hasConflictingEvidence(evidence: DecisionEvidence[]): boolean {
  return evidence.some((item) => item.verificationStatus === "conflicting") || findEvidenceConflicts(evidence).length > 0;
}

export function mapProfileToApplicationFields(
  profile: StudentProfile,
): ApplicationFieldDraft[] {
  const existingValue = (value: string | null | undefined) => value?.trim() ? value : null;
  const gradeConflict = hasConflictingGrades(profile);
  const academicQualifications = [
    existingValue(profile.academicBackground),
    ...profile.grades.map((grade) => `${grade.subject}: ${grade.result}`),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");
  const englishQualifications = profile.englishQualifications
    .map((item) => [item.qualification, item.score, item.date].filter(Boolean).join(" · "))
    .join("\n");
  const activities = [
    ...profile.extracurricularActivities,
    ...profile.research,
    ...profile.leadership,
  ].map((item) => [item.name, item.role, item.description, item.dates].filter(Boolean).join(" · "));
  activities.push(...profile.projects.map((item) => [item.name, item.description, item.dates].filter(Boolean).join(" · ")));
  const citizenships = [...new Set(profile.citizenships.map((value) => value.trim()).filter(Boolean))];

  return [
    fieldDraft({ id: "fullName", label: "Full name", category: "identity", required: true, value: existingValue(profile.fullName), mappedFrom: "Profile name" }),
    fieldDraft({ id: "dateOfBirth", label: "Date of birth", category: "identity", required: true, value: existingValue(profile.dateOfBirth), mappedFrom: "Profile date of birth" }),
    fieldDraft({
      id: "citizenship",
      label: "Citizenship",
      category: "identity",
      required: false,
      value: citizenships.length === 1 ? citizenships[0] : null,
      mappedFrom: citizenships.length === 1 ? "Profile citizenship" : null,
      ...(citizenships.length > 1 ? { reviewReason: "Multiple citizenships need confirmation for this field." } : {}),
    }),
    fieldDraft({ id: "email", label: "Email", category: "contact", required: true, value: existingValue(profile.email), mappedFrom: "Profile email" }),
    fieldDraft({ id: "phone", label: "Phone", category: "contact", required: true, value: existingValue(profile.phone), mappedFrom: "Profile phone" }),
    fieldDraft({ id: "address", label: "Address", category: "contact", required: true, value: existingValue(profile.address), mappedFrom: "Profile address" }),
    fieldDraft({
      id: "academicQualifications",
      label: "Academic qualifications",
      category: "academics",
      required: true,
      value: academicQualifications || null,
      mappedFrom: academicQualifications ? "Academic background and grades" : null,
      ...(gradeConflict ? { reviewReason: "Conflicting results are recorded for the same subject and academic year." } : {}),
    }),
    fieldDraft({ id: "school", label: "School / current institution", category: "academics", required: true, value: existingValue(profile.currentUniversity), mappedFrom: "Current institution" }),
    fieldDraft({ id: "graduationYear", label: "Graduation year", category: "academics", required: true, value: null, mappedFrom: null }),
    fieldDraft({ id: "program", label: "Current degree program", category: "program", required: false, value: existingValue(profile.degreeProgram), mappedFrom: "Profile degree program" }),
    fieldDraft({ id: "languageQualifications", label: "English qualifications", category: "language", required: false, value: englishQualifications || null, mappedFrom: englishQualifications ? "Profile English qualifications" : null }),
    fieldDraft({ id: "activities", label: "Activities and experience", category: "activities", required: false, value: activities.join("\n") || null, mappedFrom: activities.length ? "Profile activities, projects, research, and leadership" : null }),
  ];
}

export function mapVerifiedEvidenceToApplicationDocuments(
  evidence: DecisionEvidence[],
  now = new Date(),
): ApplicationDocumentDraft[] {
  const documents = evidence
    .filter((item) =>
      item.topic === "required_documents",
    )
    .map((item, index) => {
      const authoritative = resolveVerificationStatus(item, now) === "verified" && typeof item.isRequired === "boolean";
      const required = authoritative && item.isRequired === true;
      return {
        id: `${item.sourceId}-${item.evidenceReference ?? index}`,
        label: item.evidenceSnippet.split(":")[0].trim(),
        required,
        prepared: false,
        status: authoritative ? (required ? "MISSING" : "OPTIONAL") : "NEEDS_REVIEW",
        requirementStatus: authoritative ? (required ? "REQUIRED" : "OPTIONAL") : "NEEDS_REVIEW",
        provenance: {
          sourceId: item.sourceId,
          sourceUrl: item.sourceUrl,
          sourceTitle: item.sourceTitle,
          sourceType: item.sourceType,
          academicYear: item.academicYear,
          lastVerified: item.lastVerified,
          evidenceReference: item.evidenceReference,
          notes: item.sourceNotes,
        },
        ...(!authoritative ? { reviewReason: "Requirement is not supported by current authoritative evidence." } : {}),
      } satisfies ApplicationDocumentDraft;
    });
  return documents.length ? documents : [{
    id: "document-requirements-not-established",
    label: "Document requirements not established",
    required: false,
    prepared: false,
    status: "NOT_ESTABLISHED",
    requirementStatus: "NOT_ESTABLISHED",
    provenance: null,
    reviewReason: "No document requirement was found in current authoritative evidence.",
  }];
}

function requirementTarget(topic: DecisionEvidence["topic"]): { fieldId: string | null; category: ApplicationFieldCategory | null } {
  switch (topic) {
    case "admission_requirement": return { fieldId: "academicQualifications", category: "academics" };
    case "english_language_requirement": return { fieldId: "languageQualifications", category: "language" };
    case "international_applicant_requirement": return { fieldId: "citizenship", category: "identity" };
    case "required_documents": return { fieldId: null, category: "documents" };
    case "program_availability": return { fieldId: "program", category: "program" };
    default: return { fieldId: null, category: null };
  }
}

function requirementLabel(topic: DecisionEvidence["topic"]): string {
  return topic.replaceAll("_", " ").replace(/^./, (character) => character.toUpperCase());
}

function evidenceProvenance(item: DecisionEvidence): ApplicationProvenance {
  return {
    sourceId: item.sourceId,
    sourceUrl: item.sourceUrl,
    sourceTitle: item.sourceTitle,
    sourceType: item.sourceType,
    academicYear: item.academicYear,
    lastVerified: item.lastVerified,
    evidenceReference: item.evidenceReference,
    notes: item.sourceNotes,
  };
}

export function mapEvidencePackToApplicationRequirements(
  pack: EvidencePack,
  now = new Date(),
): ApplicationRequirementDraft[] {
  const requirements: ApplicationRequirementDraft[] = pack.evidence.map((item, index) => {
    const status = resolveVerificationStatus(item, now);
    const evidenceStatus: ApplicationRequirementDraft["evidenceStatus"] = status === "verified"
      ? "VERIFIED"
      : status === "stale"
        ? "STALE"
        : status === "conflicting"
          ? "CONFLICTING"
          : "NEEDS_REVIEW";
    return {
      id: item.evidenceReference ?? `${item.sourceId}:${index}`,
      topic: item.topic,
      label: item.evidenceSnippet.split(":")[0].trim() || requirementLabel(item.topic),
      description: item.evidenceSnippet,
      ...requirementTarget(item.topic),
      required: evidenceStatus === "VERIFIED" && typeof item.isRequired === "boolean" ? item.isRequired : null,
      decision: "unknown" as const,
      evidenceStatus,
      provenance: evidenceProvenance(item),
    };
  });
  const presentTopics = new Set(pack.evidence.map((item) => item.topic));
  for (const topic of pack.query.topics) {
    if (presentTopics.has(topic)) continue;
    requirements.push({
      id: `unknown:${topic}`,
      topic,
      label: requirementLabel(topic),
      description: "No evidence was retrieved for this requirement topic.",
      ...requirementTarget(topic),
      required: null,
      decision: "unknown",
      evidenceStatus: "UNKNOWN",
      provenance: null,
    });
  }
  return requirements;
}

export function collectApplicationAnswerFacts(
  profile: StudentProfile,
  userNotes: string,
): { value: string; provenance: ApplicationProvenance }[] {
  const facts: { value: string; provenance: ApplicationProvenance }[] = [];
  const add = (reference: string, value: string | null | undefined, sourceTitle = "Student profile") => {
    if (!value?.trim()) return;
    facts.push({
      value: value.trim(),
      provenance: {
        sourceId: sourceTitle === "Student profile" ? "student-profile" : "user-provided-answer-notes",
        sourceUrl: null,
        sourceTitle,
        sourceType: sourceTitle === "Student profile" ? "student-profile" : "user-entered",
        academicYear: null,
        lastVerified: null,
        evidenceReference: reference,
        notes: sourceTitle === "Student profile"
          ? "Exact value from the current student profile."
          : "Explicitly supplied by the student; not independently verified.",
      },
    });
  };

  add("profile:fullName", profile.fullName);
  add("profile:academicBackground", profile.academicBackground);
  add("profile:currentUniversity", profile.currentUniversity);
  add("profile:degreeProgram", profile.degreeProgram);
  profile.grades.forEach((grade, index) => add(`profile:grade:${index}`, `${grade.subject}: ${grade.result}`));
  profile.testScores.forEach((score, index) => add(`profile:test-score:${index}`, `${score.testName}: ${score.score}`));
  profile.englishQualifications.forEach((item, index) =>
    add(`profile:english-qualification:${index}`, [item.qualification, item.score, item.date].filter(Boolean).join(" · ")),
  );
  [...profile.extracurricularActivities, ...profile.research, ...profile.leadership].forEach((activity, index) =>
    add(`profile:activity:${index}`, [activity.name, activity.role, activity.description, activity.dates].filter(Boolean).join(" · ")),
  );
  profile.projects.forEach((project, index) =>
    add(`profile:project:${index}`, [project.name, project.description, project.dates].filter(Boolean).join(" · ")),
  );
  add("written-answer:user-notes", userNotes, "User-provided answer notes");
  return facts;
}

export function createApplicationWrittenAnswerDraft(input: {
  prompt: string;
  facts: { value: string; provenance: ApplicationProvenance }[];
  generatedText: string;
}): ApplicationWrittenAnswerDraft | null {
  const values = input.facts.map((fact) => fact.value.trim()).filter(Boolean);
  const expectedText = values.join(" ");
  if (!input.prompt.trim() || !expectedText || input.generatedText !== expectedText) return null;
  return {
    id: "written-answer-draft",
    label: "Written answer",
    category: "writtenResponses",
    prompt: input.prompt,
    value: input.generatedText,
    status: "AI_DRAFT",
    reviewState: "REVIEW_REQUIRED",
    reviewLabel: "AI DRAFT — REVIEW REQUIRED",
    provenance: input.facts.map((fact) => fact.provenance),
  };
}

export function createApplicationSchema(input: {
  universitySlug: string;
  program: string;
  fields: ApplicationFieldDraft[];
  requirements: ApplicationRequirementDraft[];
  verifiedEvidence: boolean;
}): ApplicationSchema {
  return {
    id: `${input.universitySlug}:${input.program}`,
    universitySlug: input.universitySlug,
    program: input.program,
    source: input.verifiedEvidence ? "verified-evidence" : "local-template",
    fields: input.fields,
    requirements: input.requirements,
  };
}

export function evaluateMockJevEvidence(
  domain: DecisionDomain,
  evidence: DecisionEvidence[],
  now = new Date(),
): {
  decision: "READY" | "NEEDS_REVIEW" | "UNKNOWN";
  reason: string;
  confidenceScore: number;
  confidenceLevel: "medium" | "low";
  missingInformation: string[];
} {
  const conflicts = findEvidenceConflicts(evidence);
  const hasStaleEvidence = evidence.some((item) => resolveVerificationStatus(item, now) === "stale");
  const verified = evidence.length > 0 && evidence.every((item) => isAuthoritativeEvidence(item, now));

  if (!evidence.length) {
    return {
      decision: "UNKNOWN",
      reason: "No evidence is available; the decision cannot be determined.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
      missingInformation: ["Source-backed evidence for the requested admissions question"],
    };
  }
  if (conflicts.length || hasConflictingEvidence(evidence)) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Conflicting evidence requires human review.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
      missingInformation: ["Resolution of conflicting university evidence"],
    };
  }
  if (hasStaleEvidence) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Evidence is stale and must be reverified before it can support a decision.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
      missingInformation: ["Current source verification"],
    };
  }
  if (!verified) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Mock, missing, or unverified evidence cannot support an authoritative decision.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
      missingInformation: ["Verified source, academic year, and evidence reference"],
    };
  }
  if (domain !== "application_readiness") {
    return {
      decision: "NEEDS_REVIEW",
      reason: "This mock engine does not determine admissions or scholarship eligibility.",
      confidenceScore: 0.75,
      confidenceLevel: "medium",
      missingInformation: ["Human evaluation for this decision type"],
    };
  }
  return {
    decision: "NEEDS_REVIEW",
    reason: "Verified evidence is available, but the local mock JEV has no deterministic rule to compare it with the student's profile.",
    confidenceScore: 0.2,
    confidenceLevel: "low",
    missingInformation: ["A deterministic student-to-requirement evaluation rule"],
  };
}

export function createMockJevDecisionResponse<TInput>(
  request: DecisionRequest<TInput>,
  decisionTime = new Date(),
): DecisionResponse<DecisionOutcome> {
  const evaluation = evaluateMockJevEvidence(
    request.question.domain,
    request.evidence,
    decisionTime,
  );
  const needsReview = evaluation.decision !== "READY";
  return {
    requestId: request.requestId,
    status: needsReview ? "NEEDS_HUMAN_REVIEW" : "DECIDED",
    result: {
      decision: evaluation.decision,
      confidence: {
        score: evaluation.confidenceScore,
        level: evaluation.confidenceLevel,
        rationale: "Local deterministic mock; not a connected JEV service.",
      },
      probability: null,
      reasons: [evaluation.reason],
      missingInformation: evaluation.missingInformation,
    },
    reviewReasons: needsReview ? [evaluation.reason] : [],
    evidence: request.evidence,
    decisionTimestamp: decisionTime.toISOString(),
  };
}

export function evaluateApplicationJevDecision(input: {
  fields: ApplicationFieldDraft[];
  documents: ApplicationDocumentDraft[];
  evidence: DecisionEvidence[];
  evidencePack?: EvidencePack;
}, now = new Date()): {
  decision: ApplicationDecision;
  reason: string;
  missingInformation: string[];
} {
  const missingFields = input.fields.filter((field) =>
    field.required && (!field.value?.trim() || field.status === "NEEDS_REVIEW" || field.status === "INVALID"),
  );
  if (missingFields.length) {
    return {
      decision: "NOT_READY",
      reason: "Required application fields are missing or unresolved.",
      missingInformation: missingFields.map((field) => field.label),
    };
  }

  const missingDocuments = input.documents.filter((document) => document.required && !document.prepared);
  if (missingDocuments.length) {
    return {
      decision: "NOT_READY",
      reason: "Required documents have not been confirmed as prepared.",
      missingInformation: missingDocuments.map((document) => document.label),
    };
  }

  if (input.fields.some((field) => field.status === "NEEDS_REVIEW") || input.documents.some((document) => document.requirementStatus === "NEEDS_REVIEW" || document.requirementStatus === "NOT_ESTABLISHED" || document.status === "NEEDS_REVIEW" || document.status === "NOT_ESTABLISHED")) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Ambiguous mappings or unresolved document requirements need human review.",
      missingInformation: ["Resolve all ambiguous mappings and document requirements"],
    };
  }

  if (!input.evidence.length || input.evidencePack?.status === "UNKNOWN") {
    return {
      decision: "UNKNOWN",
      reason: "Current application requirement evidence is not established.",
      missingInformation: ["Current authoritative requirements for the selected program and academic year"],
    };
  }

  if (
    hasConflictingEvidence(input.evidence) ||
    input.evidence.some((item) => resolveVerificationStatus(item, now) !== "verified") ||
    (input.evidencePack !== undefined && (!input.evidencePack.authoritative || input.evidencePack.status !== "READY"))
  ) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Evidence is stale, conflicting, unverified, or outside the resolved application scope.",
      missingInformation: ["Current authoritative, non-conflicting evidence"],
    };
  }

  return {
    decision: "NEEDS_REVIEW",
    reason: "Verified evidence is available, but the local JEV has no deterministic rule for comparing every requirement with the student profile.",
    missingInformation: ["Deterministic requirement-to-profile comparison"],
  };
}

export function validateApplicationFields(fields: ApplicationFieldDraft[]): string[] {
  const errors: string[] = [];

  for (const field of fields) {
    const value = field.value?.trim() ?? "";
    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
      continue;
    }

    if (field.id === "email" && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push("Email must be a valid email address.");
    }

    if (field.id === "graduationYear" && value && !/^\d{4}$/.test(value)) {
      errors.push("Graduation year must contain four digits.");
    }
    if (field.status === "NEEDS_REVIEW") errors.push(`${field.label} needs review before it can be used.`);
  }

  return errors;
}

export function validateApplicationFieldDrafts(fields: ApplicationFieldDraft[]): ApplicationFieldDraft[] {
  return fields.map((field) => {
    if (field.status === "NEEDS_REVIEW") {
      return { ...field, validationState: "NEEDS_REVIEW", reviewState: "REVIEW_REQUIRED" };
    }
    const hasValue = Boolean(field.value?.trim());
    const invalid = hasValue && validateApplicationFields([field]).length > 0;
    return {
      ...field,
      status: invalid ? "INVALID" : field.status === "INVALID" ? "USER_ENTERED" : field.status,
      validationState: invalid ? "INVALID" : hasValue ? "VALID" : "NOT_VALIDATED",
      reviewState: invalid ? "REVIEW_REQUIRED" : field.reviewState,
    };
  });
}

export function findEvidenceConflicts(evidence: DecisionEvidence[]): string[] {
  const snippetsByReference = new Map<string, Set<string>>();

  for (const item of evidence) {
    if (!item.evidenceReference) continue;
    const snippets = snippetsByReference.get(item.evidenceReference) ?? new Set<string>();
    snippets.add(item.evidenceSnippet.trim());
    snippetsByReference.set(item.evidenceReference, snippets);
  }

  return [...snippetsByReference]
    .filter(([, snippets]) => snippets.size > 1)
    .map(([reference]) => reference);
}

export function evaluateApplicationReadiness(input: {
  fields: ApplicationFieldDraft[];
  documents: ApplicationDocumentDraft[];
  writtenAnswers?: ApplicationWrittenAnswerDraft[];
  requirements?: ApplicationRequirementDraft[];
  decision: ApplicationDecision;
  evidence: DecisionEvidence[];
  evidencePack?: EvidencePack;
  validationErrors: string[];
  humanReviewed: boolean;
}, now = new Date()): ApplicationReadinessResult {
  if (
    input.fields.length === 0 &&
    input.documents.length === 0 &&
    !(input.writtenAnswers?.length) &&
    !(input.requirements?.length)
  ) {
    return {
      status: "NOT_READY",
      state: "DRAFT",
      reasons: ["The application draft has not been prepared."],
      unresolvedItems: [],
      humanReviewRequired: true,
    };
  }

  const missingFields = input.fields.filter(
    (field) => field.required && (!field.value?.trim() || field.status === "INVALID" || field.status === "NEEDS_REVIEW"),
  );
  const missingDocuments = input.documents.filter(
    (document) => document.required && (!document.prepared || document.status === "NEEDS_REVIEW"),
  );
  const fieldsNeedingReview = input.fields.filter((field) => field.status === "NEEDS_REVIEW" || field.validationState === "NEEDS_REVIEW");
  const documentsNeedingReview = input.documents.filter((document) => document.requirementStatus === "NEEDS_REVIEW" || document.requirementStatus === "NOT_ESTABLISHED" || document.status === "NEEDS_REVIEW" || document.status === "NOT_ESTABLISHED");
  const answersNeedingReview = (input.writtenAnswers ?? []).filter((answer) => answer.status === "AI_DRAFT" && answer.reviewState !== "REVIEWED");
  const requirementsNotSatisfied = (input.requirements ?? []).filter((requirement) => requirement.required !== false && requirement.decision === "not_satisfied");
  const requirementsNeedingReview = (input.requirements ?? []).filter((requirement) =>
    requirement.required !== false && (requirement.decision === "unknown" || requirement.evidenceStatus !== "VERIFIED"),
  );
  const conflicts = findEvidenceConflicts(input.evidence);
  const verifiedEvidence = input.evidence.length > 0 && input.evidence.every((item) => isAuthoritativeEvidence(item, now));
  const staleEvidence = input.evidence.some((item) => resolveVerificationStatus(item, now) === "stale");
  const evidencePackIsAuthoritative = !input.evidencePack || (input.evidencePack.status === "READY" && input.evidencePack.authoritative);
  const unresolvedItems = [
    ...missingFields.map((field) => ({
      id: field.id,
      label: field.label,
      required: field.required,
      resolved: false,
    })),
    ...missingDocuments.map((document) => ({
      id: document.id,
      label: document.label,
      required: document.required,
      resolved: false,
    })),
    ...fieldsNeedingReview.map((field) => ({ id: field.id, label: field.label, required: field.required, resolved: false, needsVerification: true })),
    ...documentsNeedingReview.map((document) => ({ id: document.id, label: document.label, required: document.required, resolved: false, needsVerification: true })),
    ...answersNeedingReview.map((answer) => ({ id: answer.id, label: answer.label, required: true, resolved: false, needsVerification: true })),
    ...requirementsNeedingReview.map((requirement) => ({ id: requirement.id, label: requirement.label, required: requirement.required !== false, resolved: false, needsVerification: true })),
    ...requirementsNotSatisfied.map((requirement) => ({ id: requirement.id, label: requirement.label, required: true, resolved: false })),
  ];
  const reasons = [
    ...missingFields.map((field) => `Complete ${field.label.toLowerCase()}.`),
    ...missingDocuments.map((document) => `Confirm ${document.label.toLowerCase()} is prepared.`),
    ...input.validationErrors,
  ];

  if (missingFields.length || missingDocuments.length || requirementsNotSatisfied.length || input.validationErrors.length || input.decision === "NOT_READY" || input.decision === "NOT_ELIGIBLE") {
    return { status: "NOT_READY", state: "INCOMPLETE", reasons, unresolvedItems, humanReviewRequired: true };
  }

  if (conflicts.length || hasConflictingEvidence(input.evidence)) reasons.push(`Conflicting evidence requires review${conflicts.length ? `: ${conflicts.join(", ")}` : ""}.`);
  if (staleEvidence) reasons.push("Evidence is stale and must be reverified from its source.");
  if (!input.evidence.length) reasons.push("No evidence is available for the application requirements.");
  else if (!verifiedEvidence && !staleEvidence) reasons.push("Evidence is mock or unverified and must be confirmed from official sources.");
  if (!evidencePackIsAuthoritative) reasons.push(...(input.evidencePack?.reasons ?? ["The evidence pack is not authoritative."]));
  if (fieldsNeedingReview.length) reasons.push("Ambiguous or conflicting field mappings need human review.");
  if (documentsNeedingReview.length) reasons.push("Some document requirements are not established by current authoritative evidence.");
  if (answersNeedingReview.length) reasons.push("AI-drafted written answers require review.");
  if (requirementsNeedingReview.length) reasons.push("Requirement satisfaction is unknown until a deterministic comparison or human review is available.");
  if (input.decision !== "READY") reasons.push("The JEV decision is not affirmative.");
  if (!input.humanReviewed) reasons.push("Student review of the draft is still required.");

  if (conflicts.length || hasConflictingEvidence(input.evidence) || staleEvidence || !verifiedEvidence || !evidencePackIsAuthoritative || fieldsNeedingReview.length || documentsNeedingReview.length || answersNeedingReview.length || requirementsNeedingReview.length || input.decision !== "READY" || !input.humanReviewed) {
    return { status: "REVIEW_REQUIRED", state: "NEEDS_REVIEW", reasons, unresolvedItems, humanReviewRequired: true };
  }

  return {
    status: "READY_FOR_SUBMISSION",
    state: "READY_FOR_SUBMISSION",
    reasons: ["Required fields, documents, verified evidence, and human review are complete."],
    unresolvedItems,
    humanReviewRequired: false,
  };
}
