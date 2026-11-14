import { isPublicDemoEmail } from "@/lib/public-demo-policy";

export type AdminCandidate = { id: string; email: string | null };

export const SINGLE_ADMIN_MESSAGE =
  "OurValleys allows exactly one private platform administrator.";

/**
 * OurValleys has one private platform administrator: the owner. The shared
 * public demo admin is read-only and never counts towards that limit, either as
 * the account being promoted or as an existing administrator.
 *
 * Pure so the rule is testable without a database: `existingAdmins` is every
 * account whose role is currently "admin".
 */
export function blocksAdditionalAdmin(
  existingAdmins: readonly AdminCandidate[],
  target: { id?: string | null; email?: string | null },
): boolean {
  if (isPublicDemoEmail(target.email)) return false;
  return existingAdmins.some(
    (admin) => !isPublicDemoEmail(admin.email) && admin.id !== target.id,
  );
}
