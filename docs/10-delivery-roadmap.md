# Delivery Roadmap

## 1. Delivery principle

OurValleys should be built in evidence-led stages. Each stage must produce a usable outcome and reduce a major risk before the next stage expands scope.

The roadmap avoids calendar promises until the team, stack and capacity are known. Work is organised by gates and dependencies rather than invented dates.

## 2. Phase 0 — Validation and project setup

### Objective

Confirm that the core problem, generated website proposition and willingness to participate are real before building a large platform.

### Work

- Interview 20–30 local businesses across several categories.
- Interview residents about local discovery habits.
- Recruit founding businesses.
- Produce 5–10 manual example business sites using the proposed structured content.
- Test onboarding questions.
- Validate category and location models.
- Test free and paid package concepts.
- Confirm brand and domain strategy.
- Choose accountable owners for product, privacy, safety, security and content.
- Create architecture decision records.
- Set repository protections and contribution workflow.
- Create initial place, category and glossary datasets.

### Exit gate

- At least 10 businesses are willing to complete a pilot.
- The generated website solves a stated problem for several categories.
- Core onboarding fields are understood.
- No unresolved strategic reason makes the business model implausible.
- Initial stack and hosting decisions are recorded.

## 3. Phase 1A — Engineering foundation

### Objective

Create a secure, testable platform shell with identity, reference data and operational controls.

### Work

- Application scaffold.
- Environments and secret management.
- Database and migrations.
- Place and category reference data.
- Authentication and session management.
- Role and permission framework.
- Base design system and accessibility foundations.
- Media upload pipeline.
- Email delivery foundation.
- Structured logging and error monitoring.
- Testing framework.
- CI checks.
- Admin shell.
- Audit events.
- Feature flags.

### Exit gate

- Automated checks run on pull requests.
- Environments are separated.
- Authentication and permission tests pass.
- Database backup and restore approach is documented.
- Admin routes are protected.
- No production feature depends on hard-coded local data.

## 4. Phase 1B — Business onboarding and websites

### Objective

Allow a real local business to create, preview and publish a generated website.

### Work

- Business record.
- Business membership and ownership.
- Create-versus-claim flow.
- Guided onboarding.
- Locations and service areas.
- Services, hours and attributes.
- Media gallery.
- Template family for priority categories.
- Draft, preview, publish and rollback.
- Public business route.
- Business dashboard.
- Basic verification workflow.
- Report incorrect information.
- SEO metadata and sitemap inclusion.

### Exit gate

- Several founding businesses publish without code changes.
- Public/private data separation is tested.
- Pages pass accessibility and performance thresholds.
- Claim conflicts can be reviewed administratively.
- Publishing and rollback are reliable.

## 5. Phase 1C — Discovery, places and events

### Objective

Make the growing business dataset genuinely useful to residents.

### Work

- Search projection.
- Keyword and category search.
- Location and radius filters.
- Category pages.
- Place pages.
- Saved businesses.
- Event creation and moderation.
- Event directory and details.
- Saved events and reminders.
- Guides and controlled local updates.
- Homepage content blocks.
- Zero-result and developing-coverage states.

### Exit gate

- Resident can find a relevant business by need and place.
- Search results exclude unpublished and suspended content.
- Event lifecycle handles cancellation and expiry.
- Initial places meet content thresholds.
- Thin pages are not mass-indexed.

## 6. Phase 1D — Enquiries, analytics and launch operations

### Objective

Complete the local connection loop and prepare for a controlled real-world launch.

### Work

- General enquiry and quote request.
- Spam and abuse controls.
- Business enquiry inbox.
- Email notifications.
- Defined analytics events.
- Business analytics summary.
- Founder operational dashboard.
- Moderation and report queue.
- Public policies and help content.
- Data export and closure process.
- Launch content seeding.
- Support workflow.
- Security and accessibility review.
- Recovery test.

### Exit gate

- Valid enquiries are delivered and counted correctly.
- Obvious spam is excluded from success metrics.
- Moderators can complete a report workflow.
- Required policies are published and reviewed.
- Launch content thresholds are met in focus areas.
- High-severity defects are closed.

## 7. Phase 1E — Private pilot

### Objective

Operate the complete MVP with a limited group before broad promotion.

### Work

- Onboard 20–30 founding businesses.
- Observe onboarding and support needs.
- Test resident discovery with invited users.
- Monitor enquiry delivery.
- Measure search zero-result patterns.
- Correct taxonomy and location problems.
- Improve templates based on real content.
- Run incident and moderation exercises.
- Confirm infrastructure and support cost.
- Review privacy and safety records.

### Exit gate

- Core journeys are reliable.
- No unresolved critical security or privacy issue.
- Businesses understand how to maintain their pages.
- Search delivers useful results in focus locations.
- Support burden is manageable.
- Evidence supports a public local launch.

