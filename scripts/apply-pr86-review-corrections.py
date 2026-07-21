from pathlib import Path
import re


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, found {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


# Destructive lifecycle actions are owner-only even though managers may pause,
# resume and manage temporary operational states.
replace_once(
    "src/app/dashboard/business/[businessId]/operations/actions.ts",
    "  businessPermissions,\n  canUserAccessBusiness,\n  type BusinessPermission,\n",
    "  businessPermissions,\n  canUserAccessBusiness,\n  getUserBusinessRole,\n  type BusinessPermission,\n",
)
replace_once(
    "src/app/dashboard/business/[businessId]/operations/actions.ts",
    '''  const temporaryClosedUntil = dateTime(formData.get("temporaryClosedUntil"));
  const result = await changeBusinessLifecycle({
''',
    '''  const ownerOnlyActions = [
    "permanent_close",
    "request_deletion",
    "cancel_deletion",
  ];
  if (
    ownerOnlyActions.includes(action) &&
    (await getUserBusinessRole({ userId: actorUserId, businessId })) !== "owner"
  ) {
    returnTo(businessId, "forbidden");
  }
  const temporaryClosedUntil = dateTime(formData.get("temporaryClosedUntil"));
  const result = await changeBusinessLifecycle({
''',
)

# Updating a missing contact must not clear the current primary action, and a
# disabled contact cannot become primary.
replace_once(
    "src/modules/businesses/contacts-and-enquiries.ts",
    '''      if (parsed.data.isPrimary) {
        await transaction
          .update(businessContactMethod)
          .set({ isPrimary: false, updatedAt: sql`now()` })
          .where(eq(businessContactMethod.businessId, input.businessId));
      }

      if (parsed.data.id) {
        const [updated] = await transaction
''',
    '''      if (parsed.data.id) {
        const [existing] = await transaction
          .select({ id: businessContactMethod.id })
          .from(businessContactMethod)
          .where(
            and(
              eq(businessContactMethod.id, parsed.data.id),
              eq(businessContactMethod.businessId, input.businessId),
            ),
          )
          .for("update")
          .limit(1);
        if (!existing) return { status: "not_found" } as const;
      }

      if (parsed.data.enabled && parsed.data.isPrimary) {
        await transaction
          .update(businessContactMethod)
          .set({ isPrimary: false, updatedAt: sql`now()` })
          .where(eq(businessContactMethod.businessId, input.businessId));
      }

      if (parsed.data.id) {
        const [updated] = await transaction
''',
)

# An event without an explicit end time expires once its start time has passed.
replace_once(
    "src/modules/businesses/content-features.ts",
    '''    if (publicOnly) {
      filters.push(
        eq(businessEvent.status, "active"),
        or(
          isNull(businessEvent.endsAt),
          gte(businessEvent.endsAt, new Date()),
        )!,
      );
    }
''',
    '''    if (publicOnly) {
      const now = new Date();
      filters.push(
        eq(businessEvent.status, "active"),
        or(
          and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
          gte(businessEvent.endsAt, now),
        )!,
      );
    }
''',
)
replace_once(
    "src/modules/businesses/content-features.ts",
    '''          eq(business.status, "published"),
          eq(businessEvent.status, "active"),
          or(
            isNull(businessEvent.endsAt),
            gte(businessEvent.endsAt, new Date()),
          ),
''',
    '''          eq(business.status, "published"),
          eq(businessEvent.status, "active"),
          or(
            and(
              isNull(businessEvent.endsAt),
              gte(businessEvent.startsAt, new Date()),
            ),
            gte(businessEvent.endsAt, new Date()),
          ),
''',
)
replace_once(
    "src/modules/businesses/content-features.ts",
    '''    const source = bytes.toString("latin1");
    const blockedConstructs = [
      "/JavaScript",
      "/JS",
      "/Launch",
      "/EmbeddedFile",
      "/OpenAction",
      "/AA",
    ];
    if (blockedConstructs.some((token) => source.includes(token))) {
''',
    '''    const source = bytes.toString("latin1").toLowerCase();
    const blockedConstructs = [
      "/javascript",
      "/js",
      "/launch",
      "/embeddedfile",
      "/openaction",
      "/aa",
    ];
    if (blockedConstructs.some((token) => source.includes(token))) {
''',
)

# Ticket creation is atomic, self-duplicates are invalid, duplicate merges
# preserve least-privilege roles, and all public lifecycle records stay aligned.
replace_once(
    "src/modules/businesses/tickets.ts",
    'import { businessPermissions } from "@/modules/identity/access-policy";\n',
    '''import {
  businessPermissions,
  isBusinessMembershipRole,
  permissionsForBusinessRole,
} from "@/modules/identity/access-policy";
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''  if (!parsed.success) {
    return {
      status: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Check the request and try again.",
    };
  }

  try {
''',
    '''  if (!parsed.success) {
    return {
      status: "invalid",
      message:
        parsed.error.issues[0]?.message ?? "Check the request and try again.",
    };
  }
  if (parsed.data.relatedBusinessId === parsed.data.businessId) {
    return {
      status: "invalid",
      message: "A business cannot be marked as a duplicate of itself.",
    };
  }

  try {
''',
)

path = Path("src/modules/businesses/tickets.ts")
text = path.read_text()
pattern = re.compile(
    r'''    const \[target\] = await database\n.*?    return \{ status: "created", ticketId: created\.id \};''',
    re.S,
)
replacement = '''    return await database.transaction(async (transaction) => {
      const [target] = await transaction
        .select({ id: business.id, status: business.status, slug: business.slug })
        .from(business)
        .where(eq(business.id, parsed.data.businessId))
        .limit(1);
      if (!target) return { status: "not_found" } as const;

      let relatedSnapshot: { id: string; status: string; slug: string } | null =
        null;
      if (parsed.data.relatedBusinessId) {
        const [related] = await transaction
          .select({
            id: business.id,
            status: business.status,
            slug: business.slug,
          })
          .from(business)
          .where(eq(business.id, parsed.data.relatedBusinessId))
          .limit(1);
        if (!related) return { status: "not_found" } as const;
        relatedSnapshot = related;
      }

      const [created] = await transaction
        .insert(businessTicket)
        .values({
          businessId: parsed.data.businessId,
          relatedBusinessId: parsed.data.relatedBusinessId ?? null,
          reporterUserId: parsed.data.reporterUserId ?? null,
          reporterEmail: parsed.data.reporterEmail || null,
          type: parsed.data.type,
          reason: parsed.data.reason,
          riskLevel: parsed.data.riskLevel,
          evidence: {
            ...(parsed.data.evidence ?? {}),
            targetSnapshot: target,
            relatedSnapshot,
          },
        })
        .returning({ id: businessTicket.id });
      if (!created) return { status: "unavailable" } as const;

      await transaction.insert(businessTicketEvent).values({
        ticketId: created.id,
        actorUserId: parsed.data.reporterUserId ?? null,
        action: "created",
        note: parsed.data.reason,
        metadata: { type: parsed.data.type, riskLevel: parsed.data.riskLevel },
      });

      return { status: "created", ticketId: created.id } as const;
    });'''
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"tickets create transaction replacement count={count}")
path.write_text(text)

