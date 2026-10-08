import { onboardingStepTitle } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { businessPermissions } from "@/modules/businesses/permissions";
import {
  acceptTermsAction,
  configureAutoPublishAction,
  configureLifecycleEmailsAction,
  confirmTradingAction,
  lifecycleAction,
  postponeAutoPublishAction,
} from "../actions";
import {
  ensureBusinessLifecycle,
  getAutomaticPublicationEligibility,
} from "@/modules/businesses/lifecycle-automation";
import styles from "../operations.module.css";
import { formatDate, hidden, hasPermission } from "./shared";

const missingItemMessages: Record<string, MessageKey> = {
  business: "ops.life.missing.business",
  "non-demo business": "ops.life.missing.non-demo_business",
  "eligible draft status": "ops.life.missing.eligible_draft_status",
  "verified owner email": "ops.life.missing.verified_owner_email",
  "accepted terms": "ops.life.missing.accepted_terms",
  "working contact action": "ops.life.missing.working_contact_action",
  "resolved high-risk conflict": "ops.life.missing.resolved_high-risk_conflict",
  "automated checks temporarily unavailable":
    "ops.life.missing.automated_checks_temporarily_unavailable",
};

/** Checks arrive as English phrases or onboarding step keys; step keys use the checklist titles. */
function missingItemLabel(t: Translator, item: string): string {
  const key = missingItemMessages[item];
  return key ? t(key) : onboardingStepTitle(t, item);
}

export async function LifecycleSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const i18n = await getTranslator();
  const { t } = i18n;
  const canPublishPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.publish,
  );
  const canLifecyclePromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageLifecycle,
  );
  const [lifecycle, eligibility] = await Promise.all([
    ensureBusinessLifecycle(businessId),
    getAutomaticPublicationEligibility(businessId),
  ]);
  const canPublish = await canPublishPromise;
  const canLifecycle = await canLifecyclePromise;

  return (
    <section
      className={styles.section}
      id="lifecycle"
      aria-labelledby="lifecycle-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.phase", { n: 10 })}</p>
          <h2 id="lifecycle-title">{t("ops.life.title")}</h2>
        </div>
        <p className={styles.meta}>
          {t("ops.life.state", {
            state: lifecycle?.state
              ? t(`ops.life.state.${lifecycle.state}`)
              : t("ops.life.stateUnavailable"),
          })}
        </p>
      </div>
      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>{t("ops.life.eligibility")}</h3>
          {eligibility.eligible ? (
            <p>{t("ops.life.allPass")}</p>
          ) : (
            <>
              <p>{t("ops.life.completeThese")}</p>
              <ul>
                {eligibility.missing.map((item) => (
                  <li key={item}>{missingItemLabel(t, item)}</li>
                ))}
              </ul>
            </>
          )}
          <p className={styles.meta}>
            {t("ops.life.termsAccepted", {
              answer: lifecycle?.termsAccepted
                ? t("ops.common.yes")
                : t("ops.common.no"),
            })}
          </p>
          {canPublish && !lifecycle?.termsAccepted ? (
            <form action={acceptTermsAction}>
              {hidden("businessId", businessId)}
              <label className={styles.check}>
                <input type="checkbox" name="acceptTerms" required />{" "}
                {t("ops.life.termsConfirm")}
              </label>
              <button className="button primary" type="submit">
                {t("ops.life.acceptTerms")}
              </button>
            </form>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>{t("ops.life.autoTitle")}</h3>
          <p>
            {lifecycle?.autoPublishEnabled
              ? t("ops.life.scheduled", {
                  date: formatDate(lifecycle.autoPublishAt, i18n),
                })
              : t("ops.life.autoOff")}
          </p>
          {canPublish ? (
            <>
              <form action={configureAutoPublishAction}>
                {hidden("businessId", businessId)}
                <label className={styles.check}>
                  <input
                    type="checkbox"
                    name="enabled"
                    defaultChecked={lifecycle?.autoPublishEnabled}
                  />{" "}
                  {t("ops.life.autoLabel")}
                </label>
                <button className="button" type="submit">
                  {t("ops.life.savePref")}
                </button>
              </form>
              {lifecycle?.autoPublishEnabled ? (
                <form action={postponeAutoPublishAction}>
                  {hidden("businessId", businessId)}
                  <div className={styles.field}>
                    <label htmlFor="postpone-until">
                      {t("ops.life.postponeUntil")}
                    </label>
                    <input
                      id="postpone-until"
                      name="until"
                      type="datetime-local"
                      required
                    />
                  </div>
                  <button className="button" type="submit">
                    {t("ops.life.postpone")}
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>{t("ops.life.emailsTitle")}</h3>
          <p>
            {(lifecycle?.lifecycleEmailsEnabled ?? true)
              ? t("ops.life.emailsOn")
              : t("ops.life.emailsOff")}
          </p>
          {canPublish ? (
            <form action={configureLifecycleEmailsAction}>
              {hidden("businessId", businessId)}
              <label className={styles.check}>
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={lifecycle?.lifecycleEmailsEnabled ?? true}
                />{" "}
                {t("ops.life.emailsLabel")}
              </label>
              <button className="button" type="submit">
                {t("ops.life.savePref")}
              </button>
            </form>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>{t("ops.life.tradingTitle")}</h3>
          <p>
            {t("ops.life.lastConfirmed", {
              date: formatDate(lifecycle?.lastConfirmedAt ?? null, i18n),
            })}
          </p>
          <p>
            {t("ops.life.nextDue", {
              date: formatDate(lifecycle?.nextConfirmationDueAt ?? null, i18n),
            })}
          </p>
          {canLifecycle ? (
            <form action={confirmTradingAction}>
              {hidden("businessId", businessId)}
              <button className="button primary" type="submit">
                {t("ops.life.confirm")}
              </button>
            </form>
          ) : null}
        </article>
        {canLifecycle ? (
          <article className={styles.card}>
            <h3>{t("ops.life.pauseTitle")}</h3>
            <form className={styles.form} action={lifecycleAction}>
              {hidden("businessId", businessId)}
              <div className={styles.field}>
                <label htmlFor="lifecycle-action">{t("ops.life.action")}</label>
                <select
                  id="lifecycle-action"
                  name="action"
                  defaultValue="pause"
                >
                  <option value="pause">{t("ops.life.action.pause")}</option>
                  <option value="resume">{t("ops.life.action.resume")}</option>
                  <option value="temporary_close">
                    {t("ops.life.action.temporary_close")}
                  </option>
                  <option value="permanent_close">
                    {t("ops.life.action.permanent_close")}
                  </option>
                  <option value="request_deletion">
                    {t("ops.life.action.request_deletion")}
                  </option>
                  <option value="cancel_deletion">
                    {t("ops.life.action.cancel_deletion")}
                  </option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="temporary-close-until">
                  {t("ops.life.closureEnds")}
                </label>
                <input
                  id="temporary-close-until"
                  name="temporaryClosedUntil"
                  type="datetime-local"
                />
              </div>
              <button className="button" type="submit">
                {t("ops.life.apply")}
              </button>
            </form>
            {lifecycle?.deleteAfter ? (
              <p className={styles.meta}>
                {t("ops.life.deletionNote", {
                  date: formatDate(lifecycle.deleteAfter, i18n),
                })}
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
