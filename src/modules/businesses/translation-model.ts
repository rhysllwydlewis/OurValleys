/**
 * Pure rules for the Welsh version of a business's own words: field limits,
 * cleaning, the overlay that lets Welsh text replace English on the public
 * site, and the coverage figures behind the owner's guidance. No database or
 * framework imports, so the editor, the site and the tests share one source.
 */

export const translationLimits = {
  summary: 280,
  description: 4000,
  serviceName: 100,
  serviceDescription: 280,
  offerTitle: 120,
  offerDescription: 1000,
} as const;

export type TranslationField =
  | "summary"
  | "description"
  | "serviceName"
  | "serviceDescription"
  | "offerTitle"
  | "offerDescription";

export type ServiceTranslationText = {
  name: string | null;
  description: string | null;
};

export type OfferTranslationText = {
  title: string | null;
  description: string | null;
};

/** The Welsh text on record for one business, keyed by the English service id. */
export type BusinessTranslationText = {
  summary: string | null;
  description: string | null;
  services: Record<string, ServiceTranslationText>;
  /** Keyed by the English offer id. */
  offers: Record<string, OfferTranslationText>;
  updatedAt: Date | null;
};

export const emptyTranslation: BusinessTranslationText = {
  summary: null,
  description: null,
  services: {},
  offers: {},
  updatedAt: null,
};

export type CleanedText =
  | { ok: true; value: string | null }
  | { ok: false; reason: "too-long"; max: number };

const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

/**
 * Trims, normalises line endings, drops control characters and turns blank
 * text into `null` (meaning "use the English"). Over-long text is refused
 * rather than silently cut, so an owner never publishes half a sentence.
 */
