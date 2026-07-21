# 32. Free business website — product brief and implementation handover

**Prepared for:** Rhys-Llwyd Lewis
**Repository:** rhysllwydlewis/OurValleys
**Decision snapshot:** 21 July 2026
**Version:** 1.0 — consolidated following three structured question-and-answer rounds
**Status:** Agreed product direction with recommended defaults for remaining operational details

> Market it as a website. Build it from structured business data. Make it feel like the business's own premium website.

This document consolidates the product owner's dictated decisions from the coordinator handover brief of 21 July 2026. Where a precise operating value was not chosen, the document labels a recommended default rather than presenting it as a final owner decision. Later numbered documents in `docs/` record newer authority where an older planning statement conflicts with them; this document supersedes earlier product-direction statements where they conflict.

**How to use this document.** Treat sections 1–18 as the product specification, sections 19–22 as the implementation handover, and the appendices as the decision audit trail. The coordinator should convert the delivery programme into issues and focused pull requests, preserve the repository's one-active-workstream discipline, and return only genuinely unresolved product choices to the owner. This is not a request to build an unrestricted website builder. It is a request to build a controlled, section-based website system that feels flexible to the business owner and remains safe, responsive and maintainable.

## 1. Executive summary

Our Valleys will allow any email-verified user to create a premium-quality local business website for free. The business enters structured information once; Our Valleys uses it to create the business's public website and to power the business's local listing, search results, category visibility, town visibility and related platform features.

The customer-facing promise is a free business website and local listing. The finished page must feel like the business's own website, not like a directory profile. It will use an Our Valleys URL, the business's identity, a template and colour scheme, photographs, a hero section, configurable contact actions, automatic navigation and a controlled library of editable, reorderable and hideable sections.

The default website must be attractive enough for a non-technical business owner to publish without making design changes. The editor then provides meaningful customisation without allowing arbitrary code or pixel-level positioning. The guiding experience is closer to arranging polished website sections than using a blank-canvas design tool.

| Decision           | Agreed position                                                                                         | Delivery implication                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Primary offer      | A generous free business website plus local discovery.                                                  | Build the website experience as the flagship, not as an afterthought to a listing. |
| Access             | Anyone may register with an email address; email verification unlocks the account and publishing tools. | Public registration, verification and recovery are foundational.                   |
| First value moment | Generate a preview after business name, category and location.                                          | The user sees something real before completing a long form.                        |
| Publication        | Publish automatically after checks and reminders, with the owner able to publish earlier or postpone.   | Automated validation replaces routine manual approval.                             |
| Editor             | Edit, reorder and hide complete sections; offer approved layout choices, templates and colours.         | Do not build unrestricted drag-and-drop.                                           |
| Identity           | Business-first design with a medium, tasteful "Powered by Our Valleys" logo/link in the footer.         | Free sites retain platform attribution.                                            |
| Monetisation       | Not fixed yet; future paid features may include footer removal and custom domains.                      | The free product must remain genuinely useful.                                     |

## 2. Product vision and positioning

### 2.1 Product proposition

**Your free business website and local listing.**

A business creates an account, adds its essential details and receives an immediate professional starter website. It can then tailor its content, images, sections, theme and contact actions, publish the website and share the URL or QR code with customers. The same data makes the business discoverable throughout Our Valleys.

### 2.2 Positioning rule

Market the product as a website because the customer receives a genuine public web presence with its own URL, navigation, identity, content, calls to action and management tools. Explain clearly that it is hosted by Our Valleys and also acts as the business's local listing. Before a public marketing launch, obtain a focused legal and advertising review of the final claims, terms, free-tier restrictions and data responsibilities.

### 2.3 What the proposition is not

- It is not merely a directory record presented inside the main Our Valleys navigation.
- It is not an unrestricted blank-canvas website builder.
- It is not an ecommerce platform in the first release.
- It is not a public reviews platform in the first release.
- It is not restricted to hospitality, retail, trades or any single category.
- It does not require formal proof of business ownership before a person can begin contributing.

## 3. Product principles

| Principle                           | Meaning                                                                                                                                        | Coordinator test                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Website first                       | A visitor following the URL should immediately believe they have arrived at that business's website.                                           | Remove platform chrome and test the page as a standalone business destination. |
| Structured underneath               | Business data is stored once and reused safely across the website, listing, search and location/category surfaces.                             | No parallel source of truth for public and directory information.              |
| Excellent by default                | A person with no design experience can publish a credible site without changing the template.                                                  | Test a business that accepts all default choices.                              |
| Progressive completion              | Show the first preview early, then guide the user to improve it through a clear checklist.                                                     | Preview exists after three answers and remains honest about missing content.   |
| Controlled flexibility              | Users control complete sections, approved layouts, themes, colours and media, but cannot break responsiveness or accessibility.                | Every user choice remains mobile-safe and accessible.                          |
| Open contribution, managed conflict | People can add businesses without onerous proof; duplicate, claim and correction conflicts are resolved through evidence-rich admin tickets.   | Conflicting records produce a resolvable ticket rather than silent overwrite.  |
| Automatic where safe                | Routine publication, navigation, expiry and inactivity processes should be automated, with admin intervention reserved for conflicts and risk. | Admin queues contain exceptions, not every ordinary publication.               |
| Generous free core                  | The permanent free site should be useful enough to operate as a small business's main website.                                                 | A business can confidently print and share its free URL.                       |
| Local network effect                | Business content should flow into events, search, category and place discovery without duplicate entry.                                        | One event or offer can surface in multiple relevant places.                    |
| Trust and reversibility             | Important actions have audit trails, confirmation, recovery periods, redirects and safe rollback.                                              | Slug changes redirect; unpublish can be reversed; deletion has a grace period. |

