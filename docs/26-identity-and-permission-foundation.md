# Identity and Permission Foundation

## Delivered boundary

This slice establishes the reusable, fail-closed authorisation vocabulary for the next identity, onboarding and administration journeys.

- Platform roles are a closed set: `resident`, `business_user`, `moderator` and `admin`.
- Business membership roles are a closed set: `owner`, `manager`, `editor` and `viewer`.
- Business permissions are centrally defined and validated before use.
- Unknown roles, inactive memberships, unknown permission strings and database failures deny access.
- Owners receive the supported business permission set; all other roles require both a role-level allowance and an explicit membership permission.
- A stored permission cannot expand a role beyond its documented maximum.

## Role boundary

- **Owner:** view, edit profile, publish and manage members.
- **Manager:** view, edit profile, publish and manage members when explicitly assigned.
- **Editor:** view, edit profile and publish when explicitly assigned.
- **Viewer:** view only when explicitly assigned.

The policy is intentionally deny-by-default. New permissions must be added to the central allowlist and deliberately assigned to each role rather than being accepted from arbitrary database strings.

## Safety and privacy

This change does not enable registration, public account creation, real user data, email delivery or administrative access. Existing unconfigured authentication remains unavailable and protected routes remain fail-closed.

## Successor work

The next Stage E slices can build on this policy to add verified registration, recovery, session management, admin MFA and business membership administration. Transactional email must remain behind the documented adapter and safe disabled state until the required provider configuration is available.

## Administrator two-step verification (OV-204)

Platform administrators must enrol TOTP two-step verification (Better Auth `twoFactor` plugin) before using the admin area or any admin mutation. Enrolment lives in Account settings → Two-step verification and requires the account password; one-time recovery codes are shown once at enrolment and can be used at the sign-in challenge. Enabling or disabling it for an admin is written to the admin audit log (`auth.two_factor_enabled` / `auth.two_factor_disabled`). The shared read-only public admin demonstration is exempt because it cannot mutate state. Recovery if an admin loses both the authenticator and recovery codes: another admin (or database operator) clears `auth_two_factor` rows and `auth_user.two_factor_enabled` for that user, after out-of-band identity confirmation, and the audit log records the re-enrolment. `ADMIN_MFA_READY` remains the launch-readiness attestation that this is in place.
