"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useT } from "@/lib/i18n/client";
import {
  entryFieldName,
  entryHeadline,
  entryLimits,
  offerFieldName,
  serviceFieldName,
  translationLimits,
} from "@/modules/businesses/translation-model";
import { saveWelshVersionAction } from "./actions";
import { idleWelshFormState, type WelshFormState } from "./state";
import styles from "./welsh.module.css";

export type EditorService = {
  id: string;
  name: string;
  description: string | null;
  welshName: string;
  welshDescription: string;
};

export type EditorOffer = {
  id: string;
  title: string;
  description: string;
  welshTitle: string;
  welshDescription: string;
};

export type EditorEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  dates: number;
  welshTitle: string;
  welshDescription: string;
};

export type EditorMenuItem = {
  id: string;
  name: string;
  description: string | null;
  welshName: string;
  welshDescription: string;
};

export type EditorMenuGroup = {
  id: string;
  name: string;
  description: string | null;
  welshName: string;
  welshDescription: string;
  items: EditorMenuItem[];
};

type Props = {
  events: EditorEvent[];
  menuGroups: EditorMenuGroup[];
  businessId: string;
  canEdit: boolean;
  english: { summary: string; description: string };
  welsh: { summary: string; description: string };
  services: EditorService[];
  offers: EditorOffer[];
};

function Pair({
  id,
  title,
  hint,
  englishLabel,
  english,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  englishLabel: string;
  english: string | null;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <div className={styles.pair} id={id}>
      <div className={styles.pairHead}>
        <h3>{title}</h3>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
      </div>
      <div className={styles.columns}>
        <div className={styles.english}>
          <p className={styles.columnLabel}>{englishLabel}</p>
          {english ? (
            <p className={styles.englishText} lang="en-GB">
              {english}
            </p>
          ) : (
            <p className={styles.muted}>{t("welsh.englishEmpty")}</p>
          )}
        </div>
        <div className={styles.welsh}>{children}</div>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  max,
  rows,
  value,
  onChange,
  error,
  disabled,
}: {
  name: string;
  label: string;
  max: number;
  rows: number;
  value: string;
  onChange: (value: string) => void;
  error: boolean;
  disabled: boolean;
}) {
  const t = useT();
  const count = [...value].length;
  const errorId = `${name}-error`;
  const countId = `${name}-count`;
  return (
    <div className={styles.field}>
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        name={name}
        lang="cy-GB"
        rows={rows}
        value={value}
        disabled={disabled}
        aria-invalid={error || count > max ? true : undefined}
        aria-describedby={error ? `${countId} ${errorId}` : countId}
        onChange={(event) => onChange(event.target.value)}
      />
      <p
        id={countId}
        className={styles.counter}
        data-over={count > max ? "true" : undefined}
      >
        {t("welsh.counter", { count, max })}
      </p>
      {error || count > max ? (
        <p id={errorId} className={styles.error}>
          {t("welsh.tooLong", { max })}
        </p>
      ) : null}
    </div>
  );
}

type EntryKind = "event" | "menuGroup" | "menuItem";

/** One English entry beside its Welsh headline and description fields. */
function EntryPair({
  kind,
  id,
  anchor,
  headingLevel,
  englishHeadline,
  englishDescription,
  meta,
  values,
  setValue,
  state,
  canEdit,
  headlineLabel,
  descriptionLabel,
  rows,
}: {
  kind: EntryKind;
  id: string;
  anchor: string;
  headingLevel: 3 | 4;
  englishHeadline: string;
  englishDescription: string | null;
  meta?: ReactNode;
  values: Record<string, string>;
  setValue: (name: string, value: string) => void;
  state: WelshFormState;
  canEdit: boolean;
  headlineLabel: string;
  descriptionLabel: string;
  rows: number;
}) {
  const t = useT();
  const headlineName = entryFieldName(kind, id, entryHeadline(kind));
  const descriptionName = entryFieldName(kind, id, "description");
  const headline = values[headlineName] ?? "";
  const description = values[descriptionName] ?? "";
  const limits = entryLimits[kind];
  // A refusal only stands while the field still holds the refused text.
  const refused = (name: string, value: string) =>
    state.errors.entries[name] === "too-long" &&
    state.values?.entries[name] === value;
  const headlineTooLong =
    refused(headlineName, headline) || [...headline].length > limits.headline;
  const Heading = headingLevel === 3 ? "h3" : "h4";
  return (
    <div className={styles.pair} id={anchor}>
      <div className={styles.columns}>
        <div className={styles.english}>
          <p className={styles.columnLabel}>{t("welsh.english")}</p>
          <Heading lang="en-GB">{englishHeadline}</Heading>
          {meta ? <p className={styles.muted}>{meta}</p> : null}
          {englishDescription ? (
            <p className={styles.englishText} lang="en-GB">
              {englishDescription}
            </p>
          ) : null}
        </div>
        <div className={styles.welsh}>
          <div className={styles.field}>
            <label htmlFor={headlineName}>{headlineLabel}</label>
            <input
              id={headlineName}
              name={headlineName}
              type="text"
              lang="cy-GB"
              value={headline}
              disabled={!canEdit}
              aria-invalid={headlineTooLong ? true : undefined}
              aria-describedby={
                headlineTooLong ? `${headlineName}-error` : undefined
              }
              onChange={(event) => setValue(headlineName, event.target.value)}
            />
            {headlineTooLong ? (
              <p id={`${headlineName}-error`} className={styles.error}>
                {t("welsh.tooLong", { max: limits.headline })}
              </p>
            ) : null}
          </div>
          <Field
            name={descriptionName}
            label={descriptionLabel}
            max={limits.description}
            rows={rows}
            value={description}
            onChange={(value) => setValue(descriptionName, value)}
            error={refused(descriptionName, description)}
            disabled={!canEdit}
          />
        </div>
      </div>
    </div>
  );
}

