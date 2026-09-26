import type {
  University,
  UniversityContact,
  UniversityProgram,
} from "@/types/domain";
import { missingSource, mockSource } from "./provenance.ts";

function sourceFor(slug: string, claim: string) {
  return mockSource(`${slug}-${claim}`, `${slug}: ${claim}`);
}

function emptyContact(slug: string, department: string): UniversityContact {
  return {
    id: `${slug}-${department.toLowerCase().replaceAll(" ", "-")}`,
    department,
    contactName: null,
    email: null,
    phone: null,
    contactUrl: null,
    source: missingSource(
      `${slug}-${department.toLowerCase().replaceAll(" ", "-")}-source`,
      `${department} contact source`,
      "institution-contact",
    ),
  };
}

function program(slug: string, details: Omit<UniversityProgram, "source">): UniversityProgram {
  return { ...details, source: sourceFor(slug, `program ${details.name}`) };
}

function officialSources(slug: string) {
  return [
    missingSource(`${slug}-website`, "Official website", "official-website"),
    missingSource(`${slug}-admissions`, "Admissions information", "institutional-page"),
    missingSource(`${slug}-international`, "International student information", "institutional-page"),
    missingSource(`${slug}-portal`, "Official application portal", "application-portal"),
  ];
}

export const universities: University[] = [
  {
    id: "north-harbor-university",
    slug: "north-harbor-university",
    name: "North Harbor University",
    country: "Canada",
    city: "Port Alder",
    destinationRegion: { value: null, source: sourceFor("north-harbor-university", "destination region") },
    institutionType: "Public research university",
    overview: {
      value: "Illustrative university profile focused on environmental research, community partnerships, and applied undergraduate study.",
      source: sourceFor("north-harbor-university", "overview"),
    },
    studentCount: { value: null, source: sourceFor("north-harbor-university", "student count") },
    studyAreas: {
      value: ["Environment", "Life sciences", "Public policy"],
      source: sourceFor("north-harbor-university", "study areas"),
    },
    programs: [
      program("north-harbor-university", { id: "environmental-science-bsc", name: "Environmental Science", credential: "BSc", studyMode: "On campus (mock)", duration: "4 years (mock)", annualTuition: "Not provided", language: "Not provided" }),
      program("north-harbor-university", { id: "environmental-policy-ba", name: "Environmental Policy", credential: "BA", studyMode: "On campus (mock)", duration: "4 years (mock)", annualTuition: "Not provided", language: "Not provided" }),
    ],
    requirements: [],
    deadlines: [],
    scholarships: [],
    contacts: [emptyContact("north-harbor-university", "Admissions office"), emptyContact("north-harbor-university", "International student office")],
    officialSources: officialSources("north-harbor-university"),
    source: mockSource("university-north-harbor-university", "North Harbor University illustrative profile"),
  },
  {
    id: "meridian-institute",
    slug: "meridian-institute",
    name: "Meridian Institute",
    country: "United Kingdom",
    city: "Ashford",
    destinationRegion: { value: null, source: sourceFor("meridian-institute", "destination region") },
    institutionType: "Independent institute",
    overview: {
      value: "Illustrative profile for a globally oriented institute with programs in policy, society, and sustainability.",
      source: sourceFor("meridian-institute", "overview"),
    },
    studentCount: { value: null, source: sourceFor("meridian-institute", "student count") },
    studyAreas: {
      value: ["International relations", "Sustainability", "Social sciences"],
      source: sourceFor("meridian-institute", "study areas"),
    },
    programs: [
      program("meridian-institute", { id: "international-relations-ba", name: "International Relations", credential: "BA", studyMode: "On campus (mock)", duration: "3 years (mock)", annualTuition: "Not provided", language: "Not provided" }),
      program("meridian-institute", { id: "global-sustainability-msc", name: "Global Sustainability", credential: "MSc", studyMode: "On campus (mock)", duration: "1 year (mock)", annualTuition: "Not provided", language: "Not provided" }),
    ],
    requirements: [],
    deadlines: [],
    scholarships: [],
    contacts: [emptyContact("meridian-institute", "Admissions office"), emptyContact("meridian-institute", "International student office")],
    officialSources: officialSources("meridian-institute"),
    source: mockSource("university-meridian-institute", "Meridian Institute illustrative profile"),
  },
  {
    id: "westlake-college",
    slug: "westlake-college",
    name: "Westlake College",
    country: "Australia",
    city: "Lydon",
    destinationRegion: { value: null, source: sourceFor("westlake-college", "destination region") },
    institutionType: "University college",
    overview: {
      value: "Illustrative college profile for applied study in data, society, and interdisciplinary technology.",
      source: sourceFor("westlake-college", "overview"),
    },
    studentCount: { value: null, source: sourceFor("westlake-college", "student count") },
    studyAreas: {
      value: ["Data and society", "Computing", "Design"],
      source: sourceFor("westlake-college", "study areas"),
    },
    programs: [
      program("westlake-college", { id: "data-society-bsc", name: "Data and Society", credential: "BSc", studyMode: "On campus (mock)", duration: "3 years (mock)", annualTuition: "Not provided", language: "Not provided" }),
      program("westlake-college", { id: "digital-design-bdes", name: "Digital Design", credential: "BDes", studyMode: "On campus (mock)", duration: "3 years (mock)", annualTuition: "Not provided", language: "Not provided" }),
    ],
    requirements: [],
    deadlines: [],
    scholarships: [],
    contacts: [emptyContact("westlake-college", "Admissions office"), emptyContact("westlake-college", "International student office")],
    officialSources: officialSources("westlake-college"),
    source: mockSource("university-westlake-college", "Westlake College illustrative profile"),
  },
];

export function getUniversityBySlug(slug: string) {
  return universities.find((university) => university.slug === slug);
}