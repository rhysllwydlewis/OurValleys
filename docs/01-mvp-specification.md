# Phase 1 MVP Specification

## 1. Objective

Deliver the smallest credible version of OurValleys that proves the core loop:

1. A local business creates and publishes a useful website.
2. The published data improves local discovery.
3. A resident finds the business or event and makes a meaningful connection.
4. The business can see and respond to that activity.

The MVP is not a mock-up. It must be secure, administrable and usable by real businesses and residents.

## 2. Release groups

### Public discovery

- Home.
- Search results.
- Category pages.
- Town and village pages.
- Public business websites.
- Event directory and event detail.
- Guide directory and guide detail.
- Static trust and information pages.

### Resident account

- Registration and sign-in.
- Profile and preferences.
- Saved businesses.
- Saved events.
- Notification preferences.
- Enquiry history where appropriate.

### Business account

- Registration and identity confirmation.
- Create or claim business.
- Guided onboarding.
- Website editor and preview.
- Services, hours, locations and media.
- Enquiry inbox.
- Event management.
- Basic analytics.
- Verification status.
- Account and team settings.

### Administration

- User and business search.
- Business claim review.
- Verification review.
- Content moderation queue.
- Event and guide review.
- Report handling.
- Location and category management.
- Audit log.
- Feature flags.
- Basic operational metrics.

## 3. Public page catalogue

## 3.1 Home page

### Purpose

Explain the product quickly and route residents or businesses to the correct task.

### Required content

- Location-aware search.
- Browse by category.
- Browse by town or local area.
- Current events.
- Featured or recently completed business profiles.
- Useful guides.
- Clear business call to action.
- Transparent labelling of sponsored content.

### Acceptance criteria

- Search can be used without an account.
- The selected location can be changed manually.
- No precise location permission is required to use the page.
- Empty sections are hidden rather than displayed as blank shells.
- Core content remains usable without client-side JavaScript where reasonably practical.

## 3.2 Search results

### Required behaviour

- Accept keyword, category and location intent.
- Return businesses and events in the MVP.
- Support location, distance, category, open-now and verification filters.
- Provide a useful zero-results state.
- Distinguish organic and sponsored results.
- Preserve query and filters in the URL.

### Ranking principles

Initial organic ranking should use transparent factors such as:

1. Query relevance.
2. Geographic relevance.
3. Profile completeness.
4. Verified information.
5. Current opening or event status.
6. Content freshness.
7. Quality signals that are not directly purchased.

Sponsored placement must be separately labelled and must not silently replace organic ranking.

## 3.3 Category page

### Required content

- Category introduction.
- Relevant businesses.
- Relevant subcategories.
- Location controls.
- Related events and guides where available.
- SEO-safe pagination or progressive loading.

## 3.4 Town or village page

### Required content

- Place name and short introduction.
- Businesses grouped by useful categories.
- Upcoming events.
- Relevant guides.
- Nearby communities.
- Clear coverage status if the page is still being seeded.

### Rules

- Do not publish thin auto-generated location pages solely for search-engine traffic.
- A location page should not be promoted until it has enough current content to help a user.

## 3.5 Public business website

### Required content

- Name, category and summary.
- Hero or principal media.
- Services or products summary.
- Address or service area.
- Opening hours.
- Contact and enquiry actions.
- Gallery.
- Accessibility and language information where supplied.
- Verification badges with specific meanings.
- Last updated information.
- Report incorrect information control.
- Platform relationship disclosure.

### Required states

- Draft.
- Pending review where applicable.
- Published.
- Temporarily hidden.
- Suspended.
- Archived.

### Acceptance criteria

- Business owner can preview before publishing.
- Published page has stable URL and metadata.
- Page is responsive and accessible.
- Contact details respect the business's visibility settings.
- Unverified claims are not presented as verified facts.
- Arbitrary scripts and unsafe HTML cannot be added by business users.

## 3.6 Events

### Directory requirements

- Search by date, location and category.
- Show upcoming events by default.
- Hide or clearly label cancelled events.
- Support free, paid and externally ticketed events.

### Event detail requirements

- Title.
- Organiser.
- Date and time with timezone.
- Venue or online location.
- Description.
- Category.
- Price information.
- Ticket or registration link.
- Accessibility information where supplied.
- Parking or travel information where supplied.
- Cancellation status.
- Report control.

### MVP exclusions

- OurValleys-held ticket money.
- Reserved seating.
- Complex refunds.

## 3.7 Guides and local updates

### Required behaviour

- Editorial workflow with draft, review, scheduled, published and archived states.
- Named author or organisation.
- Content-type label such as guide, community submission, business update or sponsored content.
- Correction date where a material correction is made.
- Related locations, businesses and events.

## 4. Account requirements

## 4.1 Authentication

- Email-based account creation and verification.
- Secure password handling if passwords are used.
- Password reset or equivalent recovery.
- Optional social sign-in may be added without making it the only method.
- Session revocation.
- Rate limiting and abuse controls.
- Multi-factor authentication required for administrators and strongly encouraged for business owners.

## 4.2 Resident profile

Minimum fields:

- Display name.
- Email.
- Preferred locations.
- Preferred language.
- Notification choices.
- Consent records.

Do not require date of birth, gender, precise home address or other unnecessary data for ordinary use.

## 4.3 Business onboarding

### Steps

1. Create or claim a business.
2. Choose primary category and optional secondary categories.
3. Enter legal or trading identity information privately where needed.
4. Add public contact information.
5. Select physical location, service area or online-only operation.
6. Enter opening hours.
7. Add services, descriptions and price guidance.
8. Add media and branding.
9. Select template and appearance settings.
10. Configure enquiry options.
11. Preview.
12. Complete required verification.
13. Publish.

