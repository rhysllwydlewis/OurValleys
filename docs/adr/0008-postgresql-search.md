# ADR-0008: PostgreSQL search baseline

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-004, OV-005, Phase 1C

## Context

Residents need to find businesses, services, places, events and guides by ordinary local phrasing, category and distance. The first release does not yet have the scale or relevance evidence to justify operating a separate search engine.

## Decision drivers

- Search only public, published data.
- Keyword, category, synonym, location and radius filtering.
- Fuzzy handling of common spelling differences.
- Explainable ranking and labelled sponsored placement.
- Low initial operational complexity.
- A measurable upgrade path rather than a permanent assumption.

## Options considered

### PostgreSQL full-text search, `pg_trgm` and PostGIS

**Advantages**

- Uses the existing datastore and transactions.
- Supports indexed full-text, fuzzy similarity and geographic filtering.
- Public search projections can be updated atomically with publication state.
- Avoids operating and synchronising another service initially.

**Disadvantages**

- Advanced typo handling, analytics, faceting and ranking tools require more custom work.
- Search queries and indexes need careful tuning.

### Meilisearch, Typesense or Elasticsearch/OpenSearch from launch

**Advantages**

- Dedicated relevance, typo tolerance, facets and search operations.

**Disadvantages**

- Adds a new service, data synchronisation, recovery and privacy boundary before requirements are proven.

## Decision

Begin with **PostgreSQL full-text search**, **`pg_trgm` fuzzy matching** and **PostGIS location filtering**.

Implementation rules:

- Build an explicit denormalised `SearchDocument` or materialised projection containing only approved public fields.
- Never search ORM entities directly when that could expose draft, private, suspended or archived data.
- Store normalised English and Welsh labels, aliases and category synonyms.
- Combine text relevance, category match, geographic suitability, profile completeness and freshness using documented weights.
- Keep sponsored placement separate from organic ranking and label it clearly.
- Log privacy-safe search outcomes, including zero-result searches, using the analytics allowlist.
- Add representative RCT fixtures and regression tests for relevance.

## Consequences

### Positive

- Search can ship with the main database and publication transaction model.
- Fewer services need monitoring during validation.
- Ranking remains explainable and directly testable.

### Negative or accepted trade-offs

- Relevance work will use SQL and curated synonym data.
- Large-scale autocomplete and complex faceting may eventually need a dedicated engine.

### Required follow-up

- Define the search projection schema and update mechanism.
- Build the category and synonym seed dataset.
- Create relevance fixtures for common local searches and Welsh names.
- Benchmark keyword plus radius queries under representative data volumes.
- Document ranking factors and sponsored separation.

## Security, privacy and safety effects

- Only public projections are indexed.
- Private home coordinates, unpublished content, moderation notes and enquiry data are excluded.
- Suspensions and unpublishing must remove content from results promptly and testably.
- Search logs must not retain unnecessary personal or precise location data.

## Validation

Before launch:

- Test expected top results for a representative query suite.
- Test common spelling variants and category aliases.
- Test English and Welsh place names.
- Test radius and service-area filtering.
- Test that drafts, suspended records and private fields never appear.
- Measure p50 and p95 latency with representative launch and growth datasets.

## Revisit trigger

Evaluate a dedicated search engine when any of these persist after reasonable PostgreSQL tuning:

- More than 100,000 active public searchable entities.
- Representative p95 search latency above 300 ms at expected concurrency.
- Required relevance, faceting or typo-tolerance quality cannot meet the agreed regression suite.
- Search indexing materially interferes with transactional database reliability.

A new engine requires its own ADR, synchronisation design, privacy review and recovery test.

## References

- https://www.postgresql.org/docs/current/textsearch.html
- https://www.postgresql.org/docs/current/pgtrgm.html
- https://postgis.net/documentation/
- `../02-information-architecture.md`
- `../08-content-locations-localisation.md`
