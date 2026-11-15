"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./designer.module.css";
import { ArrowIcon } from "./designer-icons";

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
  /** Shown beside a section that is switched off. */
  hiddenTag: string;
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
  const moved = useRef<string | null>(null);
  const tops = useRef(new Map<string, number>());
  const byId = new Map(sections.map((section) => [section.id, section]));

  useEffect(() => {
    // The position fields changed programmatically, which fires no event, so
    // tell the form (and the live preview listening to it) explicitly.
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const form = root.current?.closest("form");
    if (!form) return;
    // The preview brings the moved section into view.
    if (moved.current) form.dataset.movedSection = moved.current;
    form.dispatchEvent(new Event("change", { bubbles: true }));
  }, [order]);

  // Rows glide to their new place instead of jumping, so the eye can follow
  // which one moved. Skipped entirely when motion is reduced.
  useLayoutEffect(() => {
    const list = root.current?.querySelector("ol");
    if (!list) return;
    const previous = tops.current;
    const next = new Map<string, number>();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const row of list.children) {
      if (!(row instanceof HTMLElement)) continue;
      const id = row.dataset.section;
      if (!id) continue;
      const top = row.offsetTop;
      next.set(id, top);
      const before = previous.get(id);
      if (still || before === undefined || before === top) continue;
      row.animate(
        [
          { transform: `translateY(${before - top}px)` },
          { transform: "translateY(0)" },
        ],
        { duration: 260, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }
    tops.current = next;
  }, [order]);

  function move(id: string, direction: -1 | 1) {
    const index = order.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    moved.current = id;
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
            <li className={styles.row} key={id} data-section={id}>
              <input
                type="hidden"
                name={`position-${id}`}
                value={String(index + 1)}
              />
              <div className={styles.rowHead}>
                <span className={styles.rowIndex} aria-hidden="true">
                  {index + 1}
                </span>
                <span className={styles.rowName}>
                  <strong>{section.label}</strong>
                  <span className={styles.rowHidden}>{text.hiddenTag}</span>
                </span>
                <input
                  className={styles.switch}
                  type="checkbox"
                  name={`visible-${id}`}
                  aria-label={section.showLabel}
                  defaultChecked={!hidden.includes(id)}
                  disabled={disabled}
                />
                <span className={styles.rowMoves}>
                  <button
                    type="button"
                    onClick={() => move(id, -1)}
                    disabled={disabled}
                    aria-disabled={index === 0 || undefined}
                    aria-label={section.moveUpLabel}
                  >
                    <ArrowIcon direction="up" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(id, 1)}
                    disabled={disabled}
                    aria-disabled={index === order.length - 1 || undefined}
                    aria-label={section.moveDownLabel}
                  >
                    <ArrowIcon direction="down" />
                  </button>
                </span>
              </div>
              <div
                className={styles.rowLayout}
                role="radiogroup"
                aria-label={`${section.label}: ${text.layout}`}
              >
                <span className={styles.rowLayoutLabel} aria-hidden="true">
                  {text.layout}
                </span>
                <span className={styles.layoutOptions}>
                  {section.layouts.map((layout) => (
                    <label key={layout.key} className={styles.layoutOption}>
                      <input
                        type="radio"
                        name={`layout-${id}`}
                        value={layout.key}
                        defaultChecked={layouts[id] === layout.key}
                        disabled={disabled}
                      />
                      <span>{layout.name}</span>
                    </label>
                  ))}
                </span>
              </div>
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
