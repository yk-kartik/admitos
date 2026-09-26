import type { StudyPathway } from "@/types";

export const studyPathways: StudyPathway[] = [
  {
    id: "direct-entry",
    title: "Direct entry",
    description: "Apply to an undergraduate program using an eligible secondary-school qualification.",
    duration: "Program length varies",
    stages: [
      { title: "Qualification mapping", detail: "Compare current credentials with destination-country entry expectations.", duration: "1-2 weeks" },
      { title: "Application preparation", detail: "Gather transcripts, language evidence, references, and written materials.", duration: "2-4 months" },
      { title: "Offer and transition", detail: "Review conditions, funding, immigration, and arrival planning.", duration: "After decision" },
    ],
    considerations: ["Country-specific equivalency", "Language requirements", "Program prerequisites"],
  },
  {
    id: "foundation-year",
    title: "Foundation year",
    description: "Consider a preparatory program where academic preparation or subject prerequisites need strengthening.",
    duration: "Typically an additional year (illustrative)",
    stages: [
      { title: "Readiness review", detail: "Identify subject, language, and academic preparation gaps.", duration: "1-2 weeks" },
      { title: "Foundation application", detail: "Compare progression conditions and recognition with intended degree programs.", duration: "2-3 months" },
      { title: "Progression review", detail: "Meet the published progression conditions before entering the degree.", duration: "During study" },
    ],
    considerations: ["Progression guarantees and conditions", "Additional time and cost", "Recognition by target programs"],
  },
  {
    id: "transfer-route",
    title: "Transfer pathway",
    description: "Begin study at one institution and explore transfer options after checking credit recognition in advance.",
    duration: "Varies by credit recognition",
    stages: [
      { title: "Credit pre-assessment", detail: "Ask target institutions to assess course outlines and transferable credits.", duration: "Before enrolling" },
      { title: "Complete coursework", detail: "Maintain course records and grades that meet transfer conditions.", duration: "1-2 years" },
      { title: "Transfer application", detail: "Submit official transcripts and confirm remaining degree requirements.", duration: "Before target intake" },
    ],
    considerations: ["Credit transfer is not automatic", "Written pre-assessment", "Visa and funding implications"],
  },
];