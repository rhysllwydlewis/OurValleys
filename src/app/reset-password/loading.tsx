import { AuthShell } from "@/components/auth/auth-shell";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export default async function ResetPasswordLoading() {
  const { locale, t } = await getTranslator();
  return (
    <AuthShell
      busy
      idPrefix="reset-loading"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("brand.home")}
      eyebrow={t("loading.reset.eyebrow")}
      title={t("loading.reset.title")}
    >
      <div className="skeleton-card" aria-hidden="true" />
      <span className="sr-only">{t("loading.reset.hint")}</span>
    </AuthShell>
  );
}
