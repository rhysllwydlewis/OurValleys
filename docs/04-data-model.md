# Data Model

## 1. Purpose

Define a stable conceptual model before framework-specific schemas are written. The final database may use different table or collection names, but it must preserve the boundaries, ownership rules and lifecycle states described here.

## 2. Modelling principles

- Use stable internal identifiers; public slugs may change.
- Separate public profile content from private verification, billing and security data.
- Treat locations and categories as managed reference data.
- Preserve important state transitions and administrative decisions.
- Avoid copying the same business information into separate website and directory records.
- Record consent, moderation and verification decisions with timestamps and accountable actors.
- Do not retain data indefinitely merely because storage is inexpensive.
- Prefer structured fields for search, filtering, accessibility and translation.

## 3. Core identity entities

## 3.1 User

Represents an authenticated person.

Suggested fields:

- `id`
- `email`
- `email_verified_at`
- `display_name`
- `preferred_language`
- `status`
- `created_at`
- `updated_at`
- `last_active_at`

Private authentication credentials or provider identifiers should live in dedicated authentication storage rather than public profile data.

Suggested states:

- pending_verification
- active
- restricted
- suspended
- deletion_pending
- deleted_or_anonymised

## 3.2 UserProfile

Optional resident-facing preferences:

- `user_id`
- `public_display_name`
- `avatar_media_id`
- `bio`
- `home_place_id`
- `profile_visibility`

MVP should avoid collecting unnecessary demographic data.

## 3.3 UserLocationPreference

- `user_id`
- `place_id`
- `follow_level`
- `notification_enabled`

## 3.4 ConsentRecord

- `id`
- `user_id` or contact reference
- `purpose`
- `status`
- `source`
- `policy_version`
- `captured_at`
- `withdrawn_at`

Consent must not be used where another lawful basis is actually relied on; the field records real consent decisions rather than becoming a generic legal flag.

## 4. Business and organisation entities

## 4.1 Business

The canonical business record.

Suggested fields:

- `id`
- `trading_name`
- `legal_name_private`
- `slug`
- `summary`
- `description`
- `primary_category_id`
- `business_type`
- `status`
- `claim_status`
- `verification_summary_status`
- `public_phone`
- `public_email`
- `website_mode`
- `preferred_language`
- `created_by_user_id`
- `published_at`
- `created_at`
- `updated_at`

Suggested status lifecycle:

- draft
- pending_review
- published
- temporarily_hidden
- suspended
- archived

`verification_summary_status` must not replace the detailed verification records.

## 4.2 BusinessMembership

Connects users to businesses.

- `id`
- `business_id`
- `user_id`
- `role`
- `permissions`
- `status`
- `invited_by_user_id`
- `accepted_at`
- `created_at`

There must always be an explicit ownership resolution process before the last active owner is removed.

## 4.3 BusinessCategory

Allows limited secondary categories.

- `business_id`
- `category_id`
- `relationship_type`
- `sort_order`

## 4.4 Service

- `id`
- `business_id`
- `name`
- `description`
- `category_id`
- `price_type`
- `price_from`
- `price_to`
- `currency`
- `duration_minutes`
- `status`
- `sort_order`

Price fields must support “contact for quote” without inventing numerical values.

## 4.5 BusinessLocation

- `id`
- `business_id`
- `place_id`
- `location_type`
- `public_address_fields`
- `private_address_fields`
- `coordinates`
- `public_address_visibility`
- `is_primary`
- `status`

Suggested location types:

- public_premises
- private_premises
- service_area_base
- online_only
- temporary_or_mobile

## 4.6 BusinessServiceArea

- `id`
- `business_id`
- `place_id` or geometry
- `radius_distance`
- `radius_unit`
- `priority`

Avoid representing a very broad service radius as evidence that the business is locally based.

## 4.7 OpeningHoursRule

- `id`
- `business_location_id`
- `day_of_week`
- `opens_at`
- `closes_at`
- `is_closed`
- `valid_from`
- `valid_to`

## 4.8 OpeningHoursException

- `id`
- `business_location_id`
- `date`
- `opens_at`
- `closes_at`
- `is_closed`
- `note`

## 4.9 BusinessAttribute

Structured attributes for search and disclosure:

