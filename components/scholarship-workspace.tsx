"use client";

import { CalendarDays, CircleHelp, GraduationCap } from "lucide-react";
import { useState } from "react";
import type { ScholarshipOpportunity } from "@/types";
import { PageHeading } from "@/components/ui/page-heading";
import { PanelHeading } from "@/components/ui/panel-heading";

type ScholarshipWorkspaceProps = {
  opportunities: ScholarshipOpportunity[];
};

export function ScholarshipWorkspace({ opportunities }: ScholarshipWorkspaceProps) {
  const [focusArea, setFocusArea] = useState("All areas");
  const focusAreas = [...new Set(opportunities.flatMap((item) => item.focusAreas))];
  const visibleOpportunities = opportunities.filter(
    (item) => focusArea === "All areas" || item.focusAreas.includes(focusArea),
  );

  return (
    <div className="workspace-page scholarship-workspace">
      <PageHeading
        eyebrow="FUNDING DISCOVERY"
        title="Scholarship shortlist"
        description="Track potential funding alongside your study plans and application deadlines."
        badge="MOCK OPPORTUNITIES"
      />

      <section className="funding-overview" aria-label="Funding overview">
        <div><span>Sample opportunities</span><strong>{opportunities.length}</strong></div>
        <div><span>Source verified</span><strong>0</strong></div>
        <div><span>Next sample deadline</span><strong>Nov 30, 2026</strong></div>
        <p><CircleHelp size={14} aria-hidden="true" /> All awards and deadlines are illustrative; no official sources are attached.</p>
      </section>

      <div className="scholarship-toolbar">
        <div>
          <PanelHeading eyebrow="OPPORTUNITY CATALOG" title="Explore awards" />
          <span className="toolbar-caption">{visibleOpportunities.length} sample records</span>
        </div>
        <label className="select-control">
          <span>Study area</span>
          <select value={focusArea} onChange={(event) => setFocusArea(event.target.value)}>
            <option>All areas</option>
            {focusAreas.map((area) => <option key={area}>{area}</option>)}
          </select>
        </label>
      </div>

      <div className="scholarship-opportunity-list">
        {visibleOpportunities.map((opportunity) => (
          <article className="scholarship-opportunity" key={opportunity.id}>
            <div className="scholarship-opportunity-main">
              <div className="scholarship-opportunity-topline">
                <span className="opportunity-category"><GraduationCap size={13} aria-hidden="true" /> {opportunity.degreeLevels.join(" · ")}</span>
                <span className="record-status">Mock · unverified</span>
              </div>
              <h2>{opportunity.name}</h2>
              <span className="opportunity-provider">{opportunity.provider}</span>
              <p>{opportunity.summary}</p>
              <div className="study-area-list">
                {opportunity.focusAreas.map((area) => <span key={area}>{area}</span>)}
              </div>
              <div className="eligibility-summary">
                <strong>Eligibility to confirm</strong>
                <ul>{opportunity.eligibility.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
            </div>
            <aside className="opportunity-side">
              <span className="award-label">Illustrative award</span>
              <strong>{opportunity.award}</strong>
              <span className="opportunity-deadline"><CalendarDays size={14} aria-hidden="true" /> {opportunity.deadline}</span>
              <span className="opportunity-destination">{opportunity.eligibleRegions.join(" · ")}</span>
              <span className="source-unavailable">No verified source</span>
            </aside>
          </article>
        ))}
      </div>

      <p className="data-disclaimer">Award names, values, deadlines, and eligibility shown here are mock data and are not real scholarship listings.</p>
    </div>
  );
}