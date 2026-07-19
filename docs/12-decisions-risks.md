# Decisions, Assumptions and Risks

## 1. Purpose

This document records decisions that constrain the product, assumptions that still need evidence, open questions and material risks. Update it whenever a significant product or architecture choice changes.

## 2. Confirmed product decisions

| ID | Decision | Rationale | Revisit trigger |
| --- | --- | --- | --- |
| D-001 | Launch geography is Rhondda Cynon Taf. | Creates a clear initial market and matches founder knowledge. | Strong evidence that a narrower or different launch area is required. |
| D-002 | Active seeding begins with Rhondda density before wider RCT promotion. | Dense useful coverage is better than scattered listings. | Partnerships create stronger launch density elsewhere. |
| D-003 | The flagship product is a generated one-page business website. | Gives businesses a concrete reason to join beyond directory exposure. | Validation shows businesses do not value or maintain it. |
| D-004 | Business website and directory profile use one canonical business record. | Prevents duplicate editing and inconsistent information. | No planned revisit; core architecture principle. |
| D-005 | Residents can browse without an account. | Reduces friction and supports public local discovery. | A specific protected feature requires authentication. |
| D-006 | Phase 1 excludes marketplace, open forum, reviews, property and held payments. | Limits safety, legal and operational risk while proving the core loop. | Current phase exit gates are met and a module passes its release gate. |
| D-007 | Paid subscriptions must add value rather than deliberately cripple the free site. | Supports trust and business adoption. | Commercial evidence supports a different but still fair structure. |
| D-008 | Paid placement must be clearly disclosed. | Protects user trust and consumer-law compliance. | No planned revisit. |
| D-009 | Business verification badges describe the specific check. | Avoids implying that the entire business is endorsed. | No planned revisit. |
| D-010 | Product is bilingual-ready from the data model. | Retrofitting language fields later would be costly and inappropriate locally. | Implementation choice may change, not the principle. |
| D-011 | Generated sites do not permit arbitrary JavaScript or unsafe HTML. | Protects security, accessibility and maintainability. | A tightly sandboxed approved integration is justified and reviewed. |
| D-012 | Success is measured through local connections, not page views alone. | Aligns platform growth with resident and business value. | Metric definitions may evolve with modules. |
| D-013 | Project execution is AI-agent-led with minimal product-owner interruption. | Reduces owner workload and makes routine research, planning and implementation autonomous. | The model creates unacceptable quality, security or governance outcomes. |
| D-014 | Routine agent-created pull requests remain agent-owned through repeated independent review, correction, validation, merge and post-merge verification. | The product owner is not a coder and should not be the default quality-control or merge step; repeated, distinct review passes improve the reliability of AI-generated work. | Evidence shows autonomous merge creates unacceptable defects, branch protections require a different model, or an independent specialist review is required for a defined risk class. |
| D-015 | `main` is the canonical integration, release and deployment branch; completed application, configuration and documentation work must be merged into `main` before it is treated as delivered. | The production website is expected to deploy from `main`, so work left only on a temporary branch can be missed and will not update the deployed product. | The deployment source deliberately changes through a recorded architecture or operational decision. |

## 3. Accepted technical decisions

The detailed rationale, consequences and validation gates are recorded in `docs/adr/`.

