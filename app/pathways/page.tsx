import { PathwayPlanner } from "@/components/pathway-planner";
import { studyPathways } from "@/data/pathways";

export default function PathwaysPage() {
  return <PathwayPlanner pathways={studyPathways} />;
}