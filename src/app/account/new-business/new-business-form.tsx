"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import type { SimilarBusiness } from "@/modules/businesses/creation";
import styles from "@/components/auth/sign-in-form.module.css";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { createBusinessAction } from "./actions";

type ReferenceOption = {
  id: string;
  name: string;
};

type NewBusinessFormProps = {
  categories: ReferenceOption[];
  places: ReferenceOption[];
};

const businessTypeOptions: ReadonlyArray<{
  value: string;
  label: MessageKey;
}> = [
  { value: "premises", label: "newBusiness.form.premises" },
  { value: "service_area", label: "newBusiness.form.serviceArea" },
  { value: "online", label: "newBusiness.form.online" },
];

export function NewBusinessForm({ categories, places }: NewBusinessFormProps) {
  const { locale, t } = useLocale();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // The server explains validation failures in English only.
  const [errorIsEnglish, setErrorIsEnglish] = useState(false);
  const [matches, setMatches] = useState<SimilarBusiness[] | null>(null);
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);

  async function submit(form: HTMLFormElement, confirmed: boolean) {
    setErrorMessage(null);
    setErrorIsEnglish(false);
    setIsSubmitting(true);

    const formData = new FormData(form);
    try {
      const result = await createBusinessAction({
        tradingName: String(formData.get("tradingName") ?? "").trim(),
        welshName: String(formData.get("welshName") ?? "").trim(),
        primaryCategoryId: String(formData.get("primaryCategoryId") ?? ""),
        placeId: String(formData.get("placeId") ?? ""),
        businessType: String(formData.get("businessType") ?? ""),
        confirmedDistinct: confirmed,
      });

      switch (result.status) {
        case "created":
          window.location.assign(`/dashboard/business/${result.businessId}`);
          return;
        case "matches":
          setMatches(result.matches);
          setConfirmedDistinct(true);
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit(event.currentTarget, confirmedDistinct);
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      <div className={styles.field}>
        <label htmlFor="new-business-name">{t("newBusiness.form.name")}</label>
        <input
          id="new-business-name"
          name="tradingName"
          type="text"
          minLength={2}
          maxLength={120}
          required
          autoFocus
          disabled={isSubmitting}
          onInput={() => {
            // Renaming the business restarts the duplicate check.
            setMatches(null);
            setConfirmedDistinct(false);
            setErrorMessage(null);
          }}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="new-business-welsh-name">
          {t("newBusiness.form.welshName")}
        </label>
        <input
          id="new-business-welsh-name"
          name="welshName"
          type="text"
          maxLength={120}
          disabled={isSubmitting}
          lang="cy"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="new-business-category">
          {t("newBusiness.form.category")}
        </label>
        <select
          id="new-business-category"
          name="primaryCategoryId"
          required
          disabled={isSubmitting}
          defaultValue=""
        >
          <option value="" disabled>
            {t("newBusiness.form.categoryPlaceholder")}
          </option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="new-business-place">
          {t("newBusiness.form.place")}
        </label>
        <select
          id="new-business-place"
          name="placeId"
          required
          disabled={isSubmitting}
          defaultValue=""
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

      <fieldset className={styles.field} disabled={isSubmitting}>
        <legend>{t("newBusiness.form.reach")}</legend>
        {businessTypeOptions.map((option, index) => (
          <label
            key={option.value}
            className={styles.remember}
            htmlFor={`new-business-type-${option.value}`}
          >
            <input
              id={`new-business-type-${option.value}`}
              name="businessType"
              type="radio"
              value={option.value}
              defaultChecked={index === 1}
              required
            />
            <span>{t(option.label)}</span>
          </label>
        ))}
      </fieldset>

      {matches && matches.length > 0 ? (
        <aside className={styles.status} role="status">
          <p>
            <strong>{t("newBusiness.matches.title")}</strong>{" "}
            {matches.length === 1
              ? t("newBusiness.matches.foundOne")
              : t("newBusiness.matches.foundMany")}
          </p>
          <ul>
            {matches.map((match) => (
              <li key={match.id}>
                <Link href={`/b/${match.slug}`} lang={authoredTextLang}>
                  {match.tradingName}
                </Link>
                {match.placeName ? ` — ${match.placeName}` : null}
                {match.categoryName ? ` (${match.categoryName})` : null}{" "}
                <Link href={`/claim/${match.id}`}>
                  {t("newBusiness.matches.claim")}
                </Link>
              </li>
            ))}
          </ul>
          <p>{t("newBusiness.matches.help")}</p>
        </aside>
      ) : null}

      {errorMessage ? (
        <p
          className={styles.error}
          role="alert"
          lang={errorIsEnglish && locale === "cy" ? "en-GB" : undefined}
        >
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? t("newBusiness.form.creating")
          : matches && matches.length > 0
            ? t("newBusiness.form.different")
            : t("newBusiness.form.create")}
      </button>
    </form>
  );
}
