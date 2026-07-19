# Generated Business Website System

## 1. Purpose

The generated business website is the flagship product. It must be valuable enough to attract real businesses while remaining structured, safe, maintainable and scalable.

The product is not a general-purpose drag-and-drop website builder. It is a category-aware local business website system powered by the canonical OurValleys business record.

## 2. Product promise

A business should be able to:

1. Enter its details once.
2. Receive a suitable website automatically.
3. Edit wording, images and selected design choices.
4. Preview the result.
5. Publish without technical assistance.
6. Update information later from one dashboard.
7. Have those updates appear across OurValleys.

## 3. Free website definition

The free product should be a polished one-page website containing the sections relevant to that business type.

Suggested free entitlement:

- Platform URL.
- One generated page.
- Business summary.
- Services or products summary.
- Opening hours.
- Location or areas served.
- Contact and enquiry actions.
- Limited media gallery.
- Basic colour and style choices.
- Basic analytics.
- OurValleys branding.

The free tier must not include unlimited bespoke support, unlimited storage, arbitrary layouts or advanced commercial automation.

## 4. Website and directory relationship

There should not be two competing editable records.

The public business route acts as:

- The business website.
- The directory profile.
- The canonical business page within OurValleys.

Later, a paid custom domain should render the same published business site while retaining one content source.

## 5. Content model

The editor should expose structured sections rather than one large rich-text field.

Core sections:

- Hero.
- About.
- Services or products.
- Opening hours.
- Location or service area.
- Gallery.
- Contact and enquiry.
- Accessibility.
- Languages.
- Qualifications or accreditations.
- Frequently asked questions.
- Events.
- Offers when launched.
- Latest updates.

Each section has:

- Enabled state.
- Heading.
- Structured content.
- Display variant.
- Sort order within permitted rules.
- Validation.
- Visibility rules.

## 6. Category-specific templates

## 6.1 Trades and home services

Priority sections:

- Services.
- Areas served.
- Quote request.
- Qualifications.
- Emergency availability.
- Before-and-after gallery.
- Business hours.

Do not imply that qualifications or memberships are verified unless the relevant check has been completed.

## 6.2 Food and drink

Priority sections:

- Menu or offering.
- Opening hours.
- Dietary information.
- Booking link.
- Collection and delivery.
- Location and directions.
- Events and offers.

## 6.3 Retail

Priority sections:

- Product categories.
- Featured products.
- Stock enquiry.
- Delivery or collection.
- Opening hours.
- Location.

MVP does not require full stock management or checkout.

## 6.4 Beauty and wellbeing

Priority sections:

- Services or treatments.
- Price guidance.
- Staff or practitioner information.
- Booking link or request.
- Opening hours.
- Accessibility.

## 6.5 Venues and weddings

Priority sections:

- Packages.
- Capacity.
- Gallery.
- Availability enquiry.
- Brochure link.
- Facilities.
- Accessibility.
- Frequently asked questions.

## 6.6 Professional services

Priority sections:

- Services.
- Areas of expertise.
- Team.
- Qualifications or regulation information.
- Consultation enquiry.
- Service area.

## 6.7 Community organisations

Priority sections:

- Purpose.
- Activities.
- Timetable.
- Events.
- Volunteering.
- Membership.
- Donation or support links.
- Contact details.

## 7. Onboarding-to-template mapping

The onboarding answers should determine:

- Recommended template family.
- Default sections.
- Suggested field labels.
- Suitable enquiry types.
- Relevant attributes.
- Recommended media prompts.

Example:

```text
Primary category: Plumbing & Heating
Business type: Service-area business
Emergency service: Yes
Pricing: Quote required

Generated result:
- Prominent call and quote actions
- Areas-served section
- Emergency availability label
- Services cards
- Qualifications section
- Before-and-after gallery
```

## 8. AI-assisted content

AI may assist with:

- Rewriting rough business descriptions.
- Suggesting section headings.
- Summarising supplied services.
- Producing draft FAQs from supplied facts.
- Suggesting missing information.
- Translating draft content for review.

AI must not:

- Invent claims, qualifications, reviews, opening hours or prices.
- Publish without owner review.
- copy competitor text.
- claim a translation is authoritative without review.
- generate misleading scarcity or promotional statements.

The interface should show generated wording as a draft and require deliberate approval before publication.

## 9. Customisation boundaries

### Allowed in free tier

- Select from approved template variants.
- Choose approved palette or limited custom brand colour.
- Upload logo and images.
- Edit all factual wording.
- Enable or disable optional sections.
- Choose from approved section layouts.

### Paid possibilities

- Custom domain.
- Removal of platform branding.
- More template options.
- Additional content sections.
- Larger media limits.
- Advanced call-to-action configuration.
- Multiple locations.
- Staff profiles.
- Booking and payment integrations.
- Custom forms.
- Advanced analytics.
- Marketing tools.

### Not allowed

- Arbitrary JavaScript.
- Arbitrary iframe embedding.
- Raw unsanitised HTML.
- Uploading executable files.
- Breaking required accessibility controls.
- Hiding required sponsorship or platform disclosures.

