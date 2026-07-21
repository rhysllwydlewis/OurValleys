from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(
            f"{path}: expected {count} occurrence(s), found {actual}: {old[:120]!r}"
        )
    file.write_text(text.replace(old, new, count))


replace(
    "src/lib/database/schema/business-operations.ts",
    '    deletionRequestedAt: timestamp("deletion_requested_at", {\n'
    '      withTimezone: true,\n'
    '    }),\n'
    '    deleteAfter: timestamp("delete_after", { withTimezone: true }),\n',
    '    deletionRequestedAt: timestamp("deletion_requested_at", {\n'
    '      withTimezone: true,\n'
    '    }),\n'
    '    deletionWarningSentAt: timestamp("deletion_warning_sent_at", {\n'
    '      withTimezone: true,\n'
    '    }),\n'
    '    deleteAfter: timestamp("delete_after", { withTimezone: true }),\n',
)
replace(
    "drizzle/0009_business_operations.sql",
    '  "deletion_requested_at" timestamp with time zone,\n'
    '  "delete_after" timestamp with time zone,\n',
    '  "deletion_requested_at" timestamp with time zone,\n'
    '  "deletion_warning_sent_at" timestamp with time zone,\n'
    '  "delete_after" timestamp with time zone,\n',
)

replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '  deleteAfter: Date | null;\n',
    '  deletionWarningSentAt?: Date | null;\n'
    '  deleteAfter: Date | null;\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '        deletionRequestedAt: businessLifecycle.deletionRequestedAt,\n'
    '        deleteAfter: businessLifecycle.deleteAfter,\n',
    '        deletionRequestedAt: businessLifecycle.deletionRequestedAt,\n'
    '        deletionWarningSentAt: businessLifecycle.deletionWarningSentAt,\n'
    '        deleteAfter: businessLifecycle.deleteAfter,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '      deletionRequestedAt: row.deletionRequestedAt,\n'
    '      deleteAfter: row.deleteAfter,\n',
    '      deletionRequestedAt: row.deletionRequestedAt,\n'
    '      deletionWarningSentAt: row.deletionWarningSentAt,\n'
    '      deleteAfter: row.deleteAfter,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '              deletionRequestedAt: null,\n'
    '              deleteAfter: null,\n',
    '              deletionRequestedAt: null,\n'
    '              deletionWarningSentAt: null,\n'
    '              deleteAfter: null,\n',
    2,
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '              deletionRequestedAt: now,\n'
    '              deleteAfter: addDays(now, deletionRecoveryDays),\n',
    '              deletionRequestedAt: now,\n'
    '              deletionWarningSentAt: null,\n'
    '              deleteAfter: addDays(now, deletionRecoveryDays),\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '  unpublishedForInactivity: number;\n',
    '  unpublishedForInactivity: number;\n'
    '  deletedAfterRecovery: number;\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '    unpublishedForInactivity: 0,\n',
    '    unpublishedForInactivity: 0,\n'
    '    deletedAfterRecovery: 0,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '          temporaryClosedUntil: businessLifecycle.temporaryClosedUntil,\n'
    '          staleAt: businessLifecycle.staleAt,\n'
    '          state: businessLifecycle.state,\n',
    '          temporaryClosedUntil: businessLifecycle.temporaryClosedUntil,\n'
    '          deletionWarningSentAt: businessLifecycle.deletionWarningSentAt,\n'
    '          deleteAfter: businessLifecycle.deleteAfter,\n'
    '          staleAt: businessLifecycle.staleAt,\n'
    '          state: businessLifecycle.state,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '      for (const row of rows) {\n'
    '        const ageMs = now.getTime() - row.createdAt.getTime();\n',
    '      for (const row of rows) {\n'
    '        if (row.state === "deletion_pending" && row.deleteAfter) {\n'
    '          const warningAt = addDays(row.deleteAfter, -7);\n'
    '          if (\n'
    '            !row.deletionWarningSentAt &&\n'
    '            warningAt <= now &&\n'
    '            row.deleteAfter > now\n'
    '          ) {\n'
    '            await sendLifecycleEmail({\n'
    '              businessId: row.businessId,\n'
    '              businessName: row.businessName,\n'
    '              subject: `${row.businessName} deletion is approaching`,\n'
    '              message:\n'
    '                "Your confirmed deletion request will complete in seven days. Cancel it from the dashboard to recover the website and its content.",\n'
    '            });\n'
    '            await database\n'
    '              .update(businessLifecycle)\n'
    '              .set({ deletionWarningSentAt: now, updatedAt: sql`now()` })\n'
    '              .where(eq(businessLifecycle.businessId, row.businessId));\n'
    '            result.remindersSent += 1;\n'
    '          }\n'
    '          if (row.deleteAfter <= now) {\n'
    '            const [owner] = await ownerRecipients(row.businessId);\n'
    '            await database.delete(business).where(eq(business.id, row.businessId));\n'
    '            if (owner) {\n'
    '              await recordAdminAudit({\n'
    '                actorUserId: owner.id,\n'
    '                action: "business.lifecycle_changed",\n'
    '                targetType: "business",\n'
    '                targetId: row.businessId,\n'
    '                metadata: { action: "owner_requested_deletion_completed" },\n'
    '              });\n'
    '            }\n'
    '            result.deletedAfterRecovery += 1;\n'
    '            continue;\n'
    '          }\n'
    '        }\n\n'
    '        const ageMs = now.getTime() - row.createdAt.getTime();\n',
)

# Slug changes must preserve old QR codes and links with a permanent redirect.
replace(
    "src/app/b/[businessSlug]/page.tsx",
    'import { notFound, redirect } from "next/navigation";\n',
    'import { notFound, permanentRedirect } from "next/navigation";\n',
)
replace(
    "src/app/b/[businessSlug]/page.tsx",
    '    if (redirectSlug) redirect(`/b/${redirectSlug}`);\n',
    '    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}`);\n',
)

# Reject active-content PDF constructs in the quick menu route.
replace(
    "src/modules/businesses/content-features.ts",
    '  if (contentType === "application/pdf") {\n'
    '    return bytes.subarray(0, 5).toString("ascii") === "%PDF-"\n'
    '      ? { valid: true as const, extension: "pdf" }\n'
    '      : {\n'
    '          valid: false as const,\n'
    '          message: "The file contents do not match a PDF.",\n'
    '        };\n'
    '  }\n',
    '  if (contentType === "application/pdf") {\n'
    '    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {\n'
    '      return {\n'
    '        valid: false as const,\n'
    '        message: "The file contents do not match a PDF.",\n'
    '      };\n'
    '    }\n'
    '    const source = bytes.toString("latin1");\n'
    '    const blockedConstructs = [\n'
    '      "/JavaScript",\n'
    '      "/JS",\n'
    '      "/Launch",\n'
    '      "/EmbeddedFile",\n'
    '      "/OpenAction",\n'
    '      "/AA",\n'
    '    ];\n'
    '    if (blockedConstructs.some((token) => source.includes(token))) {\n'
    '      return {\n'
    '        valid: false as const,\n'
    '        message: "Active or embedded PDF content is not accepted.",\n'
    '      };\n'
    '    }\n'
    '    return { valid: true as const, extension: "pdf" };\n'
    '  }\n',
)
