# Testing and Quality Strategy

## 1. Objective

Ensure OurValleys remains trustworthy, secure and maintainable while being developed through small AI-assisted changes.

Testing must focus on real user and data risks, not only maximising test counts.

## 2. Quality principles

- Test business rules at the lowest useful level.
- Test permissions and tenant boundaries aggressively.
- Test complete critical journeys in a real browser.
- Treat accessibility, security, performance and recovery as release criteria.
- Use representative local data and difficult edge cases.
- Keep tests deterministic and independent.
- A failing test is not fixed by deleting or weakening it without a reasoned product decision.
- Generated code is reviewed to the same standard as human-written code.

## 3. Test layers

## 3.1 Static checks

Run on every pull request:

- Formatting.
- Linting.
- Type checking.
- Schema or migration checks.
- Dependency policy checks.
- Secret scanning.
- Build.

## 3.2 Unit tests

Use for pure rules such as:

- Slug generation.
- Opening-hours calculations.
- Plan entitlements.
- Business completeness scoring.
- Search query parsing.
- Event state transitions.
- Verification badge labels.
- Notification preference resolution.
- Retention date calculation.

## 3.3 Integration tests

Use a real test database for:

- Migrations.
- Business creation and membership.
- Permission-scoped queries.
- Claim approval transactions.
- Publishing revisions.
- Search projection updates.
- Location and radius queries.
- Enquiry storage and status.
- Moderation decisions.
- Subscription webhooks when added.

Mocks should not replace the database where database constraints are part of the behaviour.

## 3.4 Contract tests

Use for external integrations:

- Email provider.
- Object storage.
- Authentication provider.
- Geocoding or postcode provider.
- Billing provider.
- Analytics.

Verify expected request and response shapes without depending entirely on live external services in CI.

## 3.5 End-to-end tests

Critical browser journeys:

1. Resident registers and verifies email.
2. Business owner creates a business.
3. Business completes onboarding.
4. Business previews and publishes a site.
5. Resident searches by category and location.
6. Resident opens a business and submits an enquiry.
7. Business sees and updates the enquiry.
8. Organiser creates and publishes an event.
9. Administrator approves a claim.
10. Moderator handles a report.
11. User changes language preference.
12. User requests export or account closure.

Keep a smaller stable critical suite for every pull request and a broader scheduled suite if runtime becomes significant.

## 4. Permission and tenant-isolation tests

These are P0 tests.

Test that:

- Visitor cannot access resident, business or admin data.
- Resident cannot access any business dashboard without membership.
- Business editor cannot manage billing or ownership.
- Business manager cannot access another business by changing an identifier.
- Removed team member loses access.
- Suspended user cannot perform restricted actions.
- Moderator sees only necessary moderation data.
- Support operator cannot use moderator or billing powers.
- Admin routes require the correct role and MFA state.
- Cache and search results never leak draft or private tenant data.

For every new business-owned endpoint, add a cross-tenant negative test.

## 5. Public/private data tests

Test that public API and rendered pages never expose:

- Private home address.
- Legal name where not intended for publication.
- Verification evidence.
- Billing identifiers.
- Internal moderation notes.
- User email used only for account access.
- Unpublished drafts.
- Enquiry sender details to unauthorised users.
- Security or recovery tokens.

Use explicit response allowlists rather than serialising database records directly.

## 6. Search tests

### Relevance fixtures

Create realistic fixtures for:

- Plumber in Tonypandy.
- Café in Treorchy.
- Mobile hairdresser covering several towns.
- Online-only RCT business.
- Business with a hidden home address.
- Welsh and English category aliases.
- Similar business names.
- Closed and suspended profiles.

### Required assertions

- Relevant local result ranks above unrelated result.
- Selected place and radius are respected.
- Private base location is not revealed.
- Suspended, draft and archived records are excluded.
- Sponsored placement is labelled and separate.
- Zero-results suggestions do not invent availability.
- Slug change does not create duplicate canonical results.

## 7. Business website tests

Test every active template with:

- Very long business name.
- Missing logo.
- No gallery.
- One service and many services.
- Long descriptions.
- Welsh characters.
- No public street address.
- Multiple opening intervals.
- Closed business.
- Expired verification.
- Large and small images.
- Keyboard-only navigation.
- 200% and 400% zoom.
- Reduced motion.

Publishing tests:

- Incomplete site cannot publish.
- Preview requires permission and is not indexable.
- Published revision is stable.
- Rollback restores prior public state.
- Publishing updates search and cache.
- Failed indexing does not corrupt the published revision.

## 8. Enquiry tests

- Valid enquiry is stored and delivered once.
- Retry does not create duplicate user-visible enquiries.
- Invalid email or required fields are rejected accessibly.
- Rate limits work.
- Spam classification does not silently discard legitimate messages without policy.
- Business members without enquiry permission cannot read content.
- Notification subject does not expose sensitive text.
- Retention process removes or anonymises expired records correctly.
- Analytics record only the allowed event, not the message content.

## 9. Event tests

- End cannot precede start.
- Timezone is explicit.
- Cancelled event is labelled and removed from normal upcoming results.
- Past event transitions correctly.
- Recurrence is bounded and does not generate infinite instances.
- Organiser permission is enforced.
- Unpublished event does not appear on place pages or sitemaps.
- Ticket URL is validated safely.

