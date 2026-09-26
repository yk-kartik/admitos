import type {
  ApplicationDecision,
  ApplicationDocumentDraft,
  ApplicationFieldDraft,
  ApplicationReadinessResult,
  DecisionDomain,
  DecisionEvidence,
  DecisionOutcome,
  DecisionRequest,
  DecisionResponse,
} from "@/types/ai";
import type { StudentProfile } from "@/types/domain";
import { resolveVerificationStatus } from "./evidence-retriever.ts";

function isAuthoritativeEvidence(evidence: DecisionEvidence, now = new Date()): boolean {
  return resolveVerificationStatus(evidence, now) === "verified";
}

function hasConflictingEvidence(evidence: DecisionEvidence[]): boolean {
  return evidence.some((item) => item.verificationStatus === "conflicting") || findEvidenceConflicts(evidence).length > 0;
}

export function mapProfileToApplicationFields(
  profile: StudentProfile,
): ApplicationFieldDraft[] {
  const existingValue = (value: string | null) => value?.trim() ? value : null;
  const academicQualifications = [
    existingValue(profile.academicBackground),
    ...profile.grades.map((grade) => `${grade.subject}: ${grade.result}`),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join("\n");

  const fields: { id: string; label: string; value: string | null; mappedFrom: string | null }[] = [
    { id: "fullName", label: "Full name", value: existingValue(profile.fullName), mappedFrom: "Profile name" },
    { id: "dateOfBirth", label: "Date of birth", value: null, mappedFrom: null },
    { id: "email", label: "Email", value: null, mappedFrom: null },
    { id: "phone", label: "Phone", value: null, mappedFrom: null },
    { id: "address", label: "Address", value: null, mappedFrom: null },
    {
      id: "academicQualifications",
      label: "Academic qualifications",
      value: academicQualifications || null,
      mappedFrom: academicQualifications ? "Academic background and grades" : null,
    },
    {
      id: "school",
      label: "School / current institution",
      value: existingValue(profile.currentUniversity),
      mappedFrom: "Current institution",
    },
    { id: "graduationYear", label: "Graduation year", value: null, mappedFrom: null },
  ];

  return fields.map((field) => ({
    ...field,
    required: true,
    status: field.value?.trim() ? "MAPPED" : "MISSING",
  }));
}

export function mapVerifiedEvidenceToApplicationDocuments(
  evidence: DecisionEvidence[],
  now = new Date(),
): ApplicationDocumentDraft[] {
  return evidence
    .filter((item) =>
      item.topic === "required_documents" &&
      typeof item.isRequired === "boolean" &&
      resolveVerificationStatus(item, now) === "verified",
    )
    .map((item, index) => ({
      id: `${item.sourceId}-${item.evidenceReference ?? index}`,
      label: item.evidenceSnippet.split(":")[0].trim(),
      required: item.isRequired as boolean,
      prepared: false,
    }));
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
  }

  return errors;
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
  decision: ApplicationDecision;
  evidence: DecisionEvidence[];
  validationErrors: string[];
  humanReviewed: boolean;
}, now = new Date()): ApplicationReadinessResult {
  const missingFields = input.fields.filter(
    (field) => field.required && (!field.value?.trim() || field.status === "INVALID" || field.status === "NEEDS_REVIEW"),
  );
  const missingDocuments = input.documents.filter(
    (document) => document.required && !document.prepared,
  );
  const conflicts = findEvidenceConflicts(input.evidence);
  const verifiedEvidence = input.evidence.length > 0 && input.evidence.every((item) => isAuthoritativeEvidence(item, now));
  const staleEvidence = input.evidence.some((item) => resolveVerificationStatus(item, now) === "stale");
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
  ];
  const reasons = [
    ...missingFields.map((field) => `Complete ${field.label.toLowerCase()}.`),
    ...missingDocuments.map((document) => `Confirm ${document.label.toLowerCase()} is prepared.`),
    ...input.validationErrors,
  ];

  if (missingFields.length || missingDocuments.length || input.validationErrors.length || input.decision === "NOT_READY" || input.decision === "NOT_ELIGIBLE") {
    return { status: "NOT_READY", reasons, unresolvedItems, humanReviewRequired: true };
  }

  if (conflicts.length || hasConflictingEvidence(input.evidence)) reasons.push(`Conflicting evidence requires review${conflicts.length ? `: ${conflicts.join(", ")}` : ""}.`);
  if (staleEvidence) reasons.push("Evidence is stale and must be reverified from its source.");
  if (!input.evidence.length) reasons.push("No evidence is available for the application requirements.");
  else if (!verifiedEvidence && !staleEvidence) reasons.push("Evidence is mock or unverified and must be confirmed from official sources.");
  if (input.decision !== "READY") reasons.push("The JEV decision is not affirmative.");
  if (!input.humanReviewed) reasons.push("Student review of the draft is still required.");

  if (conflicts.length || hasConflictingEvidence(input.evidence) || staleEvidence || !verifiedEvidence || input.decision !== "READY" || !input.humanReviewed) {
    return { status: "REVIEW_REQUIRED", reasons, unresolvedItems, humanReviewRequired: true };
  }

  return {
    status: "READY_FOR_SUBMISSION",
    reasons: ["Required fields, documents, verified evidence, and human review are complete."],
    unresolvedItems,
    humanReviewRequired: false,
  };
}
