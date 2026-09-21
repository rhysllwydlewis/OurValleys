import { savePlaceAction } from "@/app/account/saved/actions";

export function SavedPlaceControl({
  placeId,
  returnTo,
}: {
  placeId: string;
  returnTo: string;
}) {
  return (
    <section aria-labelledby="save-place-heading" className="state-panel">
      <p className="eyebrow">Your shortlist</p>
      <h2 id="save-place-heading">Keep this place for later</h2>
      <p>
        Save this area to your private account list. You will be directed to
        sign in first when needed and returned to this page.
      </p>
      <form action={savePlaceAction}>
        <input name="itemId" type="hidden" value={placeId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button primary" type="submit">
          Save place
        </button>
      </form>
    </section>
  );
}
