"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import type { SimilarBusiness } from "@/modules/businesses/creation";
import styles from "@/components/auth/sign-in-form.module.css";
import { createBusinessAction } from "./actions";

type ReferenceOption = {
  id: string;
  name: string;
};

type NewBusinessFormProps = {
  categories: ReferenceOption[];
  places: ReferenceOption[];
};

const businessTypeOptions = [
  {
    value: "premises",
    label: "Customers visit our premises (shop, café, salon, venue)",
  },
  {
    value: "service_area",
    label: "We travel to customers across a service area (trades, mobile)",
  },
  { value: "online", label: "We mainly operate online" },
] as const;

export function NewBusinessForm({ categories, places }: NewBusinessFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [matches, setMatches] = useState<SimilarBusiness[] | null>(null);
  const [confirmedDistinct, setConfirmedDistinct] = useState(false);

  async function submit(form: HTMLFormElement, confirmed: boolean) {
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(form);
    try {
      const result = await createBusinessAction({
        tradingName: String(formData.get("tradingName") ?? "").trim(),
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
          setErrorMessage(
            "Your account must be signed in and email-verified to create a business. The public demonstration account cannot create businesses.",
          );
          return;
        case "limit":
          setErrorMessage(
            "You have reached the current limit of businesses one account can own. Contact OurValleys support if you manage more businesses.",
          );
          return;
        case "invalid":
          setErrorMessage(result.message);
          return;
        default:
          setErrorMessage(
            "Business creation is temporarily unavailable. Your details were not saved — please try again shortly.",
          );
      }
    } catch {
      setErrorMessage(
        "Business creation could not be reached. Check your connection and try again.",
      );
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
        <label htmlFor="new-business-name">Business name</label>
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
        <label htmlFor="new-business-category">
          What does the business do?
        </label>
        <select
          id="new-business-category"
          name="primaryCategoryId"
          required
          disabled={isSubmitting}
          defaultValue=""
        >
          <option value="" disabled>
            Choose a category
          </option>
          {categories.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.field}>
        <label htmlFor="new-business-place">Where is it based?</label>
        <select
          id="new-business-place"
          name="placeId"
          required
          disabled={isSubmitting}
          defaultValue=""
        >
          <option value="" disabled>
            Choose a town or area
          </option>
          {places.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className={styles.field} disabled={isSubmitting}>
        <legend>How do customers reach you?</legend>
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
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      {matches && matches.length > 0 ? (
        <aside className={styles.status} role="status">
          <p>
            <strong>Is your business already listed?</strong> We found{" "}
            {matches.length === 1
              ? "a published business"
              : "published businesses"}{" "}
            with a similar name:
          </p>
          <ul>
            {matches.map((match) => (
              <li key={match.id}>
                <Link href={`/b/${match.slug}`}>{match.tradingName}</Link>
                {match.placeName ? ` — ${match.placeName}` : null}
                {match.categoryName ? ` (${match.categoryName})` : null}{" "}
                <Link href={`/claim/${match.id}`}>Claim this business</Link>
              </li>
            ))}
          </ul>
          <p>
            If one of these is your business, use its claim link. Claims create an
            evidence-rich admin ticket and never overwrite existing control
            automatically. If yours is different, continue below.
          </p>
        </aside>
      ) : null}

      {errorMessage ? (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      ) : null}

      <button className={styles.submit} type="submit" disabled={isSubmitting}>
        {isSubmitting
          ? "Creating your starter website…"
          : matches && matches.length > 0
            ? "Mine is a different business — continue"
            : "Create my starter website"}
      </button>
    </form>
  );
}
