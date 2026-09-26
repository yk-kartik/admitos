import type {
  ApplicationDecision,
  ApplicationDocumentDraft,
  ApplicationFieldDraft,
  ApplicationReadinessResult,
  DecisionDomain,
  DecisionEvidence,
} from "@/types/ai";
import type { StudentProfile } from "@/types/domain";

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

export function evaluateMockJevEvidence(
  domain: DecisionDomain,
  evidence: DecisionEvidence[],
): {
  decision: "READY" | "NEEDS_REVIEW" | "UNKNOWN";
  reason: string;
  confidenceScore: number;
  confidenceLevel: "medium" | "low";
} {
  const conflicts = findEvidenceConflicts(evidence);
  const verified = evidence.length > 0 && evidence.every(
    (item) => item.verificationStatus === "verified" && Boolean(item.sourceUrl && item.lastVerified),
  );

  if (!evidence.length) {
    return {
      decision: "UNKNOWN",
      reason: "No evidence is available; the decision cannot be determined.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
    };
  }
  if (conflicts.length) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Conflicting evidence requires human review.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
    };
  }
  if (!verified) {
    return {
      decision: "NEEDS_REVIEW",
      reason: "Mock or unverified evidence cannot support an authoritative decision.",
      confidenceScore: 0.2,
      confidenceLevel: "low",
    };
  }
  if (domain !== "application_readiness") {
    return {
      decision: "NEEDS_REVIEW",
      reason: "This mock engine does not determine admissions or scholarship eligibility.",
      confidenceScore: 0.75,
      confidenceLevel: "medium",
    };
  }
  return {
    decision: "READY",
    reason: "Verified evidence is consistent for this mock readiness decision.",
    confidenceScore: 0.75,
    confidenceLevel: "medium",
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
}): ApplicationReadinessResult {
  const missingFields = input.fields.filter(
    (field) => field.required && (!field.value?.trim() || field.status === "INVALID" || field.status === "NEEDS_REVIEW"),
  );
  const missingDocuments = input.documents.filter(
    (document) => document.required && !document.prepared,
  );
  const conflicts = findEvidenceConflicts(input.evidence);
  const verifiedEvidence = input.evidence.length > 0 && input.evidence.every(
    (item) => item.verificationStatus === "verified" && Boolean(item.sourceUrl && item.lastVerified),
  );
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

  if (conflicts.length) reasons.push(`Conflicting evidence requires review: ${conflicts.join(", ")}.`);
  if (!input.evidence.length) reasons.push("No evidence is available for the application requirements.");
  else if (!verifiedEvidence) reasons.push("Evidence is mock or unverified and must be confirmed from official sources.");
  if (input.decision !== "READY") reasons.push("The JEV decision is not affirmative.");
  if (!input.humanReviewed) reasons.push("Student review of the draft is still required.");

  if (conflicts.length || !verifiedEvidence || input.decision !== "READY" || !input.humanReviewed) {
    return { status: "REVIEW_REQUIRED", reasons, unresolvedItems, humanReviewRequired: true };
  }

  return {
    status: "READY_FOR_SUBMISSION",
    reasons: ["Required fields, documents, verified evidence, and human review are complete."],
    unresolvedItems,
    humanReviewRequired: false,
  };
}
