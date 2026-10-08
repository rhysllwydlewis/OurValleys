"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  authoredTextLang,
  weekdayKeys,
  weekdayLabel,
} from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import {
  saveOnboardingSection,
  type SaveSectionIssue,
  type SaveSectionResult,
} from "./actions";

type PlaceOption = { id: string; slug: string; name: string };

type ProfileValues = {
  tradingName: string;
  summary: string;
  publicPhone: string | null;
  publicEmail: string | null;
};

type LocationValues = {
  placeId: string;
  locationType: "premises" | "service_area" | "online";
  publicAddressVisibility:
    "full_address" | "locality_only" | "service_area_only";
  publicAddressLineOne: string | null;
  publicLocality: string | null;
  publicPostcode: string | null;
  privateAddressLineOne: string | null;
  privatePostcode: string | null;
};

type ServiceValue = {
  name: string;
  description: string | null;
  priceGuidance: string | null;
};

type WeekdayKey = (typeof weekdayKeys)[number];

type OpeningHoursDay = {
  day: WeekdayKey;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

const weekdayOrder: { key: WeekdayKey }[] = weekdayKeys.map((key) => ({
  key,
}));

function defaultOpeningHours(): OpeningHoursDay[] {
  return weekdayOrder.map(({ key }) => ({
    day: key,
    closed: key === "saturday" || key === "sunday",
    opensAt: key === "saturday" || key === "sunday" ? null : "09:00",
    closesAt: key === "saturday" || key === "sunday" ? null : "17:00",
  }));
}

function mergeOpeningHours(
  initial: OpeningHoursDay[] | null,
): OpeningHoursDay[] {
  if (!initial || initial.length === 0) return defaultOpeningHours();
  const byDay = new Map(initial.map((day) => [day.day, day]));
  const defaults = new Map(defaultOpeningHours().map((day) => [day.day, day]));
  return weekdayOrder.map(({ key }) => byDay.get(key) ?? defaults.get(key)!);
}

type OnboardingFormsProps = {
  businessId: string;
  initialVersion: number;
  initialProfile: ProfileValues | null;
  initialLocation: LocationValues | null;
  initialServices: ServiceValue[] | null;
  initialHours: OpeningHoursDay[] | null;
  places: PlaceOption[];
};

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; atLabel: string }
  | { phase: "error"; message: string }
  | { phase: "conflict" }
  | { phase: "invalid"; issues: SaveSectionIssue[] };

function issueFor(issues: SaveSectionIssue[], field: string): string | null {
  const issue = issues.find(
    (candidate) => candidate.field === field || candidate.field === "",
  );
  return issue ? issue.message : null;
}

function friendlyMessage(t: Translator, result: SaveSectionResult): string {
  switch (result.status) {
    case "forbidden":
      return t("dash.form.forbidden");
    case "locked":
      return t("dash.form.locked");
    case "unauthenticated":
      return t("dash.form.unauthenticated");
    case "unavailable":
      return t("dash.form.unavailable");
    default:
      return t("dash.form.failed");
  }
}

function SaveStatus({ state, id }: { state: SaveState; id: string }) {
  const { t } = useLocale();
  return (
    <p
      id={id}
      className={`save-status${state.phase === "error" || state.phase === "conflict" ? " save-status--problem" : ""}`}
      role="status"
      aria-live="polite"
    >
      {state.phase === "saving" ? t("dash.form.savingDraft") : null}
      {state.phase === "saved"
        ? t("dash.form.savedAt", { time: state.atLabel })
        : null}
      {state.phase === "error" ? state.message : null}
      {state.phase === "invalid" ? t("dash.form.invalid") : null}
    </p>
  );
}

