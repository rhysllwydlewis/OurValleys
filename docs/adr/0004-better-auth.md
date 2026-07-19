# ADR-0004: Better Auth with database-backed sessions

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owners:** OurValleys product and engineering agents
- **Related backlog items:** OV-005, Phase 1A

## Context

OurValleys needs resident, business-member, editor, moderator and administrator access. Authentication must support secure account recovery, email verification, session revocation and stronger administrator protection. Product permissions are more detailed than a single account role because one user may belong to several businesses.

## Decision drivers

- TypeScript and Next.js integration.
- Database-backed session control and revocation.
- Email verification and password reset support.
- Multi-factor authentication for privileged accounts.
- Ability to keep authentication separate from product authorisation.
- Avoid outsourcing all product identity data to a closed provider prematurely.

## Options considered

### Better Auth

**Advantages**

- Framework-agnostic TypeScript library with Next.js support.
- Database sessions, email verification, account management and plugin system.
- Two-factor authentication plugin supports TOTP, OTP and backup codes.
- Authentication data can live in the application database.

**Disadvantages**

- The project owns more configuration and operational responsibility than with a fully hosted identity provider.
- Product-specific authorisation still needs to be designed and tested separately.

### Fully hosted identity provider

**Advantages**

- Reduced authentication operations and polished hosted flows.

**Disadvantages**

- Higher provider coupling, possible per-user cost and less control over user journeys.
- Does not remove the need for OurValleys business-membership permissions.

### Custom authentication

Rejected because password, session, recovery and MFA implementation are security-sensitive commodity capabilities.

## Decision

Use **Better Auth** with **database-backed sessions**.

Initial authentication policy:

- Email and password are supported first.
- Email ownership must be verified before sensitive business or contributor actions.
- Password hashing uses the library’s supported secure default.
- Password reset and account-recovery flows must not reveal whether an account exists.
- Users can view and revoke active sessions.
- Administrators and other high-privilege operational accounts require two-factor authentication before production access.
- Social sign-in may be added later through configuration, beginning with Google only if it reduces onboarding friction.

Authorisation policy:

- Better Auth proves identity and session state.
- OurValleys owns product roles, `BusinessMembership`, verification, moderation and entitlement rules.
- Every protected server action resolves permissions from trusted session identity and stored membership; never from a client-supplied role or business ID alone.

## Consequences

### Positive

- Sessions can be revoked and audited centrally.
- Product permissions remain explicit and testable.
- The project can add stronger authentication without redesigning all domain data.

### Negative or accepted trade-offs

- Email delivery, abuse prevention and account recovery must be operated carefully.
- Authentication updates require active dependency and security maintenance.

### Required follow-up

- Threat-model sign-in, verification, reset and account-linking flows.
- Add rate limits and suspicious-attempt logging.
- Define session lifetime and privileged re-authentication rules.
- Add administrator MFA enforcement tests.
- Add account closure and data-export journeys.

## Security, privacy and safety effects

- Authentication secrets and provider credentials remain server-only.
- Session cookies must be secure, HTTP-only and appropriately SameSite-scoped.
- Audit logs must not store password, token or recovery-code values.
- Business ownership evidence remains separate from login credentials.

## Validation

Before release, automated tests must cover:

- Sign-up, verification, sign-in and sign-out.
- Password reset without account enumeration.
- Session revocation.
- Expired and invalid session denial.
- Administrator MFA enforcement.
- Cross-tenant denial after changing a business identifier.
- Role or membership revocation taking effect on protected operations.

## Revisit trigger

Reconsider the provider if security maintenance becomes unsustainable, required enterprise identity features cannot be supported safely, or an independent review identifies a material architectural weakness.

## References

- https://www.better-auth.com/docs/introduction
- https://www.better-auth.com/docs/concepts/session-management
- https://www.better-auth.com/docs/authentication/email-password
- https://www.better-auth.com/docs/plugins/2fa
- `../03-user-roles-and-journeys.md`
- `../14-agent-build-guide.md`
