import type {
  Application,
  DashboardData,
  Pathway,
  Scholarship,
  University,
} from "@/types/domain";
import type {
  ApplicationRepository,
  DashboardRepository,
  PathwayRepository,
  ProfileRepository,
  ScholarshipRepository,
  UniversityRepository,
} from "@/repositories/contracts";
import { mockSource, missingSource } from "@/data/provenance";
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
import { universities as legacyUniversities } from "@/data/universities";
import { calculateProfileCompletion } from "@/utils/profile";

const mockUniversities: University[] = legacyUniversities.map((record) => {
  const profileSource = mockSource(
    `university-${record.slug}`,
    `${record.name} illustrative profile`,
  );
  const sourceFor = (claim: string) =>
    mockSource(`${record.slug}-${claim}`, `${record.name}: ${claim}`);

  return {
    id: record.slug,
    slug: record.slug,
    name: record.name,
    country: record.country,
    city: record.city,
    institutionType: record.institutionType,
    overview: { value: record.overview, source: sourceFor("overview") },
    studentCount: { value: record.studentCount, source: sourceFor("student count") },
    studyAreas: { value: record.studyAreas, source: sourceFor("study areas") },
    programs: record.programs.map((program) => ({
      ...program,
      source: sourceFor(`program ${program.name}`),
    })),
    requirements: record.requirements.map((requirement) => ({
      ...requirement,
      source: sourceFor(`requirement ${requirement.title}`),
    })),
    deadlines: record.deadlines.map((deadline) => ({
      ...deadline,
      academicYear: "2027/28 (illustrative)",
      source: sourceFor(`deadline ${deadline.label}`),
    })),
    scholarships: record.scholarships.map((scholarship) => {
      const source = sourceFor(`scholarship ${scholarship.name}`);
      return {
        id: scholarship.id,
        name: scholarship.name,
        provider: record.name,
        country: record.country,
        summary: scholarship.eligibility,
        eligibleStudyLevels: ["Not specified in mock data"],
        eligibleNationalities: ["Not specified in mock data"],
        amount: {
          currency: null,
          minimum: null,
          maximum: null,
          display: scholarship.award,
        },
        deadline: scholarship.deadline,
        academicYear: "2027/28 (illustrative)",
        eligibilityCriteria: [scholarship.eligibility],
        requiredDocuments: [],
        focusAreas: [],
        officialSource: source,
        sources: [source],
        verificationStatus: "mock",
        lastVerified: null,
        isMock: true,
      } satisfies Scholarship;
    }),
    contacts: [
      {
        id: `${record.slug}-admissions-contact`,
        ...record.contacts.admissions,
        source: missingSource(
          `${record.slug}-admissions-source`,
          "Admissions contact source",
          "institution-contact",
        ),
      },
      {
        id: `${record.slug}-international-contact`,
        ...record.contacts.internationalStudents,
        source: missingSource(
          `${record.slug}-international-source`,
          "International student contact source",
          "institution-contact",
        ),
      },
    ],
    officialSources: [
      missingSource(`${record.slug}-website`, "Official website", "official-website"),
      missingSource(`${record.slug}-admissions`, "Admissions information", "institutional-page"),
      missingSource(`${record.slug}-international`, "International student information", "institutional-page"),
      missingSource(`${record.slug}-portal`, "Application portal", "application-portal"),
    ],
    source: profileSource,
  };
});

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
    academicYear: "2027/28 (illustrative)",
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
    return mockUniversities;
  },
  async getBySlug(slug) {
    return mockUniversities.find((university) => university.slug === slug) ?? null;
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