from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text()
    actual = text.count(old)
    if actual != count:
        raise SystemExit(
            f"{path}: expected {count} occurrence(s), found {actual}: {old[:100]!r}"
        )
    file.write_text(text.replace(old, new, count))


replace(
    "src/components/generated-business-website.tsx",
    'import {\n  BusinessSiteFooter,\n  BusinessSiteHeader,\n} from "@/components/business-site-chrome";\n',
    'import {\n  BusinessSiteFooter,\n  BusinessSiteHeader,\n  type BusinessSiteSection,\n} from "@/components/business-site-chrome";\n',
)
replace(
    "src/components/generated-business-website.tsx",
    '  reportHref?: string | null;\n  embedded?: boolean;\n};\n',
    '  reportHref?: string | null;\n'
    '  embedded?: boolean;\n'
    '  primaryActionOverride?: { href: string; label: string } | null;\n'
    '  additionalSections?: BusinessSiteSection[];\n'
    '  additionalContent?: ReactNode;\n'
    '};\n',
)
replace(
    "src/components/generated-business-website.tsx",
    '  reportHref = null,\n  embedded = false,\n}: GeneratedBusinessWebsiteProps) {\n',
    '  reportHref = null,\n'
    '  embedded = false,\n'
    '  primaryActionOverride = null,\n'
    '  additionalSections = [],\n'
    '  additionalContent = null,\n'
    '}: GeneratedBusinessWebsiteProps) {\n',
)
replace(
    "src/components/generated-business-website.tsx",
    '  const primaryAction = projection.publicEmail\n'
    '    ? { href: `mailto:${projection.publicEmail}`, label: "Email us" }\n'
    '    : projection.publicPhone\n'
    '      ? { href: `tel:${projection.publicPhone}`, label: "Call us" }\n'
    '      : null;\n',
    '  const primaryAction =\n'
    '    primaryActionOverride ??\n'
    '    (projection.publicEmail\n'
    '      ? { href: `mailto:${projection.publicEmail}`, label: "Email us" }\n'
    '      : projection.publicPhone\n'
    '        ? { href: `tel:${projection.publicPhone}`, label: "Call us" }\n'
    '        : null);\n',
)
replace(
    "src/components/generated-business-website.tsx",
    '        sections={visibleSections.map(({ id, label }) => ({ id, label }))}\n',
    '        sections={[\n'
    '          ...visibleSections.map(({ id, label }) => ({ id, label })),\n'
    '          ...additionalSections,\n'
    '        ]}\n',
)
replace(
    "src/components/generated-business-website.tsx",
    '        {visibleSections.map(renderSection)}\n\n        {updatedLabel || reportHref ? (\n',
    '        {visibleSections.map(renderSection)}\n\n'
    '        {additionalContent}\n\n'
    '        {updatedLabel || reportHref ? (\n',
)

replace(
    "src/app/dashboard/business/[businessId]/page.tsx",
    '            generated website and future resident journeys. Everything here\n'
    '            saves as a draft — nothing publishes automatically.\n',
    '            generated website and future resident journeys. Draft changes stay\n'
    '            controlled; publication can be reviewed, scheduled or postponed.\n',
)
replace(
    "src/app/dashboard/business/[businessId]/page.tsx",
    '          <Link\n'
    '            className="button"\n'
    '            href={\n'
    '              `/dashboard/business/${parsedBusinessId.data}/website` as Route\n'
    '            }\n'
    '          >\n'
    '            Design &amp; photos\n'
    '          </Link>\n',
    '          <Link\n'
    '            className="button"\n'
    '            href={\n'
    '              `/dashboard/business/${parsedBusinessId.data}/website` as Route\n'
    '            }\n'
    '          >\n'
    '            Design &amp; photos\n'
    '          </Link>\n'
    '          <Link\n'
    '            className="button"\n'
    '            href={\n'
    '              `/dashboard/business/${parsedBusinessId.data}/operations` as Route\n'
    '            }\n'
    '          >\n'
    '            Contacts, content &amp; insights\n'
    '          </Link>\n',
)

replace(
    "src/app/admin/admin-nav.tsx",
    '  { href: "/admin/reports" as Route, label: "Reports" },\n',
    '  { href: "/admin/reports" as Route, label: "Reports" },\n'
    '  { href: "/admin/tickets" as Route, label: "Claims & corrections" },\n',
)

replace(
    "src/app/account/new-business/new-business-form.tsx",
    '              <li key={match.id}>\n'
    '                <Link href={`/b/${match.slug}`}>{match.tradingName}</Link>\n'
    '                {match.placeName ? ` — ${match.placeName}` : null}\n'
    '                {match.categoryName ? ` (${match.categoryName})` : null}\n'
    '              </li>\n',
    '              <li key={match.id}>\n'
    '                <Link href={`/b/${match.slug}`}>{match.tradingName}</Link>\n'
    '                {match.placeName ? ` — ${match.placeName}` : null}\n'
    '                {match.categoryName ? ` (${match.categoryName})` : null}{" "}\n'
    '                <Link href={`/claim/${match.id}`}>Claim this business</Link>\n'
    '              </li>\n',
)
replace(
    "src/app/account/new-business/new-business-form.tsx",
    '            If one of these is your business, open its page and use the report\n'
    '            link to tell us — ownership claims are reviewed by the OurValleys\n'
    '            team. If yours is a different business, continue below.\n',
    '            If one of these is your business, use its claim link. Claims create an\n'
    '            evidence-rich admin ticket and never overwrite existing control\n'
    '            automatically. If yours is different, continue below.\n',
)
