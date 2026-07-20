import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { getAuth } from "@/lib/auth";
import {
  businessOnboardingSteps,
  calculateBusinessOnboardingProgress,
} from "@/modules/businesses/onboarding";
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

  const progress = calculateBusinessOnboardingProgress([]);

  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Protected business dashboard</p>
        <h1>Build your OurValleys presence.</h1>
        <p className="lead">
          Complete one structured business profile and use it across discovery,
          your generated website and future resident journeys.
        </p>
        <p aria-live="polite">
          {progress.completedCount} of {progress.totalCount} onboarding steps
          complete ({progress.percentage}%).
        </p>
      </section>

      <section aria-labelledby="onboarding-heading">
        <p className="eyebrow">Stage G onboarding</p>
        <h2 id="onboarding-heading">Your setup checklist</h2>
        <ol>
          {businessOnboardingSteps.map((step, index) => (
            <li key={step.key}>
              <article>
                <p className="eyebrow">Step {index + 1}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <p>Status: Not started</p>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="safety-heading">
        <p className="eyebrow">Safe by default</p>
        <h2 id="safety-heading">Nothing publishes automatically.</h2>
        <p>
          Preview, verification and publication remain separate controlled
          steps. This dashboard is available only after server-side tenant
          membership and permission checks succeed.
        </p>
      </section>
    </main>
  );
}
