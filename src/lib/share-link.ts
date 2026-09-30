export type ShareOutcome = "shared" | "copied" | "cancelled" | "unavailable";

export type ShareEnvironment = {
  share?: (data: { title: string; url: string }) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
};

export async function shareOrCopyLink(
  environment: ShareEnvironment,
  data: { title: string; url: string },
): Promise<ShareOutcome> {
  if (environment.share) {
    try {
      await environment.share(data);
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
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
