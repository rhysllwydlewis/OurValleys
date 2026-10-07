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
import { formatDate, hidden } from "./shared";

export async function LifecycleSection({
  businessId,
  canPublish,
  canLifecycle,
}: {
  businessId: string;
  canPublish: boolean;
  canLifecycle: boolean;
}) {
  const [lifecycle, eligibility] = await Promise.all([
    ensureBusinessLifecycle(businessId),
    getAutomaticPublicationEligibility(businessId),
  ]);

  return (
    <section
      className={styles.section}
      id="lifecycle"
      aria-labelledby="lifecycle-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Phase 10</p>
          <h2 id="lifecycle-title">Publication and lifecycle</h2>
        </div>
        <p className={styles.meta}>
          Current state: {lifecycle?.state ?? "unavailable"}
        </p>
      </div>
      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Publication eligibility</h3>
          {eligibility.eligible ? (
            <p>All automated checks pass.</p>
          ) : (
            <>
              <p>Complete these before automatic publication:</p>
              <ul>
                {eligibility.missing.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </>
          )}
          <p className={styles.meta}>
            Terms accepted: {lifecycle?.termsAccepted ? "Yes" : "No"}
          </p>
          {canPublish && !lifecycle?.termsAccepted ? (
            <form action={acceptTermsAction}>
              {hidden("businessId", businessId)}
              <label className={styles.check}>
                <input type="checkbox" name="acceptTerms" required /> I confirm
                the business information is accurate, I have a reasonable basis
                to manage it, and I accept the current free website terms.
              </label>
              <button className="button primary" type="submit">
                Accept terms
              </button>
            </form>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>Automatic publication</h3>
          <p>
            {lifecycle?.autoPublishEnabled
              ? `Scheduled for ${formatDate(lifecycle.autoPublishAt)}`
              : "Off. Nothing will publish automatically."}
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
                  Publish automatically after the 14-day reminder period when
                  eligible
                </label>
                <button className="button" type="submit">
                  Save preference
                </button>
              </form>
              {lifecycle?.autoPublishEnabled ? (
                <form action={postponeAutoPublishAction}>
                  {hidden("businessId", businessId)}
                  <div className={styles.field}>
                    <label htmlFor="postpone-until">Postpone until</label>
                    <input
                      id="postpone-until"
                      name="until"
                      type="datetime-local"
                      required
                    />
                  </div>
                  <button className="button" type="submit">
                    Postpone
                  </button>
                </form>
              ) : null}
            </>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>Reminder emails</h3>
          <p>
            {(lifecycle?.lifecycleEmailsEnabled ?? true)
              ? "Owners receive publication, trading-check and other account reminder emails."
              : "Off. Owners will not receive these reminder emails. Important account notices are unaffected."}
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
                Send reminder emails to owners
              </label>
              <button className="button" type="submit">
                Save preference
              </button>
            </form>
          ) : null}
        </article>
        <article className={styles.card}>
          <h3>Trading confirmation</h3>
          <p>
            Last confirmed: {formatDate(lifecycle?.lastConfirmedAt ?? null)}
          </p>
          <p>
            Next due: {formatDate(lifecycle?.nextConfirmationDueAt ?? null)}
          </p>
          {canLifecycle ? (
            <form action={confirmTradingAction}>
              {hidden("businessId", businessId)}
              <button className="button primary" type="submit">
                Confirm still trading
              </button>
            </form>
          ) : null}
        </article>
        {canLifecycle ? (
          <article className={styles.card}>
            <h3>Pause, close or recover</h3>
            <form className={styles.form} action={lifecycleAction}>
              {hidden("businessId", businessId)}
              <div className={styles.field}>
                <label htmlFor="lifecycle-action">Action</label>
                <select
                  id="lifecycle-action"
                  name="action"
                  defaultValue="pause"
                >
                  <option value="pause">Pause/unpublish</option>
                  <option value="resume">Resume</option>
                  <option value="temporary_close">Temporarily close</option>
                  <option value="permanent_close">
                    Mark permanently closed
                  </option>
                  <option value="request_deletion">
                    Request recoverable deletion
                  </option>
                  <option value="cancel_deletion">
                    Cancel deletion request
                  </option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor="temporary-close-until">
                  Temporary closure ends
                </label>
                <input
                  id="temporary-close-until"
                  name="temporaryClosedUntil"
                  type="datetime-local"
                />
              </div>
              <button className="button" type="submit">
                Apply lifecycle action
              </button>
            </form>
            {lifecycle?.deleteAfter ? (
              <p className={styles.meta}>
                Deletion remains recoverable until{" "}
                {formatDate(lifecycle.deleteAfter)}. No automated hard deletion
                is activated.
              </p>
            ) : null}
          </article>
        ) : null}
      </div>
    </section>
  );
}
