import type {
  Application,
  ApplicationReadinessState,
  ApplicantType,
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

export type EvidenceTopic =
  | "admission_requirement"
  | "english_language_requirement"
  | "application_deadline"
  | "scholarship_eligibility"
  | "program_availability"
  | "required_documents"
  | "international_applicant_requirement";

export type EvidenceQuery = {
  universitySlug: string;
  topics: EvidenceTopic[];
  academicYear: string | null;
  questionText?: string;
  programId?: string | null;
  applicantType?: ApplicantType | null;
};

export type DecisionEvidence = {
  evidenceId?: string;
  programId?: string | null;
  topic: EvidenceTopic;
  sourceId: string;
  sourceUrl: string | null;
  sourceTitle: string;
  sourceType: OfficialSource["sourceType"];
  academicYear: string | null;
  lastVerified: string | null;
  evidenceSnippet: string;
  evidenceReference: string | null;
  isRequired?: boolean | null;
  verificationStatus: OfficialSource["verificationStatus"];
  sourceNotes: string | null;
};

export type RetrievedEvidence = DecisionEvidence & {
  evidenceId: string;
  universitySlug: string;
  universityName: string;
  programId: string | null;
  applicantType: ApplicantType | "all" | null;
  freshnessStatus: "current" | "stale" | "unknown";
};

export type EvidencePackStatus = "READY" | "UNKNOWN" | "NEEDS_HUMAN_REVIEW";

export type EvidencePack = {
  query: EvidenceQuery;
  status: EvidencePackStatus;
  authoritative: boolean;
  evidence: RetrievedEvidence[];
  reasons: string[];
};

export type AdmissionsQuestionRequest = {
  universitySlug: string;
  question: string;
  academicYear: string | null;
  topic?: EvidenceTopic;
  programId?: string | null;
  applicantType?: ApplicantType | null;
  explainWithLanguage?: boolean;
};

export type AdmissionsQuestionResponse = {
  question: string;
  answer: string;
  decision: DecisionResponse<DecisionOutcome>;
  evidencePack: EvidencePack;
  explanation: string | null;
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
  evidenceQuery?: EvidenceQuery;
  evidence: DecisionEvidence[];
  evidencePack?: EvidencePack;
  requestedAt: string;
};

export type DecisionResponse<TDecision = unknown> = {
  requestId: string;
  status: "DECIDED" | "NEEDS_HUMAN_REVIEW";
  result: DecisionResult<TDecision>;
  reviewReasons: string[];
  evidence: DecisionEvidence[];
  evidencePack?: EvidencePack;
  decisionTimestamp: string;
};

export interface DecisionEngine {
  evaluate<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>>;
}

export interface EvidenceRetriever {
  retrieve<TInput>(request: DecisionRequest<TInput>): Promise<DecisionEvidence[]>;
  retrievePack(query: EvidenceQuery): Promise<EvidencePack>;
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

export type { ApplicationReadinessState } from "./domain";

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

export type ApplicationFieldCategory =
  | "identity"
  | "contact"
  | "academics"
  | "program"
  | "language"
  | "activities"
  | "documents"
  | "writtenResponses";

export type ApplicationProvenance = {
  sourceId: string;
  sourceUrl: string | null;
  sourceTitle: string;
  sourceType: OfficialSource["sourceType"] | "student-profile" | "user-entered" | "ai-generated";
  academicYear: string | null;
  lastVerified: string | null;
  evidenceReference: string | null;
  notes: string | null;
};

export type ApplicationFieldStatus =
  | "AUTO_MAPPED"
  | "USER_ENTERED"
  | "AI_DRAFT"
  | "MISSING"
  | "NEEDS_REVIEW"
  | "INVALID"
  | "MAPPED"
  | "STUDENT_PROVIDED";

export type ApplicationFieldValidationState = "NOT_VALIDATED" | "VALID" | "INVALID" | "NEEDS_REVIEW";
export type ApplicationFieldReviewState = "NOT_REVIEWED" | "REVIEW_REQUIRED" | "REVIEWED";

export type ApplicationFieldDraft = {
  id: string;
  label: string;
  category: ApplicationFieldCategory;
  required: boolean;
  value: string | null;
  status: ApplicationFieldStatus;
  mappedFrom: string | null;
  provenance: ApplicationProvenance | null;
  validationState: ApplicationFieldValidationState;
  reviewState: ApplicationFieldReviewState;
  reviewReason?: string | null;
};

export type ApplicationSchema = {
  id: string;
  universitySlug: string;
  program: string;
  source: "local-template" | "verified-evidence";
  fields: ApplicationFieldDraft[];
  requirements: ApplicationRequirementDraft[];
};

export type ApplicationRequirementDraft = {
  id: string;
  topic: EvidenceTopic;
  label: string;
  description: string;
  fieldId: string | null;
  category: ApplicationFieldCategory | null;
  required: boolean | null;
  decision: RequirementDecision;
  evidenceStatus: "VERIFIED" | "UNKNOWN" | "NEEDS_REVIEW" | "STALE" | "CONFLICTING";
  provenance: ApplicationProvenance | null;
};

export type ApplicationDocumentStatus =
  | "REQUIRED"
  | "OPTIONAL"
  | "MISSING"
  | "CONFIRMED"
  | "NEEDS_REVIEW"
  | "NOT_ESTABLISHED";

export type ApplicationDocumentRequirementStatus =
  | "REQUIRED"
  | "OPTIONAL"
  | "NEEDS_REVIEW"
  | "NOT_ESTABLISHED";

export type ApplicationDocumentDraft = {
  id: string;
  label: string;
  required: boolean;
  prepared: boolean;
  status: ApplicationDocumentStatus;
  requirementStatus?: ApplicationDocumentRequirementStatus;
  provenance: ApplicationProvenance | null;
  reviewReason?: string | null;
};

export type ApplicationWrittenAnswerDraft = {
  id: string;
  label: string;
  category: "writtenResponses";
  prompt: string;
  value: string;
  status: "AI_DRAFT" | "USER_ENTERED";
  reviewState: "REVIEW_REQUIRED" | "REVIEWED";
  reviewLabel: "AI DRAFT — REVIEW REQUIRED";
  provenance: ApplicationProvenance[];
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
  state: ApplicationReadinessState;
  reasons: string[];
  unresolvedItems: ReadinessItem[];
  humanReviewRequired: boolean;
};

export type ApplicationCopilotInput = {
  profile: StudentProfile;
  application: Application;
  university: University;
};

export type ApplicationCopilotAssessment = {
  schema: ApplicationSchema;
  fields: ApplicationFieldDraft[];
  documents: ApplicationDocumentDraft[];
  requirements: ApplicationRequirementDraft[];
  writtenAnswers: ApplicationWrittenAnswerDraft[];
  decision: DecisionResponse<ApplicationDecision>;
  evidencePack: EvidencePack;
  readiness: ApplicationReadinessResult;
  validationErrors: string[];
};

export type ApplicationCopilotDraftState = {
  fields: ApplicationFieldDraft[];
  documents: ApplicationDocumentDraft[];
  requirements: ApplicationRequirementDraft[];
  writtenAnswers: ApplicationWrittenAnswerDraft[];
  readinessState: ApplicationReadinessState;
  humanReviewed: boolean;
};

export type PortalDraft = {
  applicationId: string;
  fields: Record<string, string | null>;
};

export interface ApplicationPortalAdapter {
  prepareDraft(input: ApplicationCopilotInput): Promise<PortalDraft>;
}

export interface AdmissionsAIOrchestrator {
  evaluate<TInput>(
    request: DecisionRequest<TInput>,
  ): Promise<DecisionResponse<DecisionOutcome>>;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
  answerQuestion(request: AdmissionsQuestionRequest): Promise<AdmissionsQuestionResponse>;
}