import type { ApplicationRecord } from "@/types";

export const applicationRecords: ApplicationRecord[] = [
  {
    id: "app-north-harbor",
    universitySlug: "north-harbor-university",
    universityName: "North Harbor University",
    program: "BSc Environmental Science",
    intake: "Fall 2027",
    status: "In progress",
    progress: 68,
    deadline: "2027-01-15",
    tasks: [
      { label: "Confirm program requirements", complete: true },
      { label: "Request academic transcript", complete: true },
      { label: "Draft statement of purpose", complete: false },
    ],
  },
  {
    id: "app-meridian",
    universitySlug: "meridian-institute",
    universityName: "Meridian Institute",
    program: "BA International Relations",
    intake: "Autumn 2027",
    status: "Ready to submit",
    progress: 91,
    deadline: "2027-03-31",
    tasks: [
      { label: "Prepare academic records", complete: true },
      { label: "Review personal statement", complete: true },
      { label: "Confirm application portal", complete: false },
    ],
  },
  {
    id: "app-westlake",
    universitySlug: "westlake-college",
    universityName: "Westlake College",
    program: "BSc Data and Society",
    intake: "Semester 1, 2027",
    status: "Planning",
    progress: 34,
    deadline: "2026-11-30",
    tasks: [
      { label: "Compare program options", complete: true },
      { label: "Review entry requirements", complete: false },
      { label: "Plan application materials", complete: false },
    ],
  },
];