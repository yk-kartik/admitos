import type { UniversityRecord } from "@/types";

const emptyContact = (department: string) => ({
  department,
  contactName: null,
  email: null,
  phone: null,
  contactUrl: null,
});

const unavailableLinks = {
  officialWebsite: null,
  admissionsPage: null,
  internationalStudentsPage: null,
  applicationPortal: null,
};

export const universities: UniversityRecord[] = [
  {
    slug: "north-harbor-university",
    name: "North Harbor University",
    country: "Canada",
    city: "Port Alder",
    institutionType: "Public research university",
    overview:
      "Illustrative university profile focused on environmental research, community partnerships, and applied undergraduate study.",
    studentCount: "18,000 (mock figure)",
    studyAreas: ["Environment", "Life sciences", "Public policy"],
    programs: [
      {
        id: "environmental-science-bsc",
        name: "Environmental Science",
        credential: "BSc",
        studyMode: "On campus",
        duration: "4 years (illustrative)",
        annualTuition: "CAD 32,000 (mock estimate)",
        language: "English",
      },
      {
        id: "environmental-policy-ba",
        name: "Environmental Policy",
        credential: "BA",
        studyMode: "On campus",
        duration: "4 years (illustrative)",
        annualTuition: "CAD 30,000 (mock estimate)",
        language: "English",
      },
    ],
    requirements: [
      {
        id: "academic-record",
        title: "Academic transcripts",
        detail: "Official secondary-school records; exact requirements are unverified.",
        required: true,
      },
      {
        id: "language-evidence",
        title: "English language evidence",
        detail: "Accepted tests and score thresholds are not available in this mock record.",
        required: true,
      },
      {
        id: "personal-statement",
        title: "Personal statement",
        detail: "May be requested depending on program; confirm with the institution.",
        required: false,
      },
    ],
    deadlines: [
      {
        id: "fall-2027",
        label: "Priority application",
        date: "2027-01-15",
        intake: "Fall 2027",
        isIllustrative: true,
      },
      {
        id: "fall-2027-aid",
        label: "Funding consideration",
        date: "2027-02-01",
        intake: "Fall 2027",
        isIllustrative: true,
      },
    ],
    scholarships: [
      {
        id: "north-harbor-merit",
        name: "North Harbor Merit Award (mock)",
        award: "CAD 5,000-12,000 (illustrative)",
        eligibility: "International undergraduate applicants; criteria unverified.",
        deadline: "2027-02-01 (illustrative)",
      },
    ],
    contacts: {
      admissions: emptyContact("Admissions office"),
      internationalStudents: emptyContact("International student office"),
    },
    links: unavailableLinks,
    sourceUrl: null,
    lastVerifiedAt: null,
    verificationStatus: "mock-unverified",
  },
  {
    slug: "meridian-institute",
    name: "Meridian Institute",
    country: "United Kingdom",
    city: "Ashford",
    institutionType: "Independent institute",
    overview:
      "Illustrative profile for a globally oriented institute with programs in policy, society, and sustainability.",
    studentCount: "6,500 (mock figure)",
    studyAreas: ["International relations", "Sustainability", "Social sciences"],
    programs: [
      {
        id: "international-relations-ba",
        name: "International Relations",
        credential: "BA",
        studyMode: "On campus",
        duration: "3 years (illustrative)",
        annualTuition: "GBP 24,000 (mock estimate)",
        language: "English",
      },
      {
        id: "global-sustainability-msc",
        name: "Global Sustainability",
        credential: "MSc",
        studyMode: "On campus",
        duration: "1 year (illustrative)",
        annualTuition: "GBP 27,000 (mock estimate)",
        language: "English",
      },
    ],
    requirements: [
      {
        id: "prior-qualification",
        title: "Prior academic qualification",
        detail: "Equivalent qualifications vary by program and applicant country.",
        required: true,
      },
      {
        id: "english-proficiency",
        title: "English proficiency evidence",
        detail: "Accepted assessments and thresholds require official confirmation.",
        required: true,
      },
      {
        id: "references",
        title: "Academic references",
        detail: "Reference requirements are program-specific and unverified.",
        required: false,
      },
    ],
    deadlines: [
      {
        id: "autumn-2027",
        label: "General application window",
        date: "2027-03-31",
        intake: "Autumn 2027",
        isIllustrative: true,
      },
    ],
    scholarships: [
      {
        id: "meridian-global-award",
        name: "Global Perspectives Award (mock)",
        award: "GBP 3,000-8,000 (illustrative)",
        eligibility: "International applicants; eligibility is illustrative only.",
        deadline: "2027-03-31 (illustrative)",
      },
    ],
    contacts: {
      admissions: emptyContact("Admissions office"),
      internationalStudents: emptyContact("International student office"),
    },
    links: unavailableLinks,
    sourceUrl: null,
    lastVerifiedAt: null,
    verificationStatus: "mock-unverified",
  },
  {
    slug: "westlake-college",
    name: "Westlake College",
    country: "Australia",
    city: "Lydon",
    institutionType: "University college",
    overview:
      "Illustrative college profile for applied study in data, society, and interdisciplinary technology.",
    studentCount: "9,200 (mock figure)",
    studyAreas: ["Data and society", "Computing", "Design"],
    programs: [
      {
        id: "data-society-bsc",
        name: "Data and Society",
        credential: "BSc",
        studyMode: "On campus",
        duration: "3 years (illustrative)",
        annualTuition: "AUD 36,000 (mock estimate)",
        language: "English",
      },
      {
        id: "digital-design-bdes",
        name: "Digital Design",
        credential: "BDes",
        studyMode: "On campus",
        duration: "3 years (illustrative)",
        annualTuition: "AUD 34,000 (mock estimate)",
        language: "English",
      },
    ],
    requirements: [
      {
        id: "school-qualification",
        title: "Secondary-school qualification",
        detail: "Country-specific equivalencies are not available in this mock record.",
        required: true,
      },
      {
        id: "english-test",
        title: "English language evidence",
        detail: "Accepted tests and score thresholds need official confirmation.",
        required: true,
      },
      {
        id: "portfolio",
        title: "Portfolio or supplementary work",
        detail: "May apply to selected programs; requirements are unverified.",
        required: false,
      },
    ],
    deadlines: [
      {
        id: "semester-1-2027",
        label: "Semester 1 application",
        date: "2026-11-30",
        intake: "Semester 1, 2027",
        isIllustrative: true,
      },
    ],
    scholarships: [
      {
        id: "westlake-access-award",
        name: "Access and Achievement Award (mock)",
        award: "AUD 4,000 (illustrative)",
        eligibility: "Potential international undergraduate applicants; unverified.",
        deadline: "2026-11-30 (illustrative)",
      },
    ],
    contacts: {
      admissions: emptyContact("Admissions office"),
      internationalStudents: emptyContact("International student office"),
    },
    links: unavailableLinks,
    sourceUrl: null,
    lastVerifiedAt: null,
    verificationStatus: "mock-unverified",
  },
];

export function getUniversityBySlug(slug: string) {
  return universities.find((university) => university.slug === slug);
}