### Save behaviour

- Progress autosaves.
- Owner can leave and resume.
- Validation errors identify the field and explain the correction.
- No data is publicly visible before the owner understands the publication state.

## 4.4 Business claiming

A claim must:

- Identify the claimed business record.
- Verify the claimant's contact method.
- Gather evidence proportionate to the risk.
- Prevent simultaneous silent ownership transfer.
- Create an admin-reviewable record.
- Notify the existing verified owner where one exists.
- Support rejection and appeal notes.

## 5. Business dashboard requirements

## 5.1 Overview

Show:

- Publication status.
- Profile completeness.
- Verification status.
- Recent enquiries.
- Upcoming events.
- Recent profile views and meaningful actions.
- Tasks requiring attention.

Avoid vanity metrics without context.

## 5.2 Website editor

- Structured fields rather than arbitrary page-builder code.
- Autosave.
- Preview at mobile and desktop widths.
- Publish confirmation.
- Revision history for important changes.
- Image alt-text prompts.
- Clear free-tier limits.

## 5.3 Enquiries

- Secure enquiry delivery.
- Spam protection.
- Business notification.
- Read, unread, replied and archived states.
- Export or deletion in accordance with retention policy.
- No public exposure of the sender's private details.

## 5.4 Events

- Create, edit, cancel, duplicate and archive.
- Recurrence may be limited to simple patterns in MVP.
- Preview before publication.
- Admin review rules configurable by risk level.

## 5.5 Analytics

Initial metrics:

- Public website views.
- Search appearances.
- Contact-button actions.
- Enquiries submitted.
- Event link clicks.
- Direction requests where tracked with consent and technical feasibility.

Metrics must include definitions and bot filtering where practical.

## 6. Administration requirements

## 6.1 Admin dashboard

Must show:

- Pending business claims.
- Verification queue.
- Report queue.
- Pending editorial content.
- Suspended content.
- Recent administrative actions.
- Platform error and delivery indicators where available.

## 6.2 Moderation

Administrators or moderators must be able to:

- View the reported content in context.
- See prior reports and account history.
- Record a reasoned decision.
- Hide, restore, restrict or suspend.
- Notify the affected user using templates that can be edited.
- Escalate urgent reports.
- Record appeal outcomes.

## 6.3 Taxonomy management

- Create, edit, merge and retire categories.
- Manage synonyms.
- Prevent deletion where records depend on a value.
- Redirect retired public URLs.
- Manage location hierarchy and aliases.

## 6.4 Audit logging

Record at minimum:

- Actor.
- Action.
- Target.
- Timestamp.
- Previous and new state for critical changes.
- Reason where required.
- Request or correlation identifier where technically available.

Audit logs must not become a second uncontrolled store of sensitive content.

## 7. Notifications

MVP notification types:

- Email verification.
- Password or account recovery.
- Business claim status.
- Website publication status.
- New business enquiry.
- Event status changes.
- Saved-event reminder if enabled.
- Moderation decision.
- Security-relevant account change.

Every marketing or optional notification must have an appropriate preference control.

## 8. Required static pages

- About OurValleys.
- Contact.
- Terms of service.
- Privacy notice.
- Cookie information and controls.
- Community and content guidelines.
- Business verification explanation.
- Advertising and sponsorship policy.
- Complaints and corrections.
- Accessibility statement.
- Safety and reporting guidance.

Final legal wording requires appropriate professional review before launch.

## 9. Non-functional requirements

### Accessibility

- Target WCAG 2.2 AA.
- Keyboard-operable core journeys.
- Visible focus states.
- Semantic forms and errors.
- Sufficient text alternatives.
- Reduced-motion support where motion exists.

### Performance

Initial targets for representative public pages on mobile:

- Largest Contentful Paint at or below 2.5 seconds at the 75th percentile where feasible.
- Interaction to Next Paint at or below 200 milliseconds at the 75th percentile where feasible.
- Cumulative Layout Shift at or below 0.1 at the 75th percentile.
- Images appropriately sized and lazy-loaded outside the initial viewport.

### Security

- Least-privilege access.
- Server-side permission checks.
- Input validation and output encoding.
- CSRF protection where applicable.
- Rate limiting.
- Secure secrets handling.
- Dependency and vulnerability monitoring.
- File upload validation.
- Backups and restoration testing.

### Reliability

- User-friendly error states.
- Idempotent handling for retryable operations where relevant.
- Monitoring for authentication, enquiry and publishing failures.
- Database backup plan.
- Documented recovery procedure.

### SEO and sharing

- Unique metadata.
- Canonical URLs.
- Structured data only where accurate.
- XML sitemaps.
- Robots controls for draft, filtered and thin pages.
- Social-sharing metadata.

## 10. MVP release acceptance criteria

The release is ready only when all of the following are true:

1. At least one business can complete the full onboarding and publication journey without database or manual code intervention.
2. A resident can search by category and place and submit an enquiry.
3. Enquiries are delivered, recorded and protected from obvious abuse.
4. A business can edit information and republish safely.
5. An administrator can review a claim and handle a report.
6. Permission tests confirm residents cannot access business or admin controls.
7. Core pages pass agreed accessibility checks.
8. Backup and restore have been tested in a non-production environment.
9. Privacy, terms, reporting and complaints pages are available.
10. Analytics record defined connection events without collecting unnecessary personal data.
11. Empty future modules are not exposed in the public navigation.
12. Seed content meets the launch thresholds in the content plan.
13. Known high-severity security defects are resolved.
14. Legal and safety release gates are signed off by the accountable owner.
