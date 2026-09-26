import {
  Award,
  Building2,
  ClipboardList,
  Compass,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { SectionContent, SectionKey } from "@/types";

export const sections: Record<SectionKey, SectionContent> = {
  "ai-advisor": {
    eyebrow: "GUIDANCE",
    title: "AI Advisor",
    description:
      "A considered space for the questions, goals, and context behind your next step.",
    panelTitle: "A plan that starts with you",
    panelDescription:
      "This space is being prepared for thoughtful, personalized admissions guidance.",
    checklist: [
      "Share the subjects and ideas that energize you",
      "Set priorities for your university search",
      "Keep your next decisions in one place",
    ],
    insightLabel: "A GOOD PLACE TO BEGIN",
    insightValue: "Start with what matters",
    insightDescription:
      "Your interests, ambitions, and constraints will shape a more useful plan.",
    icon: Sparkles,
  },
  universities: {
    eyebrow: "YOUR SEARCH",
    title: "Universities",
    description:
      "Explore the kind of academic environment that could be right for you.",
    panelTitle: "A shortlist with more signal",
    panelDescription:
      "Your future university view will bring programs, campus details, and fit into focus.",
    checklist: [
      "Compare study areas and degree formats",
      "Keep potential universities together",
      "See important dates at a glance",
    ],
    insightLabel: "SEARCH NOTE",
    insightValue: "Fit is more than a ranking",
    insightDescription:
      "Consider teaching style, location, support, and the life you want to build.",
    icon: Building2,
  },
  scholarships: {
    eyebrow: "FUNDING",
    title: "Scholarships",
    description:
      "Keep funding opportunities connected to your goals and application timeline.",
    panelTitle: "Make funding part of the plan",
    panelDescription:
      "This section will help organize awards, eligibility notes, and upcoming deadlines.",
    checklist: [
      "Save awards to revisit later",
      "Track criteria alongside your profile",
      "Bring deadlines into your application plan",
    ],
    insightLabel: "FUNDING NOTE",
    insightValue: "Start early, stay organized",
    insightDescription:
      "Eligibility and timing differ by award; keep each opportunity's details close.",
    icon: Award,
  },
  pathways: {
    eyebrow: "POSSIBLE DIRECTIONS",
    title: "Pathways",
    description:
      "See how subjects, qualifications, and future ambitions can connect.",
    panelTitle: "Explore more than one route",
    panelDescription:
      "Your pathway view will help make options and the steps between them easier to see.",
    checklist: [
      "Connect interests to possible study areas",
      "Compare different qualification routes",
      "Keep prerequisites visible as you plan",
    ],
    insightLabel: "PLANNING NOTE",
    insightValue: "There is rarely one route",
    insightDescription:
      "A flexible plan can leave room for different subjects, places, and possibilities.",
    icon: Compass,
  },
  applications: {
    eyebrow: "YOUR PLAN",
    title: "Applications",
    description:
      "Keep milestones, supporting materials, and decisions moving together.",
    panelTitle: "A calmer application season",
    panelDescription:
      "This view is being prepared to bring your university applications and next actions together.",
    checklist: [
      "See progress across each application",
      "Keep required materials close at hand",
      "Stay aware of important dates",
    ],
    insightLabel: "NEXT STEP",
    insightValue: "Make progress one piece at a time",
    insightDescription:
      "A clear list of small milestones can make a long process feel more manageable.",
    icon: ClipboardList,
  },
  profile: {
    eyebrow: "YOUR STORY",
    title: "Profile",
    description:
      "Bring the details, experience, and ambitions that make your application yours.",
    panelTitle: "A profile that travels with you",
    panelDescription:
      "Your future profile will keep important academic and personal details together.",
    checklist: [
      "Add your academic background",
      "Capture interests and activities",
      "Keep key details current as plans evolve",
    ],
    insightLabel: "PROFILE NOTE",
    insightValue: "Your context matters",
    insightDescription:
      "A little detail about your goals can make future planning more personal.",
    icon: UserRound,
  },
};