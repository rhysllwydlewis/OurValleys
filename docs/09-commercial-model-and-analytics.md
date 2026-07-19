# Commercial Model and Analytics

## 1. Objective

Build a sustainable local platform without damaging resident trust or making the free business product deliberately ineffective.

The platform should monetise additional commercial value delivered to businesses while keeping ordinary resident access free.

## 2. Commercial principles

- Prove business value before expecting broad subscription adoption.
- Sell outcomes, capability and convenience rather than arbitrary restrictions.
- Label advertising and sponsorship clearly.
- Do not allow payment to buy false verification or undisclosed editorial recommendation.
- Keep packages understandable.
- Avoid taking transaction risk before operational capacity exists.
- Test pricing with local businesses before fixing it.
- Track meaningful connections, not only impressions.

## 3. Core business model

### Free

Purpose: acquisition, local coverage and proof of value.

Suggested entitlement:

- Claimed business profile.
- Generated one-page website.
- Platform URL.
- Core contact details.
- Services and opening hours.
- Limited media.
- Enquiry form.
- Basic analytics.
- Platform branding.

### Enhanced

Indicative validation range: £10–£20 per month.

Potential value:

- More media and sections.
- Offers and events.
- Improved style controls.
- Review responses when reviews launch.
- Better analytics.
- Reduced advertising on the business page.
- Simple lead organisation.

### Professional

Indicative validation range: £25–£45 per month.

Potential value:

- Custom domain.
- Removal of platform branding.
- Advanced enquiries and quotation forms.
- Booking integrations.
- Product or menu sections.
- Multiple team members.
- Deeper analytics.
- Automated customer follow-up.

### Growth

Indicative validation range: £50–£80 per month.

Potential value:

- Multiple locations.
- Customer management.
- Email campaigns.
- Advanced automation.
- Ecommerce or payment tools.
- Priority support.
- Enhanced lead management.
- Promotional campaign tools.

These are test ranges, not approved launch prices.

## 4. Entitlement design

Store capabilities as versioned plan entitlements rather than scattering plan-name checks throughout the code.

Example entitlements:

- `site.custom_domain`
- `site.remove_platform_branding`
- `site.max_media`
- `site.extra_sections`
- `business.max_locations`
- `team.max_members`
- `enquiry.advanced_forms`
- `analytics.retention_days`
- `marketing.email_campaigns`
- `commerce.payments`

Rules:

- Historical subscribers retain a clear entitlement set.
- Downgrade behaviour is documented.
- Failed payment enters grace state.
- Content is not deleted immediately on downgrade.
- Critical public contact information remains recoverable.

## 5. Additional revenue streams

Potential later revenue:

- Sponsored search or category placement.
- Sponsored town-page blocks.
- Newsletter sponsorship.
- Event promotion.
- Job listings.
- Property packages.
- Marketplace boosts.
- Ticket commission.
- Booking commission.
- Gift voucher fees.
- Domain and email services.
- Photography and onboarding services.
- Content-writing services.
- Relevant affiliate relationships.
- White-label local portals.

Every stream requires its own disclosure, operational cost and user-value assessment.

## 6. Revenue not recommended initially

- Managed marketplace buyer protection.
- Holding property deposits.
- Food-delivery commissions.
- Local currency or crypto token.
- High-volume display advertising that degrades the experience.
- Selling user contact lists.
- Undisclosed pay-to-rank schemes.
- Charging residents to access basic local information.

## 7. Pricing validation programme

Interview at least 20–30 businesses across different categories.

Test:

- Current website and advertising costs.
- Current dependence on social media.
- Difficulty updating information.
- Importance of custom domain.
- Value of enquiries and bookings.
- Desired support level.
- Willingness to pay for specific tools.
- Preference for monthly or annual billing.
- Reactions to a free one-page website.
- Concerns about platform dependence.

Avoid asking only “Would you pay for this?” Use concrete trade-offs and, where possible, ask for a founding commitment or pilot participation.

## 8. Founding business offer

Possible structure:

- Free Professional-equivalent access for a fixed pilot period.
- Personal onboarding.
- Founding-member badge that does not imply verification.
- Feedback sessions.
- Launch promotion.
- Clear end date and future price explanation.

Do not promise unlimited premium access forever. Early commitments should be written clearly.

## 9. Unit economics model

Track at minimum:

- Business acquisition cost.
- Onboarding support cost.
- Monthly infrastructure cost per active business.
- Media storage and delivery cost.
- Email and notification cost.
- Moderation and support cost.
- Payment-processing cost.
- Average revenue per paying business.
- Gross margin.
- Monthly and annual churn.
- Upgrade and downgrade rates.
- Time to first meaningful connection.

## 10. North-star metric

**Successful local connections created each month.**

Each connection type needs a precise analytics definition.

Examples:

- `business_enquiry_submitted`
- `quote_request_submitted`
- `business_phone_revealed_or_tapped`
- `external_booking_clicked`
- `event_registration_completed`
- `job_application_started_or_handed_off`
- `marketplace_contact_started`
- `property_enquiry_submitted`
- `volunteer_interest_submitted`

Do not claim that a click equals a completed sale.

