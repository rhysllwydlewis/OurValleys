# Contributing to OurValleys

OurValleys is currently in product validation and foundation planning. Contributions should follow the current phase and the specifications in [`docs/`](docs/README.md).

## Before starting

1. Read `README.md` and the relevant documents.
2. Choose or create a bounded GitHub issue linked to an `OV-XXX` backlog item.
3. Confirm that the work belongs to the current delivery phase.
4. Identify permissions, privacy, safety, accessibility and data implications.
5. Avoid combining unrelated refactors with product work.

## Branches

Use a short descriptive branch name, for example:

```text
feat/ov-401-business-record
fix/ov-1002-enquiry-delivery
chore/ov-102-ci
```

Do not commit directly to the default branch once active application development begins unless an emergency process explicitly permits it.

## Commit messages

Use clear imperative messages with an optional scope:

```text
feat(businesses): add canonical business record
fix(auth): prevent cross-tenant membership lookup
chore(ci): add typecheck workflow
```

## Pull requests

A pull request should:

- Address one bounded problem.
- Link the backlog item or issue.
- Explain scope and exclusions.
- Include tests.
- Identify migrations and deployment effects.
- State permission, privacy and safety considerations.
- Include screenshots or recordings for visible changes.
- Update documentation when behaviour changes.

## Definition of done

Work is complete only when:

- Acceptance criteria are met.
- Server-side permissions are enforced.
- Public and private data remain separated.
- Empty, loading and error states exist.
- Accessibility has been considered and tested.
- Tests pass.
- Build succeeds.
- Analytics are correct and privacy-safe where added.
- Administrative and moderation requirements are covered.
- Documentation is current.

## Testing

Run the repository-defined commands for:

- Formatting.
- Linting.
- Type checking.
- Unit and integration tests.
- Critical end-to-end tests where relevant.
- Production build.

Do not delete or weaken a meaningful test simply to pass CI.

## Database changes

- Use committed migrations.
- Explain backfills and destructive changes.
- Add constraints for important integrity rules.
- Test with representative existing data.
- Document rollback or forward-fix approach.

## Security and privacy

Never commit:

- Secrets or tokens.
- Production data.
- Verification documents.
- Enquiry content.
- Private addresses.
- Payment-card data.

Every protected business action needs a negative permission or cross-tenant test.

Report suspected vulnerabilities through the process in [`SECURITY.md`](SECURITY.md), not a public issue.

## Deferred features

Reviews, marketplace, open community discussion, property and held payments are outside Phase 1 until their release gates are approved. Do not implement them because they appear in the long-term vision.

## AI-assisted contributions

AI-generated code is reviewed and tested to the same standard as any other contribution. Follow [`docs/14-agent-build-guide.md`](docs/14-agent-build-guide.md).
