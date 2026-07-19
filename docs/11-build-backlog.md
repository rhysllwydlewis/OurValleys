# Initial Build Backlog

## 1. How to use this backlog

This is the prioritised product backlog for Phase 0 and Phase 1. It is organised into epics and stories so coding agents can take bounded work without inventing scope.

Priority labels used here:

- **P0:** launch-blocking foundation, security or core journey.
- **P1:** required for a credible Phase 1 release.
- **P2:** valuable after the core release is stable.
- **Deferred:** explicitly outside Phase 1.

Every implementation issue should include:

- User problem.
- Scope.
- Acceptance criteria.
- Permission implications.
- Data model changes.
- Analytics events.
- Accessibility requirements.
- Tests.
- Documentation changes.

## Epic OV-000 — Validation and decisions

### OV-001 — Interview local businesses [P0]

**Outcome:** evidence on website needs, onboarding and willingness to pay.

Acceptance criteria:

- 20–30 interviews across at least five business categories.
- Notes stored in a private appropriate location, not necessarily this public repository.
- Themes summarised without unnecessary personal data.
- Top repeated problems and paid-tool demand documented.
- Product charter updated if assumptions fail.

### OV-002 — Build manual pilot business pages [P0]

- Create 5–10 representative structured example pages.
- Include trades, hospitality, retail, beauty, professional service and community organisation.
- Test content fields, template sections and mobile presentation.
- Record missing or confusing onboarding fields.

### OV-003 — Confirm initial place dataset [P0]

- Canonical RCT hierarchy agreed.
- Welsh names and aliases reviewed.
- Initial focus towns selected.
- Coordinates and place types recorded.
- Coverage state defined.

### OV-004 — Confirm category taxonomy [P0]

- Priority top-level categories agreed.
- Synonyms captured.
- Primary versus secondary category rules tested.
- Duplicate and overly narrow categories removed.

### OV-005 — Record architecture decisions [P0]

Create ADRs for framework, database, authentication, hosting, storage, email, analytics and search.

## Epic OV-100 — Repository and engineering foundation

### OV-101 — Scaffold application [P0]

Acceptance criteria:

- TypeScript strict mode.
- Agreed framework and package manager.
- Lint, format, typecheck and test scripts.
- Environment variable validation.
- Local setup documented.
- No secrets committed.

### OV-102 — Configure CI [P0]

- Install dependencies from lockfile.
- Lint.
- Typecheck.
- Unit tests.
- Build.
- Dependency and secret checks where selected.
- Pull request status visible.

### OV-103 — Configure environments [P0]

- Local, preview/test and production separated.
- Distinct databases and secrets.
- Preview indexing disabled.
- Destructive commands protected from production.

### OV-104 — Database and migrations [P0]

- PostgreSQL configured.
- PostGIS available and tested.
- Migration workflow documented.
- Seed workflow for places and categories.
- Backup and restore instructions drafted.

### OV-105 — Observability foundation [P0]

- Structured logs.
- Error tracking.
- Request correlation IDs.
- Health endpoint.
- Sensitive-field redaction.

### OV-106 — Design system foundation [P0]

- Tokens for spacing, typography, radius and colour.
- Accessible buttons, links, inputs, errors, dialogs and cards.
- Dark mode only if explicitly chosen later; not required by default.
- Story or component examples for critical states.

## Epic OV-200 — Identity and permissions

### OV-201 — Resident registration and sign-in [P0]

- Email verification.
- Secure sign-in.
- Recovery.
- Session management.
- Rate limiting.
- Clear errors without account enumeration.

### OV-202 — Resident profile and preferences [P1]

- Display name.
- Preferred language.
- Followed locations.
- Notification choices.
- Data and account controls.

### OV-203 — Role and permission service [P0]

- Global staff roles.
- Business memberships.
- Server-side permission helpers.
- Deny-by-default tests.
- Role changes reflected promptly.

### OV-204 — Administrator multi-factor requirement [P0]

- MFA required before admin access.
- Recovery process documented.
- Security event recorded.

