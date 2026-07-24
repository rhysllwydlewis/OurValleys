# Development Demo Access and External News

## 1. Outcome

Issue #102 adds two deliberately public development accounts alongside the existing read-only viewer and introduces an attributed News section backed by the WalesOnline RSS feed supplied by the product owner.

The owner and administrator demonstrations are development and private-pilot conveniences, not launch-ready authentication policy. They must be removed before public release. The least-privilege read-only viewer may remain where there is a justified product-demonstration need.

## 2. Alignment with the product plan

The product charter includes selected local updates but explicitly excludes automated copying or rewriting of third-party news. The content plan also requires clear sources, content-type labels, correction discipline and a gradual approach to editorial reporting.

The implemented boundary therefore does not ingest or reproduce articles. It displays feed-supplied headlines, publication times, optional story images explicitly exposed by the feed, visible WalesOnline attribution and outbound links to the original publisher. Article bodies and feed descriptions are not rendered.

OurValleys does not claim affiliation with, endorsement by or editorial responsibility for WalesOnline.

## 3. Staged demonstration accounts

During `development` and `private_pilot`, the full `/login` page discloses three fictional accounts:

| Demonstration  | Email                            | Password               | Capability                                                                   |
| -------------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| Viewer         | `demo.viewer@ourvalleys.example` | `PUBLIC-DEMO-ONLY`     | View the fictional Cwm & Coil Heating dashboard only                         |
| Business owner | `demo.owner@ourvalleys.example`  | `PUBLIC-BUSINESS-DEMO` | View, edit and publish only the seeded Cwm & Coil Heating profile            |
| Platform admin | `demo.admin@ourvalleys.example`  | `PUBLIC-ADMIN-DEMO`    | Inspect a sanitised, non-mutating administration overview during development |

At `public` release, the login page exposes only the viewer. The owner and administrator fill controls are absent and their identities must not exist in the production database.

Every credential is intentionally conspicuous, uses the reserved `.example` domain and must never be reused for a private or real account.

The compact homepage sign-in dialog continues to show only the viewer account. Business and administrator access is confined to the full login page outside public release so the homepage interaction stays simple and the elevated development roles receive clearer warnings.

Selecting a fill button copies the chosen credentials into the form but never submits automatically. Public demo sign-ins always create a non-persistent session, even if the shared-device checkbox is selected manually. After successful authentication, the viewer opens `/account`, the business owner opens the seeded business dashboard, and the administrator opens `/admin` when those stage-specific accounts are enabled.

## 4. Permission and privacy boundaries

The public business owner is a dedicated account, separate from every fixture owner used by seeded moderation examples. Provisioning removes any non-target business memberships and grants only:

- `business.view`;
- `business.edit_profile`;
- `business.publish`.

Owner role names no longer bypass stored permission arrays. The public owner cannot manage members, contacts, enquiries, content, lifecycle automation, analytics or claims. Private operations and media routes redirect back to the supplied dashboard, and ownership-claim creation is denied.

Every public demo is denied additional business creation at the page and server-action layers. Account profile changes, preferences, credential changes, linked-account changes and deletion are blocked in the interface and in the Better Auth route boundary.

The public administrator is deliberately safer than a real administrator:

- `/admin` renders a sanitised static overview rather than live user, report, business or audit records;
- direct navigation to private admin subroutes redirects to `/admin` before the route is rendered;
- Better Auth administrator APIs are denied for both reads and writes;
- every application admin server action fails closed because public demo identities cannot obtain a mutation-capable admin session.

## 5. Provisioning and deployment

`pnpm auth:provision-demo` is release-stage aware.

In every stage it:

1. provisions or rotates the viewer credential;
2. verifies that the viewer matches the deterministic seeded user;
3. revokes prior viewer sessions through the existing account-provisioning service.

In `development` and `private_pilot` it then:

1. provisions or rotates the dedicated public business-owner identity;
2. removes any non-Cwm & Coil memberships from that owner and upserts one restricted membership;
3. provisions or rotates the administrator credential;
4. grants the administrator role while retaining the public-demo read-only policy.

In `public` it does not provision those privileged accounts. It queries the production database and fails the release if either privileged identity still exists. `PRIVILEGED_DEMOS_REMOVED=true` is required by environment validation, but the flag is not accepted as a substitute for the database check.

The Railway `pnpm deploy:prepare` sequence runs this stage-aware provisioning after migrations, deterministic fixtures and the versioned reference-data import.

## 6. Mandatory pre-launch removal gate

