"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { PlaceProfileSection } from "@/components/places/place-profile";
import {
  createTranslator,
  type MessageKey,
  type Translator,
} from "@/lib/i18n/translator";
import {
  PLACE_ABOUT_MAX,
  PLACE_FACTS_MAX,
  PLACE_FACT_LABEL_MAX,
  PLACE_FACT_VALUE_MAX,
  PLACE_SUMMARY_MAX,
  profileCompleteness,
  resolvePlaceProfile,
  type PlaceFact,
  type PlaceProfile,
} from "@/modules/reference-data/place-profile-model";
import { savePlaceProfileAction } from "../actions";
import adminStyles from "../../admin.module.css";
import styles from "./place-profile-editor.module.css";

type Messages = Partial<Record<MessageKey, string>>;

type Props = {
  place: {
    id: string;
    canonicalName: string;
    welshName: string | null;
    slug: string;
    editorialSummary: string;
    status: string;
  };
  initial: PlaceProfile;
  updatedAt: string | null;
  messages: { en: Messages; cy: Messages };
};

const blankFact: PlaceFact = { label: "", labelCy: "", value: "", valueCy: "" };

const FACT_SUGGESTIONS = [
  "Market day",
  "Parking",
  "Getting there",
  "Local landmark",
  "Annual event",
  "Good for",
];

function Counter({ value, max }: { value: string; max: number }) {
  const near = value.length > max * 0.9;
  return (
    <span className={near ? styles.counterNear : styles.counter}>
      {value.length}/{max}
    </span>
  );
}

