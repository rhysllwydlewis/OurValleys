# 119. Public release: gap analysis and runbook

Written 16 November 2026 against production at `main` commit `7810005` (Railway project `OurValleys`, services `OurValleys`, `OurValleys-worker`, `Postgres`). It extends `docs/34` §2, §6 and §9 and `docs/30`. Nothing here weakens the release gate: `OURVALLEYS_RELEASE_STAGE=public` still fails closed without every item in `docs/34` §2.

Production today is stage `development`: global `noindex`, `robots.txt` blocks all, empty sitemap, and `/api/health` and `/api/ready` return 200. Evidence was read from the live site, the Railway service configuration (variable names only), deploy logs and the Postmark and Cloudflare APIs.

## 1. Gap analysis

| #   | Area               | State on 16 Nov 2026                                                                                                                                                                                                                                                                                                                                                                                                            | Who closes it                                                |
| --- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Cloudflare R2      | **Open.** No `R2_*` variable on either Railway service. The Cloudflare account the tooling sees answers `R2 not enabled` (code 10042), so no bucket exists there. The worker also needs the same `R2_*` variables, or the stored-file clean-up queue cannot delete anything.                                                                                                                                                    | Owner: enable R2 (needs a payment method on the account)     |
| 2   | Postmark           | **Mostly done.** `ourvalleys.co.uk` is verified in Postmark (SPF, DKIM and return path). `POSTMARK_API_KEY` and `EMAIL_FROM` are set on both services. Not proven: that `EMAIL_FROM` is on that domain, and that a real email was delivered (no send is recorded in the logs).                                                                                                                                                  | Owner: approve one test send (section 4, step 2)             |
| 3   | Administrator      | **Partly done.** Every deploy logs "The ADMIN_EMAIL account is already the administrator", which the script prints only when the account exists, has a verified email and holds the role. Two-step enrolment cannot be read from outside the application.                                                                                                                                                                       | Owner: confirm enrolment, then `ADMIN_MFA_READY` (section 3) |
| 4   | Demo identities    | **Open.** `demo.owner@` and `demo.admin@` are re-provisioned on every deploy (log: "Provisioned intentionally public development viewer, single-business owner and admin demos"). A tool now removes them and keeps evidence (section 2.3).                                                                                                                                                                                     | Engineering built it; the owner approves running it          |
| 5   | Policies           | **Open.** Privacy, terms, accessibility, content, corrections and advertising exist in English only and are baseline wording. The privacy policy now states email open tracking (section 2.2). It still says nothing about service providers, cookies and local storage, or retention beyond business suggestions, and names no contact. `POLICIES_APPROVED` is the owner's decision.                                           | Owner (and specialist advice where wanted)                   |
| 6   | Content            | **Open, and the largest gap.** The directory holds one business, the labelled, noindexed, never-sitemapped fictional "Cwm & Coil Heating". 7 council areas and 54 places exist as reference data. The project's own bar (`docs/35`, "Launch threshold proposal") is 75 to 100 useful profiles, 30 confirmed events and 15 to 20 guides before broad promotion; `docs/08` says OurValleys "cannot launch as an empty framework". | Owner decision (section 5)                                   |
| 7   | Indexing mechanics | **One defect found and fixed** (section 2.1). The rest checks out (section 6).                                                                                                                                                                                                                                                                                                                                                  | Engineering                                                  |
| 8   | Welsh review       | **Open.** About 3,800 Welsh strings are first drafts (a rough count; about 800 are in files that face visitors, with `cy.ts` holding 1,589 more of mixed use). Policies are English only, with a note saying so. Welsh is chosen with the language switch, not by URL (`/cy` is a 404), so search engines will see English only; `docs/57` lists a `/cy` route with `hreflang` among the work not built.                        | Owner: a fluent reviewer                                     |
| 9   | Report-only CSP    | **Reviewed** (section 7). One real source is blocked on every page; nothing else found. Not a launch gate.                                                                                                                                                                                                                                                                                                                      | Owner decision on the analytics beacon                       |

Other findings from the same pass:

