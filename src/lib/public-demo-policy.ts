export const publicViewerDemoEmail = "demo.viewer@ourvalleys.example";
export const publicBusinessDemoEmail = "demo.owner@ourvalleys.example";
export const publicAdminDemoEmail = "demo.admin@ourvalleys.example";

export const publicDemoEmails = [
  publicViewerDemoEmail,
  publicBusinessDemoEmail,
  publicAdminDemoEmail,
] as const;

const publicDemoEmailSet: ReadonlySet<string> = new Set(publicDemoEmails);

export function isPublicDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return publicDemoEmailSet.has(email.trim().toLowerCase());
}

/**
 * Shared demos may use only their explicit structured-profile journey;
 * all private appearance and media tooling remains unavailable.
 */
export function canUseBusinessAppearanceTools(
  email: string | null | undefined,
): boolean {
  return !isPublicDemoEmail(email);
}

/** Shared demos are denied at the private operations server-action boundary. */
export function canUseBusinessOperationsTools(
  email: string | null | undefined,
): boolean {
  return !isPublicDemoEmail(email);
}
