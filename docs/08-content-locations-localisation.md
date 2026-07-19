# Content, Locations and Localisation

## 1. Purpose

OurValleys cannot launch as an empty framework. This document defines how local coverage, editorial content, business data and Welsh-language readiness should be created and maintained.

## 2. Content principles

- Useful before comprehensive.
- Accurate before abundant.
- Current information over decorative volume.
- Clear source and content type.
- Local specificity rather than generic search-engine copy.
- Paid relationships disclosed.
- English and Welsh stored as separate content, not merged into one uncontrolled field.
- Thin or empty sections remain hidden until useful.

## 3. Location model

## 3.1 Canonical hierarchy

Use a managed hierarchy:

1. Rhondda Cynon Taf.
2. Valley or local area.
3. Town.
4. Village or neighbourhood.
5. Venue or address-level location where needed.

The hierarchy should support, but not oversimplify, the Rhondda Fawr, Rhondda Fach, Cynon, Taff and Ely valleys and communities that identify differently.

## 3.2 Initial location dataset

For each place capture:

- Canonical English name.
- Welsh name where used.
- Common alternative name.
- Common spelling variants.
- Place type.
- Parent place.
- Latitude and longitude.
- Boundary reference where available.
- Adjacent places.
- Postcode associations.
- Coverage status.
- Short factual introduction.

## 3.3 Coverage states

- planned
- seeding
- active
- mature
- paused
- archived

A place page in `planned` state should not be indexable. A `seeding` page may be visible only when it contains a minimum useful set and clearly explains developing coverage.

## 3.4 Initial density approach

Recommended operational order:

1. Rhondda communities where existing relationships make onboarding practical.
2. Cynon Valley.
3. Taff and Ely communities.
4. Remaining RCT gaps.
5. Wider Valleys expansion only after RCT density is demonstrated.

The database can contain the full RCT structure from the start, but marketing and editorial effort should be concentrated.

## 4. Business category seeding

Priority categories should reflect frequent local intent and strong business value:

- Plumbing and heating.
- Electrical.
- Building and home improvement.
- Roofing.
- Cleaning.
- Gardening and landscaping.
- Food and drink.
- Hair and beauty.
- Shops.
- Vehicle services.
- Professional services.
- Children and family.
- Pets.
- Weddings and events.
- Activities and leisure.
- Accommodation and visitor services.
- Community organisations.

Before finalising taxonomy:

- Interview businesses.
- Review real local search phrasing.
- Test whether businesses can choose a category confidently.
- Add synonyms rather than creating duplicate categories.
- Keep specialist categories only where enough businesses exist.

## 5. Launch seeding targets

Targets are guidelines, not reasons to publish poor data.

Before broad public promotion aim for:

- 75–100 useful business profiles.
- Strong representation in priority categories.
- Complete pages for the first focus towns.
- 30 or more current events.
- 15–20 genuinely useful guides.
- Several active community organisations.
- Clear business website examples.
- No promoted empty module.

A “useful business profile” means more than a name and telephone number. It should normally include category, description, contact route, location or service area, opening information where relevant and at least one appropriate image where available.

## 6. Business data acquisition

## 6.1 Preferred sources

- Business owner submission.
- Direct owner interview.
- Formal partnership or supplied dataset with clear rights.
- Public factual information used carefully with a correction route.

## 6.2 Platform-created profiles

Where OurValleys creates a basic record before it is claimed:

- Record the source.
- Use only factual information necessary for discovery.
- Avoid copying descriptive text or images from third-party websites.
- Mark the profile unclaimed.
- Provide correction, removal and claim routes.
- Do not imply endorsement or verification.
- Do not add the public contact to marketing lists automatically.

## 6.3 Founding-business intake

A human-assisted onboarding process can collect:

- Business story.
- Core services.
- Service area.
- Opening hours.
- Contact preferences.
- Common customer questions.
- Images and rights confirmation.
- Accessibility.
- Welsh-language capability.
- Desired website style.
- Future paid-tool interest.

This creates higher-quality examples and tests the automated onboarding questions.

## 7. Editorial content types

## 7.1 Evergreen guide

Examples:

- Town introduction.
- Family day out.
- Local walk.
- Wedding planning.
- Moving to the area.
- Local shopping.
- Home improvement.

Required fields:

- Author.
- Last reviewed date.
- Related places.
- Sources where factual claims need support.
- Commercial disclosure.
- Review owner.

## 7.2 Current guide

Examples:

- What’s on this weekend.
- School-holiday activities.
- Christmas markets.
- Bank-holiday openings.

Must include an expiry or review date.

## 7.3 Community update

Submitted by a verified organisation. Must identify the submitting organisation and must not be presented as independent reporting.

## 7.4 Business update

Published through a business account. Suitable for openings, new services, temporary hours or events. Subject to promotional and content rules.

