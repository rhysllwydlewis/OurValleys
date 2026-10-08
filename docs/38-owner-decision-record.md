# Owner decision record: approval-gated and unresolved items

Written 8 October 2026 for issue #358. Every statement here was checked against the code or documents named beside it. The only code change that accompanies it is a wording correction to the deletion notice (section 2). Each section separates what engineering will do without waiting from the decision that is the owner's.

The product owner decides these items. Engineering has prepared everything that can be prepared without the decision.

## 1. Billing, plan management and custom domains

**Why it is gated.** It needs money (a payment provider and its fees), a paid contract, and a domain purchase or transfer for custom domains. `AGENTS.md` lists each of these as a genuine approval gate.

**What exists today.**

- A permanent free entitlement. `business_entitlement` stores a plan key (`free` or `custom`), capabilities and limits; the free defaults are in `src/modules/businesses/entitlements.ts` and are shown to owners on the operations page ("Permanent free entitlement"). The page states the free core is active "without billing, pricing or an unapproved paid plan".
- `docs/32` §17.3 lists the candidate future paid features: removing the "Powered by Our Valleys" footer, a custom domain, larger media and document allowance, multiple locations, extra team members and advanced permissions, advanced analytics, booking or marketing integrations, and advanced templates. §17.2 says the exact paid model is "intentionally deferred".
- No payment code, price list, checkout, invoice, subscription state or domain-connection flow exists, and none is planned until the owner decides.

**Recommendation.** Do not build billing or custom domains before public launch. Launch on the free entitlement, collect real usage, then choose a paid model from evidence. Keep the entitlement table as the single place paid limits would later live.

**Smallest decision needed, when the owner wants to start.** Choose one of: (a) stay free-only for launch and revisit after N months of use; (b) name the first paid feature (the least risky is removing the footer, because it needs no domain handling) and approve opening a payment-provider account. A custom domain should be a separate later decision because it adds domain purchase or transfer, certificate handling and an abuse surface.

## 2. Owner-requested deletion, and the background worker

**Correction first.** Issue #358 and the first version of this record said automated hard deletion was not built. That was wrong. It is built, but it is not running in production, for the reason in the next paragraph.

**The worker is not deployed.** Hard deletion lives in `runLifecycleAutomation`, which only the separate worker process runs (`pnpm worker`, `src/jobs/worker.ts`, every 15 minutes). `docs/23` says the worker needs its own Railway service with the start command `pnpm worker`. The production Railway project has two services, `Postgres` and `OurValleys`; the committed `railway.json` starts only `pnpm start` (`next start`), and nothing in the web process starts pg-boss. So in production today no deletion happens, and neither do the other worker jobs: reminder and nudge emails, automatic publication, the annual trading confirmation, inactivity unpublishing, enquiry and platform retention, and saved-event reminders. The production service also has no variable names for email (Resend) or file storage (R2), so those paths are unavailable there regardless. (Checked on 8 October 2026 from the Railway service configuration and variable names only; values were not read.)

**What the code does when the worker runs.** An owner with lifecycle permission requests deletion. The business moves to `deletion_pending`, is hidden, and `delete_after` is set thirty days ahead (`deletionRecoveryDays`). The owner can cancel before then. Seven days before, the worker emails the owners. After `delete_after` it deletes the `business` row; all 28 foreign keys to `business` cascade, so profile, content, enquiries, media records and memberships go with it. Dormancy deletion (after 24 months unpublished, `docs/32` §14) is not built.

**Defects found by review and confirmed in the code** (each is a reason not to start the worker until fixed, and each is engineering work that needs no owner decision):

1. _The seven-day warning can silently fail._ `sendCriticalLifecycleEmail` uses `Promise.allSettled`, so a rejected send is swallowed, `deletion_warning_sent_at` is still set, and the business is deleted on schedule with no warning delivered and no retry.
2. _Nothing enforces that the warning window elapsed._ The delete step runs whenever `delete_after` has passed, regardless of whether the warning was ever sent.
3. _Stored files survive._ The business row is deleted without calling the storage delete, and the cascade removes the `business_media` and `business_document` rows that held the object keys, so the files stay reachable at their unguessable URLs with nothing left that knows their names.
4. _The audit entry is best-effort._ `recordAdminAudit` swallows insert failures, and the call is skipped when no active owner is found, after the deletion has already committed.
5. _No restore has been rehearsed._

**Recommendation.**

1. Engineering fixes 1 to 4 in one pull request before the worker is deployed: mark the warning sent only after a successful send and require a delivered warning (and the full window) before the final delete; write the storage keys to a durable cleanup queue in the same transaction as the delete, and write the audit row in that transaction; drain the queue in the worker (section 4).
2. Keep dormancy deletion unbuilt for launch.
3. Rehearse one restore of a deleted business from a backup and record the result before launch.

