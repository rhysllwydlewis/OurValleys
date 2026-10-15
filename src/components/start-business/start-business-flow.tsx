"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import {
  createBusinessAction,
  findSimilarBusinessesAction,
} from "@/app/account/new-business/actions";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import type { SimilarBusiness } from "@/modules/businesses/creation";
import {
  foldBusinessName,
  startProgress,
  starterPreview,
} from "@/modules/businesses/start-journey";
import { StarterPreviewCard } from "./starter-preview";
import styles from "./start-business.module.css";

export type StartCategoryOption = {
  id: string;
  slug: string;
  /** Canonical English name, used to choose the starter design. */
  name: string;
  /** Name in the visitor's language. */
  label: string;
};

export type StartPlaceOption = { id: string; name: string };

type StartBusinessFlowProps = {
  categories: StartCategoryOption[];
  places: StartPlaceOption[];
};

type CheckState = "idle" | "checking" | "done" | "limited" | "error";
type CheckAnswer = {
  key: string;
  state: "done" | "limited" | "error";
  matches: SimilarBusiness[];
};

const reachOptions: ReadonlyArray<{
  value: "premises" | "service_area" | "online";
  title: MessageKey;
  body: MessageKey;
}> = [
  {
    value: "premises",
    title: "startx.reach.premises.title",
    body: "startx.reach.premises.body",
  },
  {
    value: "service_area",
    title: "startx.reach.serviceArea.title",
    body: "startx.reach.serviceArea.body",
  },
  {
    value: "online",
    title: "startx.reach.online.title",
    body: "startx.reach.online.body",
  },
];

const checkDelayMs = 400;
const minimumCheckLength = 3;