### OV-205 — Account export and closure [P1]

- Re-authentication.
- Ownership conflict handling.
- Secure export link with expiry.
- Deletion or anonymisation workflow.
- Retention exceptions explained.

## Epic OV-300 — Reference data

### OV-301 — Place model and management [P0]

- Place types and hierarchy.
- English and Welsh names.
- Aliases.
- Coordinates.
- Coverage states.
- Admin create, edit, retire and redirect controls.

### OV-302 — Category model and management [P0]

- Three-level maximum hierarchy.
- Aliases and synonyms.
- Merge and retire workflow.
- Prevent unsafe deletion.
- Public category routes.

### OV-303 — Business attributes [P1]

- Accessibility.
- Languages.
- Delivery and collection.
- Emergency availability.
- Appointment requirements.
- Managed definitions.

## Epic OV-400 — Business records and claiming

### OV-401 — Create canonical business record [P0]

- Draft business creation.
- Public and private fields separated.
- Primary category.
- Status lifecycle.
- Unique stable ID and slug.

### OV-402 — Business membership and team roles [P0]

- Owner, manager and editor roles.
- Invitations.
- Acceptance and revocation.
- Last-owner protection.
- Audit events.

### OV-403 — Create-versus-claim check [P0]

- Search existing records before creation.
- Duplicate warning.
- Continue-to-create override requires explanation.
- Admin duplicate merge workflow planned.

### OV-404 — Business claim workflow [P0]

- Claim submission.
- Contact verification.
- Evidence upload or reference.
- Existing owner notification.
- Admin decision.
- Appeal notes.
- Atomic ownership assignment.

### OV-405 — Verification checks [P1]

- Specific check types.
- Private evidence storage.
- Expiry where applicable.
- Public badge explanation.
- No paid verification shortcut.

### OV-406 — Report incorrect business information [P1]

- Public report route.
- Correction category.
- Admin queue.
- Business notification where appropriate.
- Decision and audit.

## Epic OV-500 — Business onboarding

### OV-501 — Onboarding shell and autosave [P0]

- Step progress.
- Resume later.
- Server validation.
- Accessible errors.
- Public/private visibility explanations.

### OV-502 — Core details step [P0]

- Trading name.
- Summary.
- Description.
- Category.
- Public contact.

### OV-503 — Location and service-area step [P0]

- Fixed premises.
- Hidden-address business.
- Service area.
- Online-only.
- Coordinates and place association.
- Preview of public address visibility.

### OV-504 — Services and price guidance [P0]

- Structured services.
- Description.
- Category.
- Fixed, from, range or quote pricing.
- Reordering.

### OV-505 — Opening hours and exceptions [P0]

- Weekly schedule.
- Closed days.
- Multiple intervals if selected.
- Date exceptions.
- Timezone.

### OV-506 — Accessibility and language attributes [P1]

- Structured attributes.
- Explanatory labels.
- Welsh-speaking service.
- Owner review before publication.

### OV-507 — Media onboarding [P0]

- Logo and gallery.
- Upload validation.
- Processing state.
- Alt-text prompt.
- Rights confirmation.
- Limits.

### OV-508 — Enquiry configuration [P1]

- General enquiry.
- Quote request.
- Contact visibility.
- Required privacy text.

## Epic OV-600 — Generated business websites

### OV-601 — Site template schema [P0]

- Template versioning.
- Supported business types.
- Section definitions.
- Theme tokens.
- Quality status.

### OV-602 — Initial universal template [P0]

- Hero.
- About.
- Services.
- Hours.
- Location or service area.
- Gallery.
- Contact.
- Accessibility and language.

### OV-603 — Priority category variants [P1]

- Trades.
- Food and drink.
- Retail.
- Beauty.
- Professional services.
- Community organisation.

### OV-604 — Draft autosave and preview [P0]

- Draft revision.
- Mobile and desktop preview.
- Preview authorization.
- No indexing.

### OV-605 — Publish and rollback [P0]

