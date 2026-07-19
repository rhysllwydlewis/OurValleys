# User Roles and Journeys

## 1. Principles

- Browsing should not require an account.
- Permissions are granted explicitly and checked server-side.
- A person may hold more than one role.
- Business access belongs to a membership record, not a permanent property on the user.
- Administrative access must be tightly controlled, auditable and protected with multi-factor authentication.
- Private identity and verification information must remain separate from public profile content.

## 2. Roles

## 2.1 Visitor

Can:

- Browse public content.
- Search businesses and events.
- View town pages and guides.
- Submit a business enquiry subject to abuse controls.
- Begin account or business registration.
- Report certain public content with appropriate controls.

Cannot:

- Save content across devices.
- Publish content.
- Access business dashboards.
- See private contact or verification information.

## 2.2 Resident

Can:

- Maintain a profile and preferences.
- Follow locations.
- Save businesses and events.
- Receive opted-in notifications.
- View appropriate enquiry history.
- Submit future reviews or community content when those modules launch.
- Exercise account data rights through supported processes.

## 2.3 Business owner

Can:

- Create or claim a business.
- Manage public business content.
- Configure the generated website.
- Manage services, hours, locations and media.
- Receive and manage enquiries.
- Publish events according to moderation rules.
- Invite team members.
- View analytics.
- Manage subscription and domain settings.

Cannot:

- Alter verification decisions.
- Edit another business without membership.
- Publish unsafe code.
- Present paid status as independent verification.

## 2.4 Business manager

Can perform most day-to-day business management but cannot normally:

- Transfer ownership.
- Delete the business permanently.
- Change billing owner.
- Access highly sensitive verification documents unless explicitly authorised.

## 2.5 Business editor

Can edit public content, services, media and events but cannot:

- Manage billing.
- Manage team roles.
- Transfer ownership.
- Access private enquiries unless granted a separate permission.

## 2.6 Organisation manager

Equivalent to a business manager but with organisation-specific fields such as activities, volunteering, donations and membership.

## 2.7 Contributor

Can:

- Create draft guides or updates.
- Upload approved media.
- Submit content for editorial review.
- See decisions and requested amendments on their own submissions.

Cannot publish directly unless granted a trusted publisher permission.

## 2.8 Moderator

Can:

- Review reports.
- View relevant account and content history.
- Hide or restore content within policy.
- Restrict posting or suspend accounts within assigned powers.
- Record decisions and appeal outcomes.

Cannot:

- Change platform billing.
- Alter audit records.
- Access unrelated private data.
- use moderation tools for personal disputes.

## 2.9 Editor

Can:

- Review, schedule, publish, correct and archive editorial content.
- Apply content labels.
- Manage related businesses, places and events.
- Record corrections and sponsorship disclosures.

## 2.10 Administrator

Can manage platform configuration, users, businesses, taxonomy, feature flags and operational workflows according to assigned privileges.

Administrator must not be treated as one unlimited role in implementation. Sensitive capabilities should be separated, for example:

- User administration.
- Content administration.
- Billing administration.
- Safety administration.
- Technical administration.

## 2.11 Support operator

May assist users and inspect limited account status but should not automatically receive full moderator, billing or verification access.

## 3. Permission model

Recommended model:

- Global platform roles for tightly controlled staff functions.
- Business or organisation memberships with role and permission sets.
- Fine-grained permissions for sensitive actions.
- Explicit ownership transfer workflow.
- Temporary support access only where justified and recorded.

Example business permissions:

- `business.view`
- `business.edit_profile`
- `business.publish`
- `business.manage_media`
- `business.manage_enquiries`
- `business.manage_events`
- `business.view_analytics`
- `business.manage_team`
- `business.manage_billing`
- `business.transfer_ownership`

## 4. Journey A: resident finds a local business

### Trigger

A resident needs a service, product or place nearby.

### Flow

1. Arrives through the homepage, search engine or town page.
2. Enters a need and selects or confirms a location.
3. Reviews relevant results and filters.
4. Opens a business website.
5. Checks services, hours, service area and trust information.
6. Chooses call, email, directions or enquiry.
7. Submits an enquiry if selected.
8. Receives confirmation without being forced into marketing consent.
9. Optionally creates an account to save the business.

### Success event