- wheelchair access
- accessible toilet
- hearing loop
- parking
- delivery
- collection
- emergency availability
- Welsh-speaking service
- appointment required

Use managed definitions rather than uncontrolled boolean columns for every future attribute.

## 5. Generated website entities

## 5.1 BusinessSite

- `id`
- `business_id`
- `template_id`
- `status`
- `theme_settings`
- `navigation_settings`
- `platform_subpath`
- `custom_domain_status`
- `published_revision_id`
- `draft_revision_id`
- `published_at`

Business and business site should remain one-to-one in the initial product.

## 5.2 SiteTemplate

- `id`
- `name`
- `supported_business_types`
- `version`
- `status`
- `section_definitions`
- `default_theme`
- `accessibility_test_status`

## 5.3 SiteRevision

- `id`
- `business_site_id`
- `revision_number`
- `content_snapshot_or_reference`
- `theme_snapshot`
- `created_by_user_id`
- `created_at`
- `published_at`

Revision storage must not duplicate private fields into public snapshots.

## 5.4 CustomDomain

- `id`
- `business_site_id`
- `hostname`
- `verification_status`
- `dns_challenge`
- `tls_status`
- `primary_status`
- `created_at`
- `verified_at`

## 6. Reference entities

## 6.1 Place

- `id`
- `canonical_name`
- `welsh_name`
- `slug`
- `place_type`
- `parent_place_id`
- `coordinates`
- `boundary_reference`
- `coverage_status`
- `editorial_summary`
- `status`

## 6.2 PlaceAlias

- `id`
- `place_id`
- `alias`
- `language`
- `alias_type`

## 6.3 PlaceRelationship

For adjacency or discovery relationships beyond the canonical parent:

- `from_place_id`
- `to_place_id`
- `relationship_type`
- `weight`

## 6.4 Category

- `id`
- `name`
- `welsh_name`
- `slug`
- `parent_category_id`
- `description`
- `status`
- `sort_order`

## 6.5 CategoryAlias

- `id`
- `category_id`
- `alias`
- `language`
- `search_weight`

## 7. Content entities

## 7.1 Event

- `id`
- `organiser_business_id` or organisation reference
- `title`
- `slug`
- `summary`
- `description`
- `category_id`
- `place_id`
- `venue_name`
- `address_visibility`
- `start_at`
- `end_at`
- `timezone`
- `recurrence_rule_limited`
- `price_type`
- `price_display`
- `ticket_url`
- `accessibility_information`
- `travel_information`
- `status`
- `moderation_status`
- `published_at`

Suggested event states:

- draft
- pending_review
- scheduled
- published
- cancelled
- completed
- archived
- removed

## 7.2 Guide

- `id`
- `title`
- `slug`
- `summary`
- `body_structured`
- `content_type`
- `author_user_id`
- `sponsor_business_id`
- `sponsorship_disclosure`
- `status`
- `published_at`
- `corrected_at`

## 7.3 GuidePlace

- `guide_id`
- `place_id`
- `relationship_type`

## 7.4 GuideBusiness

- `guide_id`
- `business_id`
- `relationship_type`
- `editorial_basis`
- `sponsored_status`

## 7.5 MediaAsset

- `id`
- `owner_user_id`
- `business_id`
- `storage_key`
- `media_type`
- `mime_type`
- `file_size`
- `width`
- `height`
- `duration`
- `alt_text`
- `credit`
- `rights_basis`
- `processing_status`
- `moderation_status`
- `created_at`

Do not rely on the original filename for identity or public delivery.

## 8. Interaction entities

## 8.1 Enquiry

- `id`
- `business_id`
- `sender_user_id_optional`
- `sender_name`
- `sender_email`
- `sender_phone_optional`
- `subject_or_service_id`
- `message`
- `consent_and_notice_record`
- `spam_score`
- `status`
- `delivered_at`
- `created_at`
- `retention_expires_at`

Suggested states:

- received
- delivered
- read
- replied
- closed
- spam
- delivery_failed
- deleted_or_anonymised

## 8.2 SavedEntity

- `id`
- `user_id`
- `entity_type`
- `entity_id`
- `created_at`

Validate entity type centrally rather than accepting arbitrary strings.

## 8.3 NotificationPreference

