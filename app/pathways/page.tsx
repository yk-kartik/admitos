import { PathwayPlanner } from "@/components/pathway-planner";
import { studyPathways } from "@/data/pathways";

export const metadata = {
  title: "Transfer pathways",
  description:
    "Compare transfer and study pathways as you plan your international university journey.",
};

export default function PathwaysPage() {
  return <PathwayPlanner pathways={studyPathways} />;
}