replace_once(
    "src/modules/businesses/tickets.ts",
    '''      const managerPermissions = [
        businessPermissions.view,
        businessPermissions.editProfile,
        businessPermissions.publish,
        businessPermissions.manageMembers,
        businessPermissions.manageContacts,
        businessPermissions.manageEnquiries,
        businessPermissions.manageContent,
        businessPermissions.manageLifecycle,
        businessPermissions.viewAnalytics,
      ];
''',
    '''      const managerPermissions = permissionsForBusinessRole("manager");
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''          const duplicateMemberships = await transaction
            .select({ userId: businessMembership.userId })
            .from(businessMembership)
            .where(eq(businessMembership.businessId, ticket.relatedBusinessId));
          for (const membership of duplicateMemberships) {
            await transaction
              .insert(businessMembership)
              .values({
                businessId: ticket.businessId,
                userId: membership.userId,
                role: "manager",
                permissions: managerPermissions,
                status: "active",
                acceptedAt: new Date(),
              })
''',
    '''          const duplicateMemberships = await transaction
            .select({
              userId: businessMembership.userId,
              role: businessMembership.role,
            })
            .from(businessMembership)
            .where(eq(businessMembership.businessId, ticket.relatedBusinessId));
          for (const membership of duplicateMemberships) {
            const sourceRole = isBusinessMembershipRole(membership.role)
              ? membership.role
              : "viewer";
            const mergedRole = sourceRole === "owner" ? "manager" : sourceRole;
            await transaction
              .insert(businessMembership)
              .values({
                businessId: ticket.businessId,
                userId: membership.userId,
                role: mergedRole,
                permissions: permissionsForBusinessRole(mergedRole),
                status: "active",
                acceptedAt: new Date(),
              })
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''          await transaction
            .update(business)
            .set({ status: "removed", updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          break;
''',
    '''          await transaction
            .update(business)
            .set({ status: "removed", updatedAt: sql`now()` })
            .where(eq(business.id, ticket.relatedBusinessId));
          await transaction
            .update(businessPublication)
            .set({ status: "removed", updatedAt: sql`now()` })
            .where(
              eq(businessPublication.businessId, ticket.relatedBusinessId),
            );
          await transaction
            .update(businessSite)
            .set({ status: "removed", updatedAt: sql`now()` })
            .where(eq(businessSite.businessId, ticket.relatedBusinessId));
          break;
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''          if (restoredStatus === "published") {
            await transaction
              .update(businessPublication)
              .set({ status: "published", updatedAt: sql`now()` })
              .where(
                eq(businessPublication.businessId, ticket.relatedBusinessId),
              );
            await transaction
              .update(businessSite)
              .set({ status: "published", updatedAt: sql`now()` })
              .where(eq(businessSite.businessId, ticket.relatedBusinessId));
          }
          break;
''',
    '''          await transaction
            .update(businessPublication)
            .set({ status: restoredStatus, updatedAt: sql`now()` })
            .where(
              eq(businessPublication.businessId, ticket.relatedBusinessId),
            );
          await transaction
            .update(businessSite)
            .set({ status: restoredStatus, updatedAt: sql`now()` })
            .where(eq(businessSite.businessId, ticket.relatedBusinessId));
          break;
''',
)
replace_once(
    "src/modules/businesses/tickets.ts",
    '''        case "accept_correction": {
          const changes = safeCorrectionChanges(evidence);
          if (Object.keys(changes).length > 0) {
            await transaction
              .update(business)
              .set({ ...changes, updatedAt: sql`now()` })
              .where(eq(business.id, ticket.businessId));
          }
          break;
        }
''',
    '''        case "accept_correction": {
          const changes = safeCorrectionChanges(evidence);
          if (Object.keys(changes).length === 0) {
            return {
              status: "invalid",
              message:
                "This correction has no structured public changes to apply. Request more information or reject it.",
            } as const;
          }
          await transaction
            .update(business)
            .set({ ...changes, updatedAt: sql`now()` })
            .where(eq(business.id, ticket.businessId));
          break;
        }
''',
)

# Publication permissions now follow the documented manager/editor boundary.
publication_test = Path("tests/integration/business-publication.test.ts")
publication_text = publication_test.read_text()
count = publication_text.count('role: "editor"')
if count != 4:
    raise SystemExit(f"publication role replacements expected 4, found {count}")
publication_test.write_text(publication_text.replace('role: "editor"', 'role: "manager"'))
