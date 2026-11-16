# 120. Privacy policy: wording, evidence and what the owner must supply

Written 16 November 2026. The wording is `src/lib/privacy-policy.ts`, shown at `/policies/privacy`. It replaces the five-paragraph baseline. It is a factual description of what the application does, written for the owner to review. It is not legal advice, and `POLICIES_APPROVED` stays the owner's decision (`docs/119` §3).

`src/lib/privacy-policy.test.ts` ties the figures and names in the text to the constants and files below, so a change to the code that makes the policy untrue fails a test instead of going unnoticed.

## 1. Evidence for each statement

| Statement in the policy                                                                                                | Where it is true                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name, email, hashed password, two-step settings are kept                                                               | `src/lib/database/schema/auth.ts` (`auth_user`, `auth_account`, `two_factor`); Better Auth stores a hash                                                 |
| Saved businesses, places, events, searches, notice choices, reports filed, suggestions                                 | `src/app/account/privacy/page.tsx` ("What we hold about you")                                                                                            |
| Enquiry name, contact details and message are passed to the business                                                   | `src/modules/businesses/contacts-and-enquiries.ts`                                                                                                       |
| Sign-in sessions record time, IP address and browser details                                                           | `auth_session.ip_address`, `auth_session.user_agent`                                                                                                     |
| Visit counts keep a one-way hash of IP address and browser details, no raw IP, no account link                         | `hashVisitorSignal` in `src/modules/businesses/analytics.ts`; `src/app/api/content-view/route.ts`; no user id is passed to `recordContentView`           |
| Guide and news story views are counted                                                                                 | `src/app/api/editorial-view/route.ts`                                                                                                                    |
| Words of searches that found nothing are kept with filters and time, no account                                        | `search_zero_result` (`query_text`, `category_slug`, `place_slug`, `filter_count`, `occurred_at`)                                                        |
| Postmark opens are tracked, clicks are not                                                                             | `POSTMARK_TRACK_OPENS = true`, `POSTMARK_TRACK_LINKS = "None"` in `src/lib/email.ts`                                                                     |
| Cookies: sign-in, `ov-locale`, `ov-locale-ui`, `ov-display`, each up to a year, set on a choice; none on a first visit | `src/lib/i18n/config.ts`, `src/lib/display/preferences.ts`; a first request to production returns no `Set-Cookie` header (checked 16 Nov 2026)           |
| `ov-recent-searches` in local storage, `ov-nav-from` in session storage, reduced to a broad label                      | `src/components/search/recent-searches.tsx`, `src/components/navigation-source.tsx`, `src/modules/businesses/traffic-source.ts`                          |
| Location is used only in the browser                                                                                   | `near-me-button.tsx`, `near-you.tsx`, `valleys-map.tsx` call `getCurrentPosition` and match local place centres; no request carries coordinates          |
| Railway hosts the service in the United States                                                                         | Railway deployments show region `us-west2`                                                                                                               |
| Retention periods                                                                                                      | `src/modules/platform/data-retention.ts`, `contacts-and-enquiries.ts`, `notification-model.ts`, `editorial-insights-model.ts`, `lifecycle-automation.ts` |
| Account deletion, a sole owner must add another owner first, the terms-acceptance record is kept                       | `deleteUser.beforeDelete` in `src/lib/auth.ts`; `tests/integration/account-closure.test.ts`                                                              |
| Download a copy of your data                                                                                           | `src/modules/identity/data-export.ts`                                                                                                                    |
| No advertising or cross-site tracking cookies; no sale of personal data                                                | No such code exists. The second is a commitment the owner is making by approving the text.                                                               |

## 2. What only the owner can supply

None of these can be established from the code, so none is invented. The policy is not ready for `POLICIES_APPROVED` until they are settled and the page says so.

1. **Who the controller is.** The legal name of the person or company responsible for the data, and whether it is registered with the Information Commissioner's Office. The page does not name one.
2. **A contact route for privacy requests.** The site publishes no contact address or form for this, so the page cannot tell a reader how to exercise their rights other than through the account privacy page and a complaint to the Information Commissioner's Office.
3. **The lawful basis for each purpose** (accounts, enquiries, security records, visit counts, email), which is a legal judgement.
4. **The safeguard for data held outside the UK.** Railway runs in the United States and Postmark and Cloudflare operate outside the UK. The page says so but names no mechanism.
5. **Whether children use the site**, and what follows (`docs/07` §5).
6. **A Welsh version**, reviewed by a fluent speaker. The page carries a note that policy wording is English only.

## 3. Statements that depend on other decisions

- **Cloudflare analytics.** The policy says Cloudflare "may also give us aggregate figures on visits and performance". Cloudflare Web Analytics is injected at the edge today (`docs/119` §7). If the owner switches it off in the Cloudflare dashboard, delete that sentence. Cloudflare's own pages do not say whether it uses cookies, so the policy makes no claim either way.
- **Uploaded pictures.** The providers section says Cloudflare "holds the pictures businesses upload". That becomes true when R2 is enabled, which public release requires (`docs/119` §1, gap 1). Until then pictures cannot be uploaded in production.
- **Postmark open tracking.** The sentence is true while `POSTMARK_TRACK_OPENS` is `true`. The test fails if that changes.

## 4. Maintenance

Add a section, and a test line, whenever the site starts collecting something new: a cookie, a third-party script, a new analytics event, a longer retention period or a new provider.
