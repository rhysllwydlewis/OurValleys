import type { Route } from "next";
import Link from "next/link";
import type { Translator, MessageKey } from "@/lib/i18n/translate";
import {
  ownerHubHref,
  type OwnerHubStep,
} from "@/modules/businesses/owner-hub";
import styles from "./hub.module.css";

function stepText(t: Translator, step: OwnerHubStep) {
  const key = (part: string) => `hub.step.${step.id}.${part}` as MessageKey;
  if (step.id === "reply_enquiries") {
    return {
      title:
        step.count === 1
          ? t("hub.step.reply_enquiries.titleOne")
          : t("hub.step.reply_enquiries.title", { count: step.count ?? 0 }),
      body:
        (step.days ?? 0) > 0
          ? t("hub.step.reply_enquiries.body", { days: step.days ?? 0 })
          : t("hub.step.reply_enquiries.bodyToday"),
      cta: t("hub.step.reply_enquiries.cta"),
    };
  }
  return { title: t(key("title")), body: t(key("body")), cta: t(key("cta")) };
}

const toneLabel = {
  urgent: "hub.steps.urgent",
  next: "hub.steps.next",
  grow: "hub.steps.grow",
} as const satisfies Record<OwnerHubStep["tone"], MessageKey>;

export function NextSteps({
  businessId,
  steps,
  canEdit,
  t,
}: {
  businessId: string;
  steps: OwnerHubStep[];
  canEdit: boolean;
  t: Translator;
}) {
  return (
    <section className={styles.panel} aria-labelledby="hub-steps-heading">
      <p className="eyebrow">{t("hub.steps.eyebrow")}</p>
      <h2 id="hub-steps-heading">{t("hub.steps.title")}</h2>
      <p className={styles.lead}>{t("hub.steps.lead")}</p>
      {steps.length > 0 ? (
        <ol className={styles.steps}>
          {steps.map((step, index) => {
            const text = stepText(t, step);
            return (
              <li className={styles.step} data-tone={step.tone} key={step.id}>
                <span className={styles.stepMark} aria-hidden="true">
                  {index + 1}
                </span>
                <div className={styles.stepBody}>
                  <span className={styles.toneLabel}>
                    {t(toneLabel[step.tone])}
                  </span>
                  <h3>{text.title}</h3>
                  <p>{text.body}</p>
                  {step.target ? (
                    <Link
                      className={styles.stepLink}
                      href={ownerHubHref(businessId, step.target) as Route}
                    >
                      {text.cta}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className={styles.allClear} role="status">
          <strong>{t("hub.steps.allClearTitle")}</strong>
          <span>
            {canEdit
              ? t("hub.steps.allClearBody")
              : t("hub.steps.viewOnlyBody")}
          </span>
        </p>
      )}
    </section>
  );
}
