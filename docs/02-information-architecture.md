# Information Architecture

## 1. Objective

Create a structure that feels simple to residents while allowing businesses, locations, events and content to connect through one data model.

The platform must not become a collection of unrelated mini-sites. Search, place and business data should connect every section.

## 2. Primary navigation

Recommended initial public navigation:

- **Discover**
- **Businesses**
- **What’s On**
- **Guides**
- **My Area**
- **For Business**

A prominent universal search action should remain available on all public pages.

Future modules such as Marketplace, Jobs, Property and Community should not appear in the primary navigation until they contain useful current content and have passed their release gates.

## 3. Navigation behaviour

### Discover

An editorial and exploratory landing area containing:

- Things to do.
- Food and drink.
- Shopping.
- Home and trades.
- Family.
- Weddings.
- Outdoors.
- Heritage.
- Offers when launched.

### Businesses

- Browse all categories.
- Search by keyword and location.
- Browse verified businesses.
- Browse recently added businesses where useful.

### What’s On

- Today.
- This weekend.
- Date range.
- Free events.
- Event categories.
- Town or area.

### Guides

- Town guides.
- Local life.
- Days out.
- Food and drink.
- Home and property.
- Business guidance.
- History and heritage.

### My Area

Without an account:

- Location selection.
- Local businesses.
- Current events.
- Relevant guides.

With an account:

- Followed places.
- Saved businesses.
- Saved events.
- Alerts and preferences.

### For Business

- Benefits.
- Example generated websites.
- Packages.
- Claim a business.
- Create a business.
- Sign in.
- Help centre.

## 4. Route map

Exact framework syntax is not yet selected. The following represents product routes, not mandatory code conventions.

### Public

```text
/
/search
/discover
/businesses
/businesses/[category]
/b/[business-slug]
/places
/places/[place-slug]
/events
/events/[event-slug]
/guides
/guides/[guide-slug]
/about
/contact
/advertising
/help
/legal/terms
/legal/privacy
/legal/cookies
/legal/community-guidelines
/legal/advertising-policy
/legal/complaints-corrections
/legal/accessibility
/safety/report
```

### Resident account

```text
/account
/account/profile
/account/locations
/account/saved/businesses
/account/saved/events
/account/notifications
/account/security
/account/data
```

### Business onboarding and dashboard

```text
/for-business
/business/start
/business/claim
/business/onboarding/[step]
/dashboard
/dashboard/business
/dashboard/website
/dashboard/services
/dashboard/locations
/dashboard/hours
/dashboard/media
/dashboard/enquiries
/dashboard/events
/dashboard/analytics
/dashboard/team
/dashboard/verification
/dashboard/billing
/dashboard/settings
```

### Administration

```text
/admin
/admin/users
/admin/businesses
/admin/claims
/admin/verifications
/admin/content
/admin/events
/admin/reports
/admin/moderation
/admin/locations
/admin/categories
/admin/feature-flags
/admin/audit
/admin/operations
```

## 5. URL rules

- Public URLs use readable lowercase slugs.
- Stable entity identifiers remain separate from slugs internally.
- Slug changes create permanent redirects.
- Draft and preview URLs are not indexable.
- Filter combinations should not generate uncontrolled indexable URL variants.
- Business pages use one canonical route even when reachable from several categories or places.
- Welsh and English route strategy must be decided before broad indexing; do not create duplicate language URLs without correct alternates and canonical handling.

## 6. Search model

## 6.1 Search inputs

- Query text.
- Selected place.
- Optional postcode or coordinates.
- Radius.
- Category.
- Open-now state.
- Verification state.
- Accessibility features.
- Welsh-speaking service.
- Event date.

## 6.2 Searchable entities in MVP

- Business.
- Service.
- Category.
- Place.
- Event.
- Guide.

## 6.3 Searchable entities later

- Offer.
- Job.
- Marketplace listing.
- Property listing.
- Organisation.
- Community post.

## 6.4 Search document principles

Each indexable record should include:

- Entity identifier and type.
- Published state.
- Display title.
- Search description.
- Primary and secondary categories.
- Location identifiers.
- Coordinates where appropriate.
- Service radius or service areas.
- Synonyms and aliases.
- Language.
- Freshness timestamps.
- Verification and completeness signals.
- Safety or visibility restrictions.