A valid contact action or enquiry is completed.

### Failure states

- No result in selected distance.
- Business currently closed.
- Business has incomplete information.
- Enquiry delivery unavailable.
- Spam or rate limit triggered.

The user must receive an honest next step in each case.

## 5. Journey B: new business creates a website

### Trigger

A local business wants an online presence or better local discovery.

### Flow

1. Views the business proposition and example sites.
2. Creates and verifies an account.
3. Searches for an existing business record.
4. Creates a new business or begins a claim.
5. Selects category and business type.
6. Provides location or service area.
7. Enters core details, services and hours.
8. Uploads logo and photographs.
9. Selects a suitable template.
10. Reviews generated content and edits it.
11. Configures enquiries.
12. Completes proportionate verification.
13. Previews mobile and desktop page.
14. Publishes.
15. Receives a clear checklist for improving completeness.

### Success event

A valid business website is published and publicly discoverable.

### Important constraints

- The platform must not invent qualifications, prices, reviews or claims.
- AI-assisted wording must be clearly reviewable by the owner before publication.
- The business must understand what information will be public.

## 6. Journey C: business claims an existing profile

1. Finds an unclaimed or platform-created record.
2. Selects “Claim this business”.
3. Signs in or creates an account.
4. Provides contact evidence.
5. Receives automated verification where low risk or enters manual review.
6. Existing verified owner is notified where applicable.
7. Administrator reviews conflicts.
8. Claim is approved, rejected or returned for evidence.
9. Decision and appeal route are communicated.
10. Approved claimant completes website setup.

Ownership must never be silently reassigned because a claimant knows public business information.

## 7. Journey D: business receives an enquiry

1. Resident submits validated form.
2. System records consent and delivery metadata proportionately.
3. Spam and abuse checks run.
4. Business receives notification without exposing information in an insecure subject line or public location.
5. Enquiry appears in dashboard.
6. Authorised team member marks it read and responds using an approved channel.
7. Status becomes replied, closed, spam or archived.
8. Retention policy later removes or anonymises old data.

A platform metric should not count obvious spam as a successful local connection.

## 8. Journey E: organiser publishes an event

1. Business or organisation opens event creation.
2. Enters title, schedule, location, category and organiser.
3. Adds ticket or registration information.
4. Adds accessibility and travel information.
5. Previews event.
6. Submits or publishes depending on trust status.
7. Event appears in search and relevant place pages.
8. Organiser can update or cancel it.
9. Saved-event users receive relevant status notification if enabled.
10. Event automatically becomes past and leaves default upcoming results.

## 9. Journey F: administrator reviews a business claim

1. Opens pending claims queue.
2. Views claimed record, claimant account, supplied evidence and prior ownership.
3. Checks for conflicting claims or suspicious activity.
4. Requests more evidence, approves or rejects.
5. Records reason and evidence category without unnecessary duplication.
6. System updates ownership atomically.
7. Claimant and existing owner receive appropriate notification.
8. Audit record is created.

## 10. Journey G: moderator handles a report

1. Report enters prioritised queue.
2. Moderator views report type, content and immediate risk signals.
3. Urgent illegal or safeguarding concerns follow escalation procedure.
4. Moderator reviews account and prior report history only as necessary.
5. Takes proportionate action.
6. Records policy basis and rationale.
7. Notifies affected parties where appropriate.
8. Supports appeal or further evidence.
9. Keeps required record without retaining harmful content longer than needed.

## 11. Journey H: user closes or exports account

1. User opens account data controls.
2. Requests export or closure.
3. Re-authentication is required for sensitive action.
4. System explains effects on business ownership, published content and legal retention.
5. Ownership transfer is required before deleting the sole owner account of an active business.
6. Export is generated securely with expiry.
7. Account is deleted, anonymised or restricted according to policy and lawful retention.
8. Completion is recorded and communicated.

## 12. Role and journey acceptance tests

- Every protected action is denied by default to an unauthorised role.
- A role change takes effect promptly and invalidates inappropriate active access.
- A user cannot enumerate businesses or users through predictable private identifiers.
- Business team members see only the businesses to which they belong.
- Moderator and administrator actions are auditable.
- Public and private versions of business data are demonstrably separated.
- Account closure cannot orphan an active business without an explicit resolution path.