export function OnboardingForms({
  businessId,
  initialVersion,
  initialProfile,
  initialLocation,
  initialServices,
  initialHours,
  places,
}: OnboardingFormsProps) {
  const router = useRouter();
  const { locale, t } = useLocale();
  // The server explains validation failures in English only.
  const englishLang = locale === "cy" ? "en-GB" : undefined;
  const [version, setVersion] = useState(initialVersion);
  const [profileState, setProfileState] = useState<SaveState>({
    phase: "idle",
  });
  const [locationState, setLocationState] = useState<SaveState>({
    phase: "idle",
  });
  const [servicesState, setServicesState] = useState<SaveState>({
    phase: "idle",
  });
  const [hoursState, setHoursState] = useState<SaveState>({
    phase: "idle",
  });
  const [locationType, setLocationType] = useState<
    LocationValues["locationType"]
  >(initialLocation?.locationType ?? "service_area");
  const [addressVisibility, setAddressVisibility] = useState<
    LocationValues["publicAddressVisibility"]
  >(initialLocation?.publicAddressVisibility ?? "service_area_only");
  const [serviceRows, setServiceRows] = useState<
    (ServiceValue & { key: string })[]
  >(() =>
    initialServices && initialServices.length > 0
      ? initialServices.map((service, index) => ({
          ...service,
          key: `service-${index}`,
        }))
      : [{ name: "", description: "", priceGuidance: "", key: "service-0" }],
  );
  const [nextServiceKey, setNextServiceKey] = useState(
    () => serviceRows.length,
  );
  const [hoursRows, setHoursRows] = useState<OpeningHoursDay[]>(() =>
    mergeOpeningHours(initialHours),
  );
  const profileId = useId();
  const locationId = useId();
  const servicesId = useId();
  const hoursId = useId();

  const profileIssues =
    profileState.phase === "invalid" ? profileState.issues : [];
  const locationIssues =
    locationState.phase === "invalid" ? locationState.issues : [];
  const servicesIssues =
    servicesState.phase === "invalid" ? servicesState.issues : [];
  const hoursIssues = hoursState.phase === "invalid" ? hoursState.issues : [];

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/London",
      }),
    [locale],
  );

  async function submitSection(
    section: "profile" | "location" | "services" | "hours",
    payload: unknown,
    setState: (state: SaveState) => void,
  ) {
    setState({ phase: "saving" });

    let result: SaveSectionResult;
    try {
      result = await saveOnboardingSection({
        businessId,
        expectedVersion: version,
        section,
        payload,
      });
    } catch {
      setState({
        phase: "error",
        message: t("dash.form.unreachable"),
      });
      return;
    }

    switch (result.status) {
      case "saved":
        setVersion(result.version);
        setState({
          phase: "saved",
          atLabel: timeFormatter.format(new Date(result.savedAt)),
        });
        router.refresh();
        return;
      case "invalid":
        setState({ phase: "invalid", issues: result.issues });
        return;
      case "conflict":
        setState({ phase: "conflict" });
        return;
      default:
        setState({ phase: "error", message: friendlyMessage(t, result) });
    }
  }

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submitSection(
      "profile",
      {
        tradingName: String(data.get("tradingName") ?? ""),
        summary: String(data.get("summary") ?? ""),
        publicPhone: String(data.get("publicPhone") ?? ""),
        publicEmail: String(data.get("publicEmail") ?? ""),
      },
      setProfileState,
    );
  }

  function handleLocationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void submitSection(
      "location",
      {
        placeId: String(data.get("placeId") ?? ""),
        locationType: String(data.get("locationType") ?? ""),
        publicAddressVisibility: String(
          data.get("publicAddressVisibility") ?? "",
        ),
        publicAddressLineOne: String(data.get("publicAddressLineOne") ?? ""),
        publicLocality: String(data.get("publicLocality") ?? ""),
        publicPostcode: String(data.get("publicPostcode") ?? ""),
        privateAddressLineOne: String(data.get("privateAddressLineOne") ?? ""),
        privatePostcode: String(data.get("privatePostcode") ?? ""),
      },
      setLocationState,
    );
  }

  function handleServicesSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSection(
      "services",
      serviceRows.map(({ name, description, priceGuidance }) => ({
        name,
        description: description || null,
        priceGuidance: priceGuidance || null,
      })),
      setServicesState,
    );
  }

  function updateServiceRow(
    key: string,
    field: "name" | "description" | "priceGuidance",
    value: string,
  ) {
    setServiceRows((rows) =>
      rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function addServiceRow() {
    setServiceRows((rows) => [
      ...rows,
      {
        name: "",
        description: "",
        priceGuidance: "",
        key: `service-${nextServiceKey}`,
      },
    ]);
    setNextServiceKey((value) => value + 1);
  }

  function removeServiceRow(key: string) {
    setServiceRows((rows) =>
      rows.length > 1 ? rows.filter((row) => row.key !== key) : rows,
    );
  }

  function handleHoursSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitSection("hours", hoursRows, setHoursState);
  }

  function updateHoursDay(day: WeekdayKey, patch: Partial<OpeningHoursDay>) {
    setHoursRows((rows) =>
      rows.map((row) => (row.day === day ? { ...row, ...patch } : row)),
    );
  }

  const conflictBanner = (
    <div className="conflict-banner" role="alert">
      <strong>{t("dash.form.conflictTitle")}</strong>
      <p>{t("dash.form.conflictBody")}</p>
      <button
        className="button"
        type="button"
        onClick={() => window.location.reload()}
      >
        {t("dash.form.conflictLoad")}
      </button>
    </div>
  );

  const isProfileSaving = profileState.phase === "saving";
  const isLocationSaving = locationState.phase === "saving";
  const isServicesSaving = servicesState.phase === "saving";
  const isHoursSaving = hoursState.phase === "saving";

  return (
    <div className="onboarding-forms">
      <form
        className="dashboard-form ov-glass"
        onSubmit={handleProfileSubmit}
        aria-busy={isProfileSaving}
        aria-labelledby={`${profileId}-title`}
      >
        <div className="dashboard-form__heading">
          <p className="eyebrow">{t("dash.profile.eyebrow")}</p>
          <h3 id={`${profileId}-title`}>{t("dash.profile.title")}</h3>
          <p className="dashboard-form__note">{t("dash.profile.note")}</p>
        </div>

        {profileState.phase === "conflict" ? conflictBanner : null}

        <div className="field">
          <label htmlFor={`${profileId}-tradingName`}>
            {t("dash.profile.tradingName")}
          </label>
          <input
            id={`${profileId}-tradingName`}
            name="tradingName"
            lang={authoredTextLang}
            type="text"
            required
            minLength={2}
            maxLength={120}
            defaultValue={initialProfile?.tradingName ?? ""}
            disabled={isProfileSaving}
            aria-invalid={Boolean(issueFor(profileIssues, "tradingName"))}
            aria-describedby={
              issueFor(profileIssues, "tradingName")
                ? `${profileId}-tradingName-error`
                : undefined
            }
          />
          {issueFor(profileIssues, "tradingName") ? (
            <p
              className="field-error"
              lang={englishLang}
              id={`${profileId}-tradingName-error`}
            >
              {issueFor(profileIssues, "tradingName")}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor={`${profileId}-summary`}>
            {t("dash.profile.summary")}{" "}
            <span className="field-hint">{t("dash.profile.summaryHint")}</span>
          </label>
          <textarea
            id={`${profileId}-summary`}
            name="summary"
            lang={authoredTextLang}
            required
            minLength={20}
            maxLength={280}
            rows={3}
            defaultValue={initialProfile?.summary ?? ""}
            disabled={isProfileSaving}
            aria-invalid={Boolean(issueFor(profileIssues, "summary"))}
            aria-describedby={
              issueFor(profileIssues, "summary")
                ? `${profileId}-summary-error`
                : undefined
            }
          />
          {issueFor(profileIssues, "summary") ? (
            <p
              className="field-error"
              lang={englishLang}
              id={`${profileId}-summary-error`}
            >
              {issueFor(profileIssues, "summary")}
            </p>
          ) : null}
        </div>

        <div className="field-pair">
          <div className="field">
            <label htmlFor={`${profileId}-publicPhone`}>
              {t("dash.profile.phone")}{" "}
              <span className="field-hint">{t("dash.form.optional")}</span>
            </label>
            <input
              id={`${profileId}-publicPhone`}
              name="publicPhone"
              lang={authoredTextLang}
              type="tel"
              maxLength={40}
              defaultValue={initialProfile?.publicPhone ?? ""}
              disabled={isProfileSaving}
            />
          </div>
          <div className="field">
            <label htmlFor={`${profileId}-publicEmail`}>
              {t("dash.profile.email")}{" "}
              <span className="field-hint">{t("dash.form.optional")}</span>
            </label>
            <input
              id={`${profileId}-publicEmail`}
              name="publicEmail"
              lang={authoredTextLang}
              type="email"
              maxLength={254}
              defaultValue={initialProfile?.publicEmail ?? ""}
              disabled={isProfileSaving}
              aria-invalid={Boolean(issueFor(profileIssues, "publicEmail"))}
              aria-describedby={
                issueFor(profileIssues, "publicEmail")
                  ? `${profileId}-publicEmail-error`
                  : undefined
              }
            />
            {issueFor(profileIssues, "publicEmail") ? (
              <p
                className="field-error"
                lang={englishLang}
                id={`${profileId}-publicEmail-error`}
              >
                {issueFor(profileIssues, "publicEmail")}
              </p>
            ) : null}
          </div>
        </div>

        <div className="save-row">
          <button
            className="button primary"
            type="submit"
            disabled={isProfileSaving}
          >
            {isProfileSaving ? (
              <>
                <span className="button__spinner" aria-hidden="true" />
                {t("dash.form.saving")}
              </>
            ) : (
              t("dash.profile.save")
            )}
          </button>
          <SaveStatus state={profileState} id={`${profileId}-status`} />
        </div>
      </form>

      <form
        className="dashboard-form ov-glass"
        onSubmit={handleLocationSubmit}
        aria-busy={isLocationSaving}
        aria-labelledby={`${locationId}-title`}
      >
        <div className="dashboard-form__heading">
          <p className="eyebrow">{t("dash.location.eyebrow")}</p>
          <h3 id={`${locationId}-title`}>{t("dash.location.title")}</h3>
          <p className="dashboard-form__note">{t("dash.location.note")}</p>
        </div>

        {locationState.phase === "conflict" ? conflictBanner : null}

        <div className="field-pair">
          <div className="field">
            <label htmlFor={`${locationId}-placeId`}>
              {t("dash.location.place")}
            </label>
            <select
              id={`${locationId}-placeId`}
              name="placeId"
              required
              defaultValue={initialLocation?.placeId ?? ""}
              disabled={isLocationSaving}
              aria-invalid={Boolean(issueFor(locationIssues, "placeId"))}
            >
              <option value="" disabled>
                {t("dash.location.placePlaceholder")}
              </option>
              {places.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            {issueFor(locationIssues, "placeId") ? (
              <p className="field-error" lang={englishLang}>
                {issueFor(locationIssues, "placeId")}
              </p>
            ) : null}
          </div>
          <div className="field">
            <label htmlFor={`${locationId}-locationType`}>
              {t("dash.location.operate")}
            </label>
            <select
              id={`${locationId}-locationType`}
              name="locationType"
              value={locationType}
              onChange={(event) =>
                setLocationType(
                  event.currentTarget.value as LocationValues["locationType"],
                )
              }
              disabled={isLocationSaving}
            >
              <option value="service_area">
                {t("dash.location.serviceArea")}
              </option>
              <option value="premises">{t("dash.location.premises")}</option>
              <option value="online">{t("dash.location.online")}</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor={`${locationId}-visibility`}>
            {t("dash.location.visibility")}
          </label>
          <select
            id={`${locationId}-visibility`}
            name="publicAddressVisibility"
            value={addressVisibility}
            onChange={(event) =>
              setAddressVisibility(
                event.currentTarget
                  .value as LocationValues["publicAddressVisibility"],
              )
            }
            disabled={isLocationSaving}
            aria-invalid={Boolean(
              issueFor(locationIssues, "publicAddressVisibility"),
            )}
            aria-describedby={`${locationId}-visibility-help`}
          >
            <option value="service_area_only">
              {t("dash.location.visibilityServiceArea")}
            </option>
            <option value="locality_only">
              {t("dash.location.visibilityLocality")}
            </option>
            <option value="full_address">
              {t("dash.location.visibilityFull")}
            </option>
          </select>
          <p className="field-hint" id={`${locationId}-visibility-help`}>
            {addressVisibility === "full_address"
              ? t("dash.location.helpFull")
              : t("dash.location.helpOther")}
          </p>
          {issueFor(locationIssues, "publicAddressVisibility") ? (
            <p className="field-error" lang={englishLang}>
              {issueFor(locationIssues, "publicAddressVisibility")}
            </p>
          ) : null}
        </div>

        {addressVisibility !== "service_area_only" ? (
          <div className="field-group">
            <div className="field">
              <label htmlFor={`${locationId}-publicAddressLineOne`}>
                {t("dash.location.addressLine")}
                {addressVisibility === "full_address" ? null : (
                  <span className="field-hint"> {t("dash.form.optional")}</span>
                )}
              </label>
              <input
                id={`${locationId}-publicAddressLineOne`}
                name="publicAddressLineOne"
                lang={authoredTextLang}
                type="text"
                maxLength={160}
                defaultValue={initialLocation?.publicAddressLineOne ?? ""}
                disabled={isLocationSaving}
              />
            </div>
            <div className="field-pair">
              <div className="field">
                <label htmlFor={`${locationId}-publicLocality`}>
                  {t("dash.location.locality")}{" "}
                  <span className="field-hint">{t("dash.form.optional")}</span>
                </label>
                <input
                  id={`${locationId}-publicLocality`}
                  name="publicLocality"
                  lang={authoredTextLang}
                  type="text"
                  maxLength={120}
                  defaultValue={initialLocation?.publicLocality ?? ""}
                  disabled={isLocationSaving}
                />
              </div>
              <div className="field">
                <label htmlFor={`${locationId}-publicPostcode`}>
                  {t("dash.location.postcode")}
                  {addressVisibility === "full_address" ? null : (
                    <span className="field-hint">
                      {" "}
                      {t("dash.form.optional")}
                    </span>
                  )}
                </label>
                <input
                  id={`${locationId}-publicPostcode`}
                  name="publicPostcode"
                  lang={authoredTextLang}
                  type="text"
                  maxLength={16}
                  defaultValue={initialLocation?.publicPostcode ?? ""}
                  disabled={isLocationSaving}
                />
              </div>
            </div>
          </div>
        ) : null}

        {locationType === "premises" ? (
          <div className="field-group">
            <p className="field-hint">{t("dash.location.privateNote")}</p>
            <div className="field-pair">
              <div className="field">
                <label htmlFor={`${locationId}-privateAddressLineOne`}>
                  {t("dash.location.privateAddress")}
                </label>
                <input
                  id={`${locationId}-privateAddressLineOne`}
                  name="privateAddressLineOne"
                  lang={authoredTextLang}
                  type="text"
                  maxLength={160}
                  defaultValue={initialLocation?.privateAddressLineOne ?? ""}
                  disabled={isLocationSaving}
                  aria-invalid={Boolean(
                    issueFor(locationIssues, "privateAddressLineOne"),
                  )}
                />
              </div>
              <div className="field">
                <label htmlFor={`${locationId}-privatePostcode`}>
                  {t("dash.location.privatePostcode")}
                </label>
                <input
                  id={`${locationId}-privatePostcode`}
                  name="privatePostcode"
                  lang={authoredTextLang}
                  type="text"
                  maxLength={16}
                  defaultValue={initialLocation?.privatePostcode ?? ""}
                  disabled={isLocationSaving}
                />
              </div>
            </div>
            {issueFor(locationIssues, "privateAddressLineOne") ? (
              <p className="field-error" lang={englishLang}>
                {issueFor(locationIssues, "privateAddressLineOne")}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="save-row">
          <button
            className="button primary"
            type="submit"
            disabled={isLocationSaving}
          >
            {isLocationSaving ? (
              <>
                <span className="button__spinner" aria-hidden="true" />
                {t("dash.form.saving")}
              </>
            ) : (
              t("dash.location.save")
            )}
          </button>
          <SaveStatus state={locationState} id={`${locationId}-status`} />
        </div>
      </form>

      <form
        className="dashboard-form ov-glass"
        onSubmit={handleServicesSubmit}
        aria-busy={isServicesSaving}
        aria-labelledby={`${servicesId}-title`}
      >
        <div className="dashboard-form__heading">
          <p className="eyebrow">{t("dash.services.eyebrow")}</p>
          <h3 id={`${servicesId}-title`}>{t("dash.services.title")}</h3>
          <p className="dashboard-form__note">{t("dash.services.note")}</p>
        </div>

        {servicesState.phase === "conflict" ? conflictBanner : null}

        <div className="service-row-list">
          {serviceRows.map((row, index) => (
            <div className="service-row" key={row.key}>
              <div className="field">
                <label htmlFor={`${servicesId}-${row.key}-name`}>
                  {t("dash.services.name")}
                </label>
                <input
                  id={`${servicesId}-${row.key}-name`}
                  lang={authoredTextLang}
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  value={row.name}
                  onChange={(event) =>
                    updateServiceRow(row.key, "name", event.currentTarget.value)
                  }
                  disabled={isServicesSaving}
                  aria-invalid={Boolean(
                    issueFor(servicesIssues, `${index}.name`),
                  )}
                />
                {issueFor(servicesIssues, `${index}.name`) ? (
                  <p className="field-error" lang={englishLang}>
                    {issueFor(servicesIssues, `${index}.name`)}
                  </p>
                ) : null}
              </div>
              <div className="field">
                <label htmlFor={`${servicesId}-${row.key}-description`}>
                  {t("dash.services.description")}{" "}
                  <span className="field-hint">{t("dash.form.optional")}</span>
                </label>
                <input
                  id={`${servicesId}-${row.key}-description`}
                  lang={authoredTextLang}
                  type="text"
                  maxLength={280}
                  value={row.description ?? ""}
                  onChange={(event) =>
                    updateServiceRow(
                      row.key,
                      "description",
                      event.currentTarget.value,
                    )
                  }
                  disabled={isServicesSaving}
                />
              </div>
              <div className="field service-row__price">
                <label htmlFor={`${servicesId}-${row.key}-price`}>
                  {t("dash.services.price")}{" "}
                  <span className="field-hint">{t("dash.form.optional")}</span>
                </label>
                <input
                  id={`${servicesId}-${row.key}-price`}
                  lang={authoredTextLang}
                  type="text"
                  maxLength={80}
                  placeholder={t("dash.services.pricePlaceholder")}
                  value={row.priceGuidance ?? ""}
                  onChange={(event) =>
                    updateServiceRow(
                      row.key,
                      "priceGuidance",
                      event.currentTarget.value,
                    )
                  }
                  disabled={isServicesSaving}
                />
              </div>
              <button
                type="button"
                className="service-row__remove"
                onClick={() => removeServiceRow(row.key)}
                disabled={isServicesSaving || serviceRows.length <= 1}
                aria-label={
                  row.name
                    ? t("dash.services.removeNamed", { name: row.name })
                    : t("dash.services.removeThis")
                }
              >
                {t("dash.form.remove")}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="button"
          onClick={addServiceRow}
          disabled={isServicesSaving || serviceRows.length >= 20}
        >
          {t("dash.services.add")}
        </button>

        <div className="save-row">
          <button
            className="button primary"
            type="submit"
            disabled={isServicesSaving}
          >
            {isServicesSaving ? (
              <>
                <span className="button__spinner" aria-hidden="true" />
                {t("dash.form.saving")}
              </>
            ) : (
              t("dash.services.save")
            )}
          </button>
          <SaveStatus state={servicesState} id={`${servicesId}-status`} />
        </div>
      </form>

      <form
        className="dashboard-form ov-glass"
        onSubmit={handleHoursSubmit}
        aria-busy={isHoursSaving}
        aria-labelledby={`${hoursId}-title`}
      >
        <div className="dashboard-form__heading">
          <p className="eyebrow">{t("dash.hours.eyebrow")}</p>
          <h3 id={`${hoursId}-title`}>{t("dash.hours.title")}</h3>
          <p className="dashboard-form__note">{t("dash.hours.note")}</p>
        </div>

        {hoursState.phase === "conflict" ? conflictBanner : null}

        <div className="hours-row-list">
          {weekdayOrder.map(({ key }, index) => {
            const label = weekdayLabel(t, key);
            const row = hoursRows.find((candidate) => candidate.day === key);
            if (!row) return null;
            return (
              <div className="hours-row" key={key}>
                <span className="hours-row__day">{label}</span>
                <label className="hours-row__closed">
                  <input
                    type="checkbox"
                    checked={row.closed}
                    onChange={(event) =>
                      updateHoursDay(key, {
                        closed: event.currentTarget.checked,
                        opensAt: event.currentTarget.checked ? null : "09:00",
                        closesAt: event.currentTarget.checked ? null : "17:00",
                      })
                    }
                    disabled={isHoursSaving}
                  />
                  {t("dash.hours.closed")}
                </label>
                {!row.closed ? (
                  <>
                    <label className="hours-row__time">
                      <span className="sr-only">
                        {t("dash.hours.openingTime", { day: label })}
                      </span>
                      <input
                        type="time"
                        value={row.opensAt ?? ""}
                        onChange={(event) =>
                          updateHoursDay(key, {
                            opensAt: event.currentTarget.value,
                          })
                        }
                        disabled={isHoursSaving}
                      />
                    </label>
                    <span aria-hidden="true">–</span>
                    <label className="hours-row__time">
                      <span className="sr-only">
                        {t("dash.hours.closingTime", { day: label })}
                      </span>
                      <input
                        type="time"
                        value={row.closesAt ?? ""}
                        onChange={(event) =>
                          updateHoursDay(key, {
                            closesAt: event.currentTarget.value,
                          })
                        }
                        disabled={isHoursSaving}
                      />
                    </label>
                  </>
                ) : (
                  <span className="hours-row__closed-note">
                    {t("dash.hours.notOpen")}
                  </span>
                )}
                {issueFor(hoursIssues, `${index}.closesAt`) ? (
                  <p
                    className="field-error hours-row__error"
                    lang={englishLang}
                  >
                    {issueFor(hoursIssues, `${index}.closesAt`)}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="save-row">
          <button
            className="button primary"
            type="submit"
            disabled={isHoursSaving}
          >
            {isHoursSaving ? (
              <>
                <span className="button__spinner" aria-hidden="true" />
                {t("dash.form.saving")}
              </>
            ) : (
              t("dash.hours.save")
            )}
          </button>
          <SaveStatus state={hoursState} id={`${hoursId}-status`} />
        </div>
      </form>
    </div>
  );
}
