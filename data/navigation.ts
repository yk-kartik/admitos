import {
  Award,
  Building2,
  ClipboardList,
  Compass,
  FilePenLine,
  House,
  Sparkles,
  UserRound,
} from "lucide-react";
import type { NavigationItem } from "@/types";

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", href: "/", icon: House },
  { label: "AI Advisor", href: "/ai-advisor", icon: Sparkles },
  { label: "Universities", href: "/universities", icon: Building2 },
  { label: "Scholarships", href: "/scholarships", icon: Award },
  { label: "Pathway Planner", href: "/pathways", icon: Compass },
  { label: "Application Tracker", href: "/applications", icon: ClipboardList },
  { label: "Application Copilot", href: "/application-copilot", icon: FilePenLine },
  { label: "Student Profile", href: "/profile", icon: UserRound },
];