## 8. Phase 1F — Local public launch

### Objective

Launch in concentrated areas, demonstrate value and build density.

### Work

- Founding business campaign.
- Local launch guides and events.
- Business window stickers and QR materials.
- Direct outreach.
- Search indexing and performance monitoring.
- Weekly content operations.
- Support and moderation rota.
- Public feedback collection.
- Connection and retention reporting.

### Expansion gate within RCT

Expand active promotion only when:

- Existing focus areas show repeated resident use.
- Businesses receive meaningful connections.
- Content and moderation operations are stable.
- New locations can be seeded to minimum quality.

## 9. Phase 2 — Business value and monetisation

### Objective

Introduce paid capabilities after the free product demonstrates real value.

### Candidate work

- Plan and entitlement system.
- Hosted subscription checkout.
- Custom domains.
- Additional template sections.
- Advanced forms.
- Enhanced analytics.
- More team members.
- Offers.
- Jobs.
- Booking integrations.
- Contributor accounts.
- Personalised feeds and saved searches.

### Release gate

- Businesses have received measurable free value.
- Pricing interviews and pilot commitments support the package.
- Billing, entitlement and grace-state tests pass.
- Paid capability does not break the essential free product.

## 10. Phase 3 — Reviews and controlled community participation

### Objective

Increase trust and participation without creating an unmanageable social network.

### Candidate work

- Review eligibility and verification.
- Business responses.
- Review moderation and appeals.
- Local questions beneath relevant content.
- Controlled comments.
- Contributor reputation.
- Improved reporting and sanctions.

### Release gate

- CMA-aligned review systems and policy are ready.
- Online safety assessments are updated.
- Moderator capacity exists.
- Reporting and appeal journeys are tested.

## 11. Phase 4 — Marketplace and community modules

### Objective

Enable local trading and useful discussion after safety and moderation maturity.

### Candidate work

- Marketplace listings.
- Seller profiles.
- Saved searches.
- Contact controls.
- Prohibited-item enforcement.
- Town questions and groups.
- Lost and found.
- Volunteering.

### Initial boundary

No OurValleys-held marketplace money.

### Release gate

- Updated online safety and children’s assessments.
- Fraud and prohibited-items process.
- Moderator coverage.
- User blocking and reporting.
- Clear marketplace terms and safety guidance.

## 12. Phase 5 — Property advertising and transactions

### Objective

Introduce carefully bounded higher-value commercial modules.

### Candidate work

- Property advertising.
- Advertiser verification.
- Agent packages.
- Property alerts.
- Related local-service discovery.
- Event ticketing.
- Gift vouchers.
- Selected booking or payment products.

### Property boundary

The initial property product remains an advertising portal enabling direct contact. Any intermediary activity requires specialist legal review before development.

### Release gate

- Specialist legal review completed.
- Consumer terms and complaints handling ready.
- Payment, refund and reconciliation operations tested where money is held.

## 13. Phase 6 — Wider Valleys expansion

### Objective

Expand only after the RCT model is repeatable.

### Work

- Select next towns based on demand and partnerships.
- Seed local businesses and content before marketing.
- Recruit local contributors or ambassadors.
- Adapt place taxonomy.
- Ensure brand claims match coverage.
- Measure whether the economic model works outside founder-led relationships.

## 14. Cross-phase workstreams

These continue throughout delivery:

### Trust and safety

- Risk assessments.
- Reporting.
- moderation.
- policy review.
- incident exercises.

### Privacy and security

- Data inventory.
- retention.
- supplier review.
- access review.
- vulnerability management.

### Accessibility

- Component standards.
- automated and manual testing.
- user feedback.
- template quality.

### Content operations

- Business seeding.
- events.
- guides.
- corrections.
- stale-data review.

### Analytics

- Event quality.
- search success.
- business value.
- support and moderation cost.

## 15. Priority rules

When choosing between work items:

1. Fix security, privacy and data-loss risks first.
2. Fix broken core journeys before adding features.
3. Improve business publication and resident discovery before future modules.
4. Build administration with the feature, not afterwards.
5. Prefer work that creates measurable local connections.
6. Defer work that mainly makes the platform appear larger.

## 16. Definition of done

A feature is not done until:

- User problem and acceptance criteria are met.
- Permissions are enforced.
- Empty, loading and error states exist.
- Accessibility is checked.
- Analytics are defined where justified.
- Administration and moderation needs are covered.
- Tests are added.
- Documentation is updated.
- Deployment and rollback are understood.
- Privacy and safety effects are reviewed.

## 17. Change control

A feature proposed outside the current phase requires:

- Written user problem.
- Reason it cannot wait.
- Dependency and delay impact.
- Legal, safety and moderation review.
- Updated acceptance criteria.
- Explicit decision recorded in `12-decisions-risks.md`.
