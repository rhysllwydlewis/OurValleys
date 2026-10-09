import { saveBusinessAction } from "@/app/account/saved/actions";

export function SavedBusinessControl({
  businessId,
  returnTo,
  compact = false,
}: {
  businessId: string;
  returnTo: string;
  /** A single button for the website's tool strip instead of a full panel. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <form action={saveBusinessAction} data-print="hide">
        <input name="itemId" type="hidden" value={businessId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button secondary" type="submit">
          Save for later
        </button>
      </form>
    );
  }
  return (
    <section
      aria-labelledby="save-business-heading"
      className="state-panel"
      data-print="hide"
    >
      <p className="eyebrow">Your shortlist</p>
      <h2 id="save-business-heading">Keep this business for later</h2>
      <p>
        Save this public business to your private account list. You will be
        directed to sign in first when needed and returned to this page.
      </p>
      <form action={saveBusinessAction}>
        <input name="itemId" type="hidden" value={businessId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button primary" type="submit">
          Save business
        </button>
      </form>
    </section>
  );
}
