"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  assessWelshGuide,
  type TranslatableGuide,
  type WelshGuideFields,
} from "@/modules/guides/welsh";
import styles from "../admin.module.css";
import { deleteGuideWelshAction, saveGuideWelshAction } from "./actions";
import studio from "./guide-studio.module.css";
import welshStyles from "./welsh-editor.module.css";

export type WelshEditorGuide = TranslatableGuide & {
  id: string;
  slug: string;
  status: string;
  /** ISO time of the English guide's last edit, as loaded. */
  updatedAt: string;
};

type Feedback = { tone: "ok" | "error"; message: string };

type EnglishFieldProps = {
  id: string;
  label: string;
  text: string;
};

function EnglishField({ id, label, text }: EnglishFieldProps) {
  return (
    <div className={welshStyles.english}>
      <span className={welshStyles.englishLabel} id={id}>
        {label} (English)
      </span>
      <p
        className={`${welshStyles.englishText} ${text ? "" : welshStyles.empty}`}
        lang="en-GB"
        aria-labelledby={id}
      >
        {text || "Not set in the English guide."}
      </p>
    </div>
  );
}

export function WelshEditor({
  guide,
  initial,
  welshUpdatedAt,
  englishChangedSince,
}: {
  guide: WelshEditorGuide;
  initial: WelshGuideFields;
  welshUpdatedAt: string | null;
  englishChangedSince: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<WelshGuideFields>(initial);
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const [loadedAt, setLoadedAt] = useState<string | null>(welshUpdatedAt);
  const [changedSince, setChangedSince] = useState(englishChangedSince);
  const [pending, setPending] = useState<"save" | "remove" | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [stale, setStale] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const dirty = JSON.stringify(form) !== saved;
  const progress = useMemo(() => assessWelshGuide(guide, form), [guide, form]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function say(next: Feedback) {
    setFeedback(next);
    queueMicrotask(() => feedbackRef.current?.focus());
  }

  function setField<K extends Exclude<keyof WelshGuideFields, "sections">>(
    key: K,
    value: string,
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setSection(
    id: string,
    key: "heading" | "body" | "linkLabel",
    value: string,
  ) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === id ? { ...section, [key]: value } : section,
      ),
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending("save");
    try {
      const result = await saveGuideWelshAction({
        guideId: guide.id,
        expectedUpdatedAt: loadedAt,
        englishUpdatedAt: guide.updatedAt,
        fields: form,
      });
      if (result.status === "saved") {
        setSaved(JSON.stringify(form));
        setLoadedAt(result.updatedAt);
        setChangedSince(false);
        setStale(false);
        say({
          tone: "ok",
          message: result.progress.complete
            ? "Welsh version saved. It is complete, so Welsh readers now see it."
            : `Welsh version saved. ${result.progress.done} of ${result.progress.total} fields are done; Welsh readers keep seeing the English guide until every field is filled.`,
        });
      } else if (result.status === "conflict") {
        setStale(true);
        say({
          tone: "error",
          message:
            "Someone else saved the Welsh version since you opened it. Reload to see their changes; your text stays here until you do.",
        });
      } else if (result.status === "english_changed") {
        setStale(true);
        say({
          tone: "error",
          message:
            "The English guide was edited since you opened this page, so the sections may have changed. Reload to continue; your text stays here until you do.",
        });
      } else if (result.status === "invalid") {
        say({
          tone: "error",
          message: result.issues.join(" ") || "Check the Welsh text.",
        });
      } else if (result.status === "not_found") {
        say({ tone: "error", message: "This guide no longer exists." });
      } else if (result.status === "forbidden") {
        say({
          tone: "error",
          message: "You do not have permission to do that.",
        });
      } else {
        say({ tone: "error", message: "Could not save. Try again shortly." });
      }
    } finally {
      setPending(null);
    }
  }

  async function remove() {
    setPending("remove");
    try {
      const result = await deleteGuideWelshAction({ id: guide.id });
      if (result === "deleted" || result === "not_found") {
        setSaved(JSON.stringify(form));
        router.push(`/admin/guides/${guide.id}`);
        router.refresh();
      } else {
        setConfirmRemove(false);
        say({
          tone: "error",
          message:
            result === "forbidden"
              ? "You do not have permission to do that."
              : "Could not remove the Welsh version. Try again shortly.",
        });
      }
    } finally {
      setPending(null);
    }
  }

  const pct = progress.total
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className={studio.studio}>
      <div className={studio.topBar}>
        <div>
          <p className={styles.eyebrow}>
            <Link href="/admin/guides">Guides</Link> /{" "}
            <Link href={`/admin/guides/${guide.id}`}>Edit</Link> / Welsh
          </p>
          <h2 className={studio.heading}>Welsh version</h2>
        </div>
        <div className={studio.statusRow}>
          <span
            className={`${styles.pill} ${
              progress.complete ? styles.toneSuccess : styles.toneWarning
            }`}
          >
            {progress.complete
              ? "Complete: shown to Welsh readers"
              : `${progress.done} of ${progress.total} done`}
          </span>
          {dirty ? <span className={studio.dirty}>Unsaved changes</span> : null}
        </div>
      </div>

      {changedSince ? (
        <p className={welshStyles.notice} role="note">
          The English guide was edited after this Welsh version was last saved.
          Read the English again and update the Welsh where it no longer
          matches.
        </p>
      ) : null}

      <form className={studio.layout} onSubmit={save} noValidate>
        <div className={studio.main}>
          <fieldset className={studio.fieldset}>
            <legend>About the guide</legend>
            <div className={welshStyles.pair}>
              <EnglishField id="en-title" label="Title" text={guide.title} />
              <div className={studio.field}>
                <label htmlFor="cy-title">Title (Cymraeg)</label>
                <input
                  id="cy-title"
                  lang="cy"
                  value={form.title}
                  maxLength={160}
                  onChange={(event) => setField("title", event.target.value)}
                />
              </div>
            </div>
            <div className={welshStyles.pair}>
              <EnglishField
                id="en-summary"
                label="Summary"
                text={guide.summary}
              />
              <div className={studio.field}>
                <label htmlFor="cy-summary">Summary (Cymraeg)</label>
                <textarea
                  id="cy-summary"
                  lang="cy"
                  value={form.summary}
                  rows={4}
                  maxLength={500}
                  onChange={(event) => setField("summary", event.target.value)}
                />
                <p className={studio.hint}>{form.summary.length}/500</p>
              </div>
            </div>
            <div className={welshStyles.pair}>
              <EnglishField id="en-area" label="Area" text={guide.areaLabel} />
              <div className={studio.field}>
                <label htmlFor="cy-area">Area (Cymraeg)</label>
                <input
                  id="cy-area"
                  lang="cy"
                  value={form.areaLabel}
                  maxLength={120}
                  onChange={(event) =>
                    setField("areaLabel", event.target.value)
                  }
                />
              </div>
            </div>
            <div className={welshStyles.pair}>
              <EnglishField
                id="en-reading"
                label="Reading time"
                text={guide.readingTime}
              />
              <div className={studio.field}>
                <label htmlFor="cy-reading">Reading time (Cymraeg)</label>
                <input
                  id="cy-reading"
                  lang="cy"
                  value={form.readingTime}
                  maxLength={60}
                  onChange={(event) =>
                    setField("readingTime", event.target.value)
                  }
                />
              </div>
            </div>
            {guide.sponsorshipDisclosure ? (
              <div className={welshStyles.pair}>
                <EnglishField
                  id="en-disclosure"
                  label="Sponsorship disclosure"
                  text={guide.sponsorshipDisclosure}
                />
                <div className={studio.field}>
                  <label htmlFor="cy-disclosure">
                    Sponsorship disclosure (Cymraeg)
                  </label>
                  <textarea
                    id="cy-disclosure"
                    lang="cy"
                    value={form.sponsorshipDisclosure}
                    rows={3}
                    maxLength={300}
                    onChange={(event) =>
                      setField("sponsorshipDisclosure", event.target.value)
                    }
                  />
                  <p className={studio.hint}>
                    A sponsored guide must say so in Welsh too.
                  </p>
                </div>
              </div>
            ) : null}
          </fieldset>

          {guide.sections.map((section, index) => {
            const welsh = form.sections.find((item) => item.id === section.id);
            const prefix = `s-${section.id}`;
            return (
              <fieldset className={studio.fieldset} key={section.id}>
                <legend>
                  Section {index + 1}
                  {section.kind === "tip" ? " (local tip)" : ""}
                </legend>
                <div className={welshStyles.pair}>
                  <EnglishField
                    id={`en-${prefix}-heading`}
                    label="Heading"
                    text={section.heading}
                  />
                  <div className={studio.field}>
                    <label htmlFor={`cy-${prefix}-heading`}>
                      Heading (Cymraeg)
                    </label>
                    <input
                      id={`cy-${prefix}-heading`}
                      lang="cy"
                      value={welsh?.heading ?? ""}
                      maxLength={120}
                      onChange={(event) =>
                        setSection(section.id, "heading", event.target.value)
                      }
                    />
                  </div>
                </div>
                <div className={welshStyles.pair}>
                  <EnglishField
                    id={`en-${prefix}-body`}
                    label="Text"
                    text={section.body}
                  />
                  <div className={studio.field}>
                    <label htmlFor={`cy-${prefix}-body`}>Text (Cymraeg)</label>
                    <textarea
                      id={`cy-${prefix}-body`}
                      lang="cy"
                      value={welsh?.body ?? ""}
                      rows={8}
                      maxLength={2000}
                      onChange={(event) =>
                        setSection(section.id, "body", event.target.value)
                      }
                    />
                    <p className={studio.hint}>
                      {(welsh?.body ?? "").length}/2000. A blank line starts a
                      new paragraph.
                    </p>
                  </div>
                </div>
                {section.href && section.linkLabel ? (
                  <div className={welshStyles.pair}>
                    <EnglishField
                      id={`en-${prefix}-link`}
                      label={`Link wording (to ${section.href})`}
                      text={section.linkLabel}
                    />
                    <div className={studio.field}>
                      <label htmlFor={`cy-${prefix}-link`}>
                        Link wording (Cymraeg)
                      </label>
                      <input
                        id={`cy-${prefix}-link`}
                        lang="cy"
                        value={welsh?.linkLabel ?? ""}
                        maxLength={100}
                        onChange={(event) =>
                          setSection(
                            section.id,
                            "linkLabel",
                            event.target.value,
                          )
                        }
                      />
                      <p className={studio.hint}>
                        The link itself is shared with the English guide.
                      </p>
                    </div>
                  </div>
                ) : null}
              </fieldset>
            );
          })}

          <div
            ref={feedbackRef}
            tabIndex={-1}
            className={studio.feedbackSlot}
            role={feedback?.tone === "error" ? "alert" : "status"}
          >
            {feedback ? (
              <div
                className={
                  feedback.tone === "ok"
                    ? styles.feedback
                    : styles.feedbackError
                }
              >
                {feedback.message}
                {stale ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      className={studio.linkButton}
                      onClick={() => {
                        setSaved(JSON.stringify(form));
                        window.location.reload();
                      }}
                    >
                      Reload now
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className={studio.saveBar}>
            <button
              className="button primary"
              type="submit"
              disabled={pending !== null || !dirty}
            >
              {pending === "save" ? "Saving…" : "Save Welsh version"}
            </button>
            {loadedAt ? (
              confirmRemove ? (
                <span className={studio.confirm}>
                  <button
                    className={`button ${studio.danger}`}
                    type="button"
                    disabled={pending !== null}
                    onClick={remove}
                  >
                    Yes, remove the Welsh version
                  </button>
                  <button
                    className="button"
                    type="button"
                    onClick={() => setConfirmRemove(false)}
                  >
                    Keep it
                  </button>
                </span>
              ) : (
                <button
                  className={`button ${studio.danger}`}
                  type="button"
                  disabled={pending !== null}
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove Welsh version
                </button>
              )
            ) : null}
          </div>
        </div>

        <aside className={studio.side} aria-label="Welsh progress">
          <div className={`${studio.sideCard} ov-glass`}>
            <h3>Progress</h3>
            <progress
              className={welshStyles.meter}
              value={progress.done}
              max={Math.max(progress.total, 1)}
              aria-label="Welsh fields completed"
            />
            <p className={studio.sideLead}>
              {progress.done} of {progress.total} fields ({pct}%).
            </p>
            {progress.complete ? (
              <p className={welshStyles.done}>
                Every field is filled. Once saved, Welsh readers see this
                version on the guide page, the guides list, place pages and the
                homepage.
              </p>
            ) : (
              <>
                <p className={studio.sideLead}>
                  Welsh readers see the English guide until every field below is
                  filled, so a page is never half English and half Welsh.
                </p>
                <ul className={welshStyles.missingList}>
                  {progress.missing.map((field) => (
                    <li key={field.key} className={welshStyles.todo}>
                      {field.label}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <h4>Good to know</h4>
            <p className={studio.sideLead}>
              {guide.status === "published"
                ? "The English guide is published. "
                : "The English guide is not published yet, so nobody sees either version. "}
              Links, section order and the publishing checks follow the English
              guide.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