| ID | Decision | ADR | Revisit trigger summary |
| --- | --- | --- | --- |
| T-001 | TypeScript, Next.js App Router and Node.js 24 LTS. | `adr/0001-nextjs-modular-monolith.md` | A measured platform constraint cannot be handled cleanly. |
| T-002 | Modular monolith with a separately deployed worker from the same repository. | `adr/0001-nextjs-modular-monolith.md` | Independent scaling or client requirements justify a service boundary. |
| T-003 | PostgreSQL is the system of record, with PostGIS, `pg_trgm` and `unaccent`. | `adr/0002-postgresql-postgis.md` | Measured workload, isolation or legal requirements cannot be met. |
| T-004 | Drizzle ORM with committed, reviewed SQL migrations. | `adr/0003-drizzle-migrations.md` | A required stable PostgreSQL capability cannot be supported safely. |
| T-005 | Better Auth with database sessions; OurValleys retains product authorisation. | `adr/0004-better-auth.md` | Security or enterprise identity needs cannot be maintained safely. |
| T-006 | Railway hosts the web app, worker and PostgreSQL initially. | `adr/0005-railway-hosting.md` | Measured cost, availability, region or platform limits fail requirements. |
| T-007 | Cloudflare R2 stores quarantined uploads and approved public media derivatives. | `adr/0006-cloudflare-r2-media.md` | Media, region, cost or contractual requirements change materially. |
| T-008 | Resend provides transactional email behind an internal adapter. | `adr/0007-resend-transactional-email.md` | Deliverability, processing, cost or throughput no longer meets needs. |
| T-009 | PostgreSQL full-text search, `pg_trgm` and PostGIS power initial search. | `adr/0008-postgresql-search.md` | Search exceeds documented volume, latency or relevance thresholds. |
| T-010 | pg-boss runs reliable background jobs in a separate Railway worker. | `adr/0009-pg-boss-background-jobs.md` | Queue load or isolation needs justify a dedicated queue platform. |
| T-011 | Phase 1 analytics use a first-party allowlisted event model in PostgreSQL. | `adr/0010-first-party-product-analytics.md` | Stable analysis needs justify a separately reviewed provider. |

Implementation remains conditional on the validation checks within each ADR. An accepted ADR authorises scaffolding; it does not waive testing, recovery, privacy or security requirements.

## 4. Core assumptions to validate

| ID | Assumption | Validation method | Failure response |
| --- | --- | --- | --- |
| A-001 | Local businesses value a free generated website. | Interviews and manual pilot sites. | Reframe around discovery, enquiries or another stronger tool. |
| A-002 | Businesses will maintain structured information. | Observe pilot completion and updates. | Increase assisted onboarding, simplify fields or reduce reliance on owner maintenance. |
| A-003 | Businesses will pay after receiving measurable value. | Pricing interviews and paid pilot. | Change packages, target different categories or revise business model. |
| A-004 | Residents want a combined local discovery platform. | Search tests, resident interviews and pilot behaviour. | Narrow the resident proposition to highest-value use cases. |
| A-005 | Enough local content can be seeded without unauthorised copying. | Founding programme and content operations trial. | Slow launch, form partnerships or reduce initial geographic scope. |
| A-006 | Founder-led onboarding can become repeatable. | Track setup time and support burden. | Improve onboarding automation or price assisted services. |
| A-007 | One-page sites meet the initial needs of priority categories. | Category prototypes and business feedback. | Add approved category-specific sections or redefine target customer. |
| A-008 | Search can begin on PostgreSQL without a separate engine. | Load and relevance tests against ADR-0008 thresholds. | Add a dedicated engine through a new ADR only when triggered. |
| A-009 | RCT density is commercially sufficient for the first stage. | Active business, resident and connection metrics. | Adjust revenue expectations or expansion timing. |
| A-010 | The selected managed providers can meet cost and operational needs. | Staging deployment, recovery test and pilot cost measurements. | Replace the affected provider through its documented adapter boundary. |

## 5. Open product questions

1. What final public domain will be used?
2. Is “OurValleys” the permanent brand or current working name?
3. Which towns form the first public launch cluster?
4. Which six business categories enter the private pilot?
5. Which business details must be verified before publication?
6. Will unclaimed public business records be created before owner participation?
7. What exact support is included in the free tier?
8. Is the first paid product custom domains, enhanced enquiries, analytics or another tool?
9. Will events require pre-publication review for all organisers or only untrusted accounts?
10. What level of Welsh-language interface is required for first public launch?
11. Will resident enquiries require accounts or remain open with abuse controls?
12. Who holds the accountable moderation and data-protection roles at launch?
13. What operating hours and response targets are realistic for support and urgent reports?
14. Will the repository remain public once application code and security configuration are added?

Agents should resolve safe reversible questions through research and documented defaults. Only approval-gated matters listed in `15-autonomous-operating-model.md` should be escalated to the product owner.