- Publication validation.
- Published revision pointer.
- Search update.
- Cache invalidation.
- Audit event.
- Restore prior revision.

### OV-606 — Public business route [P0]

- Stable slug.
- Responsive rendering.
- Metadata.
- Verification explanations.
- Last updated.
- Report control.

### OV-607 — Website editor [P1]

- Structured fields.
- Section enablement.
- Approved layout choices.
- Safe palette controls.
- Accessibility guardrails.

### OV-608 — Custom domains [P2]

Deferred until paid plans and domain lifecycle controls are ready.

## Epic OV-700 — Search and discovery

### OV-701 — Public search projection [P0]

- Only published public fields.
- Business and event types.
- Location and category data.
- Update after publish, suspension and correction.

### OV-702 — Keyword search [P0]

- Business name, description, service and category.
- Basic typo or similarity handling.
- Highlighting where accessible.
- Pagination.

### OV-703 — Location and radius search [P0]

- Place selection.
- Postcode or coordinate lookup.
- PostGIS distance query.
- Clear distance units.
- No private base-address exposure.

### OV-704 — Search filters [P1]

- Category.
- Open now.
- Verification.
- Accessibility.
- Welsh-speaking.
- Distance.

### OV-705 — Ranking and sponsored separation [P1]

- Organic ranking documented.
- Sponsored result label.
- No hidden pay-to-rank.
- Ranking test fixtures.

### OV-706 — Zero-results experience [P1]

- Explain filters.
- Broaden radius.
- Related categories.
- Nearby place suggestion.
- Log zero-result analytics.

### OV-707 — Category pages [P1]

- Introduction.
- Subcategories.
- Businesses.
- Place controls.
- Pagination and metadata.

## Epic OV-800 — Place pages

### OV-801 — Place page renderer [P1]

- Introduction.
- Business categories.
- Current events.
- Guides.
- Nearby places.
- Coverage state.

### OV-802 — Place page administration [P1]

- Edit introduction.
- Select and order approved blocks.
- Hide insufficient sections.
- Preview.
- Publish and review date.

### OV-803 — Thin-content indexing controls [P0]

- Planned pages not indexable.
- Seeding threshold rule.
- Canonical handling.
- Sitemap inclusion only when eligible.

## Epic OV-900 — Events and editorial

### OV-901 — Event model and creation [P1]

- Organiser.
- Date, time and timezone.
- Location.
- Category.
- Price and ticket link.
- Accessibility and travel.

### OV-902 — Event moderation and lifecycle [P1]

- Draft, review, published, cancelled, completed and archived.
- Automatic past transition.
- Report route.
- Organiser notification.

### OV-903 — Event directory and filters [P1]

- Date.
- Place.
- Category.
- Free events.
- Upcoming default.

### OV-904 — Guide workflow [P1]

- Draft and editorial review.
- Author and content type.
- Related places and businesses.
- Sponsorship disclosure.
- Review date and corrections.

### OV-905 — Homepage content blocks [P1]

- Search.
- Categories.
- Events.
- Businesses.
- Guides.
- For-business CTA.
- Hide empty blocks.

## Epic OV-1000 — Enquiries and notifications

### OV-1001 — Public enquiry form [P0]

- General and quote request variants.
- Validation.
- Privacy notice.
- Rate limits and spam controls.
- Confirmation.

### OV-1002 — Enquiry delivery and storage [P0]

- Business notification.
- Dashboard record.
- Delivery status.
- Retry-safe processing.
- Retention expiry.

### OV-1003 — Business enquiry inbox [P1]

- List and detail.
- Read, replied, closed, spam and archived.
- Permission control.
- Safe export or deletion where required.

### OV-1004 — Notification preferences [P1]

- Transactional versus optional categories.
- Resident and business preferences.
- Unsubscribe and suppression.

### OV-1005 — Saved businesses and events [P1]

- Add and remove.
- Account list.
- Duplicate prevention.
- Event status notification if enabled.

## Epic OV-1100 — Administration and moderation

### OV-1101 — Admin overview [P0]

