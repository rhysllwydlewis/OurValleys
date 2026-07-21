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


# Accept only ordinary web URLs for external contact and content actions.
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    'import { and, asc, desc, eq, gte, sql } from "drizzle-orm";\n',
    'import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";\n',
)
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    'function validateContactValue(type: ContactMethodType, value: string): boolean {\n',
    'function isSafeHttpUrl(value: string): boolean {\n'
    '  try {\n'
    '    const url = new URL(value);\n'
    '    return url.protocol === "https:" || url.protocol === "http:";\n'
    '  } catch {\n'
    '    return false;\n'
    '  }\n'
    '}\n\n'
    'function validateContactValue(type: ContactMethodType, value: string): boolean {\n',
)
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    '      return z.url().safeParse(value).success;\n',
    '      return isSafeHttpUrl(value);\n',
)
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    '        href: method.value.startsWith("http")\n'
    '          ? method.value\n'
    '          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(method.value)}`,\n',
    '        href: isSafeHttpUrl(method.value)\n'
    '          ? method.value\n'
    '          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(method.value)}`,\n',
)
replace(
    "src/modules/businesses/contacts-and-enquiries.ts",
    '          eq(businessMembership.status, "active"),\n'
    '        ),\n'
    '      );\n'
    '    const dashboardUrl = new URL(\n',
    '          eq(businessMembership.status, "active"),\n'
    '          inArray(businessMembership.role, ["owner", "manager"]),\n'
    '        ),\n'
    '      );\n'
    '    const dashboardUrl = new URL(\n',
)

# Use Drizzle's table alias helper for the related business join.
replace(
    "src/modules/businesses/tickets.ts",
    'import { and, desc, eq, sql } from "drizzle-orm";\n',
    'import { alias } from "drizzle-orm/pg-core";\n'
    'import { and, desc, eq, sql } from "drizzle-orm";\n',
)
replace(
    "src/modules/businesses/tickets.ts",
    '    const related = business.as("related_business");\n',
    '    const related = alias(business, "related_business");\n',
)

# Ensure external offer/event links cannot use script or data schemes.
replace(
    "src/modules/businesses/content-features.ts",
    'const optionalUrl = z.union([z.url().max(1000), z.literal(""), z.null()]);\n',
    'const safeHttpUrl = z\n'
    '  .string()\n'
    '  .trim()\n'
    '  .max(1000)\n'
    '  .refine((value) => {\n'
    '    try {\n'
    '      const url = new URL(value);\n'
    '      return url.protocol === "https:" || url.protocol === "http:";\n'
    '    } catch {\n'
    '      return false;\n'
    '    }\n'
    '  }, "Enter an http or https URL.");\n'
    'const optionalUrl = z.union([safeHttpUrl, z.literal(""), z.null()]);\n',
)

# Temporary closures reopen on their selected end date, not annual confirmation.
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    'import { and, eq, isNull, lte, or, sql } from "drizzle-orm";\n',
    'import { and, eq, or, sql } from "drizzle-orm";\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '          nextConfirmationDueAt: businessLifecycle.nextConfirmationDueAt,\n'
    '          staleAt: businessLifecycle.staleAt,\n',
    '          nextConfirmationDueAt: businessLifecycle.nextConfirmationDueAt,\n'
    '          temporaryClosedUntil: businessLifecycle.temporaryClosedUntil,\n'
    '          staleAt: businessLifecycle.staleAt,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '          row.state === "temporarily_closed" &&\n'
    '          row.nextConfirmationDueAt &&\n'
    '          row.nextConfirmationDueAt <= now\n',
    '          row.state === "temporarily_closed" &&\n'
    '          row.temporaryClosedUntil &&\n'
    '          row.temporaryClosedUntil <= now\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '  unpublisedForInactivity: number;\n',
    '  unpublishedForInactivity: number;\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '    unpublisedForInactivity: 0,\n',
    '    unpublishedForInactivity: 0,\n',
)
replace(
    "src/modules/businesses/lifecycle-automation.ts",
    '            result.unpublisedForInactivity += 1;\n',
    '            result.unpublishedForInactivity += 1;\n',
)

# QR byte padding always starts with the specification's EC pad byte.
replace(
    "src/modules/businesses/qr-code.ts",
    '  const pads = [0xec, 0x11];\n'
    '  while (codewords.length < DATA_CODEWORDS) {\n'
    '    codewords.push(pads[(codewords.length - 1) & 1] ?? 0xec);\n'
    '  }\n',
    '  const pads = [0xec, 0x11];\n'
    '  let padIndex = 0;\n'
    '  while (codewords.length < DATA_CODEWORDS) {\n'
    '    codewords.push(pads[padIndex % pads.length] ?? 0xec);\n'
    '    padIndex += 1;\n'
    '  }\n',
)
