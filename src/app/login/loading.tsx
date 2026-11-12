import { AuthShell } from "@/components/auth/auth-shell";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export default async function LoginLoading() {
  const { locale, t } = await getTranslator();
  return (
    <AuthShell
      idPrefix="login-loading"
      htmlLang={LOCALE_DETAILS[locale].htmlLang}
      brandLabel={t("brand.home")}
      eyebrow={t("loading.login.eyebrow")}
      title={t("loading.login.title")}
      busy
    >
      {/* The same frame as the page, so nothing jumps when it arrives. */}
      <div className="skeleton-card" aria-hidden="true" />
      <span className="sr-only">{t("loading.login.hint")}</span>
    </AuthShell>
  );
}
