# 37. Sensitive path check

## 1. Purpose

Autonomous routines are authorised to merge their own pull requests into `main` once checks are green, with one exception: changes to authentication or authorisation logic, payment handling, or the public business projection's core data contract are left open for an owner decision.

Until now that exception depended on each routine correctly judging its own diff. This check makes the detection mechanical. A pull request that changes a reserved file fails the **Sensitive paths** check, and the failure is the signal to hold.

## 2. What the check does

- Workflow: `.github/workflows/sensitive-paths.yml`, run on every pull request.
- Logic: `scripts/check-sensitive-paths.ts` (unit tests in `tests/unit/sensitive-paths.test.ts`).
- Reserved list: `.github/sensitive-paths.txt`.
- It compares the pull request against its base and fails if any changed file is on the reserved list. File names are read NUL-separated, so unusual names (spaces, quotes, non-ASCII) are matched exactly as they are, and renames are listed as a delete plus an add so moving a reserved file out is still caught.
- The list is read from the base branch, so a pull request cannot shorten the list used to judge it. A malformed list (absolute paths, `..`, globs, no entries) fails loudly instead of silently weakening the check.
- Names printed in the log have control characters replaced, so a crafted file name cannot inject a workflow command.
- The workflow has `contents: read` only and uses no secrets.

## 3. What a failure means

A red **Sensitive paths** check is a hold, not a defect to fix. It means a human decision is needed on exactly the files it lists.

- Routines must not merge, retry, skip, disable or edit the check to make it pass.
- The pull request is left open and ready, with the decision needed stated in its body.
- The owner decides, and either merges, asks for changes, or edits `.github/sensitive-paths.txt` through a pull request that is itself reviewed (it is on the list).

## 4. Keeping the list true

Edit `.github/sensitive-paths.txt` through a pull request. Exact-file entries must exist: a unit test fails if a listed file is renamed or deleted, so protection cannot silently lapse. Directory entries (trailing `/`) may name directories that do not exist yet, such as `src/modules/payments/`, so new areas are covered from the first commit.

Reserved today: authentication and session code, access-policy and permission modules, the public business projection (`site-projection.ts`), the reserved payments directory, `.github/` (with the exception below), this check's own script, and `railway.json`.

Deliberately not reserved, so routine work is not held:

- Database migrations, because the owner has authorised routines to merge them after running them against a real database. For the same reason `.github/workflows/standard-postgres.yml` is carved out with a `!` exception: every migration pull request bumps the expected migration count in it.
- `src/modules/businesses/public.ts`, which holds the directory search, filter, sort and related-business queries. Measured over the last 50 merges to `main` it was touched by 5 routine discovery changes and none that altered what is exposed publicly, so reserving it would have held ordinary work. The public projection itself is `site-projection.ts`, which is reserved. Revisit if a change to `public.ts` ever alters which fields are exposed.

Keep the list narrow. A list that fires on routine work teaches everyone to ignore it. Measured over the last 50 merges with this list, the check flags only changes to authentication, access control or the projection.

## 5. Owner setup

No repository setting is needed. The check is advisory: the routines are instructed to treat a red **Sensitive paths** check as a hold, and the Fleet Supervisor and daily digest report any merge that went in with it red.

- Do **not** add it as a required status check unless you want it to block your own merges of sensitive changes too; with it required you would need to use an administrator bypass each time.
- Leave "require review from code owners" off for this purpose. The routines open and merge pull requests as the owner's own account, and GitHub does not let an author approve their own pull request, so a code-owner rule could never be satisfied.

## 6. Limits

This is a tripwire, not a lock. The routines act with the owner's identity, so no label, comment or approval can prove that a human decided. The workflow runs from the pull request's own head, so a pull request that rewrites the workflow or the script could in principle neutralise the check for itself; both files are on the reserved list, so such a change is visible to reviewers, but nothing stops an actor with merge rights. Its job is to turn a model's self-assessment ("I did not touch auth") into a fact the routines and the owner can see.
