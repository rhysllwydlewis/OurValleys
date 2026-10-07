import type { ReactNode } from "react";
import styles from "../operations.module.css";

export function formatDate(value: Date | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export function dateInput(value: Date | null): string {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function hidden(name: string, value: string) {
  return <input type="hidden" name={name} value={value} />;
}

/** Placeholder shown while a streamed section loads; keeps the anchor id. */
export function SectionSkeleton({
  id,
  title,
}: {
  id: string;
  title: string;
}): ReactNode {
  return (
    <section
      className={styles.section}
      id={id}
      aria-labelledby={`${id}-title`}
      aria-busy="true"
    >
      <div className={styles.sectionHeading}>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <p className={styles.empty}>Loading…</p>
    </section>
  );
}
