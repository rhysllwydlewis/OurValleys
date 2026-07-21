import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getBusinessModerationDetail } from "@/modules/businesses/admin-moderation";
import styles from "../../admin.module.css";
import { statusLabel, statusTone } from "../../status-tone";
import { ModerationPanel } from "./moderation-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business details",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminBusinessDetailPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const parsed = z.uuid().safeParse(businessId);
  if (!parsed.success) notFound();

  const result = await getBusinessModerationDetail(parsed.data);
  if (result.state === "missing") notFound();

  if (result.state === "unavailable") {
    return (
      <div className={styles.emptyState}>
        This business is temporarily unavailable. Please try again shortly.
      </div>
    );
  }

  const { business } = result;

  return (
    <section>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{business.categoryName}</p>
          <h2>{business.tradingName}</h2>
        </div>
        <span
          className={`${styles.pill} ${styles[statusTone(business.status)]}`}
        >
          {statusLabel(business.status)}
        </span>
      </div>

      <div className={styles.card}>
        <p>{business.summary}</p>
        <dl className="compact-facts">
          <div>
            <dt>Owners</dt>
            <dd>
              {business.owners.length > 0
                ? business.owners.map((owner) => owner.email).join(", ")
                : "None"}
            </dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{formatDateTime(business.updatedAt)}</dd>
          </div>
          {business.publication ? (
            <>
              <div>
                <dt>Submitted</dt>
                <dd>
                  {business.publication.submittedAt
                    ? formatDateTime(business.publication.submittedAt)
                    : "Not submitted"}
                  {business.publication.submittedBy
                    ? ` by ${business.publication.submittedBy.email}`
                    : ""}
                </dd>
              </div>
              <div>
                <dt>Last reviewed</dt>
                <dd>
                  {business.publication.reviewedAt
                    ? formatDateTime(business.publication.reviewedAt)
                    : "Not yet reviewed"}
                  {business.publication.reviewedBy
                    ? ` by ${business.publication.reviewedBy.email}`
                    : ""}
                </dd>
              </div>
              {business.publication.moderationNote ? (
                <div>
                  <dt>Reviewer note</dt>
                  <dd>{business.publication.moderationNote}</dd>
                </div>
              ) : null}
            </>
          ) : null}
          {business.suspension.suspendedAt ? (
            <div>
              <dt>Suspended</dt>
              <dd>
                {formatDateTime(business.suspension.suspendedAt)}
                {business.suspension.suspendedBy
                  ? ` by ${business.suspension.suspendedBy.email}`
                  : ""}
                {business.suspension.reason
                  ? ` — ${business.suspension.reason}`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      {business.onboardingDraft ? (
        <div className={`${styles.card} ${styles.spaced}`}>
          <h3>Owner-submitted draft</h3>
          <pre className={styles.rawJson}>
            {JSON.stringify(business.onboardingDraft, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className={styles.spaced}>
        <ModerationPanel businessId={business.id} status={business.status} />
      </div>
    </section>
  );
}
