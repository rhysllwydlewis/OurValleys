"use client";

import { useLocale } from "@/lib/i18n/client";

/**
 * Validation message for one control. Server-supplied messages are English
 * only, so they are marked as English inside a Welsh page. Pair with
 * `fieldA11yProps` on the control using the same id.
 */
export function FieldError({
  id,
  message,
  className,
}: {
  id: string;
  message: string | null | undefined;
  className?: string;
}) {
  const { locale } = useLocale();
  if (!message) return null;
  return (
    <p
      id={id}
      className={className}
      lang={locale === "cy" ? "en-GB" : undefined}
    >
      {message}
    </p>
  );
}
