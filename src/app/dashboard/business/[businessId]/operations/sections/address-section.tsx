import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import { getOpenSlugChangeRequest } from "@/modules/businesses/tickets";
import { withdrawSlugChangeAction } from "../actions";
import styles from "../operations.module.css";
import { SlugChangeForm } from "./slug-change-form";
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
        <>
          <p className={styles.notice} role="status">
            {t("ops.address.pending", {
              address: `/b/${pending.proposedSlug}`,
            })}
          </p>
          {canRequest ? (
            <form action={withdrawSlugChangeAction}>
              {hidden("businessId", businessId)}
              <button className="button" type="submit">
                {t("ops.address.withdraw")}
              </button>
            </form>
          ) : null}
        </>
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
          <form action={withdrawSlugChangeAction}>
            {hidden("businessId", businessId)}
            <button className="button" type="submit">
              {t("ops.address.withdraw")}
            </button>
          </form>
          <SlugChangeForm businessId={businessId} resubmit={Boolean(pending)} />
        </>
      ) : (
        <p className={styles.meta}>{t("ops.address.noPermission")}</p>
      )}
    </section>
  );
}
