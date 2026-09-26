import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { SectionContent } from "@/types";
import { PanelHeading } from "@/components/ui/panel-heading";

type SectionPlaceholderProps = {
  section: SectionContent;
};

export function SectionPlaceholder({ section }: SectionPlaceholderProps) {
  const Icon = section.icon;

  return (
    <div className="section-placeholder">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            {section.eyebrow}
          </div>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </div>
        <span className="demo-tag">EARLY PREVIEW</span>
      </div>

      <section className="placeholder-banner">
        <span className="placeholder-mark" aria-hidden="true">
          <Icon size={23} strokeWidth={1.7} />
        </span>
        <div className="placeholder-copy">
          <span className="placeholder-state">
            <span /> IN DEVELOPMENT
          </span>
          <h2>{section.panelTitle}</h2>
          <p>{section.panelDescription}</p>
        </div>
      </section>

      <div className="placeholder-grid">
        <section className="section-card">
          <PanelHeading
            eyebrow="A THOUGHTFUL START"
            title="Designed around your next decisions"
          />
          <ul className="placeholder-checklist">
            {section.checklist.map((item) => (
              <li key={item}>
                <span className="checklist-icon" aria-hidden="true">
                  <Check size={13} strokeWidth={2.2} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <aside className="insight-panel">
          <span>{section.insightLabel}</span>
          <strong>{section.insightValue}</strong>
          <p>{section.insightDescription}</p>
          <Link href="/">
            Return to overview <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}