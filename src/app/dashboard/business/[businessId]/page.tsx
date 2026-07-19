import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";

type DashboardParams = Promise<{ businessId: string }>;

export const dynamic = "force-dynamic";

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function BusinessDashboardPage({
  params,
}: {
  params: DashboardParams;
}) {
  const session = await readSession();
  if (!session) redirect("/login?next=/dashboard");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();

  const authorised = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: parsedBusinessId.data,
    permission: businessPermissions.view,
  });

  if (!authorised) notFound();

  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Protected business dashboard</p>
        <h1>Tenant membership confirmed.</h1>
        <p className="lead">
          This route checks the authenticated user, requested business and an
          active membership on the server before rendering business controls.
        </p>
      </section>
    </main>
  );
}
