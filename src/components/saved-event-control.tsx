import { saveEventAction } from "@/app/account/saved/actions";

export function SavedEventControl({
  eventId,
  returnTo,
}: {
  eventId: string;
  returnTo: string;
}) {
  return (
    <section aria-labelledby="save-event-heading" className="state-panel">
      <p className="eyebrow">Your shortlist</p>
      <h2 id="save-event-heading">Keep this event for later</h2>
      <p>
        Save this public event to your private account list. You will be
        directed to sign in first when needed and returned to this page.
      </p>
      <form action={saveEventAction}>
        <input name="itemId" type="hidden" value={eventId} />
        <input name="returnTo" type="hidden" value={returnTo} />
        <button className="button primary" type="submit">
          Save event
        </button>
      </form>
    </section>
  );
}
