import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";

export type PlatformAdminRole = "admin";

export type SessionUserRoleState = {
  role?: string | null;
  banned?: boolean | null;
  email?: string | null;
  twoFactorEnabled?: boolean | null;
};

export type AdminSession = {
  userId: string;
  name: string;
  email: string;
};

/**
 * Pure check used by pages and session policy: a platform admin is a user whose
 * Better Auth `role` is exactly "admin" and who is not banned.
 */
export function isPlatformAdmin(user: SessionUserRoleState | null): boolean {
  if (!user) return false;
  if (user.banned) return false;
  return user.role === "admin";
}

/**
 * OV-204: private administrators must have two-step verification enrolled
 * before they can use the admin area. The shared public demo admin is
 * read-only and cannot enrol, so it is exempt from the requirement.
 */
export function hasAdminMfa(user: SessionUserRoleState | null): boolean {
  if (!user) return false;
  return isPublicDemoEmail(user.email) || user.twoFactorEnabled === true;
}

/** Public admin credentials may inspect admin pages but never mutate state. */
export function canUseAdminMutations(
  user: SessionUserRoleState | null,
): boolean {
  if (!isPlatformAdmin(user)) return false;
  if (isPublicDemoEmail(user?.email)) return false;
  return hasAdminMfa(user);
}

/**
 * Reads the current session without any role requirement. Used by the admin
 * layout to distinguish not signed in from signed in without admin access.
 */
export async function readRawSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

/**
 * Returns a session only for a private, active platform admin. Every admin
 * server action uses this helper, so the intentionally public admin demo stays
 * view-only even when a mutation endpoint is called directly.
 */
export async function readAdminSession(): Promise<AdminSession | null> {
  const session = await readRawSession();
  if (!session) return null;
  if (!canUseAdminMutations(session.user)) return null;

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
