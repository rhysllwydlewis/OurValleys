# Main Branch and Deployment Policy

## 1. Purpose

This policy defines how working branches, pull requests, the `main` branch and deployment relate to each other in OurValleys.

The production website is expected to deploy from `main`. Therefore, work that exists only on another branch is not part of the delivered website.

## 2. Canonical branch

`main` is the canonical integration, release and deployment branch for OurValleys.

Unless a later recorded decision deliberately changes the deployment model:

- Production deployment must track `main`.
- Completed application, configuration and documentation changes must be merged into `main`.
- The current state of `main` represents the current delivered product.
- A feature branch, agent branch or pull-request branch is temporary working state, not a release.

## 3. Use of branches

Short-lived branches and pull requests remain the normal safe method for implementing, reviewing and validating work.

Branches should be used to:

- Isolate a coherent change.
- Run checks before affecting the deployed branch.
- Support repeated review and correction.
- Preserve an auditable pull-request record.

Branches must not become long-lived alternative product states. Do not rely on an unmerged branch to supply functionality, documentation, configuration or fixes that the deployed website requires.

## 4. Required path to delivery

Routine completed work should follow this lifecycle:

1. Create or use a short-lived working branch from current `main`.
2. Implement the coherent change.
3. Run the strongest applicable checks.
4. Open or update a pull request targeting `main`.
5. Perform the mandatory independent review passes.
6. Correct findings on the same branch and pull request where appropriate.
7. Re-run validation after material changes.
8. Confirm the branch is current enough with `main` to merge safely.
9. Merge the pull request into `main`.
10. Confirm the expected commit or change is present on `main`.
11. Verify the deployment triggered from `main` and completed successfully where deployment is connected.
12. Perform an appropriate deployed smoke test or health check.
13. Correct any post-merge or deployment defect through a follow-up pull request into `main`.

Opening a pull request, obtaining passing branch checks or completing work on a feature branch does not by itself deliver the change.

## 5. Definition of done

A routine change is not `done` until:

- The intended outcome is complete.
- Required review and validation are complete.
- The pull request has been merged into `main`.
- `main` contains the intended change.
- Deployment from `main` has been checked where available.
- Material post-merge or deployment defects have been resolved.
- The related issue and documentation reflect the merged state.

If repository permissions, branch protection or deployment access prevents any of these steps, the agent must complete everything else and report the exact bounded blocker. It must not describe branch-only work as delivered.

## 6. Parallel and unfinished work

Parallel branches may be used when they are genuinely useful and do not create conflicting product states.

However:

- Do not leave a completed, merge-ready routine pull request open while treating its work as finished.
- Do not begin unrelated work merely to avoid completing review, merge or deployment verification on the current pull request.
- Clearly record any unfinished branch, why it remains unmerged and the next action required.
- Do not count an unmerged branch toward a completed milestone or release gate.

## 7. Direct changes to main

The default workflow is pull request into `main`, not unreviewed direct commits.

A direct change to `main` is appropriate only for a genuine emergency or where the available repository tooling provides no safe pull-request route. The same validation, documentation and post-deployment responsibilities still apply, and the exception should be recorded.

## 8. Deployment ownership

Where deployment is connected to `main`, the implementing agent owns routine deployment verification after merge.

The agent should, where tools permit:

- Confirm a deployment was triggered by the merged `main` commit.
- Confirm the deployment completed successfully.
- Inspect build and runtime logs for material errors.
- Check the affected route or user journey.
- Confirm migrations and configuration changes applied correctly.
- Open, complete and merge a follow-up fix into `main` when a defect is found.

The product owner should not be made responsible for discovering that merged work failed to deploy or that the live website still reflects an older branch state.

## 9. Branch cleanup

After a pull request is merged and post-merge verification is complete, remove or close the temporary branch where the available workflow and repository policy permit.

Retain durable history through commits, pull requests, issues and documentation rather than through abandoned long-lived branches.

## 10. Standing instruction

For OurValleys, interpret all instructions to implement, complete, fix, deliver or finish routine repository work as including:

> Review it, merge it into `main`, confirm `main` contains it, and check the deployment from `main` where available.

This policy remains in force until changed by a recorded repository decision.