## 6. Risk scoring

Use:

- Likelihood: Low, Medium, High.
- Impact: Low, Medium, High, Critical.
- Status: Open, Mitigating, Accepted, Closed.

## 7. Product and market risks

| ID | Risk | Likelihood | Impact | Mitigation | Early indicator |
| --- | --- | --- | --- | --- | --- |
| R-001 | Platform becomes another sparse directory. | High | High | Launch around generated sites, seed dense locations and hide empty modules. | Low profile completion and repeat resident use. |
| R-002 | Scope expands faster than delivery capacity. | High | Critical | Phase gates, feature flags and backlog discipline. | Forum, marketplace or property work begins before core publication works. |
| R-003 | Businesses like the idea but do not maintain profiles. | High | High | Assisted pilot, reminders, simple editing and one-update-everywhere value. | Stale hours and incomplete onboarding. |
| R-004 | Residents continue using existing generic platforms. | Medium | High | Focus on local relevance, quality, combined discovery and current content. | High bounce and low connection rate. |
| R-005 | Free sites create support cost without paid conversion. | Medium | High | Constrain free scope, measure support cost and validate paid tools early. | High manual support per active business. |
| R-006 | The brand implies wider coverage than delivered. | Medium | Medium | State launch geography clearly and expand only after seeding. | Users search unsupported neighbouring areas frequently. |
| R-007 | Local disputes damage perceived neutrality. | Medium | High | Transparent policies, conflict-of-interest process and reasoned decisions. | Repeated complaints of favouritism. |

## 8. Trust, safety and legal risks

| ID | Risk | Likelihood | Impact | Mitigation | Early indicator |
| --- | --- | --- | --- | --- | --- |
| R-100 | User-generated content launches without Online Safety Act readiness. | Medium | Critical | Pre-launch service mapping, risk assessments, reporting and complaints. | Feature built without moderation requirements. |
| R-101 | Fake or manipulated reviews mislead users. | High if reviews launch | High | Defer reviews; implement CMA-aligned policy, detection and fair display. | Review bursts, owner self-review or incentives. |
| R-102 | Private home address becomes public. | Medium | Critical | Separate private/public fields, tests and preview confirmation. | Home-based businesses reporting exposure. |
| R-103 | Verification badge implies endorsement. | Medium | High | Specific badge labels and public explanation. | Users interpret badge as quality guarantee. |
| R-104 | Sponsored content appears editorial. | Medium | High | Mandatory sponsorship records and clear labels. | Commercial inclusion without disclosure. |
| R-105 | Property product crosses into estate agency work. | Medium | Critical | Advertising-only boundary and specialist review before expansion. | Staff begin arranging viewings or negotiating. |
| R-106 | Unlawful or inappropriate business marketing. | Medium | High | PECR-aware recipient classification, suppression and reviewed outreach process. | Complaints or high unsubscribe rates. |
| R-107 | Copyright complaints from copied business or news content. | Medium | High | Owner-supplied content, source records and no unauthorised copying. | Takedown requests. |
| R-108 | Welsh or English content is mistranslated materially. | Medium | Medium | Language state, human review for important text and visible fallbacks. | Complaints about legal or safety wording. |

## 9. Technical and security risks

