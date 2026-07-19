# ADR-0010: First-party privacy-minimised product analytics

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1D

## Context

The project must measure whether residents find useful local information and whether businesses receive meaningful connections. It does not need broad behavioural surveillance. A third-party analytics platform at scaffold stage would create an additional data processor, event sprawl and consent questions before the event model is stable.

## Decision drivers

- Measure successful local connections and failed discovery.
- Prevent enquiry text, contact details and private locations entering analytics.
- Maintain a controlled event dictionary.
- Support business-facing aggregate statistics.
- Minimise cookies and third-party tracking.
- Keep the option to add a dedicated product-analytics platform later.

## Options considered

### First-party allowlisted events in PostgreSQL

**Advantages**

- Full control over event names, properties, retention and access.
- No new browser tracking provider or third-party script.
- Easier to connect events to genuine domain outcomes.
- Can begin server-side and avoid non-essential cookies.

**Disadvantages**

- Funnels, exploration and dashboards require application queries or lightweight internal reporting.
- Event volume must be retained and aggregated carefully.

### Hosted product analytics from launch

**Advantages**

- Rich funnels, session tools and dashboards.

**Disadvantages**

- Additional processor, configuration and consent analysis.
- Easy to collect more behavioural data than the product needs.
- Event taxonomy is likely to change during validation.

### Basic page-view analytics only

Rejected because page views do not prove successful local connections or business value.

## Decision

Start with a **first-party, allowlisted analytics event model** stored in PostgreSQL and aggregated through scheduled jobs.

Rules:

- The event dictionary in `09-commercial-model-and-analytics.md` is authoritative.
- Prefer server-side domain events for outcomes such as published website, valid enquiry delivered, event saved or search completed.
- Client events are used only where no reliable server outcome exists.
- Event properties use an explicit allowlist and schema validation.
- Never store enquiry text, email, telephone, private address, verification evidence, authentication tokens or raw payment data in analytics.
- Use random anonymous identifiers only where needed; do not fingerprint users.
- Do not add session replay in Phase 1.
- Keep operational logs separate from product analytics.
- Define retention and aggregate older events before public launch.
- Business dashboards show aggregate counts and privacy-safe trends, not resident identities.

## Consequences

### Positive

- Analytics remain aligned to the north-star measure rather than vanity traffic.
- Data sharing and browser tracking are minimised.
- The event model can stabilise before selecting a richer tool.

### Negative or accepted trade-offs

- Early analysis will be less convenient than a specialist platform.
- Database volume and aggregation queries require controls.
- Internal dashboards must be built for the most important metrics.

### Required follow-up

- Finalise the Phase 1 event dictionary and property schemas.
- Define lawful basis, privacy notice text and retention.
- Add event-table partitioning or archiving only when volume justifies it.
- Add tests preventing sensitive properties.
- Build a founder operational dashboard from aggregate views.

## Security, privacy and safety effects

- Analytics access is restricted to authorised operational roles.
- Business owners see only metrics for businesses they are authorised to manage.
- Precise resident location and message content are excluded.
- Deletion and account-closure processes must account for identifiable analytics where applicable.

## Validation

Before launch:

- Map every collected event to a documented product question.
- Reject unknown event names and properties.
- Test that sensitive form data cannot enter analytics payloads.
- Compare delivered valid enquiries with analytics connection counts.
- Verify cross-tenant dashboard isolation.
- Verify retention and aggregation jobs.

## Revisit trigger

Consider a dedicated analytics platform when the stable event model requires analysis that cannot be delivered reasonably through aggregate SQL and internal dashboards. Any new provider requires an ADR, privacy review, data-processing assessment, consent decision and migration plan.

## References

- `../09-commercial-model-and-analytics.md`
- `../07-trust-safety-privacy-legal.md`
- `../13-testing-and-quality.md`
