import "server-only";
import { listBusinessesForModeration } from "@/modules/businesses/admin-moderation";
import { listBusinessSuggestions } from "@/modules/businesses/suggestions";
import { listBusinessTickets } from "@/modules/businesses/tickets";
import { listContentReports } from "@/modules/moderation/content-reports";
import {
  businessToDeskItem,
  rankReviewDeskItems,
  reviewDeskKinds,
  reportToDeskItem,
  suggestionToDeskItem,
  ticketToDeskItem,
  type RankedReviewDeskItem,
  type ReviewDeskItem,
  type ReviewDeskKind,
} from "./review-desk";

export type ReviewDeskResult = {
  items: RankedReviewDeskItem[];
  /** Sources that could not be read; their items are missing, not zero. */
  unavailable: ReviewDeskKind[];
  /**
   * Sources whose reader returned its row limit, so older items may be
   * missing and counts are a lower bound.
   */
  capped: ReviewDeskKind[];
};

/** The readers cap their results; at the cap we cannot know about more. */
const readerLimits: Record<ReviewDeskKind, number> = {
  business: 200,
  ticket: 250,
  report: 200,
  suggestion: 200,
};

/**
 * Collects open work from every admin queue. Each source degrades on its own,
 * so one failing reader never hides the others, and the page says which
 * source is missing rather than showing a falsely empty desk.
 */
export async function loadReviewDesk(
  now: Date = new Date(),
): Promise<ReviewDeskResult> {
  const [businesses, tickets, reports, suggestions] = await Promise.all([
    listBusinessesForModeration("pending_review"),
    listBusinessTickets("open"),
    listContentReports("open"),
    listBusinessSuggestions("new"),
  ]);

  const unavailable: ReviewDeskKind[] = [];
  const capped: ReviewDeskKind[] = [];
  const items: ReviewDeskItem[] = [];

  if (businesses.state === "ready") {
    items.push(...businesses.businesses.map(businessToDeskItem));
  } else unavailable.push("business");

  if (tickets.state === "ready") {
    items.push(...tickets.tickets.map(ticketToDeskItem));
  } else unavailable.push("ticket");

  if (reports.state === "ready") {
    items.push(...reports.reports.map(reportToDeskItem));
  } else unavailable.push("report");

  if (suggestions.state === "ready") {
    items.push(...suggestions.suggestions.map(suggestionToDeskItem));
  } else unavailable.push("suggestion");

  for (const kind of reviewDeskKinds) {
    if (
      items.filter((entry) => entry.kind === kind).length >= readerLimits[kind]
    ) {
      capped.push(kind);
    }
  }

  return { items: rankReviewDeskItems(items, now), unavailable, capped };
}