## 11. Analytics event catalogue

## 11.1 Acquisition

- `landing_viewed`
- `business_cta_clicked`
- `account_registration_started`
- `account_registered`
- `email_verified`
- `business_claim_started`
- `business_creation_started`

## 11.2 Activation

- `business_core_details_completed`
- `business_media_added`
- `business_preview_viewed`
- `business_verification_submitted`
- `business_site_published`
- `resident_location_selected`
- `resident_first_save`

## 11.3 Discovery

- `search_submitted`
- `search_filter_applied`
- `search_zero_results`
- `search_result_opened`
- `category_viewed`
- `place_viewed`
- `business_viewed`
- `event_viewed`
- `guide_viewed`

## 11.4 Connection

- `business_enquiry_started`
- `business_enquiry_submitted`
- `business_phone_action`
- `business_email_action`
- `directions_action`
- `external_booking_action`
- `event_ticket_action`
- `event_saved`

## 11.5 Retention

- `business_profile_updated`
- `business_event_published`
- `business_analytics_viewed`
- `resident_returned`
- `saved_search_result_opened`
- `notification_opened`

## 11.6 Revenue

- `plan_viewed`
- `upgrade_started`
- `subscription_started`
- `subscription_renewed`
- `subscription_payment_failed`
- `subscription_cancelled`
- `subscription_downgraded`

## 11.7 Trust and quality

- `content_reported`
- `claim_submitted`
- `claim_approved`
- `verification_completed`
- `business_information_correction_submitted`
- `moderation_decision_completed`
- `appeal_submitted`

## 12. Event data rules

- Maintain a documented event dictionary.
- Use allowlisted properties.
- Do not put enquiry message content into analytics.
- Do not send full email, telephone or private address.
- Distinguish anonymous, pseudonymous and identified events.
- Record consent state where required.
- Filter obvious bots from business-facing metrics where practical.
- Version event definitions when meaning changes.

## 13. Core product dashboards

## 13.1 Founder dashboard

- Active residents.
- Active businesses.
- Published business sites.
- Successful connections.
- Search success and zero-result rate.
- Businesses receiving at least one connection.
- New and churned subscriptions.
- Content and moderation queues.
- Coverage by place and category.

## 13.2 Business dashboard

- Page views.
- Search appearances.
- Meaningful actions.
- Enquiries.
- Response status.
- Profile completeness.
- Recent period comparison.
- Practical recommendations.

Do not show complex charts merely to make the product appear advanced.

## 13.3 Content dashboard

- Current events.
- Expired or stale content.
- Places below coverage threshold.
- Guides due for review.
- Unclaimed business records.
- Correction requests.

## 14. Funnel definitions

### Business activation funnel

1. Visits business proposition.
2. Creates account.
3. Starts business.
4. Completes core profile.
5. Uploads media.
6. Previews.
7. Verifies.
8. Publishes.
9. Receives first meaningful connection.
10. Returns to update or view analytics.

### Resident discovery funnel

1. Lands on platform.
2. Sets or confirms place.
3. Searches or browses.
4. Opens a result.
5. Completes meaningful action.
6. Saves or returns.

### Subscription funnel

1. Encounters genuine paid capability need.
2. Views plan comparison.
3. Starts checkout.
4. Subscription activates.
5. Uses paid feature.
6. Receives ongoing value.
7. Renews.

## 15. Early success thresholds

Do not treat these as guarantees; use them as review points.

### Validation stage

- 20–30 business interviews.
- 10 or more businesses willing to complete a pilot profile.
- Repeated evidence that generated website and local enquiries solve real problems.

### Private pilot

- 20–30 published business websites.
- Majority complete onboarding without technical intervention after assisted setup is refined.
- Valid enquiries delivered successfully.
- Businesses understand free and future paid boundaries.

### Local launch

- 75–100 useful business profiles.
- Strong category and location density in focus areas.
- Regular resident search activity.
- Measurable business connections.
- Operational moderation and support response.

### Monetisation test

- Businesses have received demonstrable value.
- At least one paid feature has repeated demand.
- Conversion test is conducted without removing essential free value.
- Support cost and price remain economically sensible.

## 16. Experiment standards

Every commercial experiment should state:

- Hypothesis.
- Target audience.
- Primary metric.
- Guardrail metrics.
- Duration or sample rule.
- User impact.
- Decision rule.
- Result.

Guardrails may include:

- Search usefulness.
- Business complaints.
- Enquiry completion.
- Page performance.
- Unsubscribe rate.
- Moderation volume.

## 17. Advertising quality rules

- Clearly labelled.
- Relevant to location or context.
- Frequency capped where possible.
- Not placed to imitate navigation or system notices.
- Not sold to prohibited or unsafe categories.
- Measured separately from organic content.
- Complaints and removal route available.

## 18. Commercial decision gates

Before introducing a revenue stream, confirm:

1. User value.
2. Customer and payer.
3. Legal and disclosure requirements.
4. Operational cost.
5. Refund or dispute burden.
6. Technical dependencies.
7. Analytics definition.
8. Effect on trust and organic ranking.
9. Support ownership.
10. Exit or rollback plan.
