import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  isTerminalTicketStatus,
  rankTickets,
  resolutionActionLabels,
  summariseTickets,
  ticketStatusLabels,
  ticketTypeLabels,
  type TicketStatus,
} from "@/modules/businesses/ticket-desk";
import {
  listTicketsForDesk,
  parseTicketListScope,
  type TicketListScope,
} from "@/modules/businesses/ticket-desk-data";
import {
  formatAge,
  urgencyLabels,
  type ReviewDeskUrgency,
} from "@/modules/admin/review-desk";
import type { TicketResolutionAction } from "@/modules/businesses/tickets";
import { readAdminSession } from "@/modules/identity/admin-access";
import styles from "../admin.module.css";
import desk from "./tickets.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claims and corrections" };

const scopeLabels: Record<TicketListScope, string> = {
  active: "Needs action",
  closed: "Closed",
  all: "Everything",
};

function urgencyTone(urgency: ReviewDeskUrgency | null): string {
  if (urgency === "overdue") return styles.toneDanger ?? "";
  if (urgency === "due_soon") return styles.toneWarning ?? "";
  return styles.toneNeutral ?? "";
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; type?: string }>;
}) {
  if (!(await readAdminSession())) {
    return (
      <div className={styles.emptyState} role="alert">
        Tickets are available to signed-in platform admins only.
      </div>
    );
  }
  const params = await searchParams;
  const scope = parseTicketListScope(params.scope);
  const typeFilter =
    params.type && params.type in ticketTypeLabels
      ? (params.type as keyof typeof ticketTypeLabels)
      : null;
  const result = await listTicketsForDesk(scope);
  const ranked = rankTickets(result.tickets, new Date());
  const summary = summariseTickets(ranked);
  const visible = typeFilter
    ? ranked.filter((ticket) => ticket.type === typeFilter)
    : ranked;
  const href = (next: { scope?: TicketListScope; type?: string | null }) => {
    const query = new URLSearchParams();
    const nextScope = next.scope ?? scope;
    const nextType = next.type === undefined ? typeFilter : next.type;
    if (nextScope !== "active") query.set("scope", nextScope);
    if (nextType) query.set("type", nextType);
    const text = query.toString();
    return (text ? `/admin/tickets?${text}` : "/admin/tickets") as Route;
  };

  return (
    <section aria-labelledby="tickets-heading">
      <h2 id="tickets-heading">Claims, corrections and conflicts</h2>
      <p className={styles.hint}>
        Suggestions never overwrite public business information directly. Open a
        ticket to see who is asking, what would change and what each decision
        does before you choose. Most pressing first; every decision is recorded
        in the ticket history and the audit log.
      </p>

      {result.state === "ready" && scope !== "closed" ? (
        <div className={desk.summaryRow} role="group" aria-label="Summary">
          <Link className={desk.summaryTile} href={href({ scope: "active" })}>
            <strong>{summary.open}</strong>
            <span>Open</span>
          </Link>
          <div className={desk.summaryTile} data-alert={summary.overdue > 0}>
            <strong>{summary.overdue}</strong>
            <span>Overdue</span>
          </div>
          <div className={desk.summaryTile}>
            <strong>{summary.highRisk}</strong>
            <span>High risk</span>
          </div>
          <div className={desk.summaryTile}>
            <strong>{summary.awaitingInformation}</strong>
            <span>Awaiting information</span>
          </div>
        </div>
      ) : null}

      <nav className={styles.filterBar} aria-label="Ticket scope">
        {(Object.keys(scopeLabels) as TicketListScope[]).map((value) => (
          <Link
            key={value}
            href={href({ scope: value })}
            aria-current={scope === value ? "page" : undefined}
            className={`${styles.filterLink} ${scope === value ? styles.filterLinkActive : ""}`}
          >
            {scopeLabels[value]}
          </Link>
        ))}
      </nav>
      <nav className={styles.filterBar} aria-label="Ticket type">
        <Link
          href={href({ type: null })}
          aria-current={!typeFilter ? "page" : undefined}
          className={`${styles.filterLink} ${!typeFilter ? styles.filterLinkActive : ""}`}
        >
          All types
        </Link>
        {(
          Object.keys(ticketTypeLabels) as (keyof typeof ticketTypeLabels)[]
        ).map((value) => (
          <Link
            key={value}
            href={href({ type: value })}
            aria-current={typeFilter === value ? "page" : undefined}
            className={`${styles.filterLink} ${typeFilter === value ? styles.filterLinkActive : ""}`}
          >
            {ticketTypeLabels[value]}
            {scope !== "closed" && summary.byType[value] > 0
              ? ` (${summary.byType[value]})`
              : ""}
          </Link>
        ))}
      </nav>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState} role="alert">
          Tickets are temporarily unavailable. No records were changed.
        </div>
      ) : visible.length === 0 ? (
        <div className={styles.emptyState}>
          {scope === "active"
            ? "Nothing is waiting on you here. New claims, corrections and conflicts appear as they arrive."
            : "No tickets match this view."}
        </div>
      ) : (
        <ul className={desk.ticketList}>
          {visible.map((ticket) => {
            const closed = isTerminalTicketStatus(ticket.status);
            const status = ticket.status as TicketStatus;
            return (
              <li
                key={ticket.id}
                className={desk.ticketCard}
                data-urgency={ticket.urgency ?? undefined}
                data-closed={closed}
              >
                <div className={desk.cardHead}>
                  <span className={`${styles.pill} ${styles.toneNeutral}`}>
                    {ticketTypeLabels[ticket.type]}
                  </span>
                  {ticket.riskLevel === "high" ? (
                    <span className={`${styles.pill} ${styles.toneDanger}`}>
                      High risk
                    </span>
                  ) : null}
                  {ticket.urgency ? (
                    <span
                      className={`${styles.pill} ${urgencyTone(ticket.urgency)}`}
                    >
                      {urgencyLabels[ticket.urgency]}
                    </span>
                  ) : (
                    <span className={`${styles.pill} ${styles.toneNeutral}`}>
                      {ticketStatusLabels[status] ?? ticket.status}
                    </span>
                  )}
                  <span
                    className={desk.cardAge}
                    title={formatDate(ticket.createdAt)}
                  >
                    {formatAge(ticket.ageHours)} old
                  </span>
                </div>
                <h3 className={desk.cardTitle}>
                  <Link href={`/admin/tickets/${ticket.id}` as Route}>
                    {ticket.businessName}
                    {ticket.relatedBusinessName
                      ? ` and ${ticket.relatedBusinessName}`
                      : ""}
                  </Link>
                </h3>
                <p className={desk.cardText}>
                  {ticket.reason.length > 240
                    ? `${ticket.reason.slice(0, 237)}…`
                    : ticket.reason}
                </p>
                <div className={desk.cardFoot}>
                  <Link
                    className="button primary"
                    href={`/admin/tickets/${ticket.id}` as Route}
                  >
                    {closed ? "View decision" : "Review and decide"}
                  </Link>
                  {closed && ticket.resolutionAction ? (
                    <span className={desk.muted}>
                      {ticketStatusLabels[status] ?? ticket.status}:{" "}
                      {resolutionActionLabels[
                        ticket.resolutionAction as TicketResolutionAction
                      ] ?? ticket.resolutionAction}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
