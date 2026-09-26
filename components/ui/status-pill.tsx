import type { StatusTone } from "@/types";

type StatusPillProps = {
  children: string;
  tone: StatusTone;
};

export function StatusPill({ children, tone }: StatusPillProps) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}