## 7.5 Editorial news or report

Requires stronger sourcing, fact-checking, correction and complaint procedures. This should be introduced gradually rather than treated as easy filler content.

## 7.6 Sponsored content

Requires:

- Commercial record.
- Clear public label.
- Editorial standards.
- No false independence.
- Start and end dates where campaign-based.

## 8. Content workflow

Suggested states:

- idea
- assigned
- draft
- fact_check
- editorial_review
- scheduled
- published
- correction_required
- archived

Workflow requirements:

- Named owner.
- Due date where time-sensitive.
- Source notes.
- Rights-confirmed media.
- Sponsorship status.
- Related place and category.
- Review or expiry date.

## 9. Content review schedule

### High-change content

Examples: opening hours, event details, current offers.

- Business-managed or automated expiry.
- Prompt owners to confirm periodically.
- Show last updated information.

### Medium-change content

Examples: business services, town facilities, practical guides.

- Review every 6–12 months depending on risk.

### Low-change content

Examples: local history.

- Review on correction or when sources change.

A stale-content job should flag records rather than deleting them automatically.

## 10. Event seeding

Potential sources:

- Direct organiser accounts.
- Community organisations.
- Venues.
- Founding businesses.
- Partnerships with event organisers.
- Public factual event details where reuse is lawful and the source is recorded.

Requirements:

- Confirm date and timezone.
- Capture cancellation status.
- Link to organiser or ticket source.
- Set automatic past-event transition.
- Provide organiser correction route.
- Avoid copying protected descriptions or images without permission.

## 11. Town-page quality threshold

A town page should normally have:

- Accurate introduction.
- At least several useful businesses across more than one category.
- At least one current or recurring content source.
- Nearby place links.
- No misleading claim of comprehensive coverage.

A mature page may later add:

- Current events.
- Guides.
- Offers.
- Jobs.
- Community organisations.
- Marketplace and property modules.

## 12. Welsh-language architecture

## 12.1 Field model

For platform-managed text use separate fields:

- `title_en`
- `title_cy`
- `summary_en`
- `summary_cy`
- `body_en`
- `body_cy`

For user-supplied content, store:

- Original language.
- Optional translated version.
- Translation source.
- Review status.

Do not overwrite the original with an automatic translation.

## 12.2 Interface behaviour

- Remember language preference.
- Allow switching without losing route context.
- Fall back visibly where a translation is unavailable.
- Do not show an empty Welsh page when English content exists; explain the available language respectfully.
- Search aliases should work in both languages where data exists.
- Welsh-speaking service is a business-supplied attribute with clear meaning.

## 12.3 Translation workflow

Levels:

1. Human-authored.
2. Professionally translated.
3. Machine-assisted and human-reviewed.
4. Machine-generated draft not yet reviewed.
5. No translation available.

Only reviewed translations should be treated as final platform copy for legal, safety or important public information.

## 13. Content style

OurValleys should sound:

- Local without being parochial.
- Warm without being overfamiliar.
- Clear and useful.
- Confident but not grandiose.
- Independent and transparent.
- Written in UK English.

Avoid:

- Generic AI phrases.
- Excessive tourism clichés.
- Pretending every listing is exceptional.
- Unsupported superlatives such as “best”.
- Keyword repetition.
- Council-like official language unless quoting an official source.

## 14. Photography and media

Preferred media:

- Real local businesses and places.
- Owner-supplied images with permission.
- Commissioned local photography.
- Clearly licensed images.

Media records should contain:

- Rights basis.
- Credit.
- Alt text.
- Related business or place.
- Capture date where useful.
- Expiry or campaign dates where relevant.

Avoid filling local pages with generic stock imagery that misrepresents the area.

## 15. Content governance

Assign responsibility for:

- Business profile quality.
- Event accuracy.
- Town-page coverage.
- Editorial review.
- Welsh-language quality.
- Media rights.
- Corrections.
- Sponsored-content disclosure.
- Stale-content review.

## 16. Launch content backlog

Create before or alongside engineering:

1. Canonical RCT place list.
2. Category and synonym list.
3. Founding-business interview template.
4. Business content checklist.
5. Town-page template.
6. Event submission template.
7. Evergreen guide template.
8. Sponsorship disclosure text.
9. Business claim and correction wording.
10. English and Welsh core navigation glossary.
11. Accessibility terminology guidance.
12. Initial photography brief.

## 17. Content acceptance criteria

- Every published record has an owner and source.
- Time-sensitive content has a review or expiry mechanism.
- Sponsored content is labelled.
- Business-created and editorial content are distinguishable.
- No public private address leakage.
- Media rights are recorded.
- Core locations have canonical names and aliases.
- Language state is explicit.
- Thin location pages are not mass-indexed.
- Corrections can be requested and recorded.
