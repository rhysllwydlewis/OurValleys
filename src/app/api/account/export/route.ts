import { headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { buildUserDataExport } from "@/modules/identity/data-export";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) return new Response("Unauthorized", { status: 401 });
  if (isPublicDemoEmail(session.user.email))
    return new Response("Unavailable for shared demonstration accounts", {
      status: 403,
    });

  const dataExport = await buildUserDataExport(session.user.id);
  if (!dataExport) return new Response("Not found", { status: 404 });

  const filename = `ourvalleys-my-data-${new Date().toISOString().slice(0, 10)}.json`;

  return new Response(JSON.stringify(dataExport, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
