import "server-only";
import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";

export type PlatformAdminRole = "admin";

export type SessionUserRoleState = {
  role?: string | null;
  banned?: boolean | null;
};

export type AdminSession = {
  userId: string;
  name: string;
  email: string;
};

/**
 * Pure check used by both pages and server actions: a platform admin is a
 * user whose Better Auth `role` is exactly "admin" and who is not banned.
 * Banned admins lose the capability immediately, without needing a
 * separate revocation step.
 */
export function isPlatformAdmin(user: SessionUserRoleState | null): boolean {
  if (!user) return false;
  if (user.banned) return false;
  return user.role === "admin";
}

/**
 * Reads the current session without any role requirement. Used by the
 * admin layout to distinguish "not signed in" (redirect to login) from
 * "signed in but not an admin" (show a clear not-authorised state).
 */
export async function readRawSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

/**
 * Reads the current session and returns it only if the signed-in user is
 * a platform admin. Fails closed on any error or missing/insufficient
 * role. Use this in every admin server action before performing a
 * mutation.
 */
export async function readAdminSession(): Promise<AdminSession | null> {
  const session = await readRawSession();
  if (!session) return null;
  if (!isPlatformAdmin(session.user)) return null;

  return {
    userId: session.user.id,
    name: session.user.name,
    email: session.user.email,
  };
}
