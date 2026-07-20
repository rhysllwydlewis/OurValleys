# Premium Homepage and Design System

## 1. Outcome

Issue #11 introduced the first recognisably OurValleys public homepage and a reusable premium visual language on top of the existing application, business model and deployment boundary. Follow-up issue #38 compacted the hero and replaced the authentication preview with a functional sign-in journey backed by the existing Better Auth service. Audit follow-up issue #40 hardened the fallback, dialog reset, credential rotation and validation boundaries before the work was treated as complete. Deployment follow-up issue #42 adds a clearly labelled public viewer account so the protected fictional-business journey can be exercised on Railway without exposing an owner credential.

The implementation uses the supplied **OurValleys Homepage v3** Claude Design export as its approved visual reference. The export's proprietary runtime elements were not copied into production. Its layout, hierarchy, artwork, search-first interaction, selective glass treatment and content patterns were rebuilt as typed Next.js components and CSS.

## 2. Connected product behaviour

The homepage is not a disconnected mock-up:

- the universal search submits to `/businesses` without requiring an account;
- location is selected manually and does not request precise device location;
- the featured canonical business and generated-site demonstration both read `Cwm & Coil Heating` through `getPublishedBusinessBySlug`;
- the complete generated page remains available at `/b/cwm-coil-heating`;
- public database failure removes the canonical preview honestly without blocking the rest of the homepage;
- the homepage sign-in dialog and dedicated `/login` route use the same Better Auth email-and-password boundary;
- `/account` authorises the session on the server, lists server-authorised business memberships and returns unauthenticated visitors to the dedicated sign-in route;
- the public demo viewer can follow the account link into the protected fictional-business dashboard while edit and publish permissions remain denied.

The additional businesses, events and guides are representative fictional previews. They are visibly labelled and must not be treated as verified launch content.

## 3. Design system

`src/app/design-system.css` defines semantic tokens for:

- canvas, surface, text, brand, accent and status colours;
- sans and editorial display font stacks;
- spacing, radius, border, elevation and glass values;
- focus and forced-colour behaviour.

The homepage component stylesheet applies those tokens to navigation, fields, search, cards, status labels, content modules, calls to action, the dialog and mobile sheet. Glass is limited to the sticky navigation and a small number of high-value controls, with an opaque fallback when backdrop filtering is unavailable.

The compact hero override in `src/app/home-compact.css` is imported with the homepage enhancement boundary rather than by the root layout. Its selectors remain scoped to `[data-home-root]`. It reduces the hero's minimum height from 43rem to 35.5rem on larger screens and from 48rem to 37rem on mobile while tightening heading, copy, search-control and popular-link spacing without hiding or cropping essential content.

## 4. Server-first and progressive enhancement

Essential hero content, search controls, discovery links, fictional content labels and business calls to action render on the server. Nothing important is hidden while JavaScript loads or while sections are outside the viewport.

`HomeEnhancements` progressively adds:

- the route-local compact hero stylesheet;
- a small requestAnimationFrame-managed hero offset;
- explicit reduced-motion detection;
- stable visible-state markers for browser inspection and future non-blocking enhancement.

All sections remain fully visible throughout the journey. Enhancement does not intercept scrolling, pin content, defer essential rendering or make any route dependent on animation.

## 5. Authentication interaction

The homepage sign-in control is a normal link to `/login?next=/account`. When JavaScript is available, the link progressively enhances into a native `dialog`; the same component becomes a bottom sheet at mobile widths. Without JavaScript or when hydration fails, the dedicated route remains directly reachable from the same control.

The interaction provides:

- initial focus on the email field;
- native Escape handling;
- focus restoration to the opening link;
- backdrop and explicit close controls;
- credential and error-state reset whenever the dialog closes;
- a dedicated `/login` fallback that works independently of dialog state;
- email, password and remember-me controls with native browser validation;
- disabled and `aria-busy` submission state;
- `aria-invalid` and accessible non-enumerating invalid-account, rate-limit, unavailable-service and generic failure states;
- a visibly disclosed **Fill demo details** action that populates but never automatically submits the intentionally public viewer credentials.

Successful sign-in returns to a validated same-origin path and defaults to `/account`. Absolute URLs, protocol-relative URLs, backslash variants, literal NUL characters and login loops are rejected. Signed-in visitors see an account action in the homepage header, and the protected account page provides business navigation and sign-out.

Email/password sign-in is enabled as the approved account-access behaviour while public sign-up remains disabled. The public demo credential is unmistakably labelled, fictional and view-only. It is separate from the fictional owner account and is safe to disclose because it cannot edit, publish or manage membership.

Normal private account provisioning remains an explicit internal command:

```bash
ACCOUNT_EMAIL="person@example.com" \
ACCOUNT_NAME="Person Name" \
ACCOUNT_PASSWORD="use-a-strong-unique-password" \
pnpm auth:provision
```

The command validates its inputs, hashes the password using Better Auth's password implementation, creates or updates the credential account transactionally, revokes the user's previous sessions after a password is set or rotated and logs neither the account email nor password. Email verification delivery, password recovery and public registration remain separate controlled journeys.

## 6. Responsive and reduced-motion behaviour

The implementation contains intentional desktop, tablet and mobile layouts rather than a scaled desktop composition. At narrow widths:

- navigation simplifies;
- the search becomes a vertical control group;
- grids recompose to one or two columns;
- generated-site content becomes a mobile composition;
- the login dialog becomes a safe-area-aware sheet;
- the demo credential rows recompose without horizontal overflow;
- compact hero spacing preserves the heading, both search fields, submit action and popular-search links within a shorter opening section.

Reduced-motion preferences disable the hero animation and scroll offset while preserving every section and the same information hierarchy.

## 7. Media and performance boundary

The supplied homepage artwork was resized and converted to WebP for its rendered role. The committed source images are compressed for their rendered role and kept within a small, explicitly reviewed mobile media boundary. There is no autoplay video, map SDK or third-party homepage widget.

Playwright records transferred JavaScript and imagery on a 390 × 844 viewport and enforces provisional homepage ceilings of 500 KB JavaScript and 350 KB imagery. These are implementation safeguards, not permission to consume the full budget in successor work.

## 8. Validation contract

The workstream validates:

- server-rendered homepage content with and without database configuration;
- public search submission and manual location selection;
- canonical business reuse;
- desktop, tablet and mobile layouts with no horizontal overflow;
- explicit maximum hero heights at desktop, tablet and mobile widths;
- no-JavaScript navigation from the homepage sign-in control to the dedicated fallback route;
- sign-in field focus, invalid-credential feedback, Escape handling, focus restoration and dialog reset;
- the public demo helper filling without submitting;
- real public demo sign-in, account membership display and protected dashboard navigation;
- viewer denial for edit and publish permissions;
- a generated ephemeral private account completing homepage-dialog sign-in, password rotation, session revocation and sign-out;
- direct `/login` fallback and protected-route redirects;
- safe authentication return-path normalisation, including denial cases;
- reduced-motion content parity;
- mobile JavaScript and image transfer ceilings;
- configured and unconfigured production builds, runtime smoke tests and Railway deployment.

Browser screenshots, traces and the configured build log are exported from CI for repeated independent review before merge. CI generates private test passwords at runtime. The only committed password is the intentionally public, conspicuously labelled, least-privilege demonstration value documented in issue #42 and document 30.

## 9. Successor boundaries

This work activates sign-in for existing accounts and public view-only demonstration access. It does not activate public registration, password recovery, email-verification delivery, business onboarding publication, real event publishing, real guide content, precise geolocation, ratings, reviews or advertising. Those remain separate workstreams with their own data, trust and release gates.
