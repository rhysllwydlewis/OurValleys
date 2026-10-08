/**
 * The owner forms always submit a default action label ("View offer"), but the
 * offer rules say a label needs a link to point at. Without a link the label is
 * dropped, so an offer with no link can be created and edited instead of every
 * submission being refused as invalid.
 */
export function normaliseOfferAction(input: {
  label: string | null | undefined;
  url: string | null | undefined;
}): { actionLabel: string | null; actionUrl: string | null } {
  const actionUrl = input.url?.trim() ? input.url.trim() : null;
  const label = input.label?.trim() ? input.label.trim() : null;
  return { actionLabel: actionUrl ? label : null, actionUrl };
}
