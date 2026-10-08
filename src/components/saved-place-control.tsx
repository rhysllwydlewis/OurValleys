import { savePlaceAction } from "@/app/account/saved/actions";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export async function SavedPlaceControl({
  placeId,
  returnTo,
}: {
  placeId: string;
  returnTo: string;
}) {
  const { t, locale } = await getTranslator();
  return (
    <section
      aria-labelledby="save-place-heading"
      className="state-panel"
      lang={LOCALE_DETAILS[locale].htmlLang}
    >
      <p className="eyebrow">{t("savedPlace.eyebrow")}</p>
      <h2 id="save-place-heading">{t("savedPlace.title")}</h2>
      <p>{t("savedPlace.body")}</p>
      <form action={savePlaceAction}>
        <input name="itemId" type="hidden" value={placeId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button primary" type="submit">
          {t("savedPlace.save")}
        </button>
      </form>
    </section>
  );
}