export function WelshEditor({
  events,
  menuGroups,
  businessId,
  canEdit,
  english,
  welsh,
  services,
  offers,
}: Props) {
  const t = useT();
  const [state, formAction, pending] = useActionState<WelshFormState, FormData>(
    saveWelshVersionAction,
    idleWelshFormState,
  );
  const [summary, setSummary] = useState(welsh.summary);
  const [description, setDescription] = useState(welsh.description);
  const [serviceText, setServiceText] = useState(
    Object.fromEntries(
      services.map((item) => [
        item.id,
        { name: item.welshName, description: item.welshDescription },
      ]),
    ),
  );

  const [offerText, setOfferText] = useState(
    Object.fromEntries(
      offers.map((item) => [
        item.id,
        { title: item.welshTitle, description: item.welshDescription },
      ]),
    ),
  );

  const [entryText, setEntryText] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of events) {
      initial[entryFieldName("event", item.id, "title")] = item.welshTitle;
      initial[entryFieldName("event", item.id, "description")] =
        item.welshDescription;
    }
    for (const group of menuGroups) {
      initial[entryFieldName("menuGroup", group.id, "name")] = group.welshName;
      initial[entryFieldName("menuGroup", group.id, "description")] =
        group.welshDescription;
      for (const item of group.items) {
        initial[entryFieldName("menuItem", item.id, "name")] = item.welshName;
        initial[entryFieldName("menuItem", item.id, "description")] =
          item.welshDescription;
      }
    }
    return initial;
  });
  const setEntry = (name: string, value: string) =>
    setEntryText((current) => ({ ...current, [name]: value }));

  const notice: { text: string; tone: "good" | "bad" } | null =
    state.status === "saved"
      ? { text: t("welsh.saved"), tone: "good" }
      : state.status === "cleared"
        ? { text: t("welsh.cleared"), tone: "good" }
        : state.status === "invalid"
          ? { text: t("welsh.fixErrors"), tone: "bad" }
          : state.status === "forbidden"
            ? { text: t("welsh.forbidden"), tone: "bad" }
            : state.status === "unavailable"
              ? { text: t("welsh.unavailable"), tone: "bad" }
              : null;

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="businessId" value={businessId} />
      {notice ? (
        <p
          className={styles.notice}
          data-tone={notice.tone}
          role={notice.tone === "bad" ? "alert" : "status"}
        >
          {notice.text}
        </p>
      ) : null}

      <Pair
        id="field-summary"
        title={t("welsh.summary.title")}
        hint={t("welsh.summary.hint", { max: translationLimits.summary })}
        englishLabel={t("welsh.english")}
        english={english.summary || null}
      >
        <Field
          name="summary"
          label={t("welsh.welsh")}
          max={translationLimits.summary}
          rows={3}
          value={summary}
          onChange={setSummary}
          error={
            state.errors.summary === "too-long" &&
            state.values?.summary === summary
          }
          disabled={!canEdit}
        />
      </Pair>

      <Pair
        id="field-description"
        title={t("welsh.description.title")}
        hint={t("welsh.description.hint", {
          max: translationLimits.description,
        })}
        englishLabel={t("welsh.english")}
        english={english.description || null}
      >
        <Field
          name="description"
          label={t("welsh.welsh")}
          max={translationLimits.description}
          rows={8}
          value={description}
          onChange={setDescription}
          error={
            state.errors.description === "too-long" &&
            state.values?.description === description
          }
          disabled={!canEdit}
        />
      </Pair>

      <section
        aria-labelledby="welsh-services-heading"
        className={styles.services}
      >
        <h2 id="welsh-services-heading">{t("welsh.services.title")}</h2>
        {services.length === 0 ? (
          <p className={styles.muted}>{t("welsh.services.empty")}</p>
        ) : (
          <>
            <p className={styles.hint}>{t("welsh.services.hint")}</p>
            {services.map((item) => {
              const text = serviceText[item.id] ?? {
                name: "",
                description: "",
              };
              // A refusal only stands while the field still holds the refused text.
              const submitted = state.values?.services[item.id];
              const errors = {
                name:
                  state.errors.services[item.id]?.name &&
                  submitted?.name === text.name
                    ? ("too-long" as const)
                    : undefined,
                description:
                  state.errors.services[item.id]?.description &&
                  submitted?.description === text.description
                    ? ("too-long" as const)
                    : undefined,
              };
              const nameField = serviceFieldName(item.id, "name");
              const descriptionField = serviceFieldName(item.id, "description");
              return (
                <div
                  key={item.id}
                  className={styles.pair}
                  id={`field-service-${item.id}`}
                >
                  <div className={styles.columns}>
                    <div className={styles.english}>
                      <p className={styles.columnLabel}>{t("welsh.english")}</p>
                      <h3 lang="en-GB">{item.name}</h3>
                      {item.description ? (
                        <p className={styles.englishText} lang="en-GB">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <div className={styles.welsh}>
                      <div className={styles.field}>
                        <label htmlFor={nameField}>
                          {t("welsh.service.name")}
                        </label>
                        <input
                          id={nameField}
                          name={nameField}
                          type="text"
                          lang="cy-GB"
                          value={text.name}
                          disabled={!canEdit}
                          aria-invalid={
                            errors.name ||
                            [...text.name].length >
                              translationLimits.serviceName
                              ? true
                              : undefined
                          }
                          aria-describedby={
                            errors.name ? `${nameField}-error` : undefined
                          }
                          onChange={(event) =>
                            setServiceText((current) => ({
                              ...current,
                              [item.id]: { ...text, name: event.target.value },
                            }))
                          }
                        />
                        {errors.name ||
                        [...text.name].length >
                          translationLimits.serviceName ? (
                          <p id={`${nameField}-error`} className={styles.error}>
                            {t("welsh.tooLong", {
                              max: translationLimits.serviceName,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <Field
                        name={descriptionField}
                        label={t("welsh.service.description")}
                        max={translationLimits.serviceDescription}
                        rows={3}
                        value={text.description}
                        onChange={(value) =>
                          setServiceText((current) => ({
                            ...current,
                            [item.id]: { ...text, description: value },
                          }))
                        }
                        error={errors.description === "too-long"}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      <section
        aria-labelledby="welsh-offers-heading"
        className={styles.services}
      >
        <h2 id="welsh-offers-heading">{t("welsh.offers.title")}</h2>
        {offers.length === 0 ? (
          <p className={styles.muted}>{t("welsh.offers.empty")}</p>
        ) : (
          <>
            <p className={styles.hint}>{t("welsh.offers.hint")}</p>
            {offers.map((item) => {
              const text = offerText[item.id] ?? { title: "", description: "" };
              const submitted = state.values?.offers[item.id];
              const errors = {
                title:
                  state.errors.offers[item.id]?.title &&
                  submitted?.title === text.title
                    ? ("too-long" as const)
                    : undefined,
                description:
                  state.errors.offers[item.id]?.description &&
                  submitted?.description === text.description
                    ? ("too-long" as const)
                    : undefined,
              };
              const titleField = offerFieldName(item.id, "title");
              const descriptionField = offerFieldName(item.id, "description");
              const titleTooLong =
                [...text.title].length > translationLimits.offerTitle;
              return (
                <div
                  key={item.id}
                  className={styles.pair}
                  id={`field-offer-${item.id}`}
                >
                  <div className={styles.columns}>
                    <div className={styles.english}>
                      <p className={styles.columnLabel}>{t("welsh.english")}</p>
                      <h3 lang="en-GB">{item.title}</h3>
                      <p className={styles.englishText} lang="en-GB">
                        {item.description}
                      </p>
                    </div>
                    <div className={styles.welsh}>
                      <div className={styles.field}>
                        <label htmlFor={titleField}>
                          {t("welsh.offer.title")}
                        </label>
                        <input
                          id={titleField}
                          name={titleField}
                          type="text"
                          lang="cy-GB"
                          value={text.title}
                          disabled={!canEdit}
                          aria-invalid={
                            errors.title || titleTooLong ? true : undefined
                          }
                          aria-describedby={
                            errors.title || titleTooLong
                              ? `${titleField}-error`
                              : undefined
                          }
                          onChange={(event) =>
                            setOfferText((current) => ({
                              ...current,
                              [item.id]: { ...text, title: event.target.value },
                            }))
                          }
                        />
                        {errors.title || titleTooLong ? (
                          <p
                            id={`${titleField}-error`}
                            className={styles.error}
                          >
                            {t("welsh.tooLong", {
                              max: translationLimits.offerTitle,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <Field
                        name={descriptionField}
                        label={t("welsh.offer.description")}
                        max={translationLimits.offerDescription}
                        rows={4}
                        value={text.description}
                        onChange={(value) =>
                          setOfferText((current) => ({
                            ...current,
                            [item.id]: { ...text, description: value },
                          }))
                        }
                        error={errors.description === "too-long"}
                        disabled={!canEdit}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>

      <section
        aria-labelledby="welsh-events-heading"
        className={styles.services}
      >
        <h2 id="welsh-events-heading">{t("welsh.events.title")}</h2>
        {events.length === 0 ? (
          <p className={styles.muted}>{t("welsh.events.empty")}</p>
        ) : (
          <>
            <p className={styles.hint}>{t("welsh.events.hint")}</p>
            {events.map((item) => (
              <EntryPair
                key={item.id}
                kind="event"
                id={item.id}
                anchor={`field-event-${item.id}`}
                headingLevel={3}
                englishHeadline={item.title}
                englishDescription={item.description}
                meta={
                  <>
                    <span lang="en-GB">
                      {new Intl.DateTimeFormat("en-GB", {
                        dateStyle: "medium",
                        timeZone: "Europe/London",
                      }).format(new Date(item.startsAt))}
                    </span>
                    {item.dates > 1
                      ? ` · ${t("welsh.events.dates", { count: item.dates })}`
                      : null}
                  </>
                }
                values={entryText}
                setValue={setEntry}
                state={state}
                canEdit={canEdit}
                headlineLabel={t("welsh.event.title")}
                descriptionLabel={t("welsh.event.description")}
                rows={4}
              />
            ))}
          </>
        )}
      </section>

      <section aria-labelledby="welsh-menu-heading" className={styles.services}>
        <h2 id="welsh-menu-heading">{t("welsh.menu.title")}</h2>
        {menuGroups.length === 0 ? (
          <p className={styles.muted}>{t("welsh.menu.empty")}</p>
        ) : (
          <>
            <p className={styles.hint}>{t("welsh.menu.hint")}</p>
            {menuGroups.map((group) => (
              <div key={group.id} className={styles.menuGroup}>
                <EntryPair
                  kind="menuGroup"
                  id={group.id}
                  anchor={`field-menugroup-${group.id}`}
                  headingLevel={3}
                  englishHeadline={group.name}
                  englishDescription={group.description}
                  values={entryText}
                  setValue={setEntry}
                  state={state}
                  canEdit={canEdit}
                  headlineLabel={t("welsh.menuGroup.name")}
                  descriptionLabel={t("welsh.menuGroup.description")}
                  rows={2}
                />
                {group.items.map((item) => (
                  <EntryPair
                    key={item.id}
                    kind="menuItem"
                    id={item.id}
                    anchor={`field-menuitem-${item.id}`}
                    headingLevel={4}
                    englishHeadline={item.name}
                    englishDescription={item.description}
                    values={entryText}
                    setValue={setEntry}
                    state={state}
                    canEdit={canEdit}
                    headlineLabel={t("welsh.menuItem.name")}
                    descriptionLabel={t("welsh.menuItem.description")}
                    rows={2}
                  />
                ))}
              </div>
            ))}
          </>
        )}
      </section>

      {canEdit ? (
        <div className={styles.actions}>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? t("welsh.saving") : t("welsh.save")}
          </button>
        </div>
      ) : null}
    </form>
  );
}
