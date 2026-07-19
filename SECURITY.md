# Security Policy

## Supported versions

OurValleys is currently in planning and pre-release development. Until a public release exists, only the latest default branch and active release candidate are supported.

After launch, this section must be updated with the supported production versions and security-update policy.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public GitHub issue, discussion, pull request or social post.

Use the repository owner’s private GitHub contact route or another private security contact published by the project when available. The project must add a dedicated monitored security email before public launch.

Include where possible:

- A clear description.
- Affected URL, feature or commit.
- Reproduction steps.
- Potential impact.
- Whether any personal or business data may have been accessed.
- Suggested mitigation if known.
- A safe way to contact you.

Do not include real user data, authentication tokens, private addresses, verification evidence or harmful content beyond what is necessary to explain the issue.

## Response process

The project will aim to:

1. Acknowledge a valid private report.
2. Triage severity and affected data.
3. Contain active risk.
4. Preserve necessary evidence securely.
5. Fix and test the issue.
6. Assess regulatory, contractual and user-notification duties.
7. Coordinate disclosure after remediation.
8. Record lessons and preventive work.

Specific public response times will be published only when the project has reliable operational coverage.

## High-priority vulnerability classes

- Authentication bypass.
- Broken access control.
- Cross-business or cross-tenant data access.
- Exposure of private addresses.
- Exposure of verification evidence.
- Administrator privilege escalation.
- Stored or reflected script execution.
- Unsafe file upload or malware delivery.
- Secret or token exposure.
- Enquiry or user personal-data exposure.
- Custom-domain takeover.
- Payment or webhook forgery when billing launches.
- Loss or corruption of business publication data.

## Safe research expectations

Security research must not:

- Access or modify data belonging to another real user.
- Degrade service availability.
- Use automated testing that causes significant traffic without permission.
- Send spam or harmful content.
- Attempt social engineering.
- Retain or disclose personal data.
- Extort the project or its users.

Use test accounts and the least intrusive proof possible.

## Security baseline

The project intends to maintain:

- Server-side authorisation.
- Tenant-isolation tests.
- Multi-factor authentication for administrators.
- Secure secret management.
- Dependency and secret scanning.
- File upload validation.
- Structured security logging with redaction.
- Rate limiting.
- Tested backups and recovery.
- Security review before public launch.

## Incident handling

Suspected incidents should follow the documented incident process in `docs/07-trust-safety-privacy-legal.md`. Security logs and evidence must be access-controlled and must not be copied into public issues.