- Public registration is already open in production (email is configured), at the `noindex` stage. Any real sign-ups since then are real data and are untouched by anything here.
- The web service carries `TEST_DATABASE_URL` and `DATABASE_PUBLIC_URL` as well as the production database variables. A production service should not hold a test database address; remove it after confirming nothing reads it. Values were not read.
- `/events` and `/guides` each took longer than 25 seconds on one cold request and answered in under a second on repeats. Worth watching before crawlers arrive.
- `OURVALLEYS_DEMO_CODE` (from the follow-on to PR #712) only hides the demo logins. After release only the read-only viewer remains, so the code reveals just that one.

## 2. Work done in this change

### 2.1 Sign-in page was indexable at public release

`robots.txt` matches by prefix, and the list held `/login/` but not `/login`. The global `X-Robots-Tag: noindex` header is dropped at public release, and `/login` had no `robots` metadata, so the sign-in page would have been crawlable and indexable. Fixed three ways: `/login`, `/dashboard`, `/claim`, `/invitations` and `/unsubscribe` are now listed bare as well as with a slash (`src/lib/site.ts`); the sign-in page sets `noindex, nofollow` itself; and a test (`src/app/robots.test.ts`) checks that every signed-in route, bare and nested, is blocked, which fails against the old list.

### 2.2 Privacy policy: email open tracking

`docs/30` required this before public release. Every Postmark message is sent with `TrackOpens: true` and `TrackLinks: "None"` (`src/lib/email.ts`), and the Postmark server setting is off, so the per-message flag is what applies. The privacy policy has a new "Email" section saying so. The wording is a draft for the owner's approval with the rest of the policies.

### 2.3 Removing the two privileged demo identities

`pnpm auth:retire-demos` is a dry run: it prints, for `demo.owner@ourvalleys.example` and `demo.admin@ourvalleys.example`, the user id, role, creation time and the number of sessions, credentials and business memberships. `pnpm auth:retire-demos --confirm` deletes both in one transaction, re-checks that nothing remains, and writes the same evidence to `admin_audit_log` (action `release.privileged_demos_retired`) in the same transaction. Deleting the user row removes sessions, credentials and memberships; records that only note who acted keep their content and lose the link to the person. It cannot touch any other account, never touches the viewer, and refuses to run if `ADMIN_EMAIL` names one of the two. It is safe to repeat. Tests: `tests/integration/retire-privileged-demo-accounts.test.ts` (fixture accounts, so the real demo accounts used by browser tests are never touched).

Rehearsed against a local copy of production's state: with the public stage set and the two identities present, `pnpm deploy:prepare` stopped at demo provisioning with "Public release is blocked because privileged demo accounts still exist"; after `--confirm` the same command completed and left only the viewer.

## 3. Owner-only decisions

These are not assumed. Each has a recommendation.

1. **`POLICIES_APPROVED`.** Review `/policies` in full. Recommendation: approve only after the privacy policy also names the service providers (Railway, Postmark, Cloudflare), describes cookies and local storage, gives a retention statement and a contact route. Draft wording can be prepared on request.
2. **`ADMIN_MFA_READY`.** Sign in as the `ADMIN_EMAIL` account, open `/account/settings#two-step` and enrol. Set the flag only after `/admin` opens without the setup prompt.
3. **Approval to launch**, including the content decision in section 5.

## 4. Release sequence

Preparation that does not touch production behaviour, in any order:

1. Enable R2 in Cloudflare, create a bucket, create an access key restricted to that bucket, and give the bucket a public hostname on the `ourvalleys.co.uk` zone (for example `media.ourvalleys.co.uk`). Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` and `R2_PUBLIC_BASE_URL` on **both** the web and worker services. `next.config.ts` reads `R2_PUBLIC_BASE_URL` at build time, so a rebuild follows. Then upload a picture in a business dashboard, confirm it renders from the media hostname, and remove it (the clean-up queue deletes the object).
2. One test email: trigger a password reset for the owner's own address on the live site (the owner's action), or approve a send to a named address. Check it arrives, the sender shows `ourvalleys.co.uk`, and Postmark records the delivery.
3. Merge this change so the fixes and the removal tool are on `main` and deployed.

Release window (freeze merges to `main` for the duration):

1. On the web service set `OURVALLEYS_RELEASE_STAGE=public`, `PRIVILEGED_DEMOS_REMOVED=true`, `POLICIES_APPROVED=true`, `ADMIN_MFA_READY=true`, and apply them with the R2 variables **without deploying yet**. A deploy that lands now cannot succeed while the demo identities exist: it fails closed and the running deployment stays up.
2. From a Railway shell on the web service (so the database address is never copied), run `pnpm auth:retire-demos`, read the report, then `pnpm auth:retire-demos --confirm`. Keep the printed report with the release record. Run the dry run again; it must report both identities absent.
3. Deploy the web service once. `deploy:prepare` validates every gate, provisions only the viewer, and starts. The build bakes in the absence of the `noindex` header, which is why a redeploy is required (`docs/34` §6).
4. Deploy the worker (same stage variables are not required; it needs the R2 variables from preparation step 1).
5. Purge the Cloudflare cache for `/robots.txt` and `/sitemap.xml`. `robots.txt` is served with `max-age=14400`, so without a purge the old "disallow all" can persist for up to four hours at the edge.

## 5. The content decision

Release with one fictional business is possible but is not what the project's own documents describe. The options:

- **A. Hold the public stage until the launch threshold is met** (recommended). Keep the site as it is, work through the founding-business pack (`docs/114`, `docs/35`), and release when there are enough real businesses that a visitor's first search finds something. Costs time; avoids a public site that looks empty and a thin first impression in search.
- **B. Release at a lower bar the owner names** (for example, the Rhondda Fawr cluster with a stated minimum of real profiles, events and guides). The sitemap only lists real, published, non-demo businesses and place pages with real coverage, so an under-populated launch will not mass-index thin pages, but the directory itself would still look sparse.
- **C. Release now with a clear "founding businesses wanted" front door.** Fastest, but the first indexed impression is an almost empty directory.

Decision needed: A, B (with the minimum), or C.

## 6. Verification after release

- `/api/health` returns 200 and `/api/ready` returns `{"status":"ready","database":"reachable","authentication":"configured"}`.
- `/robots.txt` is no longer `Disallow: /`; it allows `/`, lists the protected families (including `/login`, `/dashboard`, `/account`, `/admin`), and names `/sitemap.xml`.
- `/sitemap.xml` lists the home page, the directory, the map, the policies, covered places, guides and stories, and no URL containing `cwm-coil-heating`.
- Public pages carry no `X-Robots-Tag` header; `/login`, `/account` and `/admin` still render `noindex` in their page metadata. `Strict-Transport-Security`, `X-Frame-Options: DENY` and the report-only CSP are still present on both.
- Sign-in works for the administrator (and asks for the two-step code); the demo owner and admin logins are rejected; the viewer still signs in and sees the read-only dashboard.
- Submit an enquiry on a real published business and confirm the owner's email arrives.
- `/api/csp-report` still logs (section 7).
- The Production smoke workflow's "skipped" status is a known issue held for the owner (`docs/38` §5); verify by hand.

## 7. The report-only Content-Security-Policy

Checked two ways. A real browser opened the public pages and the sign-in page and recorded every violation. The deploy logs hold the reports real visitors' browsers sent (`event: csp_violation`; the fields are structured, so a plain-text log search finds none and looks falsely clean; filter on `@event:csp_violation`).

- **`https://static.cloudflareinsights.com` (script, every page).** Cloudflare's Web Analytics beacon is injected at the edge by the Cloudflare proxy. The policy would block it if enforced, and it is a third-party analytics script that the privacy policy does not mention. Decision for the owner: keep it (add that script host to `script-src` and `cloudflareinsights.com` to `connect-src`, and disclose it in the privacy policy) or switch Web Analytics off in the Cloudflare dashboard.
- **`eval` under `script-src` (six reports in 12 days: the home page, `/admin/guides`, one dashboard page).** Source not identified, and rare enough (none since 16 Nov 14:50) that a browser extension is possible but unproven. An enforced policy would need `'unsafe-eval'` unless it is traced. Not worth enforcing for launch.
- Nothing else was reported, including from map, image and font loading.

Recommendation: leave the policy report-only for launch; enforcing it is separate work (it needs per-request nonces because Next.js emits inline scripts).

## 8. Rollback

Set `OURVALLEYS_RELEASE_STAGE` back to `development` and redeploy. That restores the global `noindex` header, `Disallow: /` and the empty sitemap, and the next `deploy:prepare` re-provisions the demo owner and admin (it is idempotent), so retiring them is not a one-way door. Crawlers that cached the permissive `robots.txt` still meet the `noindex` header on every page. Pages already indexed drop out as they are recrawled, or sooner through each search engine's removal tool.
