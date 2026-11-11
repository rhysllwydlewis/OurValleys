# Free business website Phases 7–12 verification

This record accompanies pull request #86 and the delivery programme in `docs/32-free-business-website-product-brief.md`.

## Review scope

The final review covers:

- business contact methods, primary actions, public enquiry forms and tenant-isolated inboxes;
- ownership claims, correction suggestions, duplicate conflicts and audited admin resolution;
- offers, event expiry, structured menus, bounded category sections and validated document uploads;
- consent-backed automatic publication, reminders, trading confirmation, temporary closure, permanent closure and recoverable deletion;
- stable QR routes, permanent slug redirects and privacy-conscious activity summaries;
- permanent free-tier entitlements and explicit capability gates without payment activation.

## Security and recovery checks

The review specifically verifies that:

- editors cannot publish and managers cannot manage ownership;
- permanent closure and deletion actions are owner-only;
- a failed contact update cannot clear the existing primary contact action;
- admin ticket actions are restricted to the matching ticket type;
- duplicate merges preserve least-privilege roles, update all publication records consistently and have an explicit restoration route;
- public corrections cannot overwrite canonical data without structured changes and admin approval;
- expired offers and one-off events are removed from public projections;
- uploaded menu documents are size-checked, signature-checked and screened for active PDF constructs before storage.

## Automated gates

The branch must pass all repository gates before merge:

1. formatting and lint;
2. strict TypeScript;
3. dependency compatibility and high-impact vulnerability audit;
4. repeatable migrations and seed preparation;
5. unit and integration tests, including denial and recovery paths;
6. configured and unconfigured production builds;
7. responsive, keyboard and reduced-motion browser journeys;
8. standard PostgreSQL compatibility;
9. post-merge verification on `main`.

The pull request is not complete until every required gate has passed on its final reviewed commit.
