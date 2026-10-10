"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./designer.module.css";

export type DesignerSection = {
  id: string;
  label: string;
  /** Translated "Show {section}" text. */
  showLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  layouts: ReadonlyArray<{ key: string; name: string }>;
  /** The owner's current words, per field and language. */
  copy: {
    heading: { en: string; cy: string };
    intro: { en: string; cy: string };
  };
};

export type DesignerSectionText = {
  layout: string;
  /** "{section} moved to position {position} of {total}." */
  moved: string;
  copySummary: string;
  copyHint: string;
  headingEn: string;
  headingCy: string;
  introEn: string;
  introCy: string;
  standardWording: string;
  /** "{used} of {max} characters" */
  count: string;
  limits: { heading: number; intro: number };
};

/** A text box with a quiet running count against its limit. */
function CountedField({
  name,
  label,
  initial,
  max,
  multiline,
  disabled,
  placeholder,
  countText,
  lang,
}: {
  name: string;
  label: string;
  initial: string;
  max: number;
  multiline: boolean;
  disabled: boolean;
  placeholder: string;
  countText: string;
  lang: string;
}) {
  const [length, setLength] = useState(initial.length);
  const shared = {
    name,
    defaultValue: initial,
    maxLength: max,
    disabled,
    placeholder,
    lang,
    onInput: (event: { currentTarget: { value: string } }) =>
      setLength(event.currentTarget.value.length),
  };
  return (
    <label className={styles.copyField}>
      <span>{label}</span>
      {multiline ? (
        <textarea rows={3} {...shared} />
      ) : (
        <input type="text" {...shared} />
      )}
      <small className={styles.copyCount}>
        {countText
          .replace("{used}", String(length))
          .replace("{max}", String(max))}
      </small>
    </label>
  );
}

/**
 * One row per section with show/hide, an approved layout and move controls.
 * The rows submit the same `visible-`, `position-` and `layout-` fields the
 * form always has, so saving works the same and the page still saves its
 * current order if scripts are unavailable (only the move buttons need them).
 */
export function SectionRows({
  sections,
  initialOrder,
  hidden,
  layouts,
  disabled,
  text,
}: {
  sections: DesignerSection[];
  initialOrder: string[];
  hidden: string[];
  layouts: Record<string, string>;
  disabled: boolean;
  text: DesignerSectionText;
}) {
  const [order, setOrder] = useState(initialOrder);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const byId = new Map(sections.map((section) => [section.id, section]));

  useEffect(() => {
    // The position fields changed programmatically, which fires no event, so
    // tell the form (and the live preview listening to it) explicitly.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    root.current
      ?.closest("form")
      ?.dispatchEvent(new Event("change", { bubbles: true }));
  }, [order]);

  function move(id: string, direction: -1 | 1) {
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOrder(next);
    setAnnouncement(
      text.moved
        .replace("{section}", byId.get(id)?.label ?? id)
        .replace("{position}", String(target + 1))
        .replace("{total}", String(next.length)),
    );
  }

  return (
    <div ref={root}>
      <ol className={styles.rows}>
        {order.map((id, index) => {
          const section = byId.get(id);
          if (!section) return null;
          return (
            <li className={styles.row} key={id}>
              <input
                type="hidden"
                name={`position-${id}`}
                value={String(index + 1)}
              />
              <span className={styles.rowIndex} aria-hidden="true">
                {index + 1}
              </span>
              <label className={styles.rowShow}>
                <input
                  type="checkbox"
                  name={`visible-${id}`}
                  aria-label={section.showLabel}
                  defaultChecked={!hidden.includes(id)}
                  disabled={disabled}
                />
                <span>
                  <strong>{section.label}</strong>
                </span>
              </label>
              <label className={styles.rowLayout}>
                <span>{text.layout}</span>
                <select
                  name={`layout-${id}`}
                  defaultValue={layouts[id]}
                  disabled={disabled}
                >
                  {section.layouts.map((layout) => (
                    <option key={layout.key} value={layout.key}>
                      {layout.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className={styles.rowMoves}>
                <button
                  type="button"
                  className="button"
                  onClick={() => move(id, -1)}
                  disabled={disabled}
                  aria-disabled={index === 0 || undefined}
                  aria-label={section.moveUpLabel}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="button"
                  onClick={() => move(id, 1)}
                  disabled={disabled}
                  aria-disabled={index === order.length - 1 || undefined}
                  aria-label={section.moveDownLabel}
                >
                  ↓
                </button>
              </span>
              <details className={styles.rowCopy}>
                <summary>{text.copySummary}</summary>
                <p className={styles.copyHint}>{text.copyHint}</p>
                <div className={styles.copyGrid}>
                  <CountedField
                    name={`heading-${id}-en`}
                    label={text.headingEn}
                    initial={section.copy.heading.en}
                    max={text.limits.heading}
                    multiline={false}
                    disabled={disabled}
                    placeholder={text.standardWording}
                    countText={text.count}
                    lang="en-GB"
                  />
                  <CountedField
                    name={`heading-${id}-cy`}
                    label={text.headingCy}
                    initial={section.copy.heading.cy}
                    max={text.limits.heading}
                    multiline={false}
                    disabled={disabled}
                    placeholder={text.standardWording}
                    countText={text.count}
                    lang="cy"
                  />
                  <CountedField
                    name={`intro-${id}-en`}
                    label={text.introEn}
                    initial={section.copy.intro.en}
                    max={text.limits.intro}
                    multiline
                    disabled={disabled}
                    placeholder={text.standardWording}
                    countText={text.count}
                    lang="en-GB"
                  />
                  <CountedField
                    name={`intro-${id}-cy`}
                    label={text.introCy}
                    initial={section.copy.intro.cy}
                    max={text.limits.intro}
                    multiline
                    disabled={disabled}
                    placeholder={text.standardWording}
                    countText={text.count}
                    lang="cy"
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
}
