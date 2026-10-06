import type { AttendanceRecord } from "@wfh/contracts";
import { Badge as UiBadge } from "./ui/badge";

const variants = {
  Completed: "success",
  Active: "success",
  Working: "working",
  Incomplete: "incomplete",
  Inactive: "neutral",
  "Not started": "neutral",
} as const;

export function Badge({
  status,
}: {
  status: AttendanceRecord["status"] | "Active" | "Inactive" | "Not started";
}) {
  return (
    <UiBadge variant={variants[status]}>
      <span aria-hidden="true" className="size-1 rounded-full bg-current" />
      {status}
    </UiBadge>
  );
}