## 10. Editing workflow

1. Edit structured fields.
2. Autosave draft.
3. Validate required fields and public/private visibility.
4. Preview at mobile and desktop sizes.
5. Show changes since last published revision.
6. Publish or submit for review.
7. Create immutable publication record or revision snapshot.
8. Invalidate caches and update search projection.
9. Record audit event.
10. Allow rollback to a safe prior revision.

## 11. Publication rules

A site cannot publish unless:

- Required business fields are complete.
- Account email is verified.
- Business ownership or claim state meets the launch policy.
- Public contact route exists.
- Media has passed processing checks.
- No blocked terms or unsupported claims require review.
- The selected template is active.
- Terms and public information acknowledgement are current.

Administrators should be able to impose additional review for higher-risk categories without making every edit manually moderated.

## 12. Revision history

Store sufficient history to:

- Restore accidental changes.
- Understand who published material changes.
- investigate complaints.
- Compare current and previous public claims.

Do not create permanent copies of deleted private verification data within site revisions.

Suggested retention:

- Keep recent drafts for a limited period.
- Keep published revisions according to complaints, legal and operational needs.
- Allow an administrator to preserve a revision under a formal hold process.

## 13. Domain model

### Platform URL

Initial canonical pattern:

```text
ourvalleys.[tld]/b/business-slug
```

The final domain and public route may change, but a path-based URL is simplest for MVP.

### Custom domain flow

1. Business enters hostname.
2. Platform supplies DNS instructions.
3. Ownership is verified.
4. TLS certificate is provisioned.
5. Domain maps to the business site.
6. One domain is selected as canonical.
7. Other valid domains redirect.
8. Removal or subscription expiry follows a documented grace process.

### Domain safety

- Prevent domain takeover after detachment.
- Reverify suspicious changes.
- Do not allow one hostname on multiple active businesses.
- Keep the platform URL available as a recovery route unless policy states otherwise.

## 14. Search-engine handling

Each published site needs:

- Unique page title and description.
- Canonical URL.
- Accurate structured data where eligible.
- Open Graph and social metadata.
- Business image.
- Indexability state.
- Sitemap inclusion.
- Redirects after slug changes.

Avoid:

- Automatically generated keyword-stuffed paragraphs.
- Large numbers of thin pages for every service and village combination.
- False local addresses.
- Duplicate custom-domain and platform-domain pages without canonical handling.

## 15. Accessibility requirements

Template system must enforce:

- Semantic heading hierarchy.
- Keyboard navigation.
- Visible focus.
- Sufficient contrast.
- Scalable text.
- Alt-text workflow.
- Accessible forms and validation.
- Reduced motion.
- Captions or alternatives for important video content.
- No business-selected colour combination that makes core text unreadable.

Businesses may customise within guarded tokens; they cannot override essential accessibility rules.

## 16. Performance requirements

- Responsive image derivatives.
- Limited font and script budget.
- Lazy-load non-critical media.
- Avoid auto-playing heavy background video by default.
- Server-render essential content.
- Prevent cumulative layout shift through known media dimensions.
- Limit third-party widgets.
- Monitor representative generated sites, not only the platform homepage.

## 17. Enquiry configurations

Supported MVP forms may include:

- General enquiry.
- Quote request.
- Availability request.
- Booking handoff.
- Stock enquiry.

Form fields should be template-driven and limited to necessary information.

Businesses must not create unrestricted sensitive-data forms. Categories requiring health, legal or financial information need separate review before custom forms are offered.

## 18. Analytics shown to businesses

Useful initial metrics:

- Page views.
- Search appearances.
- Calls or call-button taps.
- Email or enquiry actions.
- Direction actions.
- Event or external booking clicks.
- Comparison with the previous period.

Explain definitions and avoid claiming a sale occurred merely because a contact button was clicked.

## 19. Free-to-paid upgrade moments

Appropriate upgrade prompts occur when the business tries to:

- Connect a custom domain.
- Remove platform branding.
- Add extra team members.
- Exceed media allowance.
- Use advanced forms.
- View deeper analytics.
- Add multiple locations.
- Enable booking, payments or campaigns.

Do not interrupt basic editing continually with upgrade prompts.

## 20. Template quality gate

A template cannot become available until it passes:

- Mobile, tablet and desktop review.
- Keyboard testing.
- Automated accessibility checks.
- Screen-reader spot check.
- Representative content stress test.
- Long-name and missing-image states.
- Performance budget.
- Cross-browser testing.
- Structured data validation where used.
- Security review for any embed capability.

## 21. MVP acceptance criteria

- New business can publish without developer intervention.
- Template fits at least the priority launch categories.
- Business can update core details once and see them across the site.
- Draft and published states are distinct.
- Rollback works.
- Private address and verification data cannot appear accidentally.
- Business cannot inject executable content.
- Pages meet agreed accessibility and performance gates.
- Custom domains remain disabled until domain verification and lifecycle controls are complete.