export function PlaceProfileEditor({
  place,
  initial,
  updatedAt,
  messages,
}: Props) {
  const router = useRouter();
  const [welshSummary, setWelshSummary] = useState(initial.welshSummary ?? "");
  const [about, setAbout] = useState(initial.about ?? "");
  const [aboutCy, setAboutCy] = useState(initial.aboutCy ?? "");
  const [facts, setFacts] = useState<PlaceFact[]>(initial.facts);
  const [previewLang, setPreviewLang] = useState<"en" | "cy">("en");
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);
  const [saved, setSaved] = useState(updatedAt);

  const draft = useMemo<PlaceProfile>(
    () => ({
      welshSummary: welshSummary.trim() || null,
      about: about.trim() || null,
      aboutCy: aboutCy.trim() || null,
      facts: facts.filter((fact) => fact.label.trim() && fact.value.trim()),
    }),
    [welshSummary, about, aboutCy, facts],
  );
  const completeness = profileCompleteness(draft);
  const welshPreview = previewLang === "cy";
  const translator: Translator = useMemo(
    () => createTranslator(messages[previewLang]),
    [messages, previewLang],
  );
  const view = resolvePlaceProfile(place.editorialSummary, draft, welshPreview);
  const previewName = (welshPreview && place.welshName) || place.canonicalName;

  function updateFact(index: number, patch: Partial<PlaceFact>) {
    setFacts((current) =>
      current.map((fact, i) => (i === index ? { ...fact, ...patch } : fact)),
    );
  }

  function moveFact(index: number, direction: -1 | 1) {
    setFacts((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback(null);
    try {
      const result = await savePlaceProfileAction({
        placeId: place.id,
        welshSummary,
        about,
        aboutCy,
        // Drop only fully blank rows; a row with any text is sent so the
        // server can say what is missing instead of silently losing it.
        facts: facts.filter(
          (fact) =>
            fact.label.trim() ||
            fact.labelCy.trim() ||
            fact.value.trim() ||
            fact.valueCy.trim(),
        ),
      });
      if (result.status === "saved") {
        setSaved(new Date().toISOString());
        setFeedback({ kind: "ok", text: "Profile saved and live." });
        router.refresh();
      } else if (result.status === "forbidden") {
        setFeedback({ kind: "error", text: "You can’t edit place profiles." });
      } else if (result.status === "invalid") {
        setFeedback({
          kind: "error",
          text: "Some text is too long, or a fact is missing its label or value.",
        });
      } else if (result.status === "not_found") {
        setFeedback({ kind: "error", text: "That place no longer exists." });
      } else {
        setFeedback({
          kind: "error",
          text: "Could not save just now. Try again shortly.",
        });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.layout}>
      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <header className={styles.heading}>
          <p className={adminStyles.hint}>Place profile</p>
          <h2>{place.canonicalName}</h2>
          <p className={adminStyles.hint}>
            Public copy shown on{" "}
            <a className="text-link" href={`/places/${place.slug}`}>
              /places/{place.slug}
            </a>
            {place.status !== "active"
              ? " (this place is inactive, so the page is not public)"
              : null}
            . Plain text only; leave a field blank to hide it.
          </p>
        </header>

        <fieldset className={styles.group}>
          <legend>Summary</legend>
          <p className={styles.help}>
            English summary (edited under Places): {place.editorialSummary}
          </p>
          <label htmlFor="pp-welsh-summary">Welsh summary</label>
          <textarea
            id="pp-welsh-summary"
            lang="cy"
            rows={3}
            maxLength={PLACE_SUMMARY_MAX}
            value={welshSummary}
            onChange={(event) => setWelshSummary(event.target.value)}
          />
          <Counter value={welshSummary} max={PLACE_SUMMARY_MAX} />
        </fieldset>

        <fieldset className={styles.group}>
          <legend>About the place</legend>
          <p className={styles.help}>
            Two or three short paragraphs: character, history, what people come
            for. Separate paragraphs with a blank line. Don’t state facts you
            cannot source.
          </p>
          <label htmlFor="pp-about">About (English)</label>
          <textarea
            id="pp-about"
            rows={8}
            maxLength={PLACE_ABOUT_MAX}
            value={about}
            onChange={(event) => setAbout(event.target.value)}
          />
          <Counter value={about} max={PLACE_ABOUT_MAX} />
          <label htmlFor="pp-about-cy">About (Welsh)</label>
          <textarea
            id="pp-about-cy"
            lang="cy"
            rows={8}
            maxLength={PLACE_ABOUT_MAX}
            value={aboutCy}
            onChange={(event) => setAboutCy(event.target.value)}
          />
          <Counter value={aboutCy} max={PLACE_ABOUT_MAX} />
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Good to know</legend>
          <p className={styles.help}>
            Up to {PLACE_FACTS_MAX} short facts, for example a market day or
            where to park. Welsh wording is optional per fact; Welsh readers see
            English where it is missing.
          </p>
          {facts.length === 0 ? (
            <p className={styles.empty}>No facts yet.</p>
          ) : null}
          <ol className={styles.factList}>
            {facts.map((fact, index) => (
              <li key={index} className={styles.fact}>
                <div className={styles.factGrid}>
                  <div>
                    <label htmlFor={`pp-fact-label-${index}`}>
                      Label {index + 1}
                    </label>
                    <input
                      id={`pp-fact-label-${index}`}
                      list="pp-fact-suggestions"
                      maxLength={PLACE_FACT_LABEL_MAX}
                      value={fact.label}
                      onChange={(event) =>
                        updateFact(index, { label: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`pp-fact-label-cy-${index}`}>
                      Label {index + 1} (Welsh)
                    </label>
                    <input
                      id={`pp-fact-label-cy-${index}`}
                      lang="cy"
                      maxLength={PLACE_FACT_LABEL_MAX}
                      value={fact.labelCy}
                      onChange={(event) =>
                        updateFact(index, { labelCy: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`pp-fact-value-${index}`}>
                      Detail {index + 1}
                    </label>
                    <input
                      id={`pp-fact-value-${index}`}
                      maxLength={PLACE_FACT_VALUE_MAX}
                      value={fact.value}
                      onChange={(event) =>
                        updateFact(index, { value: event.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor={`pp-fact-value-cy-${index}`}>
                      Detail {index + 1} (Welsh)
                    </label>
                    <input
                      id={`pp-fact-value-cy-${index}`}
                      lang="cy"
                      maxLength={PLACE_FACT_VALUE_MAX}
                      value={fact.valueCy}
                      onChange={(event) =>
                        updateFact(index, { valueCy: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div className={styles.factActions}>
                  <button
                    type="button"
                    className="button"
                    onClick={() => moveFact(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move fact ${index + 1} up`}
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    className="button"
                    onClick={() => moveFact(index, 1)}
                    disabled={index === facts.length - 1}
                    aria-label={`Move fact ${index + 1} down`}
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    className={`button ${adminStyles.buttonDanger}`}
                    onClick={() =>
                      setFacts((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    aria-label={`Remove fact ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ol>
          <datalist id="pp-fact-suggestions">
            {FACT_SUGGESTIONS.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
          <div>
            <button
              type="button"
              className="button"
              disabled={facts.length >= PLACE_FACTS_MAX}
              onClick={() => setFacts((current) => [...current, blankFact])}
            >
              Add a fact
            </button>
          </div>
        </fieldset>

        <div aria-live="polite" role="status" className={styles.status}>
          {feedback ? (
            <p
              className={
                feedback.kind === "ok"
                  ? styles.feedbackOk
                  : adminStyles.feedbackError
              }
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
        <div className={adminStyles.actionsRow}>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </button>
          {saved ? (
            <span className={styles.savedAt}>
              Last saved{" "}
              {new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/London",
              }).format(new Date(saved))}
            </span>
          ) : null}
        </div>
      </form>

      <aside className={styles.side} aria-label="Preview and checklist">
        <section className={styles.panel} aria-labelledby="pp-check-title">
          <h3 id="pp-check-title">Completeness</h3>
          <p>
            <strong>
              {completeness.done} of {completeness.total}
            </strong>{" "}
            done
          </p>
          <progress
            value={completeness.done}
            max={completeness.total}
            aria-label="Profile completeness"
          />
          {completeness.missing.length > 0 ? (
            <ul>
              {completeness.missing.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>
              Everything is filled in. Have the Welsh read by a fluent speaker.
            </p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="pp-preview-title">
          <div className={styles.previewHead}>
            <h3 id="pp-preview-title">Preview</h3>
            <div role="group" aria-label="Preview language">
              <button
                type="button"
                className="button"
                aria-pressed={previewLang === "en"}
                onClick={() => setPreviewLang("en")}
              >
                English
              </button>
              <button
                type="button"
                className="button"
                aria-pressed={previewLang === "cy"}
                onClick={() => setPreviewLang("cy")}
              >
                Cymraeg
              </button>
            </div>
          </div>
          <p className={styles.previewSummary} lang={view.summaryLang}>
            {view.summary}
          </p>
          {view.hasProfile ? (
            <div className={styles.previewBody} data-testid="profile-preview">
              <PlaceProfileSection
                t={translator}
                lang={previewLang}
                welsh={welshPreview}
                placeName={previewName}
                view={view}
              />
            </div>
          ) : (
            <p className={styles.empty}>
              Nothing to show yet: the place page shows only its summary.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
