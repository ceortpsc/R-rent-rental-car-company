# R-Rent | GitHub Actions Runner Registration & Assignment

Document RR-CI-RUNNER-001. Revision 1.0. Draft PR #1; runner registration is NOT completed.

## Status
- Repository: https://github.com/ceortpsc/R-rent-rental-car-company
- Branch: feature/ci-pr-guardrails-20261010
- Desktop Commander device RTPAB1 is OFFLINE, so no runner was installed there.
- GitHub runner-management APIs and runner registration tokens are not accessible with the connected GitHub integration.
- Past Actions runs failed before a runner was assigned (runner ID 0; zero executed steps). No account-level cause has been proven.

## Preferred approach: restore GitHub-hosted runners
Check Repository Settings > Actions > General, Actions > Runners, and Actions billing/usage. Confirm ubuntu-latest is allowed and the account can start jobs. Changing YAML cannot restore unavailable GitHub-hosted capacity.

## Optional self-hosted runner, restricted to trusted changes
GitHub cautions against persistent self-hosted runners for public repositories because arbitrary PR code can compromise the runner. The R-Rent repository is public. Use only an isolated, ephemeral VM with no customer files, personal data, production secrets, payment sessions or privileged network access.

1. Repository owner: open Settings > Actions > Runners > New self-hosted runner.
2. Select the isolated machine's actual OS/architecture. Follow the current official GitHub download/checksum and registration commands shown in that UI. Keep the short-lived registration token private.
3. At initial registration, apply the exact custom label rrent-ci; retain the default self-hosted label.
4. Confirm the agent reports Connected to GitHub / Listening for Jobs and appears Online / Idle under Actions > Runners.
5. In Settings > Secrets and variables > Actions > Variables, add RRENT_CI_RUNNER_MODE with value self-hosted.
6. The quality / check job then selects self-hosted and rrent-ci only on main or an internal same-repo PR initiated by account ceortpsc. External/fork PRs continue on ubuntu-latest. Do not override that protection.
7. Rerun PR #1's check, verify a runner was assigned, executed steps passed, and the tested SHA matches the PR. Do not merge while checks/reviews are failing.
8. Destroy/deregister the ephemeral VM after use. Do not attach long-lived credentials or Cloudflare production keys.

## Current workflow selection
- No administrator variable: runs-on ubuntu-latest (existing default).
- Admin variable equals self-hosted and trusted internal PR/main: runs-on [self-hosted, rrent-ci].
- External/fork PR: runs-on ubuntu-latest regardless of variable.
- A nonexistent or offline rrent-ci runner causes queuing, not an automatic fallback.
- The protected Cloudflare staging deployment remains a separate manual workflow requiring main, environment approval and secrets.

## Operational checks
- Run npm run check, npm test, and npm run ci:security after runner assignment.
- scripts/runner-preflight.mjs reports Node/OS and trusted repository without printing credentials.
- If jobs fail with zero steps, inspect GitHub Actions billing, account/organization policy, runner provisioning and platform status; the precise cause remains unknown.

References:
https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners
https://docs.github.com/en/actions/reference/runners/self-hosted-runners
https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/apply-labels