- `id`
- `user_id`
- `notification_type`
- `channel`
- `enabled`
- `updated_at`

## 8.4 NotificationDelivery

- `id`
- `user_id`
- `notification_type`
- `channel`
- `template_version`
- `status`
- `provider_reference`
- `sent_at`
- `failed_at`

Avoid storing full sensitive message contents unnecessarily in delivery logs.

## 9. Trust and governance entities

## 9.1 BusinessClaim

- `id`
- `business_id`
- `claimant_user_id`
- `status`
- `evidence_summary`
- `reviewer_user_id`
- `decision_reason`
- `submitted_at`
- `decided_at`

## 9.2 VerificationCheck

- `id`
- `business_id`
- `check_type`
- `status`
- `evidence_storage_reference`
- `verified_value_hash_or_reference`
- `reviewer_user_id`
- `expires_at`
- `created_at`
- `decided_at`

Evidence storage requires stricter access and retention than ordinary business content.

## 9.3 Report

- `id`
- `reporter_user_id_optional`
- `target_type`
- `target_id`
- `report_category`
- `description`
- `priority`
- `status`
- `assigned_to_user_id`
- `created_at`
- `resolved_at`

## 9.4 ModerationDecision

- `id`
- `report_id_optional`
- `target_type`
- `target_id`
- `action`
- `policy_basis`
- `reason`
- `decision_maker_user_id`
- `created_at`
- `expires_at_optional`

## 9.5 Appeal

- `id`
- `moderation_decision_id`
- `appellant_user_id`
- `grounds`
- `status`
- `reviewer_user_id`
- `outcome_reason`
- `created_at`
- `decided_at`

## 9.6 AuditEvent

- `id`
- `actor_user_id_optional`
- `actor_type`
- `action`
- `target_type`
- `target_id`
- `reason_optional`
- `before_summary`
- `after_summary`
- `correlation_id`
- `created_at`

Audit data must be access-controlled and retention-managed.

## 10. Commercial entities

## 10.1 Plan

- `id`
- `name`
- `version`
- `billing_interval`
- `price`
- `currency`
- `entitlements`
- `status`

Version plans so historic subscriptions retain a clear entitlement record.

## 10.2 Subscription

- `id`
- `business_id`
- `plan_id`
- `billing_customer_reference`
- `billing_subscription_reference`
- `status`
- `current_period_start`
- `current_period_end`
- `cancel_at_period_end`
- `created_at`

Do not store full payment-card data.

## 10.3 SponsorshipPlacement

- `id`
- `business_id`
- `placement_type`
- `location_or_category_scope`
- `starts_at`
- `ends_at`
- `disclosure_label`
- `status`

Paid status must be queryable so the UI can always label it correctly.

## 11. Analytics entities

Prefer an event stream or analytics service with a documented event catalogue. Key event fields:

- `event_name`
- `occurred_at`
- `anonymous_or_user_id`
- `session_id`
- `entity_type`
- `entity_id`
- `place_id`
- `source`
- `campaign`
- `properties_allowlisted`
- `consent_state`

Do not send free-form enquiry text, private addresses, verification evidence or authentication secrets into analytics.

## 12. Future module boundaries

Future entities should remain separate modules but reuse identity, location, category, media, reporting and audit systems:

- Offer.
- Job.
- MarketplaceListing.
- PropertyListing.
- Review.
- CommunityPost.
- Group.
- Booking.
- Voucher.

Do not add placeholder database tables merely to make the schema look complete. Add them when the associated product rules are ready.

## 13. Data lifecycle rules

Each entity must define:

- Creation owner.
- Public/private classification.
- Editable roles.
- Publishable states.
- Retention period.
- Deletion or anonymisation behaviour.
- Audit requirements.
- Search-index inclusion.
- Backup treatment.

## 14. Integrity constraints

At minimum:

- Public business slug unique among active business pages.
- One primary category per business.
- One active primary owner membership per business, with additional owners allowed by policy.
- No published business without required public fields.
- No custom domain attached to more than one active site.
- Event end time cannot precede start time.
- Suspended content excluded from public search.
- Private addresses excluded from public API responses.
- Verification evidence cannot be returned through ordinary business endpoints.
- Paid placement always carries a disclosure state.
