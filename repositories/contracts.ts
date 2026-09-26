import type {
  Application,
  AdvisorContext,
  DashboardData,
  Pathway,
  Scholarship,
  StudentProfile,
  StructuredAdvice,
  University,
} from "@/types/domain";

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

export interface PathwayRepository {
  list(): Promise<Pathway[]>;
}