## 4. Target users and use cases

### 4.1 Primary business audiences

- Businesses with no existing website.
- Businesses with an old, poor or difficult-to-maintain website.
- Sole traders and microbusinesses that cannot justify a bespoke website.
- Community organisations, venues and local operators that need a simple public presence.
- Businesses that already have a main website but want a strong local landing page and directory presence.

### 4.2 Initial category coverage

Launch for all local business categories. Use a universal website structure for every business, then progressively activate category-specific sections such as menus, treatment lists, areas covered, facilities or event schedules.

### 4.3 Core use cases

| Use case                   | Expected outcome                                                              |
| -------------------------- | ----------------------------------------------------------------------------- |
| No website                 | Create and share a complete free web presence.                                |
| Outdated website           | Create a modern local landing page and optionally link to the existing site.  |
| Hospitality                | Publish menu, opening hours, offers, contact details and events.              |
| Trades                     | Show services, areas covered, examples of work and quotation contact options. |
| Retail                     | Show products, offers, location, opening hours and external ordering link.    |
| Appointments               | Show treatments/services and link to an existing booking system.              |
| Seasonal/temporary closure | Pause the public site without losing content, then resume later.              |

## 5. End-to-end business journey

| Stage                   | User experience                                                                                     | System responsibility                                                 |
| ----------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1. Discover             | User sees a clear invitation to create a free business website.                                     | Use accurate free-site wording and explain Our Valleys hosting.       |
| 2. Register             | User supplies an email address, password and basic account details.                                 | Create secure account and consent records.                            |
| 3. Verify               | Email verification unlocks the account and publishing tools.                                        | Expire and resend verification links; prevent unverified publication. |
| 4. Search before create | System checks whether the business already exists and offers claim or new-business routes.          | Rank possible duplicates by multiple signals.                         |
| 5. Enter essentials     | Business name, category and location are captured.                                                  | Create draft and clean proposed slug.                                 |
| 6. Instant preview      | A category-appropriate starter website is generated immediately.                                    | Generate a real website shell using safe placeholders.                |
| 7. Complete content     | Guided cards collect profile, services, hours, media, contacts and other relevant sections.         | Autosave, validate and display completeness guidance.                 |
| 8. Customise            | User chooses template, colours, approved layouts, section order and visibility.                     | Persist template/theme/section configuration without arbitrary code.  |
| 9. Validate             | System checks minimum content, contact actions, duplicate risk, URL, safety and terms.              | Return clear, actionable failures rather than generic errors.         |
| 10. Publish             | User can publish early; otherwise the eligible draft publishes after reminders and a stated period. | Create public version, preserve draft state and write audit event.    |
| 11. Promote             | User receives a shareable URL, QR code and social-sharing preview.                                  | Generate stable QR code and sharing metadata.                         |
| 12. Operate             | User updates content, receives enquiries and views simple analytics.                                | Track permitted analytics and route customer contacts.                |
| 13. Reconfirm           | Activity or annual confirmation shows that the business is still trading.                           | Count meaningful account activity as confirmation.                    |
| 14. Pause/close/delete  | Owner can temporarily unpublish, mark closed or request deletion with safeguards.                   | Use recoverable lifecycle states and retention rules.                 |

## 6. Public website experience

### 6.1 Recommended URL

`ourvalleys.co.uk/b/business-name`

The `/b/` namespace is short, makes the business name visible, avoids clashes with platform routes and matches the generated business route already established in the repository. Where names clash, include a meaningful location suffix, for example `/b/tiglers-fish-and-chips-tonyrefail`.

### 6.2 Standalone presentation

- Business logo or name-led identity.
- Business-selected colours and approved template.
- Business-specific navigation generated from visible sections.
- Prominent primary call to action.
- No large Our Valleys directory header or distracting competitor links.
- A medium, tasteful "Powered by Our Valleys" logo and link in the footer.
- Responsive desktop, tablet and mobile presentation.
- Suitable metadata and social-sharing image.

### 6.3 Slug changes

Users should not routinely edit the URL themselves. A business can submit a support ticket for a trading-name correction, duplicate conflict or other valid reason. Approved changes must create a permanent redirect from the old address so existing links and QR codes remain useful.

### 6.4 Genuine website test

Could the business confidently put this URL on its business card, social media profile, shop window or vehicle and treat it as its main website? The release should not be described as complete until the answer is yes for a representative set of businesses and mobile devices.

## 7. Website editor, templates and themes

### 7.1 Editor model

Use a controlled section-based editor. Each section is a complete, responsive unit. The user can edit content, move the section, hide or unhide it, and where useful select from a small set of approved layouts. Content should normally be hidden rather than destroyed so that it can be restored easily.

### 7.2 Permitted controls

- Choose an approved website template.
- Choose or customise an accessible colour palette.
- Upload logo, hero and gallery media.
- Edit all business content.
- Reorder complete sections.
- Hide and unhide sections with a clear eye control.
- Choose approved layouts within selected sections.
- Select the primary call to action.
- Preview desktop and mobile versions.
- Reset a section or theme to a safe default.

### 7.3 Explicitly excluded at launch