## 10. Moderation and claim tests

- Report creates queue item.
- Priority routing works.
- Moderator action changes visibility consistently.
- Reason and audit event are required.
- Appeal can be connected to the decision.
- Claim approval transfers ownership atomically.
- Conflicting claim does not silently overwrite owner.
- Verification evidence is inaccessible to ordinary admins without permission.
- Restoring content returns only the intended state.

## 11. Accessibility testing

## 11.1 Automated

Run on representative pages and components:

- Semantic and ARIA checks.
- Colour contrast.
- Form labels.
- Duplicate IDs.
- Landmark structure.
- Obvious keyboard traps.

Automated tools do not prove accessibility.

## 11.2 Manual

For core journeys test:

- Keyboard only.
- Screen-reader spot checks.
- 200% and 400% zoom or reflow.
- High contrast or forced colours where supported.
- Reduced motion.
- Error identification and recovery.
- Focus order after dialogs and navigation.
- Touch target sizes.

## 11.3 Generated site gate

Every template version requires accessibility review before activation.

## 12. Security testing

At minimum test:

- Broken access control.
- Cross-tenant object reference changes.
- Injection and unsafe output.
- CSRF where relevant.
- Authentication rate limits.
- Session invalidation.
- Password reset abuse.
- File type spoofing.
- Oversized uploads.
- Stored script attempts.
- Unsafe redirects.
- Webhook signature verification.
- Secret exposure.
- Admin privilege escalation.
- Cache poisoning or private response caching.

Before public launch, perform a focused independent security review if feasible.

## 13. File upload testing

Fixtures should include:

- Valid JPEG, PNG and WebP.
- Incorrect extension and MIME mismatch.
- Oversized image.
- Extreme dimensions.
- Corrupt file.
- SVG with script.
- HTML renamed as image.
- Image with location metadata.
- Duplicate upload.

Assert that public derivatives are safe and unnecessary metadata is removed.

## 14. Performance testing

Test representative pages, not an empty development database.

### Public pages

- Home.
- Search results.
- Busy category page.
- Business page with full gallery.
- Place page.
- Event detail.

### Dashboard

- Business with many services and enquiries.
- Admin report queue.

### Targets

Use Core Web Vitals targets in the MVP specification and define additional server latency budgets after prototype measurement.

Track:

- Database query count.
- Slow query logs.
- Search latency.
- Media payload.
- JavaScript payload.
- Cache hit behaviour.
- background job delay.

## 15. Resilience and failure tests

Simulate:

- Email provider unavailable.
- Object storage timeout.
- Search projection job failure.
- Database connection interruption.
- Duplicate webhook.
- Background job retry.
- Publish succeeds but cache invalidation fails.
- External ticket link unavailable.

The system should degrade honestly and preserve recoverable work.

## 16. Migration testing

- Apply migrations to an empty database.
- Apply from the previous production-like schema.
- Test rollback or forward-fix plan.
- Validate data transformations.
- Check indexes and constraints.
- Estimate lock or downtime risk.
- Back up before destructive production changes.

## 17. Backup and restore testing

At a defined cadence:

1. Restore a recent database backup into a non-production environment.
2. Verify users, businesses, publications and audit references.
3. Verify media references or restoration process.
4. Test a business revision rollback.
5. Record duration, missing items and corrective actions.

## 18. Test data

Use fictional data that reflects local complexity without impersonating real residents.

Include:

- Bilingual names and content.
- Similar town names.
- Service-area businesses.
- Multi-location business.
- Hidden home address.
- Unclaimed business.
- Suspended profile.
- Cancelled event.
- Long content.
- Accessibility attributes.

Do not copy production personal data into tests by default.

## 19. CI policy

Pull requests should not merge unless required checks pass:

- Install from lockfile.
- Lint.
- Typecheck.
- Unit tests.
- Integration tests for changed domain areas.
- Critical end-to-end smoke tests.
- Production build.
- Migration validation where schema changes.
- Security and secret checks.

Allow an emergency bypass only through a documented exceptional process with follow-up issue.

## 20. Defect severity

### Critical

- Data breach.
- Cross-tenant access.
- Authentication bypass.
- Irrecoverable data loss.
- Unsafe public content state with immediate serious harm.

### High

- Core journey unusable.
- Enquiries lost.
- Private data exposed to wrong authorised class.
- Publishing corruption.
- Major accessibility blocker.

### Medium

- Feature partly broken with workaround.
- Incorrect analytics.
- Moderate performance degradation.
- Non-critical accessibility defect.

### Low

- Cosmetic issue.
- Minor wording or layout inconsistency.

Critical and High defects block release unless an accountable owner documents a compelling exceptional decision.

## 21. Release checklist

- Scope matches current phase.
- Acceptance criteria met.
- CI green.
- Permission tests included.
- Public/private data reviewed.
- Accessibility checks complete.
- Security implications reviewed.
- Performance within budget.
- Empty and error states present.
- Analytics events correct and privacy-safe.
- Admin and moderation controls ready.
- Policies and help content updated.
- Migration and rollback understood.
- Backup current.
- Feature flag and disable path known.
- Documentation updated.

## 22. Test ownership

Coding agents can create tests, but the project owner remains responsible for deciding whether tests correctly represent intended behaviour. Never accept a test merely because it passes.
