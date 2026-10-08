# Owner decision record: approval-gated and unresolved items

Written 8 October 2026 for issue #358. Every statement here was checked against the code or documents named beside it. The only code change that accompanies it is a wording correction to the deletion notice (section 2). Each section ends with a recommendation and the smallest decision that unblocks the work.

The product owner decides these items. Engineering has prepared everything that can be prepared without the decision.

## 1. Billing, plan management and custom domains

**Why it is gated.** It needs money (a payment provider and its fees), a paid contract, and a domain purchase or transfer for custom domains. `AGENTS.md` lists each of these as a genuine approval gate.

**What exists today.**

- A permanent free entitlement. `business_entitlement` stores a plan key (`free` or `custom`), capabilities and limits; the free defaults are in `src/modules/businesses/entitlements.ts` and are shown to owners on the operations page ("Permanent free entitlement"). The page states the free core is active "without billing, pricing or an unapproved paid plan".
- `docs/32` §17.3 lists the candidate future paid features: removing the "Powered by Our Valleys" footer, a custom domain, larger media and document allowance, multiple locations, extra team members and advanced permissions, advanced analytics, booking or marketing integrations, and advanced templates. §17.2 says the exact paid model is "intentionally deferred".
- No payment code, price list, checkout, invoice, subscription state or domain-connection flow exists, and none is planned until the owner decides.

**Recommendation.** Do not build billing or custom domains before public launch. Launch on the free entitlement, collect real usage, then choose a paid model from evidence. Keep the entitlement table as the single place paid limits would later live.

**Smallest decision needed, when the owner wants to start.** Choose one of: (a) stay free-only for launch and revisit after N months of use; (b) name the first paid feature (the least risky is removing the footer, because it needs no domain handling) and approve opening a payment-provider account. A custom domain should be a separate later decision because it adds domain purchase or transfer, certificate handling and an abuse surface.

## 2. Automated hard deletion

**Correction first.** Issue #358 and the first version of this record said automated hard deletion was not built. That was wrong. Owner-requested deletion is built and runs: the background worker runs `runLifecycleAutomation` every 15 minutes (`src/jobs/worker.ts`), and for a business in `deletion_pending` whose `delete_after` has passed it deletes the business row and records an audit entry (`src/modules/businesses/lifecycle-automation.ts`). All 28 foreign keys that point at `business` cascade, so its profile, content, enquiries, media records and memberships go with it. The operations page and its Welsh version said "No automated hard deletion is activated", which was misleading; this pull request corrects that wording.

**What exists today.**

- An owner with lifecycle permission can request deletion. The business moves to `deletion_pending`, is hidden, and `delete_after` is set thirty days ahead (`deletionRecoveryDays`). The owner can cancel any time before then, and a warning email is sent seven days before. `docs/32` §14 and the risk table describe a grace period and warnings, and this matches.
- After `delete_after` the deletion is permanent. The only recovery is a database backup restore; no restore has been rehearsed.
- Stored files (gallery, logo, hero, offer and event pictures, menu documents) are not removed: the rows go, the objects stay in R2 at their unguessable URLs (see section 4).
- **Dormancy deletion is not built.** `docs/32` §14 and the risk table say inactive businesses should only be deleted after at least 24 months of being unpublished, with reminders and a final warning. The automation can unpublish for inactivity but never deletes for it.
- Account deletion is a separate flow (the "Delete account" panel in account settings) and is not changed here.

**Why it is gated.** `AGENTS.md` treats an irreversible destructive action without a tested recovery path as a genuine approval gate. Owner-confirmed deletion already runs without a rehearsed restore, so that gap exists today; dormancy deletion would widen it to businesses whose owner never asked.

**Recommendation.**

1. Keep dormancy deletion unbuilt for launch. A hidden business costs little.
2. Before launch, rehearse one restore of a deleted business from a backup and write down the result, or switch owner-requested deletion to soft (keep the row hidden, skip the final delete) until that is done.
3. Remove stored files with the business through the sweep in section 4, so a deleted business leaves no public files.

