# R-Rent GitHub Actions and Pull Request Governance

**Document:** RR-ENG-GH-001 | Version 1.0 | Status: SOURCE IMPLEMENTED; ADMIN SETTINGS PENDING.

## Workflow registry

| Workflow | Trigger | Purpose | Secrets |
|---|---|---|---|
| R-Rent Quality Gate | PRs to main; pushes to main; manual dispatch | Node syntax, all unit tests and default-deny security checks | None |
| R-Rent Cloudflare Access Edge Verification | Relevant PR/push; manual dispatch | Access-rule tests and Wrangler dry-run only | None |
| R-Rent Cloudflare Direct Staging Deployment | Manual dispatch only | Explicit staging deployment after checks and GitHub environment approval | Only protected staging secrets |

The staging workflow refuses to deploy from a branch other than main. Pull requests cannot directly enable live rental payments, electronic signing, customer identity operations or vehicle release.

## PR procedure

1. Create a feature branch based on main and commit changes only to that branch.
2. Use the repository PR template to document security impact, evidence, tests, rollback, and reviewer.
3. Open a **draft PR** when checks or approvals are pending.
4. Review code, identify missing metadata, and wait for real GitHub Actions results. An unrun job is **not** passing.
5. Obtain a separate competent review when changes impact rental agreements, payment reconciliation, identity, insurance, access, encryption or personal data.
6. Merge only once actual quality checks pass, required approvals are recorded, and deployment/rollout gates are met.

## Recommended GitHub repository settings (administrator action)

In **Settings → Rules → Rulesets**, create a branch ruleset targeting main:
- Require a PR before merging.
- Require independent approving reviews and CODEOWNERS reviews when possible.
- Require all conversations resolved; dismiss stale reviews.
- Require the actual GitHub check context for the quality job, once GitHub has reported it. Job display name: quality / check.
- Prevent force pushes and branch deletion; allow narrowly scoped documented emergency exceptions only.
- Do not automatically merge a draft PR.

In **Settings → Actions → General**, verify hosted runners and permissions are available; enable only required actions. Prior run 38104953970 showed failure with runner_id 0 and zero job steps, repeated twice. Its detailed logs were unavailable, so the reason must be determined from the UI/account runner or billing notice; CI source changes cannot prove that runner provisioning has been fixed.

In **Settings → Environments → rrent-edge-staging**, require reviewer approval, restrict deployment branch to main, and configure only tightly scoped Cloudflare secrets. Do not post sensitive values in PR descriptions, source or chat.

## Rollout conditions

Run Quality Gate and Worker dry-run without Cloudflare or Vercel credentials. Cloudflare staging deployment must be a separate manual action with explicit confirmation STAGE_RRENT_EDGE, and ONLY from main after merge. Production Worker remains unrouted and public rental transactions remain locked.

## How to investigate a failing check

- Runner missing (runner_id 0, no steps): examine GitHub Actions runner availability, plan/billing limits, organization restrictions and platform incidents.
- Syntax/test error with executed steps: inspect corresponding step logs, repair the PR and rerun.
- Wrangler dry-run errors: inspect config schema, dependency versions and Access bindings; do not deploy.
- Vercel quota or failure: leave website changes pending; do not bypass the platform policy or claim a READY deployment.

**Connected integration limitation:** GitHub App cannot update repository administrator branch-protection rules or install GitHub Actions secrets. Admin user must set those controls for enforcement.

## Optional Runner Assignment (PR #1 follow-up)

The quality/check workflow selects an administrator-configured self-hosted runner with labels [self-hosted, rrent-ci] for main and same-repo PRs initiated by trusted maintainer ceortpsc when repository Actions variable RRENT_CI_RUNNER_MODE equals self-hosted. Without that variable it uses ubuntu-latest; external fork PRs always remain GitHub-hosted. The job includes a read-only runner preflight and remains subject to the same test and security gates. It does not provision, register, or start a machine.

See [Runner Setup and Security](../docs/RRENT_RUNNER_SETUP.md). GitHub strongly advises ephemeral, isolated runners for public repositories. The owner or administrator must register a disposable VM, attach the rrent-ci label, and verify that GitHub reports the runner Online/Idle before enabling the variable. Current connected desktop RTPAB1 was offline, so registration is not claimed. A queued/unassigned job is not a passing check.
