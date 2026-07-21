import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { adminAuditLog, user } from "@/lib/database/schema";

export type AdminAuditAction =
  | "business.created"
  | "business.publication_submitted"
  | "business.publication_approved"
  | "business.publication_rejected"
  | "business.suspended"
  | "business.reinstated"
  | "user.role_changed"
  | "user.banned"
  | "user.unbanned"
  | "membership.status_changed"
  | "membership.removed"
  | "content_report.resolved"
  | "content_report.dismissed"
  | "category.created"
  | "category.updated"
  | "place.created"
  | "place.updated";

/**
 * Records a moderation action for the audit trail. Never throws: a failed
 * audit write must not block the underlying moderation action, since the
 * action has already taken effect by the time this is called.
 */
export async function recordAdminAudit(input: {
  actorUserId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const database = getDatabase();
    await database.insert(adminAuditLog).values({
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata ?? null,
    });
  } catch {
    // Intentionally swallowed — see doc comment above.
  }
}

export type AdminAuditEntry = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  actor: { id: string; name: string; email: string } | null;
};

export type AdminAuditLogResult =
  | { state: "ready"; entries: AdminAuditEntry[] }
  | { state: "unavailable"; entries: [] };

export async function listRecentAdminAudit(
  limit = 100,
): Promise<AdminAuditLogResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: adminAuditLog.id,
        action: adminAuditLog.action,
        targetType: adminAuditLog.targetType,
        targetId: adminAuditLog.targetId,
        metadata: adminAuditLog.metadata,
        createdAt: adminAuditLog.createdAt,
        actorId: user.id,
        actorName: user.name,
        actorEmail: user.email,
      })
      .from(adminAuditLog)
      .leftJoin(user, eq(user.id, adminAuditLog.actorUserId))
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit);

    return {
      state: "ready",
      entries: rows.map((row) => ({
        id: row.id,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt,
        actor: row.actorId
          ? { id: row.actorId, name: row.actorName!, email: row.actorEmail! }
          : null,
      })),
    };
  } catch {
    return { state: "unavailable", entries: [] };
  }
}
