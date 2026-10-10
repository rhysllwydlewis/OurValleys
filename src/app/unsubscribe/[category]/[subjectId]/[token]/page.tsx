import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  isNotificationCategory,
  isValidSubjectId,
  verifyUnsubscribeToken,
} from "@/lib/notification-unsubscribe";
import { unsubscribeAction } from "./actions";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("unsub.metaTitle"),
    robots: { index: false, follow: false },
  };
}

const outcomeKeys = {
  unsubscribed: "unsub.outcome.unsubscribed",
  invalid: "unsub.outcome.invalid",
  unavailable: "unsub.outcome.unavailable",
} as const;

function isOutcome(
  value: string | undefined,
): value is keyof typeof outcomeKeys {
  return value !== undefined && Object.hasOwn(outcomeKeys, value);
}

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
    !isValidSubjectId(category, subjectId)
  ) {
    notFound();
  }
  const valid = verifyUnsubscribeToken(category, subjectId, token);
  const effectiveOutcome = valid ? outcome : "invalid";
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <section className="state-panel">
          <p className="eyebrow">{t("unsub.eyebrow")}</p>
          <h1>{t(`unsub.${category}.heading`)}</h1>
          {isOutcome(effectiveOutcome) ? (
            <p role="status">{t(outcomeKeys[effectiveOutcome])}</p>
          ) : (
            <>
              <p>{t(`unsub.${category}.description`)}</p>
              <form action={unsubscribeAction}>
                <input type="hidden" name="category" value={category} />
                <input type="hidden" name="subjectId" value={subjectId} />
                <input type="hidden" name="token" value={token} />
                <button className="button primary" type="submit">
                  {t("unsub.submit")}
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
