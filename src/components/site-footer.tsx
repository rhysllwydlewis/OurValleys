import Link from "next/link";
import { SiteFooterAccountLink } from "@/components/site-nav";
import { getTranslator } from "@/lib/i18n/server";

export async function SiteFooter() {
  const { t } = await getTranslator();

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__brand">
          <strong className="ov-display">OurValleys</strong>
          <p>{t("footer.tagline")}</p>
        </div>
        <nav aria-label={t("footer.navigation")}>
          <Link href="/businesses">{t("footer.browseBusinesses")}</Link>
          <Link href="/places">{t("footer.explorePlaces")}</Link>
          <Link href="/events">{t("footer.localEvents")}</Link>
          <Link href="/offers">{t("footer.localOffers")}</Link>
          <Link href="/news">{t("footer.latestNews")}</Link>
          <Link href="/guides">{t("footer.localGuides")}</Link>
          <Link href="/suggest-a-business">{t("footer.suggestBusiness")}</Link>
          <SiteFooterAccountLink />
        </nav>
        <nav aria-label={t("footer.policies")}>
          <Link href="/policies/privacy">{t("footer.privacy")}</Link>
          <Link href="/policies/terms">{t("footer.terms")}</Link>
          <Link href="/policies/accessibility">
            {t("footer.accessibility")}
          </Link>
          <Link href="/policies/content-guidelines">
            {t("footer.contentGuidelines")}
          </Link>
          <Link href="/policies/corrections">{t("footer.corrections")}</Link>
          <Link href="/policies/advertising">{t("footer.advertising")}</Link>
        </nav>
      </div>
      <div className="site-footer__legal">
        <p>{t("footer.legal")}</p>
      </div>
    </footer>
  );
}
