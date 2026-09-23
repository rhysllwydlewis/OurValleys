import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  isNotificationCategory,
  verifyUnsubscribeToken,
  type NotificationCategory,
} from "@/lib/notification-unsubscribe";
import { unsubscribeAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

const categoryCopy: Record<
  NotificationCategory,
  { heading: string; description: string }
> = {
  saved_event_cancellation: {
    heading: "Saved-event cancellation emails",
    description:
      "You will no longer be emailed when an event you saved is cancelled. You can turn this back on from your account settings at any time.",
  },
  business_lifecycle: {
    heading: "Business reminder emails",
    description:
      "This business will no longer receive publication and account reminder emails. Important account notices, such as confirmed deletion, are unaffected. Owners can turn this back on from the operations dashboard at any time.",
  },
};

const outcomeMessages: Record<string, string> = {
  unsubscribed: "You have been unsubscribed.",
  invalid: "This unsubscribe link is invalid or has already been used.",
  unavailable: "That action is temporarily unavailable. Try again shortly.",
};

export default async function UnsubscribePage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string; subjectId: string; token: string }>;
  searchParams: Promise<{ outcome?: string }>;
}) {
  const { category, subjectId, token } = await params;
  const { outcome } = await searchParams;

  if (
    !isNotificationCategory(category) ||
    !z.uuid().safeParse(subjectId).success
  ) {
    notFound();
  }
  const valid = verifyUnsubscribeToken(category, subjectId, token);
  const effectiveOutcome = valid ? outcome : "invalid";
  const copy = categoryCopy[category];

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell">
        <section className="state-panel">
          <p className="eyebrow">Email preferences</p>
          <h1>{copy.heading}</h1>
          {effectiveOutcome && outcomeMessages[effectiveOutcome] ? (
            <p role="status">{outcomeMessages[effectiveOutcome]}</p>
          ) : (
            <>
              <p>{copy.description}</p>
              <form action={unsubscribeAction}>
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="subjectId" value={subjectId} />
                <input type="hidden" name="token" value={token} />
                <button className="button primary" type="submit">
                  Unsubscribe
                </button>
              </form>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
