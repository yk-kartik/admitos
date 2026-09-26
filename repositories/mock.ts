import type {
  Application,
  DashboardData,
  Pathway,
  Scholarship,
} from "@/types/domain";
import type {
  ApplicationRepository,
  DashboardRepository,
  PathwayRepository,
  ProfileRepository,
  ScholarshipRepository,
  UniversityRepository,
} from "@/repositories/contracts";
import { mockSource } from "@/data/provenance";
import {
  dashboardMetrics,
  sampleApplications,
  scholarshipPreview,
  upcomingTasks,
} from "@/data/dashboard";
import { applicationRecords } from "@/data/applications";
import { studyPathways } from "@/data/pathways";
import { emptyStudentProfile } from "@/data/profile";
import { scholarshipOpportunities } from "@/data/scholarships";
import { universities } from "@/data/universities";
import { calculateProfileCompletion } from "@/utils/profile";

const mockScholarships: Scholarship[] = scholarshipOpportunities.map((opportunity) => {
  const source = mockSource(
    `scholarship-${opportunity.id}`,
    `${opportunity.name} illustrative record`,
  );
  return {
    id: opportunity.id,
    name: opportunity.name,
    provider: opportunity.provider,
    country: null,
    summary: opportunity.summary,
    eligibleStudyLevels: opportunity.degreeLevels,
    eligibleNationalities: ["Not specified in mock data"],
    amount: {
      currency: null,
      minimum: null,
      maximum: null,
      display: opportunity.award,
    },
    deadline: opportunity.deadline,
    academicYear: null,
    eligibilityCriteria: opportunity.eligibility,
    requiredDocuments: [],
    focusAreas: opportunity.focusAreas,
    officialSource: source,
    sources: [source],
    verificationStatus: "mock",
    lastVerified: null,
    isMock: true,
  };
});

const mockApplications: Application[] = applicationRecords.map((application) => ({
  ...application,
  source: mockSource(`application-${application.id}`, "Illustrative application tracker record"),
}));

const mockPathways: Pathway[] = studyPathways.map((pathway) => ({
  ...pathway,
  source: mockSource(`pathway-${pathway.id}`, `${pathway.title} illustrative planning guide`),
}));

export const mockUniversityRepository: UniversityRepository = {
  async list() {
    return universities;
  },
  async getBySlug(slug) {
    return universities.find((university) => university.slug === slug) ?? null;
  },
};

export const mockScholarshipRepository: ScholarshipRepository = {
  async list() {
    return mockScholarships;
  },
};

export const mockApplicationRepository: ApplicationRepository = {
  async list() {
    return mockApplications;
  },
};

export const mockPathwayRepository: PathwayRepository = {
  async list() {
    return mockPathways;
  },
};

export const mockProfileRepository: ProfileRepository = {
  async getCurrent() {
    return emptyStudentProfile;
  },
};

export const mockDashboardRepository: DashboardRepository = {
  async getOverview(): Promise<DashboardData> {
    return {
      metrics: dashboardMetrics,
      upcomingTasks,
      applications: sampleApplications,
      scholarshipPreview,
      profileName: emptyStudentProfile.preferredName,
      profileCompletion: calculateProfileCompletion(emptyStudentProfile),
    };
  },
};