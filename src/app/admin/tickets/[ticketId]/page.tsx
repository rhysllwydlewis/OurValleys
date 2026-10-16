import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { formatAge, ageInHours } from "@/modules/admin/review-desk";
import {
  actionGuide,
  correctionRows,
  describeEvidence,
  isTerminalTicketStatus,
  proposedSlugFromEvidence,
  resolutionActionLabels,
  ticketCautions,
  ticketStatusLabels,
  ticketTypeLabels,
  type TicketStatus,
} from "@/modules/businesses/ticket-desk";
import { getTicketDeskDetail } from "@/modules/businesses/ticket-desk-data";
import { readAdminSession } from "@/modules/identity/admin-access";
import admin from "../../admin.module.css";
import { statusLabel } from "../../status-tone";
import styles from "../tickets.module.css";
import { ResolvePanel } from "./resolve-panel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ticket" };

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

const historyLabels: Record<string, string> = {
  ...resolutionActionLabels,
  created: "Ticket opened",
};

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const { ticketId } = await params;
  const parsed = z.uuid().safeParse(ticketId);
  if (!parsed.success) notFound();

  // The layout already shows non-admins a notice, but this page reads
  // people's email addresses, so it checks for itself.
  const adminSession = await readAdminSession();
  if (!adminSession) {
    return (
      <div className={admin.emptyState} role="alert">
        Ticket details are available to signed-in platform admins only.
      </div>
    );
  }

  const result = await getTicketDeskDetail(parsed.data);
  if (result.state === "missing") notFound();
  if (result.state === "unavailable") {
    return (
      <div className={admin.emptyState} role="alert">
        This ticket is temporarily unavailable. No records were changed.{" "}
        <Link href={"/admin/tickets" as Route}>Back to tickets</Link>
      </div>
    );
  }

  const {
    ticket,
    business,
    related,
    claimant,
    team,
    otherOpenTickets,
    history,
  } = result.detail;
  const terminal = isTerminalTicketStatus(ticket.status);
  const status = ticket.status as TicketStatus;
  const activeOwners = team.filter(
    (member) => member.role === "owner" && member.status === "active",
  );
  const claimantAlreadyManages = Boolean(
    claimant &&
    team.some(
      (member) =>
        member.userId === claimant.userId && member.status === "active",
    ),
  );
  const options = actionGuide({
    type: ticket.type,
    status: ticket.status,
    resolutionAction: ticket.resolutionAction,
    businessName: business.name,
    businessSlug: business.slug,
    relatedBusinessName: related?.name ?? null,
    hasRelatedBusiness: Boolean(related),
    claimantName: claimant?.name ?? null,
    hasClaimant: Boolean(claimant),
    claimantAlreadyManages,
    currentOwnerCount: activeOwners.length,
    evidence: ticket.evidence,
    current: business.current,
  });
  const cautions = ticketCautions({
    type: ticket.type,
    status: ticket.status,
    hasClaimant: Boolean(claimant),
    claimantAlreadyManages,
    claimantEmailVerified: claimant?.emailVerified ?? null,
    currentOwnerCount: activeOwners.length,
    otherOpenTicketCount: otherOpenTickets.length,
  });
  const evidence = describeEvidence(ticket.evidence);
  const corrections =
    ticket.type === "correction"
      ? correctionRows(ticket.evidence, business.current)
      : [];
  const proposedSlug =
    ticket.type === "slug_change"
      ? proposedSlugFromEvidence(ticket.evidence)
      : null;
  const age = formatAge(ageInHours(ticket.createdAt, new Date()));

  return (
    <section aria-labelledby="ticket-heading">
      <Link className={styles.crumb} href={"/admin/tickets" as Route}>
        ← All tickets
      </Link>
      <div className={styles.detailHead}>
        <div className={styles.chips}>
          <span className={`${admin.pill} ${admin.toneNeutral}`}>
            {ticketTypeLabels[ticket.type]}
          </span>
          <span
            className={`${admin.pill} ${terminal ? admin.toneSuccess : admin.toneWarning}`}
          >
            {ticketStatusLabels[status] ?? statusLabel(ticket.status)}
          </span>
          {ticket.riskLevel === "high" ? (
            <span className={`${admin.pill} ${admin.toneDanger}`}>
              High risk
            </span>
          ) : null}
          <span className={styles.muted}>
            Received {formatDateTime(ticket.createdAt)} ({age} ago)
          </span>
        </div>
        <h2 id="ticket-heading">
          {business.name}
          {related ? ` and ${related.name}` : ""}
        </h2>
      </div>

      {terminal ? (
        <p className={styles.outcomeOk} role="note">
          <strong>
            {ticketStatusLabels[status] ?? ticket.status}
            {ticket.resolutionAction
              ? `: ${historyLabels[ticket.resolutionAction] ?? ticket.resolutionAction}`
              : ""}
          </strong>
          {ticket.resolvedAt
            ? ` on ${formatDateTime(ticket.resolvedAt)}${ticket.resolvedByName ? ` by ${ticket.resolvedByName}` : ""}`
            : ""}
          .{ticket.resolutionNote ? ` Note: ${ticket.resolutionNote}` : ""}
        </p>
      ) : null}

      <div className={styles.layout}>
        <div>
          <article className={styles.panel} aria-labelledby="ticket-request">
            <h3 id="ticket-request">The request</h3>
            <blockquote className={styles.quote}>{ticket.reason}</blockquote>

            {evidence.rows.length > 0 ? (
              <>
                <h4>Evidence supplied</h4>
                <dl className={styles.facts}>
                  {evidence.rows.map((row) => (
                    <div key={row.label} style={{ display: "contents" }}>
                      <dt>{row.label}</dt>
                      <dd>{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : null}

            {corrections.length > 0 ? (
              <>
                <h4>Proposed changes to the public page</h4>
                <table className={styles.compare}>
                  <thead>
                    <tr>
                      <th scope="col">Field</th>
                      <th scope="col">Public now</th>
                      <th scope="col">Proposed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corrections.map((row) => (
                      <tr key={row.field}>
                        <th scope="row">{row.label}</th>
                        <td
                          className={
                            row.changes ? undefined : styles.compareSame
                          }
                        >
                          {row.current ?? "Empty"}
                        </td>
                        <td
                          className={
                            row.changes ? styles.compareNew : styles.compareSame
                          }
                        >
                          {row.proposed ?? "Remove"}
                          {row.changes ? "" : " (no change)"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : ticket.type === "correction" ? (
              <p className={styles.muted}>
                This report describes a problem but proposes no structured
                change, so nothing can be applied automatically.
              </p>
            ) : null}

            {ticket.type === "slug_change" ? (
              <dl className={styles.facts}>
                <dt>Current address</dt>
                <dd>/b/{business.slug}</dd>
                <dt>Proposed address</dt>
                <dd>{proposedSlug ? `/b/${proposedSlug}` : "None valid"}</dd>
              </dl>
            ) : null}

            {evidence.other ? (
              <details>
                <summary>All other details</summary>
                <pre className={admin.rawJson}>
                  {JSON.stringify(evidence.other, null, 2)}
                </pre>
              </details>
            ) : null}
          </article>

          <article className={styles.panel} aria-labelledby="ticket-people">
            <h3 id="ticket-people">Who and what is involved</h3>
            <h4>{ticket.type === "claim" ? "Claimant" : "Reported by"}</h4>
            {claimant ? (
              <dl className={styles.facts}>
                <dt>Name</dt>
                <dd>{claimant.name}</dd>
                <dt>Email</dt>
                <dd>
                  {claimant.email}{" "}
                  <span
                    className={`${admin.pill} ${claimant.emailVerified ? admin.toneSuccess : admin.toneWarning}`}
                  >
                    {claimant.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </dd>
                <dt>Member since</dt>
                <dd>{formatDateTime(claimant.memberSince)}</dd>
              </dl>
            ) : ticket.reporterEmail ? (
              <p>Not signed in. Reply address: {ticket.reporterEmail}</p>
            ) : (
              <p className={styles.muted}>
                {ticket.reporterUserId
                  ? "This account has since been deleted."
                  : "Anonymous report with no reply address."}
              </p>
            )}

            <h4>{business.name}</h4>
            <dl className={styles.facts}>
              <dt>Status</dt>
              <dd>{statusLabel(business.status)}</dd>
              <dt>Ownership</dt>
              <dd>{statusLabel(business.claimStatus)}</dd>
              <dt>Page</dt>
              <dd>
                <Link href={`/admin/businesses/${business.id}` as Route}>
                  Open in admin
                </Link>
                {business.status === "published" ? (
                  <>
                    {" · "}
                    <Link href={`/b/${business.slug}` as Route}>
                      View public page
                    </Link>
                  </>
                ) : null}
              </dd>
            </dl>
            <h4>Team now</h4>
            {team.length === 0 ? (
              <p className={styles.muted}>Nobody has access yet.</p>
            ) : (
              <ul className={styles.people}>
                {team.map((member) => (
                  <li key={member.userId}>
                    <strong>{member.name}</strong>
                    <span>{statusLabel(member.role)}</span>
                    <span className={styles.muted}>
                      {member.email}
                      {member.status === "active"
                        ? ""
                        : ` (${statusLabel(member.status).toLowerCase()})`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {related ? (
              <>
                <h4>Related business</h4>
                <dl className={styles.facts}>
                  <dt>Name</dt>
                  <dd>
                    <Link href={`/admin/businesses/${related.id}` as Route}>
                      {related.name}
                    </Link>
                  </dd>
                  <dt>Status</dt>
                  <dd>{statusLabel(related.status)}</dd>
                  <dt>Address</dt>
                  <dd>/b/{related.slug}</dd>
                  <dt>Team members</dt>
                  <dd>{related.teamCount}</dd>
                </dl>
              </>
            ) : null}
          </article>
        </div>

        <aside className={styles.decision} aria-label="Decision">
          <div className={styles.panel}>
            <h3>{terminal ? "Decision made" : "Your decision"}</h3>
            {cautions.length > 0 ? (
              <ul
                className={styles.cautions}
                aria-label="Check before deciding"
              >
                {cautions.map((caution) => (
                  <li key={caution}>{caution}</li>
                ))}
              </ul>
            ) : null}
            <ResolvePanel
              ticketId={ticket.id}
              options={options}
              terminal={terminal}
            />
          </div>

          {otherOpenTickets.length > 0 ? (
            <div className={styles.panel}>
              <h3>Also waiting on this business</h3>
              <ul className={styles.people}>
                {otherOpenTickets.map((other) => (
                  <li key={other.id}>
                    <Link href={`/admin/tickets/${other.id}` as Route}>
                      {ticketTypeLabels[other.type]}
                    </Link>
                    <span className={styles.muted}>
                      {formatDateTime(other.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className={styles.panel} aria-labelledby="ticket-history">
            <h3 id="ticket-history">History</h3>
            {history.length === 0 ? (
              <p className={styles.muted}>
                No decisions yet. Received {formatDateTime(ticket.createdAt)}.
              </p>
            ) : (
              <ol className={styles.timeline}>
                {history.map((entry) => (
                  <li key={entry.id}>
                    <strong>
                      {historyLabels[entry.action] ?? statusLabel(entry.action)}
                    </strong>{" "}
                    <span className={styles.muted}>
                      {entry.actorName ?? "A former admin"} ·{" "}
                      {formatDateTime(entry.createdAt)}
                    </span>
                    {entry.note && entry.action !== "created" ? (
                      <p>{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
