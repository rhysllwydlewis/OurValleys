import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import { getOpenSlugChangeRequest } from "@/modules/businesses/tickets";
import { requestSlugChangeAction } from "../actions";
import styles from "../operations.module.css";
import { englishLang, hasPermission, hidden } from "./shared";

export async function AddressSection({
  businessId,
  businessSlug,
  userId,
}: {
  businessId: string;
  businessSlug: string;
  userId: string;
}) {
  const { locale, t } = await getTranslator();
  const [canRequest, pending] = await Promise.all([
    hasPermission(userId, businessId, businessPermissions.manageLifecycle),
    getOpenSlugChangeRequest(businessId),
  ]);

  return (
    <section
      className={styles.section}
      id="address"
      aria-labelledby="address-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.address.eyebrow")}</p>
          <h2 id="address-title">{t("ops.address.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.address.intro")}</p>
      </div>
      <p>{t("ops.address.current", { address: `/b/${businessSlug}` })}</p>
      {pending?.status === "open" ? (
        <p className={styles.notice} role="status">
          {t("ops.address.pending", { address: `/b/${pending.proposedSlug}` })}
        </p>
      ) : canRequest ? (
        <>
          {pending ? (
            <div className={styles.notice} role="status">
              <p>
                {t("ops.address.infoRequested", {
                  address: `/b/${pending.proposedSlug}`,
                })}
              </p>
              {pending.note ? (
                <p lang={englishLang(locale)}>{pending.note}</p>
              ) : null}
            </div>
          ) : null}
          <form className={styles.card} action={requestSlugChangeAction}>
            {hidden("businessId", businessId)}
            <div className={styles.field}>
              <label htmlFor="address-new">{t("ops.address.newLabel")}</label>
              <input
                id="address-new"
                name="proposedName"
                required
                minLength={3}
                maxLength={120}
                aria-describedby="address-new-help"
              />
              <p className={styles.meta} id="address-new-help">
                {t("ops.address.newHelp")}
              </p>
            </div>
            <div className={styles.field}>
              <label htmlFor="address-reason">
                {t("ops.address.reasonLabel")}
              </label>
              <textarea
                id="address-reason"
                name="reason"
                required
                minLength={10}
                maxLength={500}
                rows={3}
              />
            </div>
            <button className="button primary" type="submit">
              {pending ? t("ops.address.resubmit") : t("ops.address.submit")}
            </button>
          </form>
        </>
      ) : (
        <p className={styles.meta}>{t("ops.address.noPermission")}</p>
      )}
    </section>
  );
}
