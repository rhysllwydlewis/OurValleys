import styles from "./places.module.css";

/** A row of headline numbers; the label is the term, the number its value. */
export function PlaceStats({
  label,
  items,
}: {
  label: string;
  items: { label: string; value: number }[];
}) {
  return (
    <dl className={styles.stats} aria-label={label}>
      {items.map((item) => (
        <div className={styles.stat} key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value.toLocaleString("en-GB")}</dd>
        </div>
      ))}
    </dl>
  );
}
