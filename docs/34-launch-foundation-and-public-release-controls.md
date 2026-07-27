# Launch Foundation and Public Release Controls

## 1. Status and purpose

This document records the coordinated launch-foundation work introduced by pull request #132. The change is not delivered until it is merged into `main` and the resulting deployment is verified.

The implementation joins five related outcomes under one release contract:

1. deployed-origin verification;
2. versioned Rhondda Cynon Taf place data;
3. bilingual business categories and search aliases;
4. relevance-ranked, paginated public business discovery;
5. explicit private-pilot and public-release gates.

## 2. Release stages

`OURVALLEYS_RELEASE_STAGE` accepts `development`, `private_pilot` or `public`.

| Stage           | Indexing                                        | Demonstration access                                         | Provider requirements                       |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------- |
| `development`   | Global `noindex`; crawlers blocked              | Viewer, fictional business owner and sanitised administrator | Email and R2 may be absent                  |
| `private_pilot` | Global `noindex`; crawlers blocked              | Viewer, fictional business owner and sanitised administrator | Email and R2 may be absent                  |
| `public`        | Only explicitly indexable routes are advertised | Retained read-only viewer only                               | Resend and Cloudflare R2 must be configured |

A public release also requires these independently verified flags:

- `PRIVILEGED_DEMOS_REMOVED=true`;
- `POLICIES_APPROVED=true`;
- `ADMIN_MFA_READY=true`.

The flag does not replace a database check. Public release preparation provisions the retained read-only viewer, then fails if either privileged fictional owner or administrator identity still exists. It does not silently delete those identities because removal and evidence retention are operational release actions.

Blank optional email or R2 values are normalised to an unconfigured state outside public release. In public mode the same fields are required and validation fails closed.

## 3. Deployment order

`pnpm deploy:prepare` performs the following ordered and repeatable sequence:

1. validate runtime configuration;
2. apply committed Drizzle migrations;
3. load deterministic fictional application fixtures;
4. import the versioned place and category datasets;
5. provision stage-appropriate demonstration access.

The reference import runs inside a transaction. Existing place and category records are updated by stable slug. Parent relationships are replaced for each imported child so a reviewed hierarchy change does not leave multiple stale parents. Source-managed search and translation aliases are replaced with the current reviewed set, so corrected or removed aliases do not remain active. Versioned coordinates are updated or removed when the source record changes. Records removed entirely from the source dataset are not automatically deleted or hidden; retirement remains an explicit reviewed data decision.

## 4. Reference-data contract

The initial dataset contains an RCT region record, valley groupings and a bounded first set of towns and communities. Coordinates are public locality centroids, never resident or business addresses.

Each place record includes:

- stable slug;
- English and, where available, Welsh name;
- place type and parent;
- coverage state;
- public editorial summary;
- search aliases;
- locality centroid.

The Phase 1 category dataset includes controlled English and Welsh labels, parent relationships and resident-language aliases. Aliases improve discovery but do not become unsupported claims about a business.

Validation rejects duplicate slugs and aliases, missing parents, hierarchy cycles and invalid coordinate ranges before database writes begin. Standard PostgreSQL compatibility testing inserts obsolete managed aliases, re-runs the importer and verifies that those aliases are removed.

## 5. Ranked public discovery

The business directory reads only the published public projection. Suspended, unpublished, incomplete or private canonical information is excluded before ranking.

Search considers:

- trading name;
- summary and public description;
- active services;
- category label;
- English and Welsh category aliases.

PostgreSQL `pg_trgm` and `unaccent` provide typo tolerance and accent-insensitive matching. An immutable `ourvalleys_unaccent` wrapper creates one lower-cased, accent-normalised representation shared by the query and nine GIN trigram expression indexes across business, service, category, category-alias, place and place-alias fields. The Standard PostgreSQL lane verifies the function volatility and matching index definitions. Results use deterministic relevance, name and identifier ordering. Page size is bounded, page numbers are capped, and an out-of-range page recovers to page one rather than presenting a false zero-result state.

Query-plan and latency evidence should trigger a later generated-search-document migration if production volume shows that the multi-source ranked query requires a different materialised representation.

## 6. Indexing contract

Outside public release:

- `robots.txt` blocks every crawler;
- responses receive `X-Robots-Tag: noindex, nofollow, noarchive`;
- the sitemap is empty.

At public release the sitemap advertises only routes whose metadata is currently indexable:

- homepage;
- business directory;
- approved policy routes;
- non-demo businesses with complete published business and site records.

Place, category, event and guide routes remain usable but are intentionally absent from the sitemap while their route metadata remains `noindex`. The fictional Cwm & Coil business is never included in the public sitemap.

## 7. Production evidence

The `Production smoke` GitHub workflow runs manually or after a successful deployment status for the `production` environment from `main`. It resolves the HTTPS application origin in this order: manual `base_url`, the `PRODUCTION_BASE_URL` repository variable, then the trusted deployment `environment_url`. Preview, staging, private-pilot and non-`main` deployment events do not run the production-only assertions. Provider dashboard `target_url` values are never used as application origins.

It verifies:

- `/api/health` and `/api/ready`;
- connected public routes;
- public `robots.txt` and sitemap coherence, including an exact check that no root-wide `Disallow: /` directive is present;
- absence of privileged demo controls;
- availability and read-only behaviour of the retained viewer demonstration.

Playwright reports, screenshots, videos and traces are retained as failure evidence.

## 8. Failure containment and recovery

The migration is additive: it enables accepted PostgreSQL extensions, creates the immutable search normaliser, adds the locality-coordinate table and creates expression indexes that match the ranked query. A failed deployment should be forward-fixed on the same migration sequence rather than editing an applied migration.

Immediate containment options are:

- set the release stage back to `private_pilot` to restore global noindex behaviour;
- deploy the previously verified application build while preserving the additive schema;
- disable the affected public route or workflow through a reviewed forward fix;
- restore database data from the accepted backup process if a separate operational incident corrupts records.

Removing extensions, the normaliser, indexes or the coordinate table is not the routine rollback path because a partially deployed application may still reference them. Any destructive rollback requires explicit database inspection and a reviewed recovery plan.

## 9. Remaining genuine launch gates

Engineering preparation does not complete these owner-controlled or specialist actions:

- verify the production origin and repository variable;
- configure and verify the Resend sender domain;
- configure Cloudflare R2 production media variables;
- remove the privileged fictional owner and administrator identities and preserve appropriate evidence;
- complete administrator MFA readiness;
- complete policy, privacy, accessibility, safety and legal review;
- approve public launch.

Until those conditions are met, the safe release stage is `development` or `private_pilot`.