Before `OURVALLEYS_RELEASE_STAGE=public` is used:

1. remove the business-owner and administrator identities from the production authentication database;
2. revoke every active session associated with those identities;
3. confirm their business memberships and administrator role no longer provide access;
4. set `PRIVILEGED_DEMOS_REMOVED=true` only after the removal is independently verified;
5. create private named administrator accounts through the controlled operator process;
6. require administrator multi-factor authentication in accordance with the MVP authentication requirements;
7. retain only the least-privilege viewer when there remains a justified product need;
8. re-run permission, privacy, login, deployment and administrator-access tests.

A warning in application copy or hiding a fill button is not a substitute for completing this gate. Public release preparation intentionally fails while a privileged demo identity remains.

## 7. WalesOnline RSS integration

The News route tries the product-owner supplied section feed first and uses the current WalesOnline whole-site RSS endpoint only as a resilience fallback:

```text
https://www.walesonline.co.uk/news/?service=rss
https://www.walesonline.co.uk/?service=rss
```

Operational behaviour:

- server-side feed fetch only;
- six-second request timeout for each feed attempt;
- fifteen-minute Next.js revalidation window;
- a two-megabyte streaming response limit, including responses without `Content-Length`;
- maximum thirty parsed items and twelve displayed by default;
- only `walesonline.co.uk` and `www.walesonline.co.uk` article links are accepted;
- article links containing user information or unexpected ports are rejected;
- article links are normalised to HTTPS and fragments are removed;
- duplicate links are discarded;
- markup is stripped from feed titles and XML entities are decoded;
- optional images are read from RSS media elements, image enclosures or the first image explicitly embedded in a feed description;
- accepted image URLs must use the WalesOnline root domain or a WalesOnline subdomain, must not contain credentials or unexpected ports, and are normalised to HTTPS;
- accepted images load directly from the publisher host, use `no-referrer`, and are not copied into the repository, transformed by the application or persisted in the database;
- an external image request still exposes the visitor's network address to the publisher host, so this behaviour remains part of the pre-launch privacy and rights review;
- full article text and feed descriptions are not displayed;
- generated visual artwork remains as a fallback whenever no accepted feed image is available;
- all article links open on WalesOnline with opener and referrer protection;
- upstream failure returns an honest unavailable state without affecting other discovery routes.

The page remains `noindex` until its separate editorial, rights and privacy gate is approved.

## 8. Privacy, rights and editorial boundaries

The feed integration stores no user information and does not persist publisher content in the application database. It does not add publisher cookies or intentionally implement publisher tracking. However, displaying an image from a publisher-controlled host necessarily creates a third-party network request. The image element suppresses the OurValleys page referrer, but the publisher can still receive ordinary connection information such as the visitor's IP address and user agent.

Headlines and images may still be protected publisher content. Their presence in an RSS feed is not treated as permanent production permission. Before launch, the operator must confirm the publisher's current RSS terms, image-use expectations, attribution requirements, privacy implications and acceptable production use. If approval is not obtained, the feed and its images must remain disabled or be replaced by a licensed source.

OurValleys must not remove attribution, copy full articles or images outside a valid rights basis, rewrite third-party reporting as original journalism, imply independent verification, or mix external reporting with sponsored or community content without a clear label.

## 9. Validation

Automated coverage includes:

- unmistakably public and unique credentials and case-insensitive identity lookup;
- forced non-persistent public demo sign-in requests;
- dedicated single-tenant business-owner provisioning;
- explicit owner permission enforcement without role bypass;
- denial of extra business creation, account mutation, ownership claims, media and private operations;
- sanitised admin navigation, private-route redirects, Better Auth admin API denial and application mutation denial;
- correct role-specific protected destinations and direct-navigation checks;
- public-stage absence of privileged login controls and database identities;
- retained-viewer availability and read-only behaviour;
- RSS entity handling, article and image source validation, HTTPS normalisation, image extraction fallbacks, duplicate removal, invalid-date fallback and streaming size limits;
- `/news` attribution, external-link, responsive layout and navigation browser checks.

Development or private-pilot deployment verification confirms all three sign-ins, the exact one-business owner boundary, the sanitised admin overview, `/api/ready`, and either attributed headlines with accepted feed images or the designed unavailable News state.

Public production verification confirms health and readiness, the retained viewer's read-only boundary, absence of privileged demo controls, coherent indexing output and the intended connected public routes. The full release contract is recorded in [`34-launch-foundation-and-public-release-controls.md`](34-launch-foundation-and-public-release-controls.md).
