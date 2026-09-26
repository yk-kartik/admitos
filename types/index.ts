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

export type UniversityProgram = {
  id: string;
  name: string;
  credential: string;
  studyMode: string;
  duration: string;
  annualTuition: string;
  language: string;
};

export type AdmissionRequirement = {
  id: string;
  title: string;
  detail: string;
  required: boolean;
};

export type ApplicationDeadline = {
  id: string;
  label: string;
  date: string;
  intake: string;
  isIllustrative: boolean;
};

export type UniversityScholarship = {
  id: string;
  name: string;
  award: string;
  eligibility: string;
  deadline: string;
};

export type StructuredContact = {
  department: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  contactUrl: string | null;
};

export type UniversityLinks = {
  officialWebsite: string | null;
  admissionsPage: string | null;
  internationalStudentsPage: string | null;
  applicationPortal: string | null;
};

export type UniversityRecord = {
  slug: string;
  name: string;
  country: string;
  city: string;
  institutionType: string;
  overview: string;
  studentCount: string;
  studyAreas: string[];
  programs: UniversityProgram[];
  requirements: AdmissionRequirement[];
  deadlines: ApplicationDeadline[];
  scholarships: UniversityScholarship[];
  contacts: {
    admissions: StructuredContact;
    internationalStudents: StructuredContact;
  };
  links: UniversityLinks;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: "mock-unverified" | "verified";
};

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