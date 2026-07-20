export type StatusTone =
  "toneNeutral" | "toneWarning" | "toneSuccess" | "toneDanger";

const toneByStatus: Record<string, StatusTone> = {
  draft: "toneNeutral",
  pending_review: "toneWarning",
  published: "toneSuccess",
  rejected: "toneDanger",
  suspended: "toneDanger",
  open: "toneWarning",
  resolved: "toneSuccess",
  dismissed: "toneNeutral",
  active: "toneSuccess",
  admin: "toneWarning",
  user: "toneNeutral",
};

export function statusTone(status: string): StatusTone {
  return toneByStatus[status] ?? "toneNeutral";
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
