import type {
  AdmissionRequirement,
  Application,
  AdvisorContext,
  DashboardData,
  Pathway,
  Scholarship,
  StudentProfile,
  StructuredAdvice,
  University,
  UniversityContact,
  UniversityProgram,
  OfficialSource,
} from "@/types/domain";
import type {
  ApplicationCopilotDraftState,
  DecisionEvidence,
} from "@/types/ai";

export interface UniversityRepository {
  list(): Promise<University[]>;
  getBySlug(slug: string): Promise<University | null>;
}

export interface ScholarshipRepository {
  list(): Promise<Scholarship[]>;
}

export interface ProfileRepository {
  getCurrent(): Promise<StudentProfile>;
}

export interface DashboardRepository {
  getOverview(): Promise<DashboardData>;
}

export interface AdvisorService {
  generateAdvice(input: {
    question: string;
    context: AdvisorContext;
  }): Promise<StructuredAdvice>;
}

export interface ApplicationRepository {
  list(): Promise<Application[]>;
}

export interface ProgramRepository {
  listByUniversityId(universityId: string): Promise<UniversityProgram[]>;
  findById(id: string): Promise<UniversityProgram | null>;
}

export interface RequirementRepository {
  listByUniversityId(universityId: string): Promise<AdmissionRequirement[]>;
}

export interface UniversityContactRepository {
  listByUniversityId(universityId: string): Promise<UniversityContact[]>;
}

export interface OfficialSourceRepository {
  findById(sourceId: string): Promise<OfficialSource | null>;
}

export interface EvidenceRepository {
  listByUniversityId(universityId: string): Promise<DecisionEvidence[]>;
}

export interface StudentProfileRepository extends ProfileRepository {
  getForUser(userId: string): Promise<StudentProfile | null>;
  upsertForUser(userId: string, profile: StudentProfile): Promise<StudentProfile>;
}

export type ApplicationCreateInput = {
  application: Application;
  profileId: string;
  universityId: string;
  programId: string | null;
};

export type ApplicationUpdateInput = {
  status?: Application["status"];
  deadline?: string | null;
  tasks?: Application["tasks"];
};

export interface PersistentApplicationRepository extends ApplicationRepository {
  listForProfile(profileId: string): Promise<Application[]>;
  findById(id: string): Promise<Application | null>;
  create(input: ApplicationCreateInput): Promise<Application>;
  updateForProfile(profileId: string, applicationId: string, input: ApplicationUpdateInput): Promise<Application | null>;
  getCopilotDraft(profileId: string, applicationId: string): Promise<ApplicationCopilotDraftState | null>;
  saveCopilotDraft(profileId: string, applicationId: string, state: ApplicationCopilotDraftState): Promise<boolean>;
}

export interface PathwayRepository {
  list(): Promise<Pathway[]>;
}