import "server-only";
import { listBusinessesForModeration } from "@/modules/businesses/admin-moderation";
import { listBusinessSuggestions } from "@/modules/businesses/suggestions";
import { listBusinessTickets } from "@/modules/businesses/tickets";
import { listContentReports } from "@/modules/moderation/content-reports";
import {
  businessToDeskItem,
  rankReviewDeskItems,
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

  return { items: rankReviewDeskItems(items, now), unavailable };
}
