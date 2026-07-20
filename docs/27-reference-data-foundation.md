# Provisional Reference-Data Foundation

## Purpose

This document records the first Stage F implementation slice for configurable place, category and canonical business reference data.

The structures are deliberately provisional while issues #2 and #3 validate the final RCT place hierarchy, launch cluster and category taxonomy. They are designed so those decisions can change without replacing the canonical business record or public routes.

## Delivered model

### Places

- Existing `place` records remain canonical.
- `place_relationship` represents parent-child containment and optional provisional launch-cluster membership.
- `place_alias` stores English and Welsh search aliases without creating duplicate place pages.
- Self-referential relationships are rejected by a database check.
- Parent-child pairs and aliases are unique and indexed for traversal and lookup.

### Categories

- Existing `category` records remain canonical.
- `category_relationship` provides configurable parent-child hierarchy.
- `category_alias` stores English and Welsh search labels and common resident phrasing.
- Self-referential hierarchy links are rejected.
- Alias and relationship uniqueness prevents duplicate taxonomy paths.

### Business categories

- `business.primary_category_id` remains the single canonical primary category.
- `business_category` stores secondary categories only.
- The assignment service rejects the primary category, inactive or missing categories, duplicate assignments and more than three secondary categories.
- Database constraints prevent duplicate business/category links and non-secondary relationship types.

## Safety and data boundaries

- No real business, resident or launch claim is introduced.
- The existing public/private business projection remains unchanged.
- Aliases improve search and bilingual readiness but do not generate duplicate public pages.
- Final launch-cluster and taxonomy choices remain configurable and must not be presented as validated while issues #2 and #3 remain open.
- Tenant permissions and deny-by-default behaviour are unchanged.

## Migration and validation

Migration `0002_reference_data_foundation.sql` creates the relationship, alias and secondary-category tables with foreign keys, checks, unique indexes and lookup indexes.

Integration coverage verifies:

- English and Welsh aliases.
- Rejection of the primary category as secondary.
- The three-secondary-category ceiling.
- Fail-closed handling of missing businesses, missing categories and duplicate assignments.

The deterministic test fixtures are fictional and use reserved UUIDs and `.example` conventions.

## Successor work

Later Stage F slices should connect these structures to administration, imports, public search and provisional seed packs. Final hierarchy and taxonomy changes should update data through migrations or import tooling rather than hard-coded route logic.
