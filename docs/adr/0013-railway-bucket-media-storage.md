# ADR-0013: Private Railway Bucket for user media, served by the site

- **Status:** Accepted (16 November 2026). Supersedes ADR-0006 for the default deployment; the R2 adapter stays supported.
- **Date:** 2026-11-16
- **Owners:** Product owner decision, implemented by engineering agents
- **Related:** `docs/119` (public release), `src/lib/media-config.ts`, `src/lib/media-storage.ts`, `src/app/media/`

## Context

ADR-0006 chose Cloudflare R2 mainly because a Railway Bucket is private and cannot deliver files publicly. Release preparation then found R2 not enabled on the Cloudflare account, and the product owner decided to keep everything on Railway: one bill, one vendor, and no separate R2 subscription.

## Decision

Uploaded pictures and menu documents live in a private Railway Bucket (`ourvalleys-media`, S3-compatible, virtual-hosted addressing, region `auto`). The site serves them itself from `/media/<key>`:

- The route fetches only object names of the exact shape the upload code creates (`isServableMediaKey`), takes the content type from the extension and never from the bucket, and returns cacheable responses (`Cache-Control: public, max-age=86400`).
- Cloudflare, which already proxies the site, caches the image and PDF files at its edge, so repeat requests reach neither this service nor the bucket.
- Picture URLs are absolute (`https://<site>/media/<key>`), so structured data and link previews stay valid and Next's image optimiser works through its existing remote-pattern rules.
- The same signing code (AWS Signature v4 over `fetch`) serves both providers. Its output is pinned to AWS's own SDK by golden-value tests.

Configuration is `MEDIA_S3_ENDPOINT`, `MEDIA_S3_BUCKET`, `MEDIA_S3_ACCESS_KEY_ID`, `MEDIA_S3_SECRET_ACCESS_KEY`, optional `MEDIA_S3_REGION` and `MEDIA_S3_PATH_STYLE`, set on the web and worker services by reference to the bucket's own variables, so secrets are never copied. When these are complete they take precedence over any `R2_*` settings. The public-release gate accepts a complete bucket or a complete R2 set and fails closed otherwise.

## Consequences

- No second infrastructure provider, and no per-request egress fee from Cloudflare R2. Railway bills storage ($0.015 per GB-month); bucket traffic and S3 operations are free, but traffic from the web service to visitors is service egress, which the Cloudflare cache keeps small.
- Files are served through the web service on a cache miss, which is more load than a CDN-fronted public bucket.
- A Railway Bucket has no automatic backup or snapshot, and a deleted bucket is recoverable for 52 hours. Deleted business pictures are also removed from it (`storage_cleanup`). A backup copy is a separate decision.
- Railway Buckets are reachable only over public networking; the credentials are the only protection and must stay in Railway variables.
- The bucket region cannot be changed after creation (this one is `sjc`, US West, beside the web service).
- Moving to R2 later needs only configuration: set the `R2_*` variables and remove the `MEDIA_S3_*` ones. Existing files would have to be copied across first.
