import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import Link from "next/link";
import { listBusinessEvents } from "@/modules/businesses/content-features";
import {
  cancelEventSeriesAction,
  removeEventAction,
  saveEventAction,
} from "../actions";
import styles from "../operations.module.css";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { ContentImageFields } from "./content-image-fields";
import { dateInput, hidden, hasPermission } from "./shared";

export async function EventsSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t } = await getTranslator();
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const events = await listBusinessEvents(businessId);
  const editableEvents = events.filter((event) => event.status !== "removed");
  const removedEvents = events.filter((event) => event.status === "removed");
  const nowForEvents = new Date();
  const cancellableSeries = new Map<string, { title: string; count: number }>();
  for (const event of editableEvents) {
    if (
      !event.seriesId ||
      event.status === "cancelled" ||
      event.startsAt < nowForEvents
    ) {
      continue;
    }
    const entry = cancellableSeries.get(event.seriesId);
    if (entry) entry.count += 1;
    else
      cancellableSeries.set(event.seriesId, { title: event.title, count: 1 });
  }
  const canContent = await canContentPromise;
  const uploadsEnabled = isMediaStorageConfigured();

  return (
    <section
      className={styles.section}
      id="events"
      aria-labelledby="events-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.events.eyebrow")}</p>
          <h2 id="events-title">{t("ops.events.title")}</h2>
        </div>
        <Link href="/events">{t("ops.events.openPublic")}</Link>
      </div>
      {removedEvents.length > 0 ? (
        <p role="status" className={styles.notice}>
          {removedEvents.length === 1
            ? t("ops.events.removedOne", {
                title: removedEvents[0]?.title ?? "",
              })
            : t("ops.events.removedMany", {
                count: removedEvents.length,
                titles: removedEvents
                  .map((event) => `“${event.title}”`)
                  .join(", "),
              })}
        </p>
      ) : null}
      <div className={styles.grid}>
        {editableEvents.map((event) => (
          <form className={styles.card} action={saveEventAction} key={event.id}>
            {hidden("businessId", businessId)}
            {hidden("eventId", event.id)}
            <div className={styles.field}>
              <label htmlFor={`event-title-${event.id}`}>
                {t("ops.common.title")}
              </label>
              <input
                id={`event-title-${event.id}`}
                lang={authoredTextLang}
                name="title"
                defaultValue={event.title}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`event-description-${event.id}`}>
                {t("ops.common.description")}
              </label>
              <textarea
                id={`event-description-${event.id}`}
                lang={authoredTextLang}
                name="description"
                defaultValue={event.description}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`event-start-${event.id}`}>
                {t("ops.common.starts")}
              </label>
              <input
                id={`event-start-${event.id}`}
                name="startsAt"
                type="datetime-local"
                defaultValue={dateInput(event.startsAt)}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`event-end-${event.id}`}>
                {t("ops.common.ends")}
              </label>
              <input
                id={`event-end-${event.id}`}
                name="endsAt"
                type="datetime-local"
                defaultValue={dateInput(event.endsAt)}
                disabled={!canContent}
              />
            </div>
            <ContentImageFields
              idPrefix={`event-${event.id}`}
              image={event.image ?? null}
              canEdit={canContent}
              uploadsEnabled={uploadsEnabled}
              noun="event"
            />
            <input
              type="hidden"
              name="locationDisplay"
              value={event.locationDisplay ?? ""}
            />
            <input
              type="hidden"
              name="bookingUrl"
              value={event.bookingUrl ?? ""}
            />
            <select
              name="status"
              aria-label={t("ops.events.statusAria")}
              defaultValue={event.status}
              disabled={!canContent}
            >
              <option value="draft">{t("ops.common.draft")}</option>
              <option value="active">{t("ops.common.active")}</option>
              <option value="cancelled">{t("ops.common.cancelled")}</option>
              <option value="hidden">{t("ops.common.hidden")}</option>
            </select>
            {canContent ? (
              <button className="button primary" type="submit">
                {t("ops.events.save")}
              </button>
            ) : null}
          </form>
        ))}
        {canContent ? (
          <form className={styles.card} action={saveEventAction}>
            {hidden("businessId", businessId)}
            <h3>{t("ops.events.addTitle")}</h3>
            <div className={styles.field}>
              <label htmlFor="event-new-title">{t("ops.common.title")}</label>
              <input id="event-new-title" name="title" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-description">
                {t("ops.common.description")}
              </label>
              <textarea
                id="event-new-description"
                name="description"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-start">{t("ops.common.starts")}</label>
              <input
                id="event-new-start"
                name="startsAt"
                type="datetime-local"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-end">{t("ops.common.ends")}</label>
              <input id="event-new-end" name="endsAt" type="datetime-local" />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-repeat">
                {t("ops.events.repeats")}
              </label>
              <select
                id="event-new-repeat"
                name="repeatFrequency"
                defaultValue="never"
                aria-describedby="event-new-repeat-hint"
              >
                <option value="never">{t("ops.events.never")}</option>
                <option value="weekly">{t("ops.events.weekly")}</option>
                <option value="fortnightly">
                  {t("ops.events.fortnightly")}
                </option>
                <option value="monthly">{t("ops.events.monthly")}</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-occurrences">
                {t("ops.events.occurrences")}
              </label>
              <input
                id="event-new-occurrences"
                name="repeatOccurrences"
                type="number"
                min={2}
                max={26}
                defaultValue={4}
                aria-describedby="event-new-repeat-hint"
              />
              <p id="event-new-repeat-hint" className={styles.meta}>
                {t("ops.events.repeatHint")}
              </p>
            </div>
            <ContentImageFields
              idPrefix="event-new"
              image={null}
              canEdit={canContent}
              uploadsEnabled={uploadsEnabled}
              noun="event"
            />
            <input type="hidden" name="locationDisplay" value="" />
            <input type="hidden" name="bookingUrl" value="" />
            <select
              name="status"
              defaultValue="draft"
              aria-label={t("ops.events.statusAria")}
            >
              <option value="draft">{t("ops.common.draft")}</option>
              <option value="active">{t("ops.common.active")}</option>
            </select>
            <button className="button primary" type="submit">
              {t("ops.events.add")}
            </button>
          </form>
        ) : null}
      </div>
      {canContent && cancellableSeries.size > 0 ? (
        <div className={styles.actions}>
          {editableEvents
            .filter(
              (event, index, all) =>
                event.seriesId &&
                cancellableSeries.has(event.seriesId) &&
                all.findIndex((other) => other.seriesId === event.seriesId) ===
                  index,
            )
            .map((event) => {
              const series = cancellableSeries.get(event.seriesId!)!;
              return (
                <form action={cancelEventSeriesAction} key={event.seriesId}>
                  {hidden("businessId", businessId)}
                  {hidden("eventId", event.id)}
                  <button className={`button ${styles.danger}`} type="submit">
                    {t(
                      series.count === 1
                        ? "ops.events.cancelSeries.one"
                        : "ops.events.cancelSeries.other",
                      { count: series.count, title: series.title },
                    )}
                  </button>
                </form>
              );
            })}
        </div>
      ) : null}
      {canContent && editableEvents.length > 0 ? (
        <div className={styles.actions}>
          {editableEvents.map((event) => (
            <form action={removeEventAction} key={event.id}>
              {hidden("businessId", businessId)}
              {hidden("eventId", event.id)}
              <button className={`button ${styles.danger}`} type="submit">
                {t("ops.common.removeNamed", { name: event.title })}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
