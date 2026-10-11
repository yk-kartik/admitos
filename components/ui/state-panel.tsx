import type { ReactNode } from "react";
import type { ResourceViewState } from "@/types";

/**
 * Presentation states for a block of content that depends on a resource.
 *
 * The first five come from the shared `ResourceViewState` type. The extra
 * "not-implemented" state is for content that this surface does not load at
 * all. It deliberately says nothing about whether data exists, so it must
 * never be shown as if a lookup had found nothing.
 *
 * Only use "empty" after a real lookup has established that there is nothing.
 */
export type StatePanelState =
  | ResourceViewState
  | { status: "not-implemented"; title?: string; description?: string };

type StatePanelProps = {
  state: StatePanelState;
  className?: string;
  children?: ReactNode;
};

const labels: Record<StatePanelState["status"], string> = {
  loading: "LOADING",
  empty: "NO RECORDS FOUND",
  unavailable: "UNAVAILABLE",
  unverified: "UNVERIFIED",
  "missing-source": "SOURCE MISSING",
  "not-implemented": "NOT SHOWN YET",
};

function describeState(state: StatePanelState): {
  title: string;
  description: string;
} {
  switch (state.status) {
    case "loading":
      return {
        title: state.label ?? "Loading",
        description: "Checking for the latest information.",
      };
    case "empty":
      return {
        title: state.title ?? "No records found",
        description:
          state.description ?? "A lookup completed and found nothing to show.",
      };
    case "unavailable":
      return {
        title: "Temporarily unavailable",
        description:
          state.message ?? "This information couldn't be loaded right now.",
      };
    case "unverified":
      return {
        title: "Not yet verified",
        description:
          state.message ?? "This information has not been verified.",
      };
    case "missing-source":
      return {
        title: "Source unavailable",
        description:
          state.message ?? "No source is available for this information.",
      };
    case "not-implemented":
      return {
        title: state.title ?? "Not shown on the dashboard yet",
        description:
          state.description ??
          "This isn't connected here yet. That doesn't mean there is nothing to show.",
      };
  }
}

export function StatePanel({ state, className, children }: StatePanelProps) {
  const { title, description } = describeState(state);
  const role =
    state.status === "loading"
      ? "status"
      : state.status === "unavailable"
        ? "alert"
        : undefined;

  return (
    <div
      className={className ? `empty-state ${className}` : "empty-state"}
      role={role}
      aria-busy={state.status === "loading" ? true : undefined}
    >
      <span className="panel-eyebrow">{labels[state.status]}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      {children}
    </div>
  );
}
