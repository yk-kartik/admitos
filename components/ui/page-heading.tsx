import type { ReactNode } from "react";

type PageHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  action?: ReactNode;
};

export function PageHeading({
  eyebrow,
  title,
  description,
  badge,
  action,
}: PageHeadingProps) {
  return (
    <div className="page-heading workspace-page-heading">
      <div>
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ?? (badge ? <span className="demo-tag">{badge}</span> : null)}
    </div>
  );
}