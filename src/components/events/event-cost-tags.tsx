import type { Translator } from "@/lib/i18n/translate";
import styles from "./events.module.css";
import { eventCostTags, type EventCostFields } from "@/modules/events/cost";

/**
 * Cost and access tags for one event. Renders nothing when the organiser did
 * not say anything. The price note is owner-typed text, so it carries its own
 * language tag; the fixed labels follow the page language.
 */
export function EventCostTags({
  t,
  event,
}: {
  t: Translator;
  event: EventCostFields;
}) {
  const tags = eventCostTags(event);
  if (tags.length === 0) return null;
  return (
    <ul
      className={`tag-row ${styles.costTags}`}
      aria-label={t("eventsCost.filterGroup")}
    >
      {tags.map((tag) => (
        <li key={tag.kind} className="tag" data-event-cost={tag.kind}>
          {tag.kind === "free" ? t("eventsCost.free") : null}
          {tag.kind === "paid" ? (
            tag.note ? (
              <span lang="en-GB">{tag.note}</span>
            ) : (
              t("eventsCost.paid")
            )
          ) : null}
          {tag.kind === "stepFree" ? t("eventsCost.stepFree") : null}
          {tag.kind === "notStepFree" ? t("eventsCost.notStepFree") : null}
        </li>
      ))}
    </ul>
  );
}
