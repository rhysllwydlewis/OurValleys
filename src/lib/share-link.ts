export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export type ShareEnvironment = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
};

// Browsers with no registered share targets reject with the same AbortError as a
// dismissed sheet, but immediately. A rejection this fast cannot be a user
// choice, so fall through to copying the link instead of staying silent.
const minimumDeliberateDismissMs = 400;

export async function shareOrCopyLink(
  environment: ShareEnvironment,
  data: { title: string; url: string },
): Promise<ShareOutcome> {
  if (environment.share) {
    const startedAt = Date.now();
    try {
      await environment.share(data);
      return "shared";
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError" &&
        Date.now() - startedAt >= minimumDeliberateDismissMs
      ) {
        return "cancelled";
      }
    }
  }

  if (environment.writeText) {
    try {
      await environment.writeText(data.url);
      return "copied";
    } catch {
      return "unavailable";
    }
  }

  return "unavailable";
}