export function StartBusinessFlow({
  categories,
  places,
}: StartBusinessFlowProps) {
  const { locale, t } = useLocale();
  const ids = useId();
  const matchesRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [welshName, setWelshName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");
  const [placeId, setPlaceId] = useState("");
  const [businessType, setBusinessType] = useState("");

  const [answer, setAnswer] = useState<CheckAnswer | null>(null);
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorIsEnglish, setErrorIsEnglish] = useState(false);

  const progress = startProgress({ name, categoryId, placeId, businessType });
  const category = categories.find((option) => option.id === categoryId);
  const place = places.find((option) => option.id === placeId);
  const reach = reachOptions.find((option) => option.value === businessType);
  const preview = useMemo(
    () =>
      category
        ? starterPreview(category.name, category.slug, businessType)
        : null,
    [category, businessType],
  );

  // Live duplicate check. The answer is stored with the exact name and place
  // it was asked for, so a stale answer is never shown for what is now typed.
  const trimmedName = name.trim();
  const checkKey = `${trimmedName}|${placeId}`;
  const wantsCheck = trimmedName.length >= minimumCheckLength;
  useEffect(() => {
    if (!wantsCheck) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      let next: CheckAnswer;
      try {
        const result = await findSimilarBusinessesAction({
          name: trimmedName,
          placeId: placeId || null,
        });
        next =
          result.status === "ok"
            ? { key: checkKey, state: "done", matches: result.matches }
            : {
                key: checkKey,
                state: result.status === "limited" ? "limited" : "error",
                matches: [],
              };
      } catch {
        next = { key: checkKey, state: "error", matches: [] };
      }
      if (!cancelled) setAnswer(next);
    }, checkDelayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [wantsCheck, trimmedName, placeId, checkKey]);

  const current =
    wantsCheck && answer && answer.key === checkKey ? answer : null;
  const checkState: CheckState = !wantsCheck
    ? "idle"
    : (current?.state ?? "checking");
  const matches = useMemo(() => current?.matches ?? [], [current]);

  const blockingMatches = matches.some(
    (match) => match.matchKind !== "possible",
  );
  const visibleCategories = useMemo(() => {
    const query = foldBusinessName(categoryQuery);
    if (!query) return categories;
    return categories.filter(
      (option) =>
        option.id === categoryId ||
        foldBusinessName(option.label).includes(query) ||
        foldBusinessName(option.name).includes(query),
    );
  }, [categories, categoryQuery, categoryId]);

  function describeMatch(match: SimilarBusiness): string {
    const parts = [match.placeName, match.categoryName].filter(Boolean);
    return parts.join(" · ");
  }

  function resetDuplicateAnswer() {
    setConfirmedDistinct(false);
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setErrorIsEnglish(false);

    if (blockingMatches && !confirmedDistinct) {
      setErrorMessage(t("startx.match.mustConfirm"));
      matchesRef.current?.scrollIntoView({ block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBusinessAction({
        tradingName: name.trim(),
        welshName: welshName.trim(),
        primaryCategoryId: categoryId,
        placeId,
        businessType,
        confirmedDistinct,
      });

      switch (result.status) {
        case "created":
          window.location.assign(`/dashboard/business/${result.businessId}`);
          return;
        case "matches":
          // The server found a likeness the live check had not shown yet.
          setAnswer({ key: checkKey, state: "done", matches: result.matches });
          setConfirmedDistinct(false);
          setErrorMessage(t("startx.match.mustConfirm"));
          return;
        case "unverified":
          setErrorMessage(t("startx.error.unverified"));
          return;
        case "denied":
          setErrorMessage(t("newBusiness.error.denied"));
          return;
        case "limit":
          setErrorMessage(t("newBusiness.error.limit"));
          return;
        case "invalid":
          setErrorMessage(result.message);
          setErrorIsEnglish(true);
          return;
        default:
          setErrorMessage(t("newBusiness.error.unavailable"));
      }
    } catch {
      setErrorMessage(t("newBusiness.error.unreachable"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const stepClass = (done: boolean) => ({
    className: styles.step,
    "data-done": done ? "true" : "false",
  });

  return (
    <div className={styles.layout}>
      <form
        className={styles.form}
        onSubmit={handleSubmit}
        aria-busy={isSubmitting}
      >
        <div className={styles.progress}>
          <p className={styles.progressText} aria-live="polite">
            {progress.ready
              ? t("startx.progressReady")
              : t("startx.progress", {
                  done: progress.completed,
                  total: progress.total,
                })}
          </p>
          <div className={styles.progressBar} aria-hidden="true">
            <span
              className={styles.progressFill}
              style={{
                width: `${(progress.completed / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>

        <fieldset {...stepClass(progress.done.name)} disabled={isSubmitting}>
          <div className={styles.stepHead}>
            <span className={styles.stepNumber} aria-hidden="true">
              {progress.done.name ? "✓" : "1"}
            </span>
            <div>
              <legend className={styles.stepTitle}>
                {t("startx.step.name.title")}
              </legend>
              <p className={styles.stepHint}>{t("startx.step.name.hint")}</p>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${ids}-name`}>{t("newBusiness.form.name")}</label>
            <input
              id={`${ids}-name`}
              name="tradingName"
              type="text"
              minLength={2}
              maxLength={120}
              required
              autoFocus
              autoComplete="organization"
              value={name}
              aria-describedby={`${ids}-check`}
              onChange={(event) => {
                setName(event.target.value);
                resetDuplicateAnswer();
              }}
            />
          </div>
          <details className={styles.welshDetails} open={welshName !== ""}>
            <summary>{t("startx.welshToggle")}</summary>
            <div className={styles.field}>
              <label htmlFor={`${ids}-welsh`}>
                {t("newBusiness.form.welshName")}
              </label>
              <input
                id={`${ids}-welsh`}
                name="welshName"
                type="text"
                maxLength={120}
                lang="cy"
                value={welshName}
                onChange={(event) => setWelshName(event.target.value)}
              />
            </div>
          </details>

          <div id={`${ids}-check`} ref={matchesRef} aria-live="polite">
            {checkState === "checking" ? (
              <p className={styles.statusLine}>{t("startx.match.checking")}</p>
            ) : null}
            {checkState === "limited" ? (
              <p className={styles.statusLine}>{t("startx.match.limited")}</p>
            ) : null}
            {checkState === "error" ? (
              <p className={styles.statusLine}>{t("startx.match.error")}</p>
            ) : null}
            {checkState === "done" && matches.length === 0 ? (
              <p className={`${styles.statusLine} ${styles.statusOk}`}>
                {t("startx.match.none")}
              </p>
            ) : null}
            {checkState === "done" && matches.length > 0 ? (
              <div className={styles.matches}>
                <h3>{t("startx.match.title")}</h3>
                <p>{t("startx.match.lead")}</p>
                <ul className={styles.matchList}>
                  {matches.map((match) => (
                    <li key={match.id} className={styles.match}>
                      <div>
                        <span className={styles.matchKind}>
                          {t(`startx.match.${match.matchKind}` as MessageKey)}
                        </span>
                        <span
                          className={styles.matchName}
                          lang={authoredTextLang}
                        >
                          {match.tradingName}
                        </span>
                        {describeMatch(match) ? (
                          <div className={styles.matchMeta}>
                            {describeMatch(match)}
                          </div>
                        ) : null}
                      </div>
                      <div className={styles.matchActions}>
                        <Link
                          className={styles.linkButton}
                          href={`/claim/${match.id}`}
                        >
                          {t("startx.match.claim")}
                          <span className="sr-only">
                            {" — "}
                            {match.tradingName}
                          </span>
                        </Link>
                        <Link
                          className={styles.ghostButton}
                          href={`/b/${match.slug}`}
                          target="_blank"
                          rel="noopener"
                        >
                          {t("startx.match.view")}
                          <span className="sr-only">
                            {" — "}
                            {match.tradingName}
                          </span>
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
                {blockingMatches ? (
                  confirmedDistinct ? (
                    <p className={styles.statusOk} role="status">
                      {t("startx.match.confirmed")}
                    </p>
                  ) : (
                    <div>
                      <button
                        type="button"
                        className={styles.ghostButton}
                        onClick={() => setConfirmedDistinct(true)}
                      >
                        {t("startx.match.notMine")}
                      </button>
                    </div>
                  )
                ) : null}
              </div>
            ) : null}
          </div>
        </fieldset>

        <fieldset
          {...stepClass(progress.done.category)}
          disabled={isSubmitting}
        >
          <div className={styles.stepHead}>
            <span className={styles.stepNumber} aria-hidden="true">
              {progress.done.category ? "✓" : "2"}
            </span>
            <div>
              <legend className={styles.stepTitle}>
                {t("startx.step.category.title")}
              </legend>
              <p className={styles.stepHint}>
                {t("startx.step.category.hint")}
              </p>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${ids}-category-filter`}>
              {t("startx.categoryFilter")}
            </label>
            <input
              id={`${ids}-category-filter`}
              type="search"
              value={categoryQuery}
              placeholder={t("startx.categoryFilterPlaceholder")}
              onChange={(event) => setCategoryQuery(event.target.value)}
            />
          </div>
          <div
            className={styles.pills}
            role="radiogroup"
            aria-label={t("startx.categoryGroupAria")}
          >
            {visibleCategories.map((option) => (
              <label key={option.id} className={styles.pill}>
                <input
                  type="radio"
                  name="primaryCategoryId"
                  value={option.id}
                  checked={categoryId === option.id}
                  required
                  onChange={() => setCategoryId(option.id)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          {visibleCategories.length === 0 ? (
            <p className={styles.emptyNote} role="status">
              {t("startx.categoryNone", { query: categoryQuery.trim() })}
            </p>
          ) : null}
        </fieldset>

        <fieldset {...stepClass(progress.done.place)} disabled={isSubmitting}>
          <div className={styles.stepHead}>
            <span className={styles.stepNumber} aria-hidden="true">
              {progress.done.place ? "✓" : "3"}
            </span>
            <div>
              <legend className={styles.stepTitle}>
                {t("startx.step.place.title")}
              </legend>
              <p className={styles.stepHint}>{t("startx.step.place.hint")}</p>
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor={`${ids}-place`}>
              {t("newBusiness.form.place")}
            </label>
            <select
              id={`${ids}-place`}
              name="placeId"
              required
              value={placeId}
              onChange={(event) => setPlaceId(event.target.value)}
            >
              <option value="" disabled>
                {t("newBusiness.form.placePlaceholder")}
              </option>
              {places.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>

        <fieldset {...stepClass(progress.done.reach)} disabled={isSubmitting}>
          <div className={styles.stepHead}>
            <span className={styles.stepNumber} aria-hidden="true">
              {progress.done.reach ? "✓" : "4"}
            </span>
            <div>
              <legend className={styles.stepTitle}>
                {t("startx.step.reach.title")}
              </legend>
              <p className={styles.stepHint}>{t("startx.step.reach.hint")}</p>
            </div>
          </div>
          <div className={styles.reachGrid} role="radiogroup">
            {reachOptions.map((option) => (
              <label key={option.value} className={styles.reach}>
                <input
                  type="radio"
                  name="businessType"
                  value={option.value}
                  checked={businessType === option.value}
                  required
                  onChange={() => setBusinessType(option.value)}
                />
                <span>
                  <strong>{t(option.title)}</strong>
                  <small>{t(option.body)}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {errorMessage ? (
          <p
            className={styles.error}
            role="alert"
            lang={errorIsEnglish && locale === "cy" ? "en-GB" : undefined}
          >
            {errorMessage}
          </p>
        ) : null}

        <div className={styles.submitRow}>
          <button
            className={styles.submit}
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? t("newBusiness.form.creating")
              : t("newBusiness.form.create")}
          </button>
          <p className={styles.statusLine}>{t("startx.submit.hint")}</p>
        </div>
      </form>

      <aside className={styles.side}>
        <StarterPreviewCard
          t={t}
          name={locale === "cy" && welshName.trim() ? welshName : name}
          nameLang={
            locale === "cy" && welshName.trim() ? "cy" : authoredTextLang
          }
          preview={preview}
          placeName={place?.name ?? null}
          reachLabel={reach ? t(reach.title) : null}
        />
        <section className={styles.benefits}>
          <h2>{t("startx.benefits.title")}</h2>
          <ul>
            <li>{t("startx.benefits.one")}</li>
            <li>{t("startx.benefits.two")}</li>
            <li>{t("startx.benefits.three")}</li>
            <li>{t("startx.benefits.four")}</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