| ID | Risk | Likelihood | Impact | Mitigation | Early indicator |
| --- | --- | --- | --- | --- | --- |
| R-200 | AI-generated code bypasses permission checks. | High | Critical | Central server authorisation, tests and small reviewed changes. | UI hides action but direct request succeeds. |
| R-201 | Business data leaks across tenants. | Medium | Critical | Membership-scoped queries, integration tests and cache isolation. | User can access another dashboard by changing ID. |
| R-202 | Media upload introduces malware or executable content. | Medium | Critical | Validation, quarantine, safe derivatives and restrictive delivery. | Unsupported file served inline. |
| R-203 | Search exposes unpublished or private fields. | Medium | Critical | Public projection, allowlist and suspension tests. | Draft appears in public search. |
| R-204 | Hosting or database cost grows unexpectedly. | Medium | High | Cost dashboards, budgets, efficient media and staged features. | Cost per active business rises rapidly. |
| R-205 | No tested recovery after data loss. | Medium | Critical | Automated backups and restore exercises. | Backup exists but no restoration record. |
| R-206 | Premature microservices create delivery failure. | Low if decisions followed | High | Modular monolith and ADR requirement. | Multiple services before a working core journey. |
| R-207 | Custom-domain lifecycle enables takeover. | Medium when launched | Critical | Domain verification, detachment checks and lifecycle tests. | Old DNS maps to a new tenant. |
| R-208 | Logs or analytics capture personal data. | Medium | High | Allowlisted properties, redaction and review. | Enquiry text appears in monitoring. |
| R-209 | Dependency updates break production. | Medium | High | Lockfile, automated tests, staged updates and rollback. | Unreviewed major updates merged. |
| R-210 | External provider coupling makes migration difficult. | Medium | Medium | Internal adapters, standard protocols, container deployment and PostgreSQL exports. | Provider-specific logic spreads through domain modules. |
| R-211 | Queue work degrades transactional database performance. | Low initially | High | Dedicated worker, concurrency controls, retention and measured resource use. | Locking, latency or storage grows with jobs. |

## 10. Operational risks

| ID | Risk | Likelihood | Impact | Mitigation | Early indicator |
| --- | --- | --- | --- | --- | --- |
| R-300 | Founder becomes moderation and support bottleneck. | High | High | Narrow initial features, templates, queues, response targets and documented processes. | Long claim and report backlog. |
| R-301 | Business onboarding remains heavily manual. | High | High | Measure assistance time, simplify steps and create reusable help. | More than expected support per site. |
| R-302 | Events and opening hours become stale. | High | Medium | Expiry, reminders, last-updated display and stale-data queue. | User correction reports rise. |
| R-303 | Content operations cannot sustain regular updates. | Medium | High | Evergreen focus, contributor process and realistic cadence. | Homepage becomes visibly old. |
| R-304 | Local conflicts create moderator bias. | Medium | High | Recusal and conflict-of-interest process. | Moderator handles reports involving personal contacts. |
| R-305 | Urgent reports arrive outside monitored hours. | Medium | Critical | Clear emergency guidance, escalation design and realistic public service levels. | Serious report waits in normal queue. |
| R-306 | Autonomous agents repeatedly block on minor owner preferences. | Medium | High | `AGENTS.md`, assumption policy, bounded approval gates and the standing delivery mandate. | Issues are assigned to the owner without a genuine external dependency. |
| R-307 | An agent confirms its own assumptions, misses defects and merges poor-quality work. | Medium | High | Mandatory distinct review passes, adversarial regression review, meaningful tests, runtime or visual inspection, false-positive and false-negative investigation, and post-merge checks. | Repeated follow-up fixes, defects found immediately after merge, or the product owner must repeatedly ask for another review. |
| R-308 | Completed work remains on a feature or agent branch while the deployed `main` branch stays outdated. | Medium | High | Treat `main` as the canonical delivered state, require routine PRs to target and merge into `main`, verify the expected commit on `main`, check deployment after merge and never count branch-only work as done. | A feature is reported complete but is absent from the deployed website, merge-ready PRs remain open, or long-lived branches diverge from `main`. |

## 11. Risk review cadence

- Review open Critical risks before every release.
- Review the register monthly during active development.
- Review after an incident or material feature change.
- Update Online Safety Act assessments before significant relevant changes.
- Close a risk only with evidence, not because work has started.

## 12. Decision log template

```markdown
### D-XXX — Decision title

- Date:
- Status: proposed | accepted | superseded
- Context:
- Options considered:
- Decision:
- Consequences:
- Owner:
- Revisit trigger:
```

## 13. Risk entry template

```markdown
### R-XXX — Risk title

- Likelihood:
- Impact:
- Status:
- Owner:
- Description:
- Controls:
- Remaining exposure:
- Early warning indicator:
- Next review:
```
