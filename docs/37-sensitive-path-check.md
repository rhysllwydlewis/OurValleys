# 37. Sensitive path check

## 1. Purpose

Autonomous routines are authorised to merge their own pull requests into `main` once checks are green, with one exception set directly by the owner in the routines' standing instructions: changes to authentication or authorisation logic, payment handling, or the public business projection's core data contract are left open for an owner decision. This is the practical form of the "acceptance of materially increased privacy, security … or financial risk" gate in `AGENTS.md`.

Until now that exception depended on each routine correctly judging its own diff. This check makes the detection mechanical. A pull request that touches a reserved file, or removes calls to an authorization helper, fails the **Sensitive paths** check, and the failure is the signal to hold.

One addition is the maintainers' default rather than the owner's explicit list: repository and release controls (`.github/`, `railway.json`, this check's script). They are reserved because weakening a check or a workflow is how an automated change would make itself unaccountable, which `AGENTS.md` forbids ("do not disable checks, weaken assertions"). Remove them from the list if that is not wanted.

## 2. What the check does

- Workflow: `.github/workflows/sensitive-paths.yml`, run on every pull request.
- Logic: `scripts/check-sensitive-paths.ts` (unit tests in `tests/unit/sensitive-paths.test.ts`).
- Reserved list: `.github/sensitive-paths.txt`.
- **Path rule.** It compares the pull request against its base and fails if any changed file is on the reserved list. File names are read NUL-separated, so unusual names (spaces, quotes, non-ASCII) are matched exactly as they are, and renames are listed as a delete plus an add so moving a reserved file out is still caught.
- **Authorization-helper rule.** Protected actions are guarded by helper calls spread across many files (for example `readAdminSession` in every admin server action, `canUserAccessBusiness` on the business dashboard), so a path list cannot cover them. The list therefore also names these helpers with `call:name` lines. For every changed production source file under `src/` (tests, specs, `__tests__` and `src/test/` excluded) the check counts calls to each helper before and after the change, and fails if any single file calls a helper fewer times than before.
  - Calls are counted outside comments, as `name(` or `obj.name(`, and the helper's own `function name(` definition is not counted. Replacing a call with a comment, a bare reference or just an import is therefore seen.
  - The rule is per file, not a total over the pull request, so a deleted check cannot be hidden by an unrelated new use of the same helper elsewhere.
  - The price is that moving a check to another file, or consolidating several checks into one shared helper, is also held. That is deliberate: moving an authorization check is exactly the change an owner should look at.
  - Adding checks, and new files that use them, never fail.
- The list is read from the base branch, so a pull request cannot shorten the list used to judge it. A malformed list (absolute paths, `..`, globs, a bad helper name, no entries) fails loudly instead of silently weakening the check, and so does any git error while reading file contents.
- Names printed in the log have control characters replaced, so a crafted file name cannot inject a workflow command.
- The workflow has `contents: read` only and uses no secrets.

## 3. What a failure means

A red **Sensitive paths** check is a hold, not a defect to fix. It means a human decision is needed on exactly the files or helpers it lists. This does not make every edit to those files unfixable: it makes the owner the decider, which is the rule the owner set for this class of change.

- Routines must not merge, retry, skip, disable or edit the check to make it pass.
- The pull request is left open and ready, with the decision needed stated in its body.
- The owner decides, and either merges, asks for changes, or edits `.github/sensitive-paths.txt` through a pull request that is itself reviewed (it is on the list).

**Before merging any pull request, routines must have merged the current `main` into the branch and seen the check pass on that head.** The workflow runs when a pull request is opened, updated or reopened. It does not re-run when the base branch moves, so a pull request that was already green when this check landed, or when the list was later extended, has not been judged against the current list until its head is updated.

## 4. Keeping the list true

Edit `.github/sensitive-paths.txt` through a pull request.

- Exact-file entries must be existing files: a unit test fails if one is renamed, deleted or turned into a directory, so protection cannot silently lapse. Directory entries (trailing `/`) may name directories that do not exist yet, such as `src/modules/payments/`, so new areas are covered from the first commit.
- Every `call:` helper must still be called somewhere in `src/` (a definition or a mention does not count): a unit test fails if one is renamed or no longer called, so it cannot silently stop being watched.
- Add a helper when it becomes the way a new class of action is protected.

Reserved today: authentication and session code, access-policy and permission modules, the public demo-account policy, the public business projection (`site-projection.ts`), the reserved payments directory, `.github/` (with the exception below), this check's own script, `railway.json`, plus the authorization helpers named by `call:` lines.

Deliberately not reserved, so routine work is not held:

- Database migrations, because the owner has authorised routines to merge them after running them against a real database. For the same reason `.github/workflows/standard-postgres.yml` is carved out with a `!` exception: every migration pull request bumps the expected migration count in it.
- `src/modules/businesses/public.ts`, which holds the directory search, filter, sort and related-business queries. Measured over the last 50 merges to `main` it was touched by 5 routine discovery changes and none that altered what is exposed publicly, so reserving it would have held ordinary work. The public projection itself is `site-projection.ts`, which is reserved. Revisit if a change to `public.ts` ever alters which fields are exposed.

Keep the list narrow. A list that fires on routine work teaches everyone to ignore it. Replayed over the last 50 merges to `main`, the check flags 6: five changes to authentication, access control or the projection (account deletion, email-delivery hooks, special-day hours, two-step verification, saved-event reminders) and one refactor that consolidated business-permission lookups (`canUserAccessBusiness` calls fell from 10 to 4). Nothing else, and no migration or search work, was flagged.

## 5. Owner setup

No repository setting is needed. The check is advisory: the routines are instructed to treat a red **Sensitive paths** check as a hold, and the Fleet Supervisor and the daily digest report any merge that went in with it red.

- Do **not** add it as a required status check unless you want it to block your own merges of sensitive changes too; with it required you would need to use an administrator bypass each time.
- Leave "require review from code owners" off for this purpose. The routines open and merge pull requests as the owner's own account, and GitHub does not let an author approve their own pull request, so a code-owner rule could never be satisfied.

## 6. Limits

This is a tripwire, not a lock. The routines act with the owner's identity, so no label, comment or approval can prove that a human decided. Specific gaps:

- The workflow runs from the pull request's own head, so a pull request that rewrites the workflow or the script could in principle neutralise the check for itself. Both files are on the reserved list, so such a change is visible to reviewers, but nothing stops an actor with merge rights.
- The helper rule counts calls by name. A file that switches to an aliased import (`import { x as y }`) loses its direct calls to `x` and is held, but a guard written some other way entirely is invisible to it. It catches deletion, replacement and relocation of the named helpers, not every possible weakening.
- Comment stripping is a text heuristic, not a parser: a `//` inside a string literal makes the rest of that line uncounted, so a call on such a line can be missed.
- Authorization written without one of the named helpers is not covered until the helper is added to the list.
- It runs when a pull request is opened, updated or reopened, not when the base branch moves. That is why section 3 requires merging the current `main` and seeing the check pass before any merge.

Its job is to turn a model's self-assessment ("I did not touch auth") into a fact the routines and the owner can see.