- Pending claims.
- Verification queue.
- Reports.
- Pending content.
- Recent admin actions.
- Operational alerts.

### OV-1102 — User and business administration [P0]

- Search.
- Status view.
- Restrict and restore with reason.
- Membership inspection.
- Sensitive data minimised.

### OV-1103 — Report queue [P0]

- Priority.
- Assignment.
- Context.
- Decision.
- Notification.
- Appeal reference.

### OV-1104 — Audit log [P0]

- Actor, action, target and time.
- Before and after summary for critical actions.
- Restricted access.
- Search and export limits.

### OV-1105 — Feature flags [P1]

- Future modules disabled by default.
- Environment-aware.
- Server-enforced.
- Audit changes.

## Epic OV-1200 — Analytics and commercial readiness

### OV-1201 — Analytics event dictionary [P0]

- Define event names and properties.
- Consent and privacy review.
- Versioning.
- Test tracking in preview.

### OV-1202 — Founder dashboard [P1]

- Active businesses.
- Published sites.
- Search success.
- Connections.
- Coverage.
- Queues.

### OV-1203 — Business analytics [P1]

- Views.
- Search appearances.
- Enquiries.
- Contact actions.
- Period comparison.
- Bot caveat.

### OV-1204 — Plan and entitlement model [P2]

Required before subscriptions; not part of first private pilot unless pricing validation supports it.

### OV-1205 — Subscription billing [P2]

- Hosted checkout.
- Signed idempotent webhooks.
- Grace states.
- Entitlement synchronisation.
- Billing administration.

## Epic OV-1300 — Trust, privacy and launch readiness

### OV-1301 — Data inventory and processing record [P0]

- All personal-data flows mapped.
- Purpose, basis, processors and retention recorded.
- Public and private fields classified.

### OV-1302 — Online safety service assessment [P0]

- Service map.
- Scope check.
- Illegal-content risk assessment.
- Children’s access assessment.
- Safety measures and review owner.

### OV-1303 — Public policy pages [P0]

- Terms.
- Privacy.
- Cookies.
- Content guidelines.
- Advertising policy.
- Complaints and corrections.
- Accessibility.
- Reporting guidance.

### OV-1304 — Retention and deletion jobs [P1]

- Enquiries.
- Verification evidence.
- logs.
- abandoned drafts.
- deleted accounts.
- documented exceptions.

### OV-1305 — Security review [P0]

- Authentication.
- authorization.
- uploads.
- public/private data.
- admin routes.
- rate limits.
- secrets.
- dependencies.

### OV-1306 — Accessibility review [P0]

- Core public journeys.
- Onboarding.
- dashboard.
- admin.
- generated templates.
- accessibility statement.

### OV-1307 — Backup restore exercise [P0]

- Restore database in non-production.
- Verify media references.
- Record time and gaps.
- Update recovery procedure.

## Deferred epics

Do not create implementation tasks until release gates are approved:

- OV-2000 Reviews.
- OV-2100 Marketplace.
- OV-2200 Community forum and groups.
- OV-2300 Jobs.
- OV-2400 Property advertising.
- OV-2500 Ticketing and payments.
- OV-2600 Loyalty and vouchers.
- OV-2700 Native mobile applications.

## Suggested first coding sequence

After Phase 0 decisions:

1. OV-101 to OV-106.
2. OV-201 to OV-204.
3. OV-301 and OV-302.
4. OV-401 to OV-403.
5. OV-501 to OV-507.
6. OV-601, OV-602, OV-604 to OV-606.
7. OV-701 to OV-703.
8. OV-1001 and OV-1002.
9. OV-1101 to OV-1104.
10. Remaining P1 work by dependency.

## Vibe-coding rule

A coding agent must not implement an entire epic in one uncontrolled prompt. Break work into vertical slices that can be tested and reviewed, for example:

- Add business table and migration.
- Add server-side create-business action with validation.
- Add permission tests.
- Add onboarding form for core details.
- Add dashboard display.

Each slice should leave the repository buildable and documented.
