# 121. Terms, accessibility, content, complaints and advertising: wording and evidence

Written 18 November 2026. The wording is `src/lib/policy-documents.ts`, shown at `/policies/terms`, `/policies/accessibility`, `/policies/content-guidelines`, `/policies/corrections` and `/policies/advertising`. It replaces the short baseline text those pages carried at launch. It is plain-language wording that describes how the site works. It is not legal advice and has not been reviewed by a solicitor. The privacy policy is covered separately in `docs/120`.

`src/lib/policy-documents.test.ts` ties the statements that name a feature, a route or a number to the code below, so the text fails a test when the product stops matching it.

## 1. Where the wording came from

The owner delegated drafting and approval and pointed at their other sites. The structure of the terms follows the Event Flow terms of use (`event-flow.co.uk/terms`, version 1.2, 3 September 2026; legal hub at `event-flow.co.uk/legal`), published by the same operator, "VEXI (sole trader trading as 'VEXI')". The accessibility, complaints and illegal-content routes follow the shape of that hub. Contact is the form on vexi.co.uk, as in the owner's own privacy policy there.

Deliberately not carried over, because none of it exists on OurValleys: the marketplace and its returns and consumer-sales terms, supplier subscriptions and Stripe payments, the review policy, community discussions and profiles, the 18-plus-only age rule (OurValleys accounts start at 13, matching the privacy policy), and Event Flow's separate mailboxes (OurValleys has no mailbox of its own, so none is named).

## 2. Evidence for each statement

| Statement                                                                                                   | Where it is true                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts accept the terms at registration, with a link                                                      | `src/components/auth/register-form.tsx` (the terms checkbox links to `/policies/terms`)                                                      |
| Two-step sign-in is available in account settings                                                           | `src/components/account/two-factor-panel.tsx`, `src/app/account/settings/page.tsx`                                                           |
| A report control exists on listings, events, offers and updates; a report does not change content by itself | `src/app/report/` (`content-report-form.tsx`); reports create reviewable records                                                             |
| An account can be deleted from the privacy page; a deleted business is removed after a recovery period      | `src/app/account/privacy/page.tsx`; `deletionRecoveryDays` in `src/modules/businesses/lifecycle-automation.ts`, stated in the privacy policy |
| A business website is built from structured fields, with no scripts or raw HTML                             | the product constraint in `AGENTS.md`; the website studio takes structured fields only                                                       |
| "Verified" is a label about specific checks, and payment never buys it                                      | `verificationSummaryStatus` on the business record; `docs/00-product-charter.md`                                                             |
| Sponsored content is labelled; a story can carry a sponsorship disclosure                                   | `sponsorship_disclosure` on stories; `src/modules/stories/`                                                                                  |
| Enquiries are passed to the business, which then handles them                                               | `src/modules/businesses/contacts-and-enquiries.ts`; `docs/120` §1                                                                            |
| No payment, marketplace or public reviews or forum are offered                                              | no `src/modules/payments/` code exists; reviews are behind `src/lib/reviews-flag.ts`; the terms name none                                    |
| Some listings are fictional demonstrations and labelled                                                     | "Fictional demo" labels on the home page, directory and business page (`docs/119` §9)                                                        |
| News headlines are the publishers' and shown with attribution                                               | the external news feed (`docs/33`)                                                                                                           |
| Accessibility: automated checks run on key pages with every change                                          | `@axe-core/playwright` in the browser specs (`tests/e2e`, for example `account-extra-sections.spec.ts`), run in CI                           |
| Accessibility: reduced motion, display settings, keyboard map                                               | `prefers-reduced-motion` in the stylesheets; `src/app/display/`; `tests/e2e/valleys-map.spec.ts`                                             |
| Accessibility: no independent audit yet                                                                     | true; none has been commissioned                                                                                                             |
| England and Wales law; Consumer Rights Act 2015; liability not limited where the law forbids it             | the owner's Event Flow terms use the same; the cap applies to business use only, which keeps the consumer position clear                     |

## 3. Commitments the wording makes (so the owner can keep them)

- Reply to a contact-form message within 10 working days; accessibility reports within 5 working days; acknowledge a complaint within 5 working days and reply fully within 20 working days. These are aims, worded as aims, and all arrive through the vexi.co.uk form.
- Keep the contact route in step: if a dedicated address (for example `privacy@ourvalleys.co.uk`) is set up, change `CONTACT` in `src/lib/policy-documents.ts` and the two sentences in `src/lib/privacy-policy.ts`, and the test that checks them.
- Tell account holders about important changes to the terms (the terms say so; there is no automated notice, so it is an editorial duty).

## 4. What is still open

1. A solicitor's review of the terms and the other policies, which the owner chose to forgo for now.
2. A fluent Welsh speaker's translation; the pages carry an English-only note for Welsh readers.
3. An independent accessibility audit, which the statement says has not happened.
4. The Information Commissioner's Office fee or registration, which does not change this wording (`docs/120` §2).

## 5. Maintenance

When a feature goes live that the terms say is not available (payments, a marketplace, reviews, a forum, paid placement), the tests named above fail. Update the terms, the advertising policy and this record in the same change, and ask for fresh legal review first: those are the features that create most of the legal risk.
