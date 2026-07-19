# ADR-0006: Cloudflare R2 for user media

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A media foundation

## Context

Business pages, events and guides need images and derived files. Uploads are untrusted and must not pass through unrestricted public storage. Railway object buckets are useful private S3-compatible storage, but the current product also needs controlled public delivery through a media domain and a portable object-store interface.

## Decision drivers

- S3-compatible API and direct-upload support.
- Controlled public delivery through a custom domain.
- Separation of raw uploads from approved public derivatives.
- Low egress friction for image-heavy public pages.
- Provider portability.
- Signed upload and deletion controls.

## Options considered

### Cloudflare R2

**Advantages**

- S3-compatible object API.
- Presigned request support.
- Custom-domain public delivery and existing Cloudflare ecosystem fit.
- No egress fees to the public internet under the provider’s current model.

**Disadvantages**

- Adds a second infrastructure provider.
- Presigned URLs are bearer credentials and require short lifetimes.
- Image transformation and malware controls still need application workflows or additional services.

### Railway buckets

**Advantages**

- Fewer providers and straightforward private S3-compatible storage.

**Disadvantages**

- Current buckets are private and do not currently provide the required direct public bucket model, object versioning or lifecycle policies.
- Public delivery would require an application proxy or another delivery layer.

### Store media in PostgreSQL or local service files

Rejected because large public media would increase database and deployment coupling and complicate scaling and recovery.

## Decision

Use **Cloudflare R2** behind an internal storage interface.

Storage layout:

- Raw uploads enter a private quarantine prefix or bucket.
- The server issues short-lived, operation-specific presigned upload URLs only after authenticating ownership and validating intended file metadata.
- A worker verifies actual content type, file signature, size and dimensions; strips unnecessary metadata; and creates safe derivatives.
- Only approved derivatives are copied to a public delivery prefix.
- Public media is served through a controlled custom media domain.
- Database records store ownership, rights source, alt text, dimensions, hashes, lifecycle state and object keys.
- Raw upload keys are never predictable public URLs.
- Deletion verifies tenant ownership and records an audit event.

## Consequences

### Positive

- Public media does not depend on the web process or database.
- Direct uploads reduce application bandwidth.
- Storage can be replaced through the internal adapter if requirements change.

### Negative or accepted trade-offs

- Media processing becomes an asynchronous workflow.
- Two provider accounts and access policies must be maintained.
- Orphaned-object cleanup and retention require explicit jobs.

### Required follow-up

- Define accepted file types, size and pixel limits.
- Select image-processing and malware-scanning approach during scaffold implementation.
- Configure separate staging and production buckets and credentials.
- Add orphan cleanup, failed-processing and deletion jobs.
- Create tests proving one tenant cannot modify another tenant’s media.

## Security, privacy and safety effects

- Presigned URLs must be short-lived, method-specific and treated as secrets.
- Browser-supplied MIME types and filenames are untrusted.
- Executable or unsupported content must not be served inline.
- EXIF and other metadata must be removed unless there is a documented need.
- Private evidence and identity documents must never share the public media delivery path.

## Validation

The media prototype must demonstrate:

- Authenticated short-lived upload creation.
- Rejection of disguised or oversized files.
- Safe derivative generation.
- Public delivery only after approval.
- Cross-tenant update and delete denial.
- Cleanup of failed and orphaned objects.
- Accessible alt-text requirements in the publishing flow.

## Revisit trigger

Reconsider if R2 availability, region, processing workflow, cost, contractual terms or required media capabilities no longer meet the project’s measured needs.

## References

- https://developers.cloudflare.com/r2/
- https://developers.cloudflare.com/r2/api/s3/presigned-urls/
- https://docs.railway.com/reference/buckets
- `../05-technical-architecture.md`
- `../13-testing-and-quality.md`
