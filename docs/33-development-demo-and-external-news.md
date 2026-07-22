# Development Demo Access and External News

## 1. Outcome

Issue #102 adds two deliberately public development accounts alongside the existing read-only viewer and introduces an attributed News section backed by the WalesOnline RSS feed supplied by the product owner.

This is a development convenience, not a launch-ready authentication policy. The privileged public accounts exist only while OurValleys is unlaunched and must be removed before public release.

## 2. Alignment with the product plan

The product charter includes selected local updates but explicitly excludes automated copying or rewriting of third-party news. The content plan also requires clear sources, content-type labels, correction discipline and a gradual approach to editorial reporting.

The implemented boundary therefore does not ingest or reproduce articles. It displays only feed-supplied headlines, publication times, visible WalesOnline attribution and outbound links to the original publisher.

OurValleys does not claim affiliation with, endorsement by or editorial responsibility for WalesOnline.

## 3. Public development accounts

The full `/login` page discloses three fictional accounts:

| Demonstration  | Email                            | Password               | Capability                                                             |
| -------------- | -------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| Viewer         | `demo.viewer@ourvalleys.example` | `PUBLIC-DEMO-ONLY`     | View the fictional Cwm & Coil Heating dashboard only                   |
| Business owner | `owner@cwm-coil.example`         | `PUBLIC-BUSINESS-DEMO` | Edit and publish only the seeded fictional Cwm & Coil Heating business |
| Platform admin | `demo.admin@ourvalleys.example`  | `PUBLIC-ADMIN-DEMO`    | Use the development administration dashboard                           |

Every credential is intentionally conspicuous, uses the reserved `.example` domain and must never be reused for a private or real account.

The compact homepage sign-in dialog continues to show only the viewer account. Business and administrator access is confined to the full login page so the homepage interaction stays simple and the elevated development roles receive clearer warnings.

Selecting a fill button copies the chosen credentials into the form but never submits automatically. After successful authentication, the viewer opens `/account`, the business owner opens the seeded business dashboard, and the administrator opens `/admin`.

## 4. Provisioning and deployment

`pnpm auth:provision-demo` now performs all development-demo provisioning idempotently:

1. Provision or rotate the viewer credential and verify that it matches the deterministic seeded viewer.
2. Provision or rotate the business-owner credential and verify that it matches the deterministic seeded owner.
3. Provision or rotate the administrator credential.
4. Grant the administrator role to the administrator account.
5. Revoke prior sessions whenever credentials are reprovisioned through the existing account-provisioning service.

The existing Railway `pnpm deploy:prepare` sequence already runs `pnpm auth:provision-demo` after migrations and deterministic seed data, so no additional Railway environment variable is required for these public development accounts.

## 5. Mandatory pre-launch removal gate

Before OurValleys is made public or promoted beyond controlled development review:

1. Remove the business-owner and administrator credentials from the public login interface.
2. Stop provisioning those two accounts in `scripts/provision-demo-account.ts`.
3. Delete or disable the public administrator account and revoke every active session.
4. Rotate the fictional business-owner password or remove credential access entirely.
5. Create private named administrator accounts through the controlled operator process.
6. Require administrator multi-factor authentication in accordance with the MVP authentication requirements.
7. Retain only a least-privilege public viewer demonstration when there remains a justified product need.
8. Re-run permission, login, deployment and admin-access tests after the removal.

A warning in application copy is not a substitute for completing this gate.

## 6. WalesOnline RSS integration

The News route tries the product-owner supplied section feed first and uses the current WalesOnline whole-site RSS endpoint only as a resilience fallback:

```text
https://www.walesonline.co.uk/news/?service=rss
https://www.walesonline.co.uk/?service=rss
```

The product-owner supplied WalesOnline RSS instructions identify the `?service=rss` section pattern. The implementation treats the upstream service as external and fallible.

Operational behaviour:

- server-side fetch only;
- eight-second request timeout;
- fifteen-minute Next.js revalidation window;
- two-megabyte maximum accepted response;
- maximum thirty parsed items and twelve displayed by default;
- only `walesonline.co.uk` and `www.walesonline.co.uk` article links are accepted;
- article links are normalised to HTTPS and fragments are removed;
- duplicate links are discarded;
- markup is stripped from feed titles and XML entities are decoded;
- full article text, descriptions and publisher images are not displayed;
- all article links open on WalesOnline;
- upstream failure returns an honest unavailable state without affecting other discovery routes.

The page remains `noindex` during development while allowing outbound article links to be followed.

## 7. Privacy, rights and editorial boundaries

The feed integration stores no user information and introduces no personalised tracking. It does not persist publisher content in the application database.

Headlines may still be protected publisher content. Their use here is deliberately minimal and source-linked. Before launch, the operator must confirm the publisher's current RSS terms, attribution expectations and acceptable production use. If that approval is not obtained, the feed must remain disabled or be replaced by a licensed source.

OurValleys must not:

- remove or obscure WalesOnline attribution;
- copy full articles, summaries or images without a valid rights basis;
- rewrite third-party reports as original OurValleys journalism;
- imply that a headline has been independently verified by OurValleys;
- mix external reporting with sponsored or community content without a clear content-type label.

## 8. Validation

Automated coverage includes:

- unmistakably public and unique development credentials;
- correct protected destination for each demonstration role;
- shared fictional-business boundary between viewer and owner;
- explicit privileged-account pre-launch warnings;
- RSS entity and markup handling;
- source-host validation;
- HTTPS normalisation;
- duplicate removal;
- date parsing and invalid-date fallback;
- bounded result and response-size handling.

Deployment verification should additionally confirm that all three accounts can sign in, each reaches only its intended journey, the administrator link appears for the admin account, business isolation remains enforced and `/news` renders either attributed headlines or the designed unavailable state.
