import {
  Award,
  Bookmark,
  Building2,
  ClipboardCheck,
  FileText,
  UserRound,
} from "lucide-react";
import type { DashboardMetric, DashboardTask } from "@/types/domain";
import type { StatusTone } from "@/types";

export const dashboardMetrics = [
  {
    label: "Universities saved",
    value: "12",
    detail: "Across 4 study areas",
    icon: Building2,
    tone: "green",
  },
  {
    label: "Applications in motion",
    value: "3",
    detail: "1 ready for review",
    icon: ClipboardCheck,
    tone: "blue",
  },
  {
    label: "Funding matches",
    value: "8",
    detail: "Based on your sample profile",
    icon: Award,
    tone: "gold",
  },
] satisfies DashboardMetric[];

export const upcomingTasks = [
  {
    day: "28",
    month: "SEP",
    title: "Review your academic profile",
    category: "PROFILE",
    icon: UserRound,
  },
  {
    day: "02",
    month: "OCT",
    title: "Add a statement of purpose draft",
    category: "APPLICATIONS",
    icon: FileText,
  },
  {
    day: "06",
    month: "OCT",
    title: "Save your first scholarship match",
    category: "FUNDING",
    icon: Bookmark,
  },
] satisfies DashboardTask[];

export const sampleApplications: {
  monogram: string;
  university: string;
  program: string;
  status: string;
  tone: StatusTone;
  progress: number;
  color: string;
}[] = [
  {
    monogram: "NH",
    university: "North Harbor University",
    program: "BSc, Environmental Science",
    status: "In progress",
    tone: "attention",
    progress: 68,
    color: "",
  },
  {
    monogram: "ME",
    university: "Meridian Institute",
    program: "BA, International Relations",
    status: "Ready to review",
    tone: "positive",
    progress: 91,
    color: "university-monogram-blue",
  },
  {
    monogram: "WL",
    university: "Westlake College",
    program: "BSc, Data & Society",
    status: "Just started",
    tone: "neutral",
    progress: 34,
    color: "university-monogram-gold",
  },
];

export const scholarshipPreview = {
  title: "Future Changemakers Award",
  category: "MERIT + COMMUNITY IMPACT",
  award: "$18k - $26k",
  note: "Illustrative award range",
};