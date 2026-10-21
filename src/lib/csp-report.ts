/**
 * Turns a browser CSP violation report into one structured log line.
 * Keeps only the violated directive, the blocked origin (never its path or
 * query) and the page path without its query string, so a report cannot carry
 * tokens or personal data into the logs.
 */

export type CspReportLine = {
  level: "warn";
  event: "csp_violation";
  timestamp: string;
  directive: string;
  blocked: string;
  page: string;
  disposition: string;
};

const MAX_FIELD_LENGTH = 200;

function clip(value: unknown): string {
  return typeof value === "string" ? value.slice(0, MAX_FIELD_LENGTH) : "";
}

/** A directive name only (`img-src`), never free text from the report. */
function directiveName(value: string): string {
  const name = value.split(" ")[0] ?? "";
  return /^[a-z][a-z-]{0,40}$/.test(name) ? name : "";
}

function originOnly(value: string): string {
  if (value === "" || value === "inline" || value === "eval")
    return value || "unknown";
  try {
    const url = new URL(value);
    // data:, blob: and similar have no origin worth logging beyond the scheme.
    return url.origin === "null" ? url.protocol : url.origin;
  } catch {
    return "unknown";
  }
}

function pathOnly(value: string): string {
  try {
    return new URL(value).pathname.slice(0, MAX_FIELD_LENGTH);
  } catch {
    return "unknown";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Accepts both the legacy `csp-report` body and the Reporting API array. */
export function formatCspReports(
  body: unknown,
  now: Date = new Date(),
): CspReportLine[] {
  const entries = Array.isArray(body) ? body : [body];
  const lines: CspReportLine[] = [];
  for (const entry of entries.slice(0, 10)) {
    const root = asRecord(entry);
    if (!root) continue;
    const legacy = asRecord(root["csp-report"]);
    const modern = root.type === "csp-violation" ? asRecord(root.body) : null;
    const report = legacy ?? modern;
    if (!report) continue;
    const directive = directiveName(
      clip(
        report["effective-directive"] ??
          report.effectiveDirective ??
          report["violated-directive"],
      ),
    );
    if (!directive) continue;
    lines.push({
      level: "warn",
      event: "csp_violation",
      timestamp: now.toISOString(),
      directive,
      blocked: originOnly(clip(report["blocked-uri"] ?? report.blockedURL)),
      page: pathOnly(clip(report["document-uri"] ?? report.documentURL)),
      disposition: report.disposition === "enforce" ? "enforce" : "report",
    });
  }
  return lines;
}
