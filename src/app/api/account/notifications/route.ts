import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { countUnreadNotifications } from "@/modules/residents/notifications";

export const dynamic = "force-dynamic";

/** The signed-in person's unread notification count, for the account menu. */
export async function GET() {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) {
    return Response.json(
      { unread: 0 },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
  const unread = isPublicDemoEmail(session.user.email)
    ? 0
    : await countUnreadNotifications(session.user.id);
  return Response.json(
    { unread },
    { headers: { "Cache-Control": "no-store" } },
  );
}
