import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { savedSearch } from "@/lib/database/schema/saved-search";
import { sendTransactionalEmail } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/notification-unsubscribe";
import { getSiteUrl } from "@/lib/site";
import { parseSearchType } from "@/modules/search/search-filters";
import {
  alertableNewCount,
  MAX_SAVED_SEARCHES,
  savedSearchHref,
} from "./saved-search-model";
import { countResults } from "./saved-searches";

export type SearchAlertItem = {
  id: string;
  query: string;
  href: string;
  newCount: number;
  total: number;
};

/**
 * Plain-text body only: the resident's own search words, how many results are
 * new and a link back to the search, plus the one-click unsubscribe link. No
 * business content is copied into the email.
 */
export function composeSearchAlertEmail(
  items: SearchAlertItem[],
  unsubscribeUrl: string,
  siteUrl: URL = getSiteUrl(),
): { subject: string; text: string } {
  const lines: string[] = ["New results for the searches you saved.", ""];
  for (const item of items) {
    lines.push(
      `- "${item.query}": ${item.newCount === 1 ? "1 new result" : `${item.newCount} new results`} (${item.total} in total) — ${new URL(item.href, siteUrl).toString()}`,
    );
  }
  lines.push(
    "",
    "You are receiving this because you turned on email alerts for a saved search in your account.",
    `Stop these emails: ${unsubscribeUrl}`,
  );
  return {
    subject:
      items.length === 1
        ? `New results for "${items[0]!.query}"`
        : `New results for ${items.length} of your saved searches`,
    text: lines.join("\n"),
  };
}

export type SearchAlertResult = {
  recipients: number;
  sent: number;
  skippedEmpty: number;
  failed: number;
};

/**
 * Emails each resident who opted in once, covering the saved searches that
 * have results beyond both what they last looked at and what an earlier alert
 * covered. A search is marked as alerted only after its email is delivered,
 * so a failed send is retried next run and a result is never announced twice.
 * Searches that cannot be counted completely are skipped, not guessed at.
 * Unverified or banned residents are excluded.
 */
export async function runSavedSearchAlerts(): Promise<SearchAlertResult> {
  const database = getDatabase();
  const result: SearchAlertResult = {
    recipients: 0,
    sent: 0,
    skippedEmpty: 0,
    failed: 0,
  };

  const rows = await database
    .select({
      id: savedSearch.id,
      userId: savedSearch.userId,
      email: user.email,
      query: savedSearch.query,
      type: savedSearch.type,
      lastSeenTotal: savedSearch.lastSeenTotal,
      alertedTotal: savedSearch.alertedTotal,
    })
    .from(savedSearch)
    .innerJoin(user, eq(user.id, savedSearch.userId))
    .where(
      and(
        eq(savedSearch.emailAlerts, true),
        eq(user.emailVerified, true),
        eq(user.banned, false),
      ),
    );

  const byUser = new Map<string, { email: string; rows: typeof rows }>();
  for (const row of rows) {
    const entry = byUser.get(row.userId) ?? { email: row.email, rows: [] };
    if (entry.rows.length < MAX_SAVED_SEARCHES) entry.rows.push(row);
    byUser.set(row.userId, entry);
  }
  result.recipients = byUser.size;

  for (const [userId, entry] of byUser) {
    try {
      const items: SearchAlertItem[] = [];
      for (const row of entry.rows) {
        const type = parseSearchType(row.type);
        const total = await countResults(row.query, type).catch(() => null);
        if (total === null) continue;
        const newCount = alertableNewCount(
          total,
          row.lastSeenTotal,
          row.alertedTotal,
        );
        // Results that went away lower the baseline, so ones that come back
        // later count as new.
        if (row.alertedTotal !== null && total < row.alertedTotal) {
          await database
            .update(savedSearch)
            .set({ alertedTotal: total })
            .where(eq(savedSearch.id, row.id));
        }
        if (newCount > 0) {
          items.push({
            id: row.id,
            query: row.query,
            href: savedSearchHref({ query: row.query, type }),
            newCount,
            total,
          });
        }
      }
      if (items.length === 0) {
        result.skippedEmpty += 1;
        continue;
      }
      await sendTransactionalEmail({
        category: "saved_search_alert",
        to: entry.email,
        ...composeSearchAlertEmail(
          items,
          buildUnsubscribeUrl("saved_search_alert", userId),
        ),
      });
      // Each search is advanced to the count its email reported.
      for (const item of items) {
        await database
          .update(savedSearch)
          .set({ alertedTotal: item.total })
          .where(
            and(eq(savedSearch.id, item.id), eq(savedSearch.userId, userId)),
          );
      }
      result.sent += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
