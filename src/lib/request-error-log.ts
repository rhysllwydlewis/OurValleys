/**
 * Builds the one structured log line written for a failed server request.
 * Deliberately takes only the route pattern, never the URL, headers, cookies,
 * query string or body, and scrubs emails and token-like strings from the
 * error text.
 */

export type RequestErrorContext = {
  routePath?: string;
  routeType?: string;
  renderSource?: string;
  routerKind?: string;
};

export type RequestErrorLine = {
  level: "error";
  event: "request_error";
  timestamp: string;
  digest?: string;
  route: string;
  routeType: string;
  renderSource?: string;
  method: string;
  errorName: string;
  message: string;
  stack?: string;
};

const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 2000;

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const TOKEN_PATTERN = /\b[A-Za-z0-9_-]{32,}\b/g;
const CONNECTION_STRING_PATTERN = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"']+/gi;

export function scrubErrorText(text: string): string {
  return text
    .replace(CONNECTION_STRING_PATTERN, "[url]")
    .replace(BEARER_PATTERN, "Bearer [redacted]")
    .replace(EMAIL_PATTERN, "[email]")
    .replace(TOKEN_PATTERN, "[redacted]");
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readDigest(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = (error as { digest?: unknown }).digest;
    if (typeof digest === "string" || typeof digest === "number") {
      return String(digest);
    }
  }
  return undefined;
}

export function formatRequestError(
  error: unknown,
  request: { method?: string },
  context: RequestErrorContext,
  now: Date = new Date(),
): RequestErrorLine {
  const isError = error instanceof Error;
  const rawMessage = isError
    ? error.message
    : typeof error === "string"
      ? error
      : "Non-error value thrown";

  return {
    level: "error",
    event: "request_error",
    timestamp: now.toISOString(),
    digest: readDigest(error),
    route: context.routePath ?? "unknown",
    routeType: context.routeType ?? "unknown",
    renderSource: context.renderSource,
    method: request.method ?? "unknown",
    errorName: isError ? error.name : typeof error,
    message: truncate(scrubErrorText(rawMessage), MAX_MESSAGE_LENGTH),
    stack:
      isError && error.stack
        ? truncate(scrubErrorText(error.stack), MAX_STACK_LENGTH)
        : undefined,
  };
}
