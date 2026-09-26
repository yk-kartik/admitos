import type { LucideIcon } from "lucide-react";

export type {
  ApplicationDecision,
  ApplicationDocumentDraft,
  ApplicationFieldDraft,
  ApplicationFieldStatus,
  ApplicationReadiness,
  ApplicationReadinessInput,
  ApplicationReadinessResult,
  ApplicationCopilotInput,
  AdmissionsAIOrchestrator,
  ApplicationPortalAdapter,
  DecisionConfidence,
  DecisionDomain,
  DecisionEngine,
  DecisionEvidence,
  DecisionOutcome,
  DecisionQuestion,
  DecisionRequest,
  DecisionResponse,
  DecisionResult,
  DecisionType,
  EvidenceQuery,
  EvidenceTopic,
  DocumentPresenceDecision,
  DocumentRequirementDecision,
  EligibilityDecision,
  EvidenceRetriever,
  FieldMappingDecision,
  GenerationRequest,
  GenerationResponse,
  GenerationTask,
  GenerativeModel,
  PortalDraft,
  ReadinessItem,
  RequirementDecision,
  ScholarshipMatchDecision,
  UniversityMatchDecision,
} from "./ai";

export type {
  AdmissionRequirement as DomainAdmissionRequirement,
  AdvisorContext,
  AdviceSourceReference,
  Application as DomainApplication,
  ApplicationDeadline as DomainApplicationDeadline,
  ApplicationStatus as DomainApplicationStatus,
  EnglishQualification,
  FinancialConstraints,
  GradeRecord,
  OfficialSource,
  Pathway,
  ResourceResult,
  ResourceViewState,
  Scholarship as DomainScholarship,
  ScholarshipAmount,
  SourceType,
  StudentActivity,
  StudentProfile as DomainStudentProfile,
  StudentProject,
  StructuredAdvice,
  SourcedClaim,
  TestScore,
  University as DomainUniversity,
  UniversityContact,
  UniversityProgram as DomainUniversityProgram,
  VerificationStatus,
} from "./domain";

export type NavigationItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export type SectionKey =
  | "ai-advisor"
  | "universities"
  | "scholarships"
  | "pathways"
  | "applications"
  | "profile";

export type SectionContent = {
  eyebrow: string;
  title: string;
  description: string;
  panelTitle: string;
  panelDescription: string;
  checklist: string[];
  insightLabel: string;
  insightValue: string;
  insightDescription: string;
  icon: LucideIcon;
};

export type StatusTone = "positive" | "attention" | "neutral";

export type ScholarshipOpportunity = {
  id: string;
  name: string;
  provider: string;
  summary: string;
  award: string;
  eligibleRegions: string[];
  degreeLevels: string[];
  focusAreas: string[];
  deadline: string;
  eligibility: string[];
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  isMock: boolean;
};

export type ApplicationStatus =
  | "Planning"
  | "In progress"
  | "Ready to submit"
  | "Submitted";

export type ApplicationRecord = {
  id: string;
  universitySlug: string;
  universityName: string;
  program: string;
  intake: string;
  status: ApplicationStatus;
  progress: number;
  deadline: string;
  tasks: { label: string; complete: boolean }[];
};

export type StudyPathway = {
  id: string;
  title: string;
  description: string;
  duration: string;
  stages: { title: string; detail: string; duration: string }[];
  considerations: string[];
};

export type StudentProfile = {
  name: string;
  preferredName: string;
  citizenship: string;
  currentLocation: string;
  intendedIntake: string;
  studyLevel: string;
  interests: string[];
  languages: { name: string; proficiency: string }[];
  academicSummary: string;
  completion: number;
  isMock: boolean;
};