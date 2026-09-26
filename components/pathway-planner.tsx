"use client";

import { ArrowRight, CircleHelp, Compass, Info } from "lucide-react";
import { useState } from "react";
import type { StudyPathway } from "@/types";
import { PageHeading } from "@/components/ui/page-heading";

type PathwayPlannerProps = {
  pathways: StudyPathway[];
};

export function PathwayPlanner({ pathways }: PathwayPlannerProps) {
  const [activePathwayId, setActivePathwayId] = useState(pathways[0]?.id ?? "");
  const activePathway = pathways.find((pathway) => pathway.id === activePathwayId);

  if (!activePathway) return null;

  return (
    <div className="workspace-page pathway-planner">
      <PageHeading
        eyebrow="ROUTE PLANNING"
        title="Pathway Planner"
        description="Compare common routes into international study and identify what needs confirmation."
        badge="ILLUSTRATIVE PATHWAYS"
      />

      <div className="pathway-intro-band">
        <span className="pathway-intro-icon"><Compass size={20} aria-hidden="true" /></span>
        <div><strong>Start with the route, then check the rules</strong><p>Entry routes, qualification recognition, and transfer credit vary by institution and country.</p></div>
        <span className="pathway-intro-note"><Info size={14} aria-hidden="true" /> Not institution-specific advice</span>
      </div>

      <div className="pathway-selector" role="tablist" aria-label="Study pathway options">
        {pathways.map((pathway) => (
          <button
            key={pathway.id}
            type="button"
            role="tab"
            aria-selected={activePathway.id === pathway.id}
            aria-controls="pathway-detail"
            className={activePathway.id === pathway.id ? "pathway-tab pathway-tab-active" : "pathway-tab"}
            onClick={() => setActivePathwayId(pathway.id)}
          >
            <span>{pathway.title}</span>
            <small>{pathway.duration}</small>
          </button>
        ))}
      </div>

      <section className="pathway-detail section-card" id="pathway-detail" role="tabpanel">
        <div className="pathway-detail-heading">
          <div><span className="panel-eyebrow">SELECTED ROUTE</span><h2>{activePathway.title}</h2><p>{activePathway.description}</p></div>
          <span className="pathway-duration">{activePathway.duration}</span>
        </div>
        <div className="pathway-stage-list">
          {activePathway.stages.map((stage, index) => (
            <article className="pathway-stage" key={stage.title}>
              <span className="stage-number">{String(index + 1).padStart(2, "0")}</span>
              {index < activePathway.stages.length - 1 && <span className="stage-connector" aria-hidden="true" />}
              <div><span>{stage.duration}</span><h3>{stage.title}</h3><p>{stage.detail}</p></div>
              {index < activePathway.stages.length - 1 && <ArrowRight className="stage-arrow" size={15} aria-hidden="true" />}
            </article>
          ))}
        </div>
        <div className="pathway-considerations">
          <strong><CircleHelp size={15} aria-hidden="true" /> Questions to verify</strong>
          <div>{activePathway.considerations.map((consideration) => <span key={consideration}>{consideration}</span>)}</div>
        </div>
      </section>

      <p className="data-disclaimer">Pathway lengths and stages are generalized mock planning aids. Confirm eligibility and credit recognition directly with institutions.</p>
    </div>
  );
}