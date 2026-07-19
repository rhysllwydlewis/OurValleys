# ADR-0007: Resend for transactional email

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A email foundation

## Context

The platform needs account verification, password reset, enquiry notifications, event reminders and operational messages. Email delivery must be reliable, observable and replaceable. Messages may contain personal data, so the system should minimise content and retain provider events deliberately.

## Decision drivers

- Straightforward TypeScript and HTTP integration.
- Verified-domain sender controls.
- Delivery, bounce and complaint webhooks.
- Template ownership within the repository.
- Replaceable provider adapter.
- Clear suppression and retry behaviour.

## Options considered

### Resend

**Advantages**

- Simple API and TypeScript support.
- Domain verification and webhook events.
- Suitable for an early managed transactional-email workflow.
- Existing fit with modern Node application stacks.

**Disadvantages**

- Adds an external processor of recipient and message data.
- Deliverability still depends on DNS, content quality and list hygiene.
- Provider-specific webhook and event details require an adapter.

### Amazon SES

**Advantages**

- Mature, scalable and cost-effective at volume.

**Disadvantages**

- More infrastructure and account configuration for the first release.

### SMTP from a general mailbox

Rejected because it provides weaker application delivery events, suppression management and operational separation.

## Decision

Use **Resend** behind an application email service interface for transactional messages.

Rules:

- Use a dedicated verified sending subdomain.
- Use recognisable sender names and a monitored reply address where replies are expected.
- Store templates and subject logic in the repository.
- Do not include passwords, tokens beyond purpose-built expiring links, verification evidence, private addresses or unnecessary enquiry details in email.
- Sign and verify provider webhooks.
- Make webhook processing idempotent.
- Maintain suppression state for hard bounces, complaints and unsubscribed optional messages.
- Separate mandatory service messages from optional marketing consent.
- Queue email requests; request handlers should not depend on the provider completing synchronously.

## Consequences

### Positive

- Delivery outcomes can be tracked and retried appropriately.
- Email logic remains testable and can move to another provider.
- Verified-domain sending supports professional business and resident communication.

### Negative or accepted trade-offs

- Provider outages and rate limits become operational concerns.
- DNS and sender reputation need active management.
- Webhook records and suppression data add retention responsibilities.

### Required follow-up

- Select the sending subdomain when the canonical domain is approved.
- Configure SPF, DKIM and DMARC.
- Define transactional templates and plain-text alternatives.
- Add local development capture and test-provider modes.
- Document webhook retention and email support procedures.

## Security, privacy and safety effects

- API and webhook secrets remain server-only.
- Email addresses and delivery events are personal data.
- Logs must not contain reset or verification tokens.
- Optional newsletters require an appropriate consent and unsubscribe model separate from service emails.

## Validation

Before release test:

- Verification and reset delivery.
- Valid and invalid webhook signatures.
- Duplicate webhook events.
- Bounce and complaint suppression.
- Provider timeout and retry behaviour.
- Plain-text and accessible HTML rendering.
- Prevention of cross-tenant template or recipient misuse.

## Revisit trigger

Reconsider when deliverability, cost, regional processing, compliance, throughput or provider reliability no longer meet measured needs.

## References

- https://resend.com/docs/send-with-nextjs
- https://resend.com/docs/dashboard/domains/introduction
- https://resend.com/docs/dashboard/webhooks/introduction
- `../07-trust-safety-privacy-legal.md`
- `../13-testing-and-quality.md`
