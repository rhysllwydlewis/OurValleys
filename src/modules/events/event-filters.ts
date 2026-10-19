import { parseEventDay, parseEventWhen, type EventWhen } from "./date-window";
import { parseEventMonth } from "./month";

export type EventFilters = {
  q: string;
  category: string;
  place: string;
  when: EventWhen | null;
  /** One London calendar day, `YYYY-MM-DD`. */
  day: string | null;
  /** `month` shows the calendar grid; `list` (the default) the agenda. */
  view: "list" | "month";
  /** The calendar month, `YYYY-MM`; only meaningful in the month view. */
  month: string | null;
  page: number;
};

export type RawEventParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export function parseEventPage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

/**
 * Reads the events URL state. A picked day and a quick range are mutually
 * exclusive: a day is more specific, so it wins, which also keeps hand-edited
 * URLs from carrying two date choices.
 */
export function parseEventFilters(params: RawEventParams): EventFilters {
  const day = parseEventDay(first(params.day));
  const view = first(params.view) === "month" ? "month" : "list";
  return {
    q: first(params.q).slice(0, 80),
    category: first(params.category).slice(0, 80),
    place: first(params.place).slice(0, 80),
    // The month view is chosen by month, so a quick range does not apply.
    when: day || view === "month" ? null : parseEventWhen(first(params.when)),
    day,
    view,
    month: view === "month" ? parseEventMonth(first(params.month)) : null,
    page: parseEventPage(first(params.page)),
  };
}

function toParams(filters: Partial<EventFilters>): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.view === "month") {
    params.set("view", "month");
    if (filters.month) params.set("month", filters.month);
  }
  if (filters.day) params.set("day", filters.day);
  else if (filters.when) params.set("when", filters.when);
  return params;
}

/** The `/events` link for a filter state; defaults are omitted. */
export function eventsHref(filters: Partial<EventFilters>): string {
  const params = toParams(filters);
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

/**
 * The query string for the subscribable calendar feed. The feed has no day
 * filter, so a picked day is left out rather than silently narrowing it.
 */
export function eventsFeedQuery(filters: Partial<EventFilters>): string {
  const params = toParams({
    ...filters,
    day: null,
    view: "list",
    month: null,
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** Replaces some filters and returns to page one. */
export function withEventFilters(
  filters: EventFilters,
  change: Partial<EventFilters>,
): EventFilters {
  return { ...filters, ...change, page: 1 };
}

export function activeEventFilterCount(filters: EventFilters): number {
  return [
    filters.q,
    filters.category,
    filters.place,
    filters.when,
    filters.day,
  ].filter(Boolean).length;
}
