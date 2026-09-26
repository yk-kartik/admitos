import type { ReactNode } from "react";

type PanelHeadingProps = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
};

export function PanelHeading({
  eyebrow,
  title,
  action,
}: PanelHeadingProps) {
  return (
    <div className="panel-heading">
      <div>
        {eyebrow && <span className="panel-eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}