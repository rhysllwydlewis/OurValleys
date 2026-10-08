import { saveEventAction } from "@/app/account/saved/actions";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export async function SavedEventControl({
  eventId,
  returnTo,
}: {
  eventId: string;
  returnTo: string;
}) {
  const { t, locale } = await getTranslator();
  return (
    <section
      aria-labelledby="save-event-heading"
      className="state-panel"
      lang={LOCALE_DETAILS[locale].htmlLang}
    >
      <p className="eyebrow">{t("savedEvent.eyebrow")}</p>
      <h2 id="save-event-heading">{t("savedEvent.title")}</h2>
      <p>{t("savedEvent.body")}</p>
      <form action={saveEventAction}>
        <input name="itemId" type="hidden" value={eventId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button primary" type="submit">
          {t("savedEvent.save")}
        </button>
      </form>
    </section>
  );
}
