# ADR-0009: pg-boss PostgreSQL-backed background jobs

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A

## Context

OurValleys needs reliable asynchronous work for email, media processing, reminders, stale-content checks, search projection updates and cleanup. Request handlers must not perform long-running work, and adding a separate queue datastore would increase operational complexity before the workload is known.

## Decision drivers

- Reliable retries and dead-letter handling.
- Transactional enqueue with related database changes.
- Scheduled and delayed jobs.
- Dedicated worker process.
- Low infrastructure count.
- TypeScript and Drizzle compatibility.

## Options considered

### pg-boss on the primary PostgreSQL service

**Advantages**

- PostgreSQL-backed queue with retries, schedules, concurrency and dead-letter behaviour.
- Jobs can be created within an existing database transaction.
- Official adapter support for Drizzle SQL.
- No additional Redis or queue service for the initial product.

**Disadvantages**

- Queue load shares database resources with the application.
- Worker and retention tuning remain operational responsibilities.
- Node and PostgreSQL minimum versions must remain compatible.

### Redis-backed queue

**Advantages**

- Mature queue ecosystems and independent workload scaling.

**Disadvantages**

- Adds another stateful service and makes atomic database-plus-job changes more complex.

### Hosting cron requests only

Rejected because cron does not provide the required per-job retries, concurrency, dead-letter state or transactional enqueue. Railway cron remains suitable for a small number of coarse maintenance triggers where a queue is unnecessary.

## Decision

Use **pg-boss** in a **separate Railway worker service**, sharing the PostgreSQL service.

Rules:

- Web requests enqueue work and return; they do not wait for long-running processing.
- Enqueue inside the same transaction as the state change where atomicity matters.
- Every handler must be idempotent or protected by a unique operation key.
- Define retry limits, backoff, timeout and dead-letter behaviour for each job type.
- Store only the minimum job payload; use stable record IDs rather than copied personal data.
- Redact job payloads from ordinary logs.
- Use named queues and explicit concurrency.
- Create operational views for failed, delayed and dead-letter jobs.
- Use Railway cron only for simple scheduled commands or queue kick-offs, not as a substitute for the job system.

## Consequences

### Positive

- Database changes and follow-up work can be committed together.
- The initial platform has one fewer datastore to operate.
- Worker scaling remains independent from the web service.

### Negative or accepted trade-offs

- Poorly tuned jobs could affect PostgreSQL.
- Queue tables require retention and monitoring.
- A future high-throughput workload may justify a dedicated queue platform.

### Required follow-up

- Add queue schemas through controlled migration/startup procedure.
- Define standard handler, retry, logging and idempotency helpers.
- Add worker health monitoring and graceful shutdown.
- Add dead-letter alerting and operator replay controls.
- Add database resource measurements for queue workloads.

## Security, privacy and safety effects

- Job payloads must not contain passwords, tokens, full enquiry messages, identity evidence or unnecessary personal data.
- Worker database and provider credentials remain server-only.
- Operator replay tools require administrator authorisation and audit records.
- Safety or moderation jobs must preserve evidence and avoid silent repeated notifications.

## Validation

The scaffold must prove:

- Transactional enqueue and rollback.
- Successful worker processing.
- Retry after controlled failure.
- Idempotent duplicate delivery handling.
- Dead-letter state after retry exhaustion.
- Graceful worker restart without lost work.
- Redacted logs and restricted replay operation.

## Revisit trigger

Reconsider when queue load materially degrades transactional PostgreSQL, required throughput cannot be met by safe worker scaling, or independent failure isolation becomes a measured requirement.

## References

- https://github.com/timgit/pg-boss
- https://docs.railway.com/reference/cron-jobs
- https://docs.railway.com/guides/private-networking
- `0002-postgresql-postgis.md`
- `0003-drizzle-migrations.md`