Private fields must never be copied into the public search index.

## 6.5 Zero-results behaviour

When no exact result exists:

- Explain which filters were applied.
- Allow users to broaden distance or remove filters.
- Suggest related categories or spelling corrections.
- Show nearby results only when clearly labelled as outside the requested place.
- Never invent a local business or claim availability that is not known.

## 7. Location information architecture

## 7.1 Place types

Suggested types:

- Region.
- Valley or local area.
- Town.
- Village.
- Neighbourhood.
- Venue.
- Postcode area.

A place may have more than one parent relationship for discovery purposes, but the canonical hierarchy must remain clear.

## 7.2 Place data

- Canonical name.
- Welsh name where applicable.
- Alternative names and spellings.
- Slug.
- Type.
- Parent place.
- Coordinates or boundary.
- Adjacent places.
- Active coverage state.
- Editorial introduction.
- SEO metadata.

## 7.3 Business location types

A business can be:

- Fixed public premises.
- Fixed premises with hidden exact address.
- Service-area business.
- Home-based business with hidden address.
- Online-only business based in RCT.
- Multi-location business.

The public interface must not expose a private residential address merely because it is stored for verification or billing.

## 8. Category architecture

## 8.1 Category levels

Use no more than three levels initially:

1. Top-level category.
2. Category.
3. Optional specialist subcategory.

Example:

```text
Home & Trades
  Plumbing & Heating
    Emergency Plumber
```

## 8.2 Initial top-level categories

- Home & Trades.
- Food & Drink.
- Shopping.
- Health & Wellbeing.
- Beauty & Personal Care.
- Professional Services.
- Weddings & Celebrations.
- Activities & Leisure.
- Children & Family.
- Motoring & Transport.
- Pets.
- Accommodation & Tourism.
- Property Services.
- Community & Voluntary.
- Education & Training.
- Creative & Digital.

This list should be validated against real businesses before being locked.

## 8.3 Category rules

- Every business has one primary category.
- Secondary categories are limited to prevent keyword stuffing.
- Services can have more specific categories than the business itself.
- Category synonyms improve search but do not create duplicate public pages.
- Categories can be merged or retired with redirects.
- A paid package cannot purchase an inaccurate category.

## 9. Content relationships

### Business

Can relate to:

- Places.
- Categories.
- Services.
- Events.
- Guides.
- Offers.
- Enquiries.
- Media.
- Verification records.

### Event

Can relate to:

- Organiser business or organisation.
- Venue.
- Place.
- Category.
- Guide.

### Guide

Can relate to:

- Author.
- Places.
- Businesses.
- Events.
- Categories.
- Sponsorship record.

Relationships must be explicit. A business must not be inserted into an editorial guide merely because it pays for a subscription.

## 10. Homepage composition rules

The homepage should be assembled from reusable content blocks rather than hard-coded one-off content.

Potential blocks:

- Universal search.
- Location selector.
- Category grid.
- Upcoming events.
- Useful nearby businesses.
- Recently completed or newly verified profiles.
- Editorial guides.
- Business onboarding call to action.
- Sponsored placement.

Rules:

- Hide blocks with insufficient content.
- Limit repeated businesses.
- Label sponsored blocks.
- Avoid allowing paid content to dominate the first screen.
- Provide admin control over block enablement and ordering without arbitrary code injection.

## 11. Empty, loading and error states

Every major page needs designed states for:

- No data yet.
- No results.
- Loading.
- Partial failure.
- Offline or connection failure where relevant.
- Restricted or unpublished content.
- Deleted or redirected content.

An empty location page should invite contribution or business onboarding only if the platform honestly explains that coverage is still developing.

## 12. Future navigation expansion

Add a new top-level area only when:

1. It has a clear owner.
2. It has enough active content.
3. Search and moderation are ready.
4. Legal and privacy review is complete.
5. The module has a reliable empty-state and reporting route.
6. Its introduction does not make the primary navigation unmanageably broad.

Potential future grouping:

- Marketplace.
- Jobs.
- Property.
- Community.

These may ultimately live under a broader “Local Life” or “More” area rather than all becoming permanent primary tabs.
