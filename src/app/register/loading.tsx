import { AuthShell } from "@/components/auth/auth-shell";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export default async function RegisterLoading() {
  const { locale, t } = await getTranslator();
  return (
    <AuthShell
      busy
      idPrefix="register-loading"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("brand.home")}
      eyebrow={t("loading.register.eyebrow")}
      title={t("loading.register.title")}
    >
      <div className="skeleton-card" aria-hidden="true" />
      <span className="sr-only">{t("loading.register.hint")}</span>
    </AuthShell>
  );
}