**Smallest decision needed.** Choose: (a) keep the thirty-day automatic deletion and approve a restore rehearsal before launch; or (b) pause the final delete step until after launch. Dormancy deletion needs its own later decision with a retention rule.

## 3. Reviews: documents and code disagree

**The facts.**

- `docs/32` §11.4: "Do not build public customer reviews into the initial product. Reviews are a separate future product decision with substantial moderation, verification, fairness and legal implications." §2.3 repeats that the product is not a public reviews platform in the first release.
- `AGENTS.md` lists reviews among the capabilities that "remain deferred until their release gates are met".
- The code has resident reviews: `src/modules/businesses/reviews.ts` (one 1 to 5 star review with optional text per resident per business, edits replace the earlier review), review submission actions and display on the public business page (`src/app/b/[businessSlug]/`), a rating tag, owner responses on the operations page, admin moderation at `/admin/reviews`, review reports in `src/modules/moderation/content-reports.ts`, and inclusion in the account data export.
- The site is not public yet. `OURVALLEYS_RELEASE_STAGE` is `development` or `private_pilot` until launch is approved, and pages are not indexed before then (`src/lib/release-stage.ts`). Reviews are not gated by that setting.
- Reviews are not verified: any signed-in resident (the public demo accounts are refused) can review any business, and nothing stops a business owner or team member reviewing their own business.

**Why this matters.** The brief names moderation, verification, fairness and legal implications as the reasons to defer. The moderation tooling exists; verification and the legal review do not.

**Options.**

1. _Keep, and update the documents._ Treat reviews as a built feature, amend `docs/32` §11.4 and `AGENTS.md`, and add a launch-gate item: legal and moderation sign-off, plus a rule against reviewing a business you own or manage.
2. _Gate until launch._ Hide review submission and display unless the release stage is `public` and a review flag is on, so the product matches the documents until the gate is met. This is a small change in the public business page and review actions.
3. _Remove._ Delete the feature. Not recommended: the moderation work is done and the data model is simple.

**Recommendation.** Option 2 now, then option 1 when the legal review is complete. It matches the written decision with the least loss. Changing `AGENTS.md` is the owner's call, so the documents are not edited in this record.

**Smallest decision needed.** Pick option 1, 2 or 3. If 2, engineering will build the gate in the next slice; it touches no authorisation code.

## 4. Media storage sweep

**The facts.** When a picture is removed or replaced, the database row is retired first and the storage object is deleted best-effort. If the delete fails the object stays reachable at its unguessable URL and nothing retries. This applies to gallery, hero, logo and the offer and event pictures added in #361. Pictures are as public as gallery images once uploaded.

**Recommendation.** One scheduled sweep that deletes the objects of retired media rows (and later of hard-deleted businesses), instead of retry code in each feature. It needs a "deleted at" marker on `business_media`, so it is a small additive migration. It is also a prerequisite for hard deletion (section 2).

**Smallest decision needed.** Approve building it as its own pull request.

## 5. Other findings that need an owner action

- **Production smoke workflow reports "skipped" on every deployment** (issue #358). Its condition expects a `deployment_status` event for an environment named `production` on `main`, and the Railway events do not appear to satisfy it, so it is not verifying deployments. The workflow file is on the sensitive-paths list, so a change needs an owner decision. Engineering verifies each deploy by hand until then (deployment status plus live page checks).
- **Owner-controlled launch actions** are listed in `docs/34`: verify the production origin, configure the Resend sender domain and R2 production variables, remove the fictional privileged identities, complete administrator MFA readiness, finish policy, privacy, accessibility, safety and legal review, and approve public launch.

## Decisions to record here

| Item                                                                              | Decision | Date |
| --------------------------------------------------------------------------------- | -------- | ---- |
| Billing and plan management                                                       |          |      |
| Custom domains                                                                    |          |      |
| Owner-requested deletion (keep and rehearse a restore, or pause the final delete) |          |      |
| Dormancy deletion                                                                 |          |      |
| Reviews (option 1, 2 or 3)                                                        |          |      |
| Media storage sweep                                                               |          |      |
