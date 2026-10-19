"use client";

import { useState } from "react";
import {
  GUIDE_SECTION_LIMIT,
  type GuideSectionKind,
} from "@/modules/guides/shared";
import { guideLinkSuggestions } from "@/modules/guides/guide-model";
import styles from "./guide-studio.module.css";

export type EditableSection = {
  id: string;
  kind: GuideSectionKind;
  heading: string;
  body: string;
  href: string;
  linkLabel: string;
};

export function SectionEditor({
  sections,
  onChange,
  onAnnounce,
  onAdd,
}: {
  sections: EditableSection[];
  onChange: (next: EditableSection[]) => void;
  onAnnounce: (message: string) => void;
  onAdd: (kind: GuideSectionKind) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function update(id: string, patch: Partial<EditableSection>) {
    onChange(
      sections.map((section) =>
        section.id === id ? { ...section, ...patch } : section,
      ),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    if (!moved) return;
    next.splice(target, 0, moved);
    onChange(next);
    onAnnounce(
      `“${moved.heading || "Untitled section"}” moved to position ${target + 1} of ${sections.length}.`,
    );
  }

  function remove(id: string) {
    const removed = sections.find((section) => section.id === id);
    onChange(sections.filter((section) => section.id !== id));
    setConfirmingId(null);
    onAnnounce(`Removed “${removed?.heading || "Untitled section"}”.`);
  }

  return (
    <div className={styles.sections}>
      <datalist id="guide-link-suggestions">
        {guideLinkSuggestions.map((path) => (
          <option key={path} value={path} />
        ))}
      </datalist>
      <ol className={styles.sectionList}>
        {sections.map((section, index) => {
          const name = section.heading || `Section ${index + 1}`;
          const field = (suffix: string) => `section-${section.id}-${suffix}`;
          return (
            <li
              key={section.id}
              className={`${styles.sectionCard} ${section.kind === "tip" ? styles.sectionTip : ""}`}
              aria-label={`Section ${index + 1}: ${name}`}
            >
              <div className={styles.sectionHead}>
                <span className={styles.sectionNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <div className={styles.sectionKind}>
                  <label htmlFor={field("kind")}>Type</label>
                  <select
                    id={field("kind")}
                    value={section.kind}
                    onChange={(event) =>
                      update(section.id, {
                        kind: event.target.value as GuideSectionKind,
                      })
                    }
                  >
                    <option value="text">Section</option>
                    <option value="tip">Local tip</option>
                  </select>
                </div>
                <div className={styles.sectionTools}>
                  <button
                    className="button"
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move “${name}” up`}
                  >
                    <span aria-hidden="true">↑</span> Up
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === sections.length - 1}
                    aria-label={`Move “${name}” down`}
                  >
                    <span aria-hidden="true">↓</span> Down
                  </button>
                  {confirmingId === section.id ? (
                    <span
                      className={styles.confirm}
                      role="group"
                      aria-label={`Remove “${name}”?`}
                    >
                      <button
                        className={`button ${styles.danger}`}
                        type="button"
                        onClick={() => remove(section.id)}
                      >
                        Yes, remove
                      </button>
                      <button
                        className="button"
                        type="button"
                        onClick={() => setConfirmingId(null)}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      className={`button ${styles.danger}`}
                      type="button"
                      onClick={() => setConfirmingId(section.id)}
                      disabled={sections.length === 1}
                      aria-label={`Remove “${name}”`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor={field("heading")}>Heading</label>
                <input
                  id={field("heading")}
                  value={section.heading}
                  maxLength={120}
                  onChange={(event) =>
                    update(section.id, { heading: event.target.value })
                  }
                />
              </div>
              <div className={styles.field}>
                <label htmlFor={field("body")}>Text</label>
                <textarea
                  id={field("body")}
                  value={section.body}
                  maxLength={2000}
                  rows={6}
                  aria-describedby={field("body-hint")}
                  onChange={(event) =>
                    update(section.id, { body: event.target.value })
                  }
                />
                <p className={styles.hint} id={field("body-hint")}>
                  A blank line starts a new paragraph. {section.body.length}
                  /2000
                </p>
              </div>
              <div className={styles.linkRow}>
                <div className={styles.field}>
                  <label htmlFor={field("href")}>
                    Link to a page on this site (optional)
                  </label>
                  <input
                    id={field("href")}
                    value={section.href}
                    list="guide-link-suggestions"
                    placeholder="/businesses?q=coffee"
                    maxLength={300}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) =>
                      update(section.id, { href: event.target.value })
                    }
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={field("label")}>Link wording</label>
                  <input
                    id={field("label")}
                    value={section.linkLabel}
                    maxLength={100}
                    placeholder="Search coffee businesses"
                    onChange={(event) =>
                      update(section.id, { linkLabel: event.target.value })
                    }
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className={styles.addRow}>
        <button
          className="button"
          type="button"
          onClick={() => onAdd("text")}
          disabled={sections.length >= GUIDE_SECTION_LIMIT}
        >
          Add a section
        </button>
        <button
          className="button"
          type="button"
          onClick={() => onAdd("tip")}
          disabled={sections.length >= GUIDE_SECTION_LIMIT}
        >
          Add a local tip
        </button>
        <span className={styles.hint}>
          {sections.length} of {GUIDE_SECTION_LIMIT} sections
        </span>
      </div>
    </div>
  );
}
