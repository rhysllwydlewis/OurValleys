import Link from "next/link";
import { listBusinessEvents } from "@/modules/businesses/content-features";
import {
  cancelEventSeriesAction,
  removeEventAction,
  saveEventAction,
} from "../actions";
import styles from "../operations.module.css";
import { dateInput, hidden } from "./shared";

export async function EventsSection({
  businessId,
  canContent,
}: {
  businessId: string;
  canContent: boolean;
}) {
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

  return (
    <section
      className={styles.section}
      id="events"
      aria-labelledby="events-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">One event, multiple surfaces</p>
          <h2 id="events-title">Events</h2>
        </div>
        <Link href="/events">Open public events</Link>
      </div>
      {removedEvents.length > 0 ? (
        <p role="status" className={styles.notice}>
          {removedEvents.length === 1
            ? `A moderator removed "${removedEvents[0]?.title}" from public view. It can no longer be edited or deleted.`
            : `A moderator removed ${removedEvents.length} events from public view (${removedEvents.map((event) => `"${event.title}"`).join(", ")}). They can no longer be edited or deleted.`}
        </p>
      ) : null}
      <div className={styles.grid}>
        {editableEvents.map((event) => (
          <form className={styles.card} action={saveEventAction} key={event.id}>
            {hidden("businessId", businessId)}
            {hidden("eventId", event.id)}
            <div className={styles.field}>
              <label htmlFor={`event-title-${event.id}`}>Title</label>
              <input
                id={`event-title-${event.id}`}
                name="title"
                defaultValue={event.title}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`event-description-${event.id}`}>
                Description
              </label>
              <textarea
                id={`event-description-${event.id}`}
                name="description"
                defaultValue={event.description}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`event-start-${event.id}`}>Starts</label>
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
              <label htmlFor={`event-end-${event.id}`}>Ends</label>
              <input
                id={`event-end-${event.id}`}
                name="endsAt"
                type="datetime-local"
                defaultValue={dateInput(event.endsAt)}
                disabled={!canContent}
              />
            </div>
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
              defaultValue={event.status}
              disabled={!canContent}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
              <option value="hidden">Hidden</option>
            </select>
            {canContent ? (
              <button className="button primary" type="submit">
                Save event
              </button>
            ) : null}
          </form>
        ))}
        {canContent ? (
          <form className={styles.card} action={saveEventAction}>
            {hidden("businessId", businessId)}
            <h3>Add an event</h3>
            <div className={styles.field}>
              <label htmlFor="event-new-title">Title</label>
              <input id="event-new-title" name="title" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-description">Description</label>
              <textarea
                id="event-new-description"
                name="description"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-start">Starts</label>
              <input
                id="event-new-start"
                name="startsAt"
                type="datetime-local"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-end">Ends</label>
              <input id="event-new-end" name="endsAt" type="datetime-local" />
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-repeat">Repeats</label>
              <select
                id="event-new-repeat"
                name="repeatFrequency"
                defaultValue="never"
                aria-describedby="event-new-repeat-hint"
              >
                <option value="never">Does not repeat</option>
                <option value="weekly">Every week</option>
                <option value="fortnightly">Every two weeks</option>
                <option value="monthly">Every month (same weekday)</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="event-new-occurrences">
                Number of occurrences
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
                Used only when the event repeats, up to 26 including the first.
                Each date becomes its own event you can edit or cancel
                separately.
              </p>
            </div>
            <input type="hidden" name="locationDisplay" value="" />
            <input type="hidden" name="bookingUrl" value="" />
            <select name="status" defaultValue="draft">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
            <button className="button primary" type="submit">
              Add event
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
                    Cancel {series.count} upcoming{" "}
                    {series.count === 1 ? "date" : "dates"} of {series.title}
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
                Remove {event.title}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
