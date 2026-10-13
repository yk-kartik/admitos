import { PathwayPlanner } from "@/components/pathway-planner";
import { studyPathways } from "@/data/pathways";
import { publicPageMetadata } from "@/lib/site-metadata";

export const metadata = publicPageMetadata(
  "/pathways",
  "Transfer pathways",
  "Compare transfer and study pathways as you plan your international university journey.",
);

export default function PathwaysPage() {
  return <PathwayPlanner pathways={studyPathways} />;
}