- Free placement of individual text boxes, images and buttons.
- Arbitrary HTML, CSS or JavaScript.
- User-supplied plugins or tracking scripts.
- Unrestricted navigation building.
- Layouts that have not been tested for accessibility and responsiveness.

### 7.4 Template philosophy

Templates should vary meaningfully by business type and tone, but they should share the same structured data and section system. The system may recommend a template automatically from the category while still allowing the user to switch.

## 8. Business content model and section library

### 8.1 Universal core

| Section                    | Purpose                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| Hero                       | Business identity, short value statement, primary action and optional hero media.       |
| About us                   | Short factual introduction.                                                             |
| Our story                  | Optional longer narrative section.                                                      |
| Services                   | Structured service entries with optional description, image and price guidance.         |
| Products                   | Informational product entries; no direct checkout initially.                            |
| Opening hours              | Regular weekly hours and exceptional closures/openings.                                 |
| Location                   | Public address, service area or privacy-safe location wording.                          |
| Contact                    | Business-selected contact methods and required details.                                 |
| Gallery                    | Approved images with captions and ordering.                                             |
| Frequently asked questions | Structured question and answer entries.                                                 |
| Testimonials               | Owner-provided testimonials only if this section is later approved; not public reviews. |

### 8.2 Category-specific sections

| Category family          | Suggested structured sections                                                          |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Hospitality              | Food/drinks menu, dietary labels, delivery/collection information, table booking link. |
| Trades                   | Areas covered, quotation information, accreditations, emergency availability.          |
| Beauty and wellbeing     | Treatments, durations, prices, practitioner/team profiles, booking link.               |
| Retail                   | Featured products, brands stocked, collection/delivery information.                    |
| Accommodation            | Facilities, room types, check-in information, external availability link.              |
| Venues and organisations | Facilities, capacity, upcoming events, accessibility information.                      |
| Professional services    | Expertise, consultation method, service area and enquiry options.                      |

### 8.3 Navigation

Navigation is generated automatically from visible sections. Hiding a section removes its navigation link. The business does not need to build menus manually. In a later refinement, approved display labels could be editable without allowing arbitrary routes.

## 9. Media, gallery and menu functionality

### 9.1 Media policy

A logo or genuine business image is strongly recommended but not mandatory. The editor should explain the benefit and continue to prompt the user. If media is skipped, publish with a deliberate category-appropriate placeholder rather than a broken or generic missing-image state.

### 9.2 Media capabilities

- Logo or profile image.
- Hero image.
- Gallery with ordering and captions.
- Image crop/focal point suited to desktop and mobile.
- Menu or document upload where relevant.
- File type, size, malware and content validation.
- Alt text guidance and accessible defaults.
- Safe removal, replacement and audit history.

### 9.3 Menu options

| Method                   | Behaviour                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Quick upload             | Upload an image or PDF of an existing menu. This is the fastest route but is less accessible and less searchable.                          |
| Structured menu builder  | Create menu groups and items with names, descriptions, prices, optional images, dietary/allergen labels, availability and featured status. |
| External menu/order link | Link to an existing menu, ordering or booking service.                                                                                     |

Do not depend on a specialist universal menu file format. The structured menu builder is the best long-term experience, while image/PDF upload prevents the feature becoming a barrier for inexperienced users.

## 10. Contact methods, enquiries and calls to action

### 10.1 Business-selected actions

| Contact/action type    | Validation requirement                                     |
| ---------------------- | ---------------------------------------------------------- |
| Call us                | Requires a telephone number.                               |
| Email us               | Requires an email address.                                 |
| Send an enquiry        | Uses the Our Valleys enquiry form and business inbox.      |
| Request a quote        | Uses a purpose-specific form.                              |
| Request a callback     | Collects safe contact and timing details.                  |
| Book now               | Requires a valid external booking link initially.          |
| WhatsApp               | Requires a suitable number and clear consent expectations. |
| Get directions         | Requires a public location.                                |
| Visit our main website | Requires a valid external URL.                             |
| Order online           | Requires an external ordering URL initially.               |

### 10.2 Primary action

Each business chooses one primary action. The template presents it consistently in the hero, navigation or sticky mobile action area, while secondary actions remain available without overwhelming the page.

### 10.3 Enquiry handling

- Business inbox linked to the correct business membership.
- Email notification with safe summary and dashboard link.
- Spam and rate-limit protection.
- Clear consent/privacy wording.
- Status such as new, read, replied, archived and spam.
- No exposure of private account data on the public website.

## 11. Events, special offers, products and services

### 11.1 Events

An event created by a business should automatically appear on the business website and in the wider Our Valleys events experience, including relevant category and location surfaces. The business enters the event once. Promotion ends automatically when the event has finished.

### 11.2 Special offers

Provide a simple Special Offer section that can be shown as a card, banner or highlighted section. Fields may include title, description, image, start date, expiry date, terms and optional action. Expired offers should hide automatically or display a clear expired state. Representative offer types include:

- Free delivery on a specified day.
- Percentage or fixed-value discount.
- Spend-threshold promotion.
- Buy one, get one free.
- Seasonal or limited-time package.

### 11.3 Products and services

Initial entries are informational: name, description, image, price or price guidance, availability and category. A general call, enquiry, quotation or external booking action may accompany the website, but Our Valleys will not process direct purchases in the first version.

### 11.4 Reviews

Do not build public customer reviews into the initial product. Reviews are a separate future product decision with substantial moderation, verification, fairness and legal implications.

## 12. Accounts, roles and permissions

### 12.1 Registration

Anyone with an email address may register. The user verifies the email before gaining full account and publishing access. Verification links should expire, be resendable and avoid revealing whether unrelated addresses hold accounts.

### 12.2 Suggested business roles

| Role    | Recommended permission boundary                                                             |
| ------- | ------------------------------------------------------------------------------------------- |
| Owner   | Full control, including roles, claims, publication, pausing, closure and deletion requests. |
| Manager | Edit and publish content; manage enquiries; no ownership transfer or permanent deletion.    |
| Editor  | Edit content and media; no publication, claims or account management.                       |
| Viewer  | Read-only dashboard and preview access.                                                     |

### 12.3 Permission principles

- Server-authoritative permissions for every read and mutation.
- A person sees only businesses to which they are attached.
- Public identifiers do not grant private access.
- Important changes create audit events.
- Ownership disputes do not silently overwrite existing control.

## 13. Business creation, duplicate detection and claims

### 13.1 Open contribution model

Formal proof of ownership is not mandatory at launch. This is an open contribution model, not a statement that the software itself is open source. Users confirm that their information is accurate and that they have a reasonable basis for creating or managing the business.

### 13.2 Duplicate detection

Signals include:

- Normalised business name and common spelling variants.
- Town, postcode and full address where supplied.
- Telephone number and email address.
- Existing website domain and social links.
- Category and service area.
- Company number where voluntarily provided.
- Account and edit history.

A similar name alone must not block creation because legitimate businesses can share names in different places. Strong matches should steer the user towards a claim. Uncertain matches may allow continuation while creating a reviewable conflict record.

### 13.3 Claim and conflict tickets

| Ticket component | Requirement                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inputs           | Existing and proposed business records, account details, similarities/differences, claim reason, evidence, history and risk flags.                        |
| Admin actions    | Approve claimant, reject, request information, merge, keep separate, transfer control, add manager, suspend, restore information or close with no action. |
| Automation       | The selected resolution performs the necessary changes and records them; the admin should not need direct database work.                                  |
| Safety           | High-impact actions require confirmation and must preserve an audit trail and recovery route.                                                             |

### 13.4 Public corrections

The public may suggest corrections to hours, contact details, address, closure status, services or duplicates. A suggestion does not directly overwrite the website. Route it to the business owner and/or an admin ticket according to significance and dispute risk.

## 14. Publication, inactivity, closure and deletion

### 14.1 Publication model

Routine sites should publish automatically after the user has verified their email, supplied the minimum viable business information, accepted the terms and passed automated checks. The owner can publish earlier when eligible or postpone automatic publication.

### 14.2 Automated checks

- Minimum useful content.
- Valid enabled contact methods.
- Safe, available slug.
- Duplicate/conflict risk.
- Prohibited or unsafe text/media signals.
- File security checks.
- Required confirmations and terms.

### 14.3 Recommended reminder pattern

| Timing             | Recommended action                                                      |
| ------------------ | ----------------------------------------------------------------------- |
| Immediately        | Show the generated preview and completeness guidance.                   |
| Day 2              | Friendly reminder to add the most valuable missing information.         |
| Day 7              | Reminder showing publication eligibility and remaining gaps.            |
| Before publication | Clear warning stating the planned publication date and how to postpone. |
| Eligible deadline  | Publish automatically if the minimum requirements remain satisfied.     |

### 14.4 Website lifecycle controls

| State                    | Behaviour                                                                    |
| ------------------------ | ---------------------------------------------------------------------------- |
| Draft                    | Private, editable, previewable.                                              |
| Published                | Public and discoverable.                                                     |
| Paused/unpublished       | Hidden publicly but retained for later resumption.                           |
| Temporarily closed       | Optional public closure state or unpublish, depending on owner choice.       |
| Permanently closed       | Limited closure record may remain to reduce confusion.                       |
| Deletion pending         | Confirmed request within a recoverable grace period.                         |
| Deleted/retained minimum | Personal and business data handled according to the agreed retention policy. |

### 14.5 Trading-status confirmation

Use a 12-month confirmation cycle initially. Logging in, updating content, responding to an enquiry or using a confirmation link can count as evidence of continued activity. Inactive businesses receive reminders, are eventually marked potentially outdated, and can then be unpublished. Permanent deletion should occur only after a much longer period and final warning.

## 15. Local discovery, SEO, sharing, QR codes and analytics

### 15.1 Discovery

- Business directory and search.
- Town and area pages.
- Category pages.
- Relevant event listings.
- Special-offer discovery if enabled later.
- Internal related-content links that do not overwhelm the standalone business site.

### 15.2 Search and sharing

- Unique title and description.
- Canonical URL and clean slug.
- Structured business data where appropriate.
- Social-sharing image and summary.
- Sitemap/indexing controls tied to publication state.
- No indexing of drafts, account or admin routes.
- Redirect preservation after slug changes.

### 15.3 QR code

Every published website receives a stable QR code for menus, windows, flyers, business cards and digital sharing. It should continue to work after an approved slug change through redirect handling. Analytics should distinguish QR visits from ordinary visits.

### 15.4 Simple analytics

- Website views.
- Appearances in Our Valleys search.
- Call-button clicks.
- Email-button clicks.
- Enquiries.
- Direction requests.
- External website/booking/order clicks.
- QR-code visits.

Present analytics as understandable statements rather than a complex dashboard, for example: "183 people viewed your website this month" and "14 people used your contact buttons".

## 16. Language, accessibility, moderation and trust

### 16.1 Language

The platform interface launches in English. Businesses may write content in Welsh if they choose, and the system must support Welsh characters and text correctly from the outset. A field-by-field bilingual editing workflow may be added later.

### 16.2 Accessibility

- Keyboard-operable editor and public website.
- Visible focus states and skip links.
- Accessible colour contrast for every approved palette.
- Semantic headings and navigation.
- Alt text support and guidance.
- Reduced-motion behaviour.
- Responsive layouts and readable text sizing.
- Accessible structured menu preferred over image-only content.

### 16.3 Moderation and reporting

Automatic publication does not remove the need for reporting, suspension and admin review. The platform should define prohibited content, impersonation, fraud, unsafe categories, abusive contact use, unlawful media and repeat-offender handling before public launch.

### 16.4 Trust signals

- Last updated date where helpful.
- Business-provided information statement.
- Report incorrect information link.
- Clear closure status.
- Audit-backed admin decisions.
- Optional stronger verification badge only when a genuine verification process exists.

## 17. Free entitlement and future monetisation

### 17.1 Permanent free entitlement

- Responsive one-page business website.
- Stable Our Valleys URL.
- Several approved templates.
- Theme and accessible colour customisation.
- Logo, hero image and useful gallery allowance.
- Core and relevant category-specific sections.
- Section editing, reordering and hide/unhide controls.
- Approved layouts within selected sections.
- Multiple contact methods and primary action.
- Basic enquiry handling.
- Basic analytics.
- Search and social metadata.
- QR code.
- Unlimited factual updates within reasonable platform limits.
- Medium "Powered by Our Valleys" logo and link in the footer.

### 17.2 Branding decision

Launch position: free websites retain a medium, tasteful "Powered by Our Valleys" footer with logo and link. The footer should be visible enough to credit and grow Our Valleys without making the business page feel like a directory. The exact paid model is intentionally deferred.

### 17.3 Candidate future paid features

- Remove the Powered by Our Valleys footer.
- Connect a custom domain.
- Larger media and document allowance.
- Multiple business locations.
- Additional team members and advanced permissions.
- Advanced analytics and reports.
- Booking, ecommerce or marketing integrations.
- Advanced templates and promotional tools.

Paid features should enhance reach, control or convenience. They should not make the free website deliberately poor or unusable.

## 18. Non-functional product requirements

| Quality area    | Requirement                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Security        | Tenant isolation, server-side authorisation, secure uploads, rate limiting, audit logs, no arbitrary scripts and no exposed secrets.  |
| Privacy         | Public/private projections, consent records, minimal enquiry data, deletion/retention policy and no indexing of protected routes.     |
| Performance     | Fast mobile rendering, optimised media, useful loading states, caching that respects publication changes and resilient fallbacks.     |
| Reliability     | Atomic creation/publication actions, idempotent workflows, recoverable failures and safe background jobs.                             |
| Accessibility   | WCAG-aligned patterns across templates, editor controls and generated content.                                                        |
| Responsiveness  | Every approved template and section tested across desktop, tablet and mobile.                                                         |
| SEO integrity   | Only published sites index; correct canonical, sitemap, redirects and metadata.                                                       |
| Observability   | Structured logs, ticket/audit events, publication failures, email delivery and upload failures visible to operators.                  |
| Maintainability | Shared projections and components; no parallel business-profile and website logic.                                                    |
| Testing         | Unit, integration, database compatibility, browser journeys, permission denial, invalid ID, unavailable data and regression coverage. |

## 19. Repository snapshot and gap analysis

Snapshot checked against GitHub on 21 July 2026.

### 19.1 Current repository position

| Repository item      | Snapshot                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Latest main commit   | `049bb5ee` — Add a favicon, web manifest and theme colour (PR #78).                                                                  |
| Open pull requests   | None at the time of this snapshot.                                                                                                   |
| Scheduled automation | Issue #24 is marked RUNNING with manual override INACTIVE.                                                                           |
| Active macro work    | Issue #65 remains open for final Stage G preview/publish correction, focused coverage and deployment closure.                        |
| Existing foundation  | Protected onboarding drafts, preview, canonical public projection, moderation/publication guidance, account area and admin controls. |

Important: issue #24 and issue #65 contain status prose that may lag later merges. The coordinator must inspect current branches, pull requests, commits, CI and deployments before writing.

### 19.2 What already exists

- Business onboarding draft fields for profile, location, services, regular hours and exceptional hours.
- Protected draft preview.
- Shared public/draft business-site projection.
- Publication and moderation lifecycle guidance.
- Business public route under `/b/[businessSlug]`.
- Account and admin routes with search-index protection.
- Strong automated CI and PostgreSQL compatibility gates.

### 19.3 Main product gaps

| Gap                        | Desired end state                                        | Priority     |
| -------------------------- | -------------------------------------------------------- | ------------ |
| Public self-service access | Verified user can register and securely access tools.    | Foundational |
| Create/claim flow          | User can safely create or claim without duplicate chaos. | Foundational |
| Instant preview            | Starter website after name, category and location.       | Foundational |
| Media                      | Logo, hero, gallery and menu upload/build.               | High         |
| Appearance                 | Templates, colours, order, hide/unhide and layouts.      | High         |
| Standalone feel            | Business-first website shell.                            | High         |
| Contact and enquiries      | Chosen calls to action and inbox.                        | High         |
| Claims and tickets         | Admin resolves conflicts through one-click actions.      | High         |
| Lifecycle automation       | Publish/remind/reconfirm/unpublish safely.               | Medium       |
| Promotion and insight      | QR, analytics and platform discovery.                    | Medium       |

## 20. Recommended delivery programme

### 20.1 Operating prerequisite

Before manual or coordinator-led repository writes, pause or explicitly override the scheduled automation through issue #24 and confirm there is no active canonical workstream.

### 20.2 Delivery sequence

| Phase | Outcome                                                | Scope                                                                                                                                                              |
| ----- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Finish current Stage G baseline                        | Close issue #65 after the published-state guidance correction, remaining denial/invalid/unavailable coverage, deployment verification and post-merge confirmation. |
| 1     | Public account access                                  | Registration, email verification, resend, sign-in, recovery, protected account tools and privacy controls.                                                         |
| 2     | Create or claim a business                             | Search existing businesses, duplicate signals, create draft, ownership membership, clean slug and audit event.                                                     |
| 3     | Instant starter website                                | Generate preview after name, category and location; guided completeness and publish eligibility.                                                                   |
| 4     | Media foundation                                       | Logo, hero, gallery, safe upload, crop/focal point, placeholders and media ordering.                                                                               |
| 5     | Appearance and section editor                          | Template, colours, section visibility/order and approved section layouts.                                                                                          |
| 6     | Standalone public website shell                        | Business-specific header/navigation, hero, footer branding, responsive polish and category variants.                                                               |
| 7     | Contact methods and enquiries                          | Primary action, validated contact settings, forms, business inbox, notifications and spam controls.                                                                |
| 8     | Claims, corrections and admin tickets                  | Duplicate conflicts, ownership claims, public corrections and action-driven resolution tickets.                                                                    |
| 9     | Offers, events, menus and structured category features | Special-offer block, automatic event syndication, menu builder/upload and category sections.                                                                       |
| 10    | Lifecycle automation                                   | Auto-publication, reminders, annual confirmation, pause, closure, retention, recovery and deletion.                                                                |
| 11    | Promotion and insight                                  | QR codes, share assets, simple analytics and discovery reporting.                                                                                                  |
| 12    | Monetisation readiness                                 | Entitlement model and future paid features without activating an unagreed commercial plan.                                                                         |

### 20.3 Pull-request strategy

- Use focused vertical slices that leave the repository deployable.
- One canonical pull request at a time under the existing automation rules.
- Link each pull request to an issue with user value and acceptance criteria.
- Keep schema changes, backfills and rollback instructions explicit.
- Require product, permission/privacy and resilience review where relevant.
- Merge only after required CI, database compatibility and browser evidence pass.
- Verify main and deployment after merge before changing workstreams.

## 21. Coordinator work packages and acceptance criteria

| ID    | Work package                  | Minimum acceptance criterion                                                                                                                                 |
| ----- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WP-01 | Registration and verification | A new public user can register, verify, sign in and recover access. Unverified users cannot publish. Protected routes remain non-indexed.                    |
| WP-02 | Business create/claim entry   | A verified user searches existing businesses, sees likely matches, can claim or continue with a distinct business, and receives an attached draft dashboard. |
| WP-03 | Instant generated preview     | After name, category and location, the user sees a responsive starter website with honest placeholders and missing-section guidance.                         |
| WP-04 | Media and gallery             | User can safely upload, replace, reorder and remove logo/hero/gallery media; failed uploads do not corrupt the draft.                                        |
| WP-05 | Template and theme model      | User can choose a template and accessible colours; default choice remains attractive; invalid configuration falls back safely.                               |
| WP-06 | Section editor                | User can edit, reorder, hide/unhide and choose approved layouts for complete sections; navigation follows visible sections.                                  |
| WP-07 | Standalone public shell       | Published `/b/slug` feels business-owned, includes selected identity/actions and medium Our Valleys footer branding.                                         |
| WP-08 | Contacts and enquiries        | Only configured contact methods display; each validates its required data; enquiry reaches the correct business inbox.                                       |
| WP-09 | Claims and resolution tickets | Conflicts generate a complete admin ticket; each approved action changes the correct records atomically and logs the decision.                               |
| WP-10 | Corrections                   | Public suggestions cannot directly overwrite content and can be accepted, rejected or escalated.                                                             |
| WP-11 | Offers/events/menu            | Offers expire correctly; events surface once across business and platform; menu supports structured build and quick upload.                                  |
| WP-12 | Lifecycle automation          | Eligible drafts publish only under the defined rules; reminders, pause/resume, annual confirmation and inactivity unpublication work.                        |
| WP-13 | QR and analytics              | Stable QR code works; permitted view/search/contact events are counted and displayed simply.                                                                 |

### 21.1 Definition of done for every work package

- User-facing behaviour is complete, not merely the data layer.
- Permissions are enforced server-side.
- Success, denial, invalid ID, unavailable data and regression cases are tested.
- Responsive and keyboard journeys are verified.
- No private fields leak into public projections.
- Loading, empty, error and recovery states are intentional.
- CI and standard PostgreSQL compatibility pass.
- Deployment is verified after merge.
- Documentation and issue status match the merged reality.

## 22. Risks, dependencies and operating controls

| Risk                        | Potential consequence                            | Control                                                                                   |
| --------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Unrestricted editor scope   | Could become a costly website-builder project.   | Hold the line at complete sections and approved layouts.                                  |
| Easy creation without proof | Could produce duplicates or impersonation.       | Strong matching, reporting, evidence-rich tickets, audit and suspension tools.            |
| Automatic publication       | Could publish incomplete or unsafe pages.        | Minimum content rules, safety checks, warnings, terms and exception queue.                |
| Media uploads               | Security, copyright, privacy and storage risk.   | Validated types/sizes, scanning, moderation/reporting and clear user responsibility.      |
| Generous free tier          | Infrastructure costs may grow before revenue.    | Reasonable limits, usage monitoring and future entitlements without degrading core value. |
| All-category launch         | Specialist needs could expand scope.             | Universal core first; add bounded category sections progressively.                        |
| Event/offer syndication     | Stale content across the platform.               | Single source of truth and automatic expiry.                                              |
| Dormancy deletion           | Could remove a legitimate business's work.       | Multiple reminders, unpublish first, long recovery and final warning.                     |
| Automation collision        | Scheduled agents could overlap coordinator work. | Use issue #24 PAUSED/MANUAL status and inspect real GitHub activity.                      |

### 22.1 Coordinator governance

- Maintain a single product decision register.
- Do not silently reinterpret agreed decisions.
- Use recommended defaults only where explicitly labelled.
- Record any owner-approved deviation in the relevant issue and this document's successor.
- Keep implementation issues small enough to review but large enough to deliver visible user value.
- Do not activate monetisation, reviews, direct ecommerce or formal verification without a further product decision.

## 23. Recommended defaults still requiring confirmation

The following points were not fully fixed by the owner. None should block early foundation work. The coordinator may use the recommended defaults for planning, but should seek confirmation before irreversible production policy is activated.

| Open item                       | Recommended default                                                                                               | Reason                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Automatic publication delay     | 14 days after the verified account has an eligible draft.                                                         | Gives time for reminders without leaving previews private indefinitely. |
| Minimum publishable fields      | Name, category, location/service area, short description, at least one working contact action and accepted terms. | Produces a useful page without forcing photographs.                     |
| Annual activity grace           | Reminder before 12 months; 60-day grace before automatic unpublication.                                           | Balances freshness with small-business realities.                       |
| Deletion after inactivity       | Do not auto-delete until at least 24 months after unpublication and final warnings.                               | Reduces accidental permanent loss.                                      |
| Free media limits               | 1 logo, 1 hero, 12 gallery images and reasonable document limits initially.                                       | Generous enough for a premium site while controlling cost.              |
| Geographic eligibility          | Define the launch area explicitly in platform policy and postcode/place validation.                               | Prevents confusion about "local".                                       |
| Footer scale                    | Medium visual presence on free sites, unobtrusive after the business content.                                     | Matches the owner's latest preference.                                  |
| Account roles                   | Owner, manager, editor and viewer as proposed in section 12.                                                      | Provides future-proof collaboration without overcomplication.           |
| Public correction notifications | Notify the business for ordinary suggestions; route high-risk or disputed changes to admin.                       | Avoids unnecessary admin load.                                          |
| Analytics retention             | Aggregate reporting with a documented retention period and minimal personal data.                                 | Supports insight without creating unnecessary tracking risk.            |

### 23.1 Final quick-fire questions for the owner

1. Is 14 days the right automatic-publication deadline, or should it be shorter/longer?
2. Should a working contact method be compulsory before any website can publish?
3. How many gallery images should the free website include at launch?
4. After a missed annual confirmation, how long should the website remain recoverable before unpublishing?
5. Should permanently closed businesses retain a small public closure page or disappear completely?
6. What exact towns/postcodes define the first Our Valleys launch area?
7. Should an owner be able to invite managers/editors in the first release or later?
8. Should the free footer say "Powered by Our Valleys", "Made with Our Valleys" or another phrase?

## Appendix A. Complete question-and-answer decision record

This appendix records the structured questions asked during the product-definition sessions and translates the dictated answers into concise decisions. It is intended as an audit trail, not as a replacement for the specification above.

### Round one

| No. | Question                                                            | Owner decision                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Who is the main target first?                                       | Both businesses with no website and businesses with poor or outdated websites.                                                                                                                              |
| 2   | What should it be called publicly?                                  | The offer is definitely a free local business page and may also be called a free business website. Final wording should be accurate; recommended wording is "Your free business website and local listing". |
| 3   | How quickly should someone see the first preview?                   | After entering the business name, category and location.                                                                                                                                                    |
| 4   | Should every new business require admin approval before going live? | No. Publish automatically after checks.                                                                                                                                                                     |
| 5   | How should possible duplicates be treated?                          | Do not allow careless duplicates. Similar names may be legitimate in different locations; use multiple validity signals and admin conflict resolution where needed.                                         |
| 6   | How much design choice should the free website provide?             | Start from a strong core template; allow other templates, colour/theme changes, editing, photographs, section movement and substantial controlled customisation.                                            |
| 7   | Should the site feel separate from Our Valleys?                     | Yes. The URL is clearly Our Valleys, but the page should feel like the business's own website. Our Valleys appears in the footer.                                                                           |
| 8   | What should the main contact feature be?                            | The business chooses its own contact methods and supplies the data needed to make each action work.                                                                                                         |
| 9   | Should photographs be required?                                     | Recommended and strongly prompted, but optional. Use a deliberate placeholder if skipped.                                                                                                                   |
| 10  | Should AI help write content?                                       | Yes, only as an optional assistant and never as an inventor of facts.                                                                                                                                       |
| 11  | Which analytics matter?                                             | Views, search appearances and contact actions — all three.                                                                                                                                                  |
| 12  | How generous should the free tier be?                               | Very generous and genuinely useful.                                                                                                                                                                         |
| 13  | Should Welsh be available at launch?                                | English-first interface. Businesses may write in Welsh. Full bilingual editing can follow.                                                                                                                  |
| 14  | Which feature should follow business creation?                      | After clarification, the agreed sequence starts with public registration/verification, then creation, preview, media, design, contacts/enquiries and analytics.                                             |
| 15  | What makes it feel like a genuine website?                          | Template-led premium design; editable content; gallery and hero media; chosen contact methods; menu support; hideable/reorderable sections; clean URL; QR code; business-first identity.                    |

### Round two

| No. | Question                                                  | Owner decision                                                                                                                      |
| --- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Who can create a business website?                        | Anyone with an email address can register. Email verification gives access to the account and tools.                                |
| 2   | What if the business already exists?                      | Allow claims and contributions; conflicts or likely duplicates create an admin ticket with evidence and one-click resolution tools. |
| 3   | Must users prove ownership?                               | No mandatory proof at launch. Start open and investigate disputes or risk cases.                                                    |
| 4   | What should the URL be?                                   | Coordinator may choose the best structure provided the business name appears. Recommended: `/b/business-name`.                      |
| 5   | Can the URL change later?                                 | Not a routine self-service option. A support ticket may approve a justified change, with redirect.                                  |
| 6   | How flexible is the editor?                               | Reorder, hide and edit complete sections, plus approved layout choices. No individual-element/pixel control.                        |
| 7   | Can users add unrestricted custom sections?               | No. Use a broad approved template/section library.                                                                                  |
| 8   | How is navigation created?                                | Automatically from visible sections.                                                                                                |
| 9   | Can users link an existing website?                       | Yes, as an optional link/action. The Our Valleys page does not automatically redirect.                                              |
| 10  | What happens when the business stops trading?             | Owner can pause/unpublish, resume, mark closed or delete. Use periodic trading confirmation and inactivity handling.                |
| 11  | Can the public suggest corrections?                       | Yes, but suggestions do not directly overwrite the website.                                                                         |
| 12  | Should reviews be included initially?                     | No. The initial product is a website, not a reviews platform.                                                                       |
| 13  | Can businesses publish special offers?                    | Yes, through a simple hideable card/banner/section with controlled presentation.                                                    |
| 14  | Should business events also appear in Our Valleys events? | Yes, automatically.                                                                                                                 |
| 15  | Are products/services informational initially?            | Yes.                                                                                                                                |
| 16  | Should custom domains be supported?                       | Potential future paid feature, not an initial focus.                                                                                |
| 17  | How visible is Our Valleys branding?                      | A logo and link in the footer; later clarified as medium rather than extremely small.                                               |
| 18  | Can branding be removed?                                  | At launch it remains. Future paid features may include removing it once monetisation is defined.                                    |
| 19  | What happens to an unfinished preview?                    | Send reminders and publish automatically after a period if eligible. Dormant published sites can later be unpublished.              |
| 20  | Which business types launch first?                        | All local businesses from the beginning.                                                                                            |

### Final branding clarification

| Topic                    | Decision                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| Current free-site footer | Use a medium, tasteful Our Valleys logo and "Powered by Our Valleys" link.                         |
| Future                   | Allow footer removal as one candidate paid feature, alongside other unagreed monetisation options. |
| Commercial status        | Do not finalise or activate the monetisation model as part of the initial free-website build.      |

## Appendix B. Suggested customer-facing wording

- **Primary proposition:** Your free business website and local listing.
- **Supporting explanation:** Create a professional website for your business, customise it to suit you and help local customers find you through Our Valleys.
- **Onboarding call to action:** Create your free business website
- **First-preview message:** Your starter website is ready. Add your details, photographs and preferred contact options, then make it your own.
- **Photo prompt:** Your website can be published without a photograph, but adding a real business image helps customers recognise and trust you.
- **Footer:** Powered by Our Valleys
- **Annual confirmation:** Is your business still trading? Confirm with one click to keep your website and local information up to date.

## Appendix C. Glossary

| Term                    | Meaning                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Business website        | The public business-first page hosted by Our Valleys under a stable URL.                                           |
| Business listing        | The structured representation used in search, categories, places and directory surfaces.                           |
| Canonical business data | The single source of truth reused across the website and wider platform.                                           |
| Section                 | A complete responsive website block, such as Hero, Services or Gallery.                                            |
| Template                | An approved visual system that arranges and styles sections.                                                       |
| Layout                  | An approved presentation option within a section.                                                                  |
| Draft                   | The private editable version.                                                                                      |
| Published version       | The currently public approved/generated version.                                                                   |
| Claim                   | A request to gain management control of an existing business.                                                      |
| Conflict ticket         | An admin work item containing the evidence and actions needed to resolve a duplicate, claim or correction dispute. |
| Slug                    | The human-readable business-name part of the URL.                                                                  |
| Primary action          | The business's most prominent visitor action, such as Call, Book or Enquire.                                       |
| Open contribution model | People can add useful business information without mandatory formal proof, while conflicts remain reviewable.      |
| Dormant                 | A business website with no qualifying activity or annual confirmation for the defined period.                      |

## Coordinator mandate

Deliver a free, premium-quality, business-first website system that a non-technical local business can create quickly, customise safely, publish confidently and share as its own. Preserve one source of truth, controlled flexibility, automatic safety checks, clear lifecycle controls and the generous free proposition throughout implementation.