export function cleanTranslationText(
  value: unknown,
  max: number,
  { multiline }: { multiline: boolean },
): CleanedText {
  if (typeof value !== "string") return { ok: true, value: null };
  let text = value.normalize("NFC").replace(/\r\n?/g, "\n");
  text = text.replace(controlCharacters, "");
  text = multiline
    ? text
        .split("\n")
        .map((line) => line.trimEnd())
        .join("\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
    : text.replace(/\s+/g, " ").trim();
  if (text === "") return { ok: true, value: null };
  if ([...text].length > max) return { ok: false, reason: "too-long", max };
  return { ok: true, value: text };
}

export type TranslationFormErrors = {
  summary?: "too-long";
  description?: "too-long";
  services: Record<string, { name?: "too-long"; description?: "too-long" }>;
  offers: Record<string, { title?: "too-long"; description?: "too-long" }>;
};

export type ParsedTranslationForm =
  | { ok: true; value: Omit<BusinessTranslationText, "updatedAt"> }
  | { ok: false; errors: TranslationFormErrors };

export const serviceFieldName = (
  serviceId: string,
  field: "name" | "description",
) => `service-${serviceId}-${field}`;

export const offerFieldName = (
  offerId: string,
  field: "title" | "description",
) => `offer-${offerId}-${field}`;

/**
 * Reads the editor's form. Only fields for `serviceIds` (the business's own
 * services, loaded by the caller) are read, so a forged field naming another
 * business's service id is ignored.
 */
export function parseTranslationForm(
  read: (name: string) => unknown,
  serviceIds: readonly string[],
  offerIds: readonly string[] = [],
): ParsedTranslationForm {
  const errors: TranslationFormErrors = { services: {}, offers: {} };
  let failed = false;

  const summary = cleanTranslationText(
    read("summary"),
    translationLimits.summary,
    { multiline: false },
  );
  const description = cleanTranslationText(
    read("description"),
    translationLimits.description,
    { multiline: true },
  );
  if (!summary.ok) {
    errors.summary = "too-long";
    failed = true;
  }
  if (!description.ok) {
    errors.description = "too-long";
    failed = true;
  }

  const services: Record<string, ServiceTranslationText> = {};
  for (const serviceId of serviceIds) {
    const name = cleanTranslationText(
      read(serviceFieldName(serviceId, "name")),
      translationLimits.serviceName,
      { multiline: false },
    );
    const text = cleanTranslationText(
      read(serviceFieldName(serviceId, "description")),
      translationLimits.serviceDescription,
      { multiline: false },
    );
    const serviceErrors: { name?: "too-long"; description?: "too-long" } = {};
    if (!name.ok) serviceErrors.name = "too-long";
    if (!text.ok) serviceErrors.description = "too-long";
    if (serviceErrors.name || serviceErrors.description) {
      errors.services[serviceId] = serviceErrors;
      failed = true;
      continue;
    }
    services[serviceId] = {
      name: name.ok ? name.value : null,
      description: text.ok ? text.value : null,
    };
  }

  const offers: Record<string, OfferTranslationText> = {};
  for (const offerId of offerIds) {
    const title = cleanTranslationText(
      read(offerFieldName(offerId, "title")),
      translationLimits.offerTitle,
      { multiline: false },
    );
    const text = cleanTranslationText(
      read(offerFieldName(offerId, "description")),
      translationLimits.offerDescription,
      { multiline: true },
    );
    const offerErrors: { title?: "too-long"; description?: "too-long" } = {};
    if (!title.ok) offerErrors.title = "too-long";
    if (!text.ok) offerErrors.description = "too-long";
    if (offerErrors.title || offerErrors.description) {
      errors.offers[offerId] = offerErrors;
      failed = true;
      continue;
    }
    offers[offerId] = {
      title: title.ok ? title.value : null,
      description: text.ok ? text.value : null,
    };
  }

  if (failed) return { ok: false, errors };
  return {
    ok: true,
    value: {
      summary: summary.ok ? summary.value : null,
      description: description.ok ? description.value : null,
      services,
      offers,
    },
  };
}

export type OverlaySource = {
  summary: string | null;
  description: string | null;
  services: ReadonlyArray<{
    id?: string;
    name: string;
    description: string | null;
  }>;
};

export type WelshFlags = {
  summary: boolean;
  description: boolean;
  /** Indexes into the overlaid services whose name is Welsh. */
  serviceNames: boolean[];
  serviceDescriptions: boolean[];
};

export type OverlayResult<T extends OverlaySource> = {
  value: T;
  welsh: WelshFlags;
};

/**
 * Lays the Welsh text over the English record for a Welsh reader. Each field
 * falls back on its own, and `welsh` says which ones are really Welsh so the
 * page can tag `lang` correctly. English input is returned unchanged.
 */
export function applyWelshOverlay<T extends OverlaySource>(
  source: T,
  translation: BusinessTranslationText,
  serviceIdsByName: ReadonlyMap<string, string>,
): OverlayResult<T> {
  const welsh: WelshFlags = {
    summary: false,
    description: false,
    serviceNames: [],
    serviceDescriptions: [],
  };
  const summary = translation.summary ?? null;
  const description = translation.description ?? null;
  welsh.summary = summary !== null;
  welsh.description = description !== null;

  const services = source.services.map((service) => {
    const id = service.id ?? serviceIdsByName.get(service.name);
    const text = id ? translation.services[id] : undefined;
    const name = text?.name ?? null;
    const body = text?.description ?? null;
    welsh.serviceNames.push(name !== null);
    welsh.serviceDescriptions.push(body !== null);
    return {
      ...service,
      name: name ?? service.name,
      description: body ?? service.description,
    };
  });

  return {
    value: {
      ...source,
      summary: summary ?? source.summary,
      description: description ?? source.description,
      services,
    },
    welsh,
  };
}

/**
 * Lays the Welsh title and description over a list of offers for a Welsh
 * reader. `welsh` flags say which fields are really Welsh, so the page can tag
 * `lang` per field; a missing field keeps its English.
 */
export function applyOfferWelshOverlay<
  T extends { id: string; title: string; description: string },
>(
  offers: readonly T[],
  translation: Pick<BusinessTranslationText, "offers">,
): Array<T & { welshTitle: boolean; welshDescription: boolean }> {
  return offers.map((offer) => {
    const text = translation.offers[offer.id];
    const title = text?.title ?? null;
    const description = text?.description ?? null;
    return {
      ...offer,
      title: title ?? offer.title,
      description: description ?? offer.description,
      welshTitle: title !== null,
      welshDescription: description !== null,
    };
  });
}

export type CoverageItem = {
  key: string;
  label: "summary" | "description" | "service" | "offer";
  serviceName?: string;
  done: boolean;
};

export type WelshCoverage = {
  items: CoverageItem[];
  done: number;
  total: number;
  percent: number;
  state: "none" | "partial" | "complete";
};

/**
 * What is left to translate. Only things the English record actually has
 * count: a business with no long description is not told to translate one.
 */
export function welshCoverage(
  english: {
    summary: string | null;
    description: string | null;
    services: ReadonlyArray<{
      id: string;
      name: string;
      description: string | null;
    }>;
    offers?: ReadonlyArray<{ id: string; title: string }>;
  },
  translation: BusinessTranslationText,
): WelshCoverage {
  const items: CoverageItem[] = [];
  if (english.summary?.trim()) {
    items.push({
      key: "summary",
      label: "summary",
      done: translation.summary !== null,
    });
  }
  if (english.description?.trim()) {
    items.push({
      key: "description",
      label: "description",
      done: translation.description !== null,
    });
  }
  for (const service of english.services) {
    const text = translation.services[service.id];
    items.push({
      key: `service-${service.id}`,
      label: "service",
      serviceName: service.name,
      // A name that needs no translation (a brand, "Reiki") may stay blank,
      // but a described service is not done until its description is Welsh.
      done:
        (text?.name != null || text?.description != null) &&
        (!service.description?.trim() || text?.description != null),
    });
  }
  for (const offer of english.offers ?? []) {
    const text = translation.offers[offer.id];
    items.push({
      key: `offer-${offer.id}`,
      label: "offer",
      serviceName: offer.title,
      done: text?.title != null && text?.description != null,
    });
  }
  const done = items.filter((item) => item.done).length;
  const total = items.length;
  return {
    items,
    done,
    total,
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    state: done === 0 ? "none" : done === total ? "complete" : "partial",
  };
}
