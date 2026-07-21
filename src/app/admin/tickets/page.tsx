import type { Metadata, Route } from "next";
import Link from "next/link";
import { listBusinessTickets } from "@/modules/businesses/tickets";
import styles from "../admin.module.css";
import { TicketActions } from "./ticket-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Claims and corrections" };

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
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = [
    "open",
    "awaiting_information",
    "approved",
    "rejected",
    "resolved",
    "dismissed",
  ].includes(status ?? "")
    ? status
    : undefined;
  const result = await listBusinessTickets(filter);

  return (
    <section>
      <h2>Claims, corrections and conflict tickets</h2>
      <p>
        Suggestions never overwrite public business information directly. Review the
        evidence and choose an audited action.
      </p>
      <div className={styles.filterBar}>
        {[
          "open",
          "awaiting_information",
          "approved",
          "rejected",
          "resolved",
          "dismissed",
        ].map((value) => (
          <Link
            key={value}
            href={`/admin/tickets?status=${value}` as Route}
            aria-current={filter === value ? "page" : undefined}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {value.replaceAll("_", " ")}
          </Link>
        ))}
        <Link
          href={"/admin/tickets" as Route}
          aria-current={!filter ? "page" : undefined}
          className={`${styles.filterLink} ${!filter ? styles.filterLinkActive : ""}`}
        >
          All
        </Link>
      </div>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Tickets are temporarily unavailable. No records were changed.
        </div>
      ) : result.tickets.length === 0 ? (
        <div className={styles.emptyState}>No tickets match this filter.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Type and evidence</th>
                <th>Risk/status</th>
                <th>Received</th>
                <th>Resolution</th>
              </tr>
            </thead>
            <tbody>
              {result.tickets.map((ticket) => {
                const terminal = ["approved", "rejected", "resolved", "dismissed"].includes(
                  ticket.status,
                );
                return (
                  <tr key={ticket.id}>
                    <td>
                      <Link
                        className={styles.rowLink}
                        href={`/admin/businesses/${ticket.businessId}` as Route}
                      >
                        {ticket.businessName}
                      </Link>
                      {ticket.relatedBusinessName ? (
                        <p>Related: {ticket.relatedBusinessName}</p>
                      ) : null}
                    </td>
                    <td>
                      <strong>{ticket.type.replaceAll("_", " ")}</strong>
                      <p>{ticket.reason}</p>
                      {ticket.reporterEmail ? <p>Reply: {ticket.reporterEmail}</p> : null}
                      {ticket.evidence ? (
                        <details>
                          <summary>Structured evidence</summary>
                          <pre>{JSON.stringify(ticket.evidence, null, 2)}</pre>
                        </details>
                      ) : null}
                    </td>
                    <td>
                      <span className={styles.pill}>{ticket.riskLevel}</span>
                      <p>{ticket.status.replaceAll("_", " ")}</p>
                    </td>
                    <td>{formatDate(ticket.createdAt)}</td>
                    <td>
                      <TicketActions
                        ticketId={ticket.id}
                        type={ticket.type}
                        hasReporterUser={Boolean(ticket.reporterUserId)}
                        hasRelatedBusiness={Boolean(ticket.relatedBusinessId)}
                        terminal={terminal}
                      />
                      {ticket.resolutionNote ? <p>{ticket.resolutionNote}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