**Decision needed from the owner (bounded).** Approve adding a Railway service for the worker (it runs `pnpm worker`, exposes no port and shares the web service's database and email variables). That is a production change with a small running cost, so it is yours to approve. Without it, none of the lifecycle features above work in production. Separately, confirm the retention rule in one sentence (for example "hard-delete thirty days after a pending deletion is not cancelled, once the restore rehearsal has passed"), or that the final delete stays switched off until after launch.

## 3. Reviews: documents and code disagree

**The facts.**

- `docs/32` §11.4: "Do not build public customer reviews into the initial product. Reviews are a separate future product decision with substantial moderation, verification, fairness and legal implications." §2.3 repeats that the product is not a public reviews platform in the first release.
- `AGENTS.md` lists reviews among the capabilities that "remain deferred until their release gates are met".
- The code has resident reviews: `src/modules/businesses/reviews.ts` (one 1 to 5 star review with optional text per resident per business, edits replace the earlier review), review submission actions and display on the public business page (`src/app/b/[businessSlug]/`), a rating tag, owner responses on the operations page, admin moderation at `/admin/reviews`, review reports in `src/modules/moderation/content-reports.ts`, and inclusion in the account data export.
- Before launch, `OURVALLEYS_RELEASE_STAGE` is `development` or `private_pilot`, which only stops search engines indexing pages (`src/lib/release-stage.ts`). It does not require sign-in: anyone with a business URL can read its reviews, and reviews are not gated by that setting.
- Reviews are not verified: any signed-in resident (the public demo accounts are refused) can review any business, and nothing stops a business owner or team member reviewing their own business.

**Why this matters.** The brief names moderation, verification, fairness and legal implications as the reasons to defer. The moderation tooling exists; verification and the legal review do not.

**Options.**

1. _Keep, and update the documents._ Treat reviews as a built feature, amend `docs/32` §11.4 and `AGENTS.md`, and add a launch-gate item: legal and moderation sign-off, plus a rule against reviewing a business you own or manage.
2. _Gate until launch._ Hide review submission and display unless the release stage is `public` and a review flag is on, so the product matches the documents until the gate is met. This is a small change in the public business page and review actions.
3. _Remove._ Delete the feature. Not recommended: the moderation work is done and the data model is simple.

**What engineering did without waiting.** `AGENTS.md` already says reviews stay deferred until their release gates are met. `noindex` before launch hides pages from search engines only; anyone with a URL could read reviews and any signed-in resident could post one. Reviews are now behind an explicit switch, `OURVALLEYS_REVIEWS_ENABLED`, that is off by default in every release stage, including `public` (`src/lib/reviews-flag.ts`). While it is off, the public page shows no reviews or ratings (including the listing tags and the structured-data rating), review submission and deletion are refused, and the owner's reviews section and response actions are unavailable. Existing review rows are kept and moderators can still reach them in the admin area. It is reversible and touches no authorisation code.

**Decision needed from the owner, later.** Whether and when to enable reviews at launch, and under which rules (option 1: keep and update the documents, with legal and moderation sign-off and a rule against reviewing a business you own or manage; or option 3: remove). Until you decide, reviews stay switched off; enabling them is one environment variable.

## 4. Media storage cleanup

**The facts.** When a picture is removed or replaced, the database row is retired first and the storage object is deleted best-effort. If the delete fails the object stays reachable at its unguessable URL and nothing retries. This applies to gallery, hero, logo, menu documents and the offer and event pictures added in #361, and to every file belonging to a business removed by the deletion above. Pictures are as public as gallery images once uploaded.

**Design.** A "deleted at" marker on `business_media` is not enough: deleting a business cascades its media rows away before any sweep could read them. Use a small durable cleanup queue (storage key, queued at, deleted at) written in the same transaction as the change that orphans the object, and drained by a worker job and opportunistically on the web side. It is a small additive migration.

**This is engineering work, not an owner decision.** It retries the deletion of files users already removed, and `AGENTS.md` reserves approval gates for genuine external gates. It will be built and tested in its own pull request, after or together with the deletion fixes. It does need the worker deployed to drain the queue on a schedule.

## 5. Other findings that need an owner action

- **Production smoke workflow reports "skipped" on every deployment** (issue #358). Its condition expects a `deployment_status` event for an environment named `production` on `main`, and the Railway events do not appear to satisfy it, so it is not verifying deployments. The workflow file is on the sensitive-paths list, so a change needs an owner decision. Engineering verifies each deploy by hand until then (deployment status plus live page checks).
- **Owner-controlled launch actions** are listed in `docs/34`: verify the production origin, configure the Resend sender domain and R2 production variables, remove the fictional privileged identities, complete administrator MFA readiness, finish policy, privacy, accessibility, safety and legal review, and approve public launch.

## Decisions to record here

| Item                                                              | Decision | Date |
| ----------------------------------------------------------------- | -------- | ---- |
| Billing and plan management                                       |          |      |
| Custom domains                                                    |          |      |
| Deploy the worker service (production change, small running cost) |          |      |
| Deletion retention rule and restore rehearsal                     |          |      |
| Dormancy deletion                                                 |          |      |
| Reviews at launch (keep and update documents, or remove)          |          |      |
