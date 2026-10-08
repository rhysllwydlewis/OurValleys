import {
  canUserAccessBusiness,
  type BusinessPermission,
} from "@/modules/businesses/permissions";
import type { ReactNode } from "react";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import styles from "../operations.module.css";

export type I18n = { locale: Locale; t: Translator };

/**
 * Text the server supplies in English only (validation messages, public
 * opening-hours wording) is marked as English inside a Welsh page.
 */
export function englishLang(locale: Locale): string | undefined {
  return locale === "cy" ? LOCALE_DETAILS.en.htmlLang : undefined;
}

export function formatDate(value: Date | null, { locale, t }: I18n): string {
  if (!value) return t("ops.common.notScheduled");
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export function dateInput(value: Date | null): string {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function hidden(name: string, value: string) {
  return <input type="hidden" name={name} value={value} />;
}

/** Placeholder shown while a streamed section loads; keeps the anchor id. */
export function SectionSkeleton({
  id,
  title,
  loadingText,
}: {
  id: string;
  title: string;
  loadingText: string;
}): ReactNode {
  return (
    <section
      className={styles.section}
      id={id}
      aria-labelledby={`${id}-title`}
      aria-busy="true"
    >
      <div className={styles.sectionHeading}>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <p className={styles.empty}>{loadingText}</p>
    </section>
  );
}

export function hasPermission(
  userId: string,
  businessId: string,
  permission: BusinessPermission,
): Promise<boolean> {
  return canUserAccessBusiness({ userId, businessId, permission });
}
