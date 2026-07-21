from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


# Ticket actions must match the ticket type, and duplicate restoration must
# undo only memberships introduced by the merge operation.
replace_once(
    "src/modules/businesses/tickets.ts",
    'import { and, desc, eq, sql } from "drizzle-orm";\n',
    'import { and, desc, eq, inArray, sql } from "drizzle-orm";\n',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''      const evidence =
        (ticket.evidence as Record<string, unknown> | null) ?? null;
      const terminal = [
''',
    '''      const evidence =
        (ticket.evidence as Record<string, unknown> | null) ?? null;
      const allowedActions: Record<BusinessTicketType, readonly TicketResolutionAction[]> = {
        claim: [
          "approve_claim",
          "add_manager",
          "transfer_control",
          "request_information",
          "reject",
          "dismiss",
        ],
        duplicate: [
          "keep_separate",
          "merge_duplicate",
          "restore_duplicate",
          "request_information",
          "reject",
          "dismiss",
        ],
        correction: [
          "accept_correction",
          "request_information",
          "reject",
          "dismiss",
        ],
        slug_change: [
          "approve_slug_change",
          "request_information",
          "reject",
          "dismiss",
        ],
      };
      if (
        !(businessTicketTypes as readonly string[]).includes(ticket.type) ||
        !allowedActions[ticket.type as BusinessTicketType].includes(input.action)
      ) {
        return {
          status: "invalid",
          message: "That resolution action is not valid for this ticket type.",
        } as const;
      }
      const terminal = [
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''          const duplicateMemberships = await transaction
            .select({
              userId: businessMembership.userId,
              role: businessMembership.role,
            })
            .from(businessMembership)
            .where(eq(businessMembership.businessId, ticket.relatedBusinessId));
          for (const membership of duplicateMemberships) {
''',
    '''          const [duplicateMemberships, primaryMemberships] = await Promise.all([
            transaction
              .select({
                userId: businessMembership.userId,
                role: businessMembership.role,
              })
              .from(businessMembership)
              .where(eq(businessMembership.businessId, ticket.relatedBusinessId)),
            transaction
              .select({ userId: businessMembership.userId })
              .from(businessMembership)
              .where(eq(businessMembership.businessId, ticket.businessId)),
          ]);
          const existingPrimaryUsers = new Set(
            primaryMemberships.map((membership) => membership.userId),
          );
          const mergedMembershipUserIds: string[] = [];
          for (const membership of duplicateMemberships) {
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''            await transaction
              .insert(businessMembership)
              .values({
                businessId: ticket.businessId,
                userId: membership.userId,
                role: mergedRole,
                permissions: permissionsForBusinessRole(mergedRole),
                status: "active",
                acceptedAt: new Date(),
              })
              .onConflictDoNothing({
                target: [
                  businessMembership.businessId,
                  businessMembership.userId,
                ],
              });
          }
          await transaction
''',
    '''            await transaction
              .insert(businessMembership)
              .values({
                businessId: ticket.businessId,
                userId: membership.userId,
                role: mergedRole,
                permissions: permissionsForBusinessRole(mergedRole),
                status: "active",
                acceptedAt: new Date(),
              })
              .onConflictDoNothing({
                target: [
                  businessMembership.businessId,
                  businessMembership.userId,
                ],
              });
            if (!existingPrimaryUsers.has(membership.userId)) {
              mergedMembershipUserIds.push(membership.userId);
            }
          }
          await transaction
            .update(businessTicket)
            .set({
              evidence: { ...evidence, mergedMembershipUserIds },
              updatedAt: sql`now()`,
            })
            .where(eq(businessTicket.id, ticket.id));
          await transaction
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''          await transaction
            .update(business)
            .set({ status: restoredStatus, updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          const [related] = await transaction
''',
    '''          await transaction
            .update(business)
            .set({ status: restoredStatus, updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          const mergedMembershipUserIds = Array.isArray(
            evidence?.mergedMembershipUserIds,
          )
            ? evidence.mergedMembershipUserIds.filter(
                (value): value is string => typeof value === "string",
              )
            : [];
          if (mergedMembershipUserIds.length > 0) {
            await transaction
              .delete(businessMembership)
              .where(
                and(
                  eq(businessMembership.businessId, ticket.businessId),
                  inArray(businessMembership.userId, mergedMembershipUserIds),
                ),
              );
          }
          const [related] = await transaction
''',
)

# The lifecycle service itself enforces active membership and owner-only
# permanent closure/deletion, not only the route layer.
replace_once(
    "src/modules/businesses/lifecycle-automation.ts",
    'import { recordAdminAudit } from "@/modules/identity/audit-log";\n',
    '''import {
  businessPermissions,
  canMembershipPerform,
} from "@/modules/identity/access-policy";
import { recordAdminAudit } from "@/modules/identity/audit-log";
''',
)
replace_once(
    "src/modules/businesses/lifecycle-automation.ts",
    ''')}): Promise<"updated" | "invalid" | "not_found" | "unavailable"> {
  try {
''',
    ''')}): Promise<
  "updated" | "invalid" | "forbidden" | "not_found" | "unavailable"
> {
  try {
''',
)
replace_once(
    "src/modules/businesses/lifecycle-automation.ts",
    '''    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      const [businessRow] = await transaction
''',
    '''    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      const [actorMembership] = await transaction
        .select({
          role: businessMembership.role,
          permissions: businessMembership.permissions,
          status: businessMembership.status,
        })
        .from(businessMembership)
        .where(
          and(
            eq(businessMembership.businessId, input.businessId),
            eq(businessMembership.userId, input.actorUserId),
          ),
        )
        .limit(1);
      if (
        !canMembershipPerform(
          actorMembership ?? null,
          businessPermissions.manageLifecycle,
        )
      ) {
        return "forbidden" as const;
      }
      if (
        ["permanent_close", "request_deletion", "cancel_deletion"].includes(
          input.action,
        ) &&
        actorMembership?.role !== "owner"
      ) {
        return "forbidden" as const;
      }

      const [businessRow] = await transaction
''',
)
