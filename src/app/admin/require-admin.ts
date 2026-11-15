import "server-only";
import { notFound } from "next/navigation";
import {
  readAdminSession,
  type AdminSession,
} from "@/modules/identity/admin-access";

/**
 * Every admin page calls this as its first statement, before it reads any data.
 *
 * The admin layout already turns non-admins away, but a layout and the page
 * under it are rendered at the same time. When the layout redirects, whatever
 * the page has rendered by then is still sent in the body of the redirect
 * response, so a request with no login could read it. A page that checks for
 * itself, first, never fetches anything for a visitor who is not an
 * administrator. `src/app/admin/admin-pages-guard.test.ts` fails if a page does
 * not.
 *
 * Returns the administrator's session, which is only ever a private, active,
 * two-step-verified platform admin (never the read-only public demo admin).
 */
export async function requireAdminForPage(): Promise<AdminSession> {
  const admin = await readAdminSession();
  if (!admin) notFound();
  return admin;
}
