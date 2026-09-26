import type {
  Application,
  AdmissionRequirement,
  OfficialSource,
  StudentProfile,
  University,
} from "@/types/domain";

export type DecisionType = "choice" | "score" | "probability";

export type DecisionDomain =
  | "eligibility"
  | "scholarship_match"
  | "university_match"
  | "requirement_classification"
  | "document_check"
  | "field_mapping"
  | "application_readiness"
  | "application_field_validation";

export type DecisionQuestion = {
  id: string;
  domain: DecisionDomain;
  type: DecisionType;
  prompt: string;
  choices?: string[];
};

export type DecisionEvidence = {
  sourceId: string;
  sourceUrl: string | null;
  sourceTitle: string;
  sourceType: OfficialSource["sourceType"];
  academicYear: string | null;
  lastVerified: string | null;
  evidenceSnippet: string;
  evidenceReference: string | null;
  verificationStatus: OfficialSource["verificationStatus"];
};

export type DecisionConfidence = {
  score: number;
  level: "high" | "medium" | "low";
  rationale: string;
};

export type DecisionResult<TDecision = unknown> = {
  decision: TDecision;
  confidence: DecisionConfidence;
  probability: number | null;
  reasons: string[];
  missingInformation: string[];
};

export type DecisionRequest<TInput = Record<string, unknown>> = {
  requestId: string;
  question: DecisionQuestion;
  input: TInput;
  evidence: DecisionEvidence[];
  requestedAt: string;
};

export type DecisionResponse<TDecision = unknown> = {
  requestId: string;
  status: "DECIDED" | "NEEDS_HUMAN_REVIEW";
  result: DecisionResult<TDecision>;
  reviewReasons: string[];
  evidence: DecisionEvidence[];
  decisionTimestamp: string;
};

export interface DecisionEngine {
  evaluate<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>>;
}

export interface EvidenceRetriever {
  retrieve<TInput>(request: DecisionRequest<TInput>): Promise<DecisionEvidence[]>;
}

export type GenerationTask =
  | "sop_draft"
  | "personal_statement"
  | "email_draft"
  | "natural_language_explanation"
  | "rewrite"
  | "conversation";

export type GenerationRequest = {
  task: GenerationTask;
  prompt: string;
  context: Record<string, unknown>;
};

export type GenerationResponse = {
  text: string;
  generatedAt: string;
  modelLabel: string;
};

export interface GenerativeModel {
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

export type EligibilityDecision =
  | "eligible"
  | "probably_eligible"
  | "needs_review"
  | "not_eligible";

export type ScholarshipMatchDecision = "match" | "no_match" | "needs_review";

export type UniversityMatchDecision =
  | "strong_match"
  | "possible_match"
  | "weak_match"
  | "not_match"
  | "needs_review";

export type RequirementDecision = "satisfied" | "not_satisfied" | "unknown";

export type DocumentRequirementDecision =
  | "required"
  | "optional"
  | "not_required"
  | "unknown";

export type DocumentPresenceDecision =
  | "present"
  | "missing"
  | "needs_verification";

export type FieldMappingDecision =
  | "profile_value_matches_field"
  | "needs_review"
  | "missing_information";

export type ApplicationReadiness =
  | "NOT_READY"
  | "REVIEW_REQUIRED"
  | "READY_FOR_SUBMISSION";

export type ApplicationDecision =
  | "ELIGIBLE"
  | "NOT_ELIGIBLE"
  | "NEEDS_REVIEW"
  | "READY"
  | "NOT_READY"
  | "UNKNOWN";

export type DecisionOutcome =
  | ApplicationDecision
  | EligibilityDecision
  | ScholarshipMatchDecision
  | UniversityMatchDecision
  | RequirementDecision
  | DocumentRequirementDecision
  | DocumentPresenceDecision
  | FieldMappingDecision;

export type ApplicationFieldStatus =
  | "MAPPED"
  | "STUDENT_PROVIDED"
  | "MISSING"
  | "NEEDS_REVIEW"
  | "INVALID";

export type ApplicationFieldDraft = {
  id: string;
  label: string;
  required: boolean;
  value: string | null;
  status: ApplicationFieldStatus;
  mappedFrom: string | null;
};

export type ApplicationDocumentDraft = {
  id: string;
  label: string;
  required: boolean;
  prepared: boolean;
};

export type ReadinessItem = {
  id: string;
  label: string;
  required: boolean;
  resolved: boolean;
  needsVerification?: boolean;
};

export type ApplicationReadinessInput = {
  fields: ApplicationFieldDraft[];
  information: ReadinessItem[];
  documents: ReadinessItem[];
  sourcesConflict: boolean;
  dataAmbiguous: boolean;
  confidence: DecisionConfidence;
  evidence: DecisionEvidence[];
  decision: ApplicationDecision;
  validationErrors: string[];
  humanReviewed: boolean;
};

export type ApplicationReadinessResult = {
  status: ApplicationReadiness;
  reasons: string[];
  unresolvedItems: ReadinessItem[];
  humanReviewRequired: boolean;
};

export type ApplicationCopilotInput = {
  profile: StudentProfile;
  application: Application;
  university: University;
  requirements: AdmissionRequirement[];
};

export type ApplicationCopilotAssessment = {
  fields: ApplicationFieldDraft[];
  documents: ApplicationDocumentDraft[];
  decision: DecisionResponse<ApplicationDecision>;
  readiness: ApplicationReadinessResult;
  validationErrors: string[];
};

export type PortalDraft = {
  applicationId: string;
  fields: Record<string, string | null>;
};

export interface ApplicationPortalAdapter {
  prepareDraft(input: ApplicationCopilotInput): Promise<PortalDraft>;
  submit(
    draft: PortalDraft,
    confirmation: { explicitUserConfirmation: true },
  ): Promise<{ submitted: boolean; reference: string | null }>;
}

export interface AdmissionsAIOrchestrator {
  evaluate<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>>;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}