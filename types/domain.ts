import type { LucideIcon } from "lucide-react";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "mock"
  | "missing-source"
  | "conflicting"
  | "stale";

export type SourceType =
  | "official-website"
  | "institutional-page"
  | "official-scholarship"
  | "government"
  | "official-document"
  | "application-portal"
  | "institution-contact"
  | "mock"
  | "unknown";

export type ApplicantType = "domestic" | "international";

type SourceMetadata = {
  sourceId: string;
  sourceTitle: string;
  sourceType: SourceType;
  academicYear: string | null;
  evidenceReference: string | null;
  notes: string | null;
};

export type OfficialSource = SourceMetadata & {
  verificationStatus: VerificationStatus;
  sourceUrl: string | null;
  lastVerified: string | null;
};

export type SourcedClaim<T> = {
  value: T;
  source: OfficialSource;
};

export type UniversityProgram = {
  id: string;
  name: string;
  credential: string;
  studyMode: string;
  duration: string;
  annualTuition: string;
  language: string;
  source: OfficialSource;
};

export type AdmissionRequirement = {
  id: string;
  title: string;
  detail: string;
  required: boolean;
  programId?: string | null;
  applicantType?: ApplicantType | "all" | null;
  source: OfficialSource;
};

export type ApplicationDeadline = {
  id: string;
  label: string;
  date: string | null;
  intake: string;
  academicYear: string | null;
  isIllustrative: boolean;
  source: OfficialSource;
};

export type UniversityContact = {
  id: string;
  department: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  contactUrl: string | null;
  source: OfficialSource;
};

export type University = {
  id: string;
  slug: string;
  name: string;
  country: string;
  city: string;
  destinationRegion: SourcedClaim<string | null>;
  institutionType: string;
  overview: SourcedClaim<string>;
  studentCount: SourcedClaim<string | null>;
  studyAreas: SourcedClaim<string[]>;
  programs: UniversityProgram[];
  requirements: AdmissionRequirement[];
  deadlines: ApplicationDeadline[];
  scholarships: Scholarship[];
  contacts: UniversityContact[];
  officialSources: OfficialSource[];
  source: OfficialSource;
};

export type ScholarshipAmount = {
  currency: string | null;
  minimum: number | null;
  maximum: number | null;
  display: string | null;
};

export type Scholarship = {
  id: string;
  name: string;
  provider: string;
  country: string | null;
  summary: string;
  eligibleStudyLevels: string[];
  eligibleNationalities: string[];
  amount: ScholarshipAmount;
  deadline: string | null;
  academicYear: string | null;
  eligibilityCriteria: string[];
  requiredDocuments: string[];
  focusAreas: string[];
  officialSource: OfficialSource;
  sources: OfficialSource[];
  verificationStatus: VerificationStatus;
  lastVerified: string | null;
  isMock: boolean;
};

export type GradeRecord = {
  subject: string;
  result: string;
  scale: string | null;
  academicYear: string | null;
};

export type TestScore = {
  testName: string;
  score: string;
  date: string | null;
  source: OfficialSource | null;
};

export type EnglishQualification = {
  qualification: string;
  score: string | null;
  date: string | null;
  source: OfficialSource | null;
};

export type StudentActivity = {
  name: string;
  role: string | null;
  description: string | null;
  dates: string | null;
};

export type StudentProject = {
  name: string;
  description: string | null;
  url: string | null;
  dates: string | null;
};

export type FinancialConstraints = {
  currency: string | null;
  annualBudget: number | null;
  needsFinancialAid: boolean | null;
  notes: string | null;
};

export type StudentProfile = {
  id: string | null;
  fullName: string | null;
  preferredName: string | null;
  dateOfBirth?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  citizenships: string[];
  currentLocation: string | null;
  intendedStudyLevel: string | null;
  intendedIntake: string | null;
  academicBackground: string | null;
  currentUniversity: string | null;
  degreeProgram: string | null;
  grades: GradeRecord[];
  testScores: TestScore[];
  englishQualifications: EnglishQualification[];
  extracurricularActivities: StudentActivity[];
  projects: StudentProject[];
  research: StudentActivity[];
  leadership: StudentActivity[];
  financialConstraints: FinancialConstraints | null;
  targetCountries: string[];
  targetUniversities: string[];
  intendedStudyAreas: string[];
  languages: { name: string; proficiency: string | null }[];
  isMock: boolean;
};

export type ApplicationStatus =
  | "Planning"
  | "In progress"
  | "Ready to submit"
  | "Submitted";

export type Application = {
  id: string;
  universitySlug: string;
  universityName: string;
  program: string;
  intake: string;
  status: ApplicationStatus;
  progress: number;
  deadline: string;
  tasks: { label: string; complete: boolean }[];
  source: OfficialSource;
};

export type Pathway = {
  id: string;
  title: string;
  description: string;
  duration: string;
  stages: { title: string; detail: string; duration: string }[];
  considerations: string[];
  source: OfficialSource;
};

export type ResourceResult<T> =
  | { status: "ready"; data: T }
  | { status: "empty" }
  | { status: "unavailable"; message: string };

export type ResourceViewState =
  | { status: "loading"; label?: string }
  | { status: "empty"; title?: string; description?: string }
  | { status: "unavailable"; message?: string }
  | { status: "unverified"; message?: string }
  | { status: "missing-source"; message?: string };

export type AdvisorContext = {
  profile: StudentProfile;
  universities: University[];
  scholarships: Scholarship[];
  sources: OfficialSource[];
};

export type AdviceSourceReference = {
  sourceId: string;
  sourceTitle: string;
  sourceUrl: string;
  lastVerified: string;
  academicYear: string | null;
};

export type StructuredAdvice = {
  summary: string;
  recommendations: {
    text: string;
    rationale: string;
    evidenceStatus: "supported" | "needs-verification";
    sourceReferences: AdviceSourceReference[];
  }[];
  verificationRequired: boolean;
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: "green" | "blue" | "gold";
};

export type DashboardTask = {
  day: string;
  month: string;
  title: string;
  category: string;
  icon: LucideIcon;
};

export type DashboardApplicationPreview = {
  monogram: string;
  university: string;
  program: string;
  status: string;
  tone: "positive" | "attention" | "neutral";
  progress: number;
  color: string;
};

export type DashboardScholarshipPreview = {
  title: string;
  category: string;
  award: string;
  note: string;
};

export type DashboardData = {
  metrics: DashboardMetric[];
  upcomingTasks: DashboardTask[];
  applications: DashboardApplicationPreview[];
  scholarshipPreview: DashboardScholarshipPreview;
  profileName: string | null;
  profileCompletion: number;
};