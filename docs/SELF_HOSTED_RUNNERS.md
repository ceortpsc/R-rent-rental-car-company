# R-Rent Self-Hosted Runner Governance and Operating Procedure
**Document:** RR-CI-RUNNER-001  
**Owner:** Ross Tax Pro Software Company — R-Rent Division  
**Status:** Repository configuration established; runner provisioning and GitHub environment rules require independent verification.

## Runner assignment
The existing three workflows already contain dedicated runner selection:
| Workload | Labels | Trust |
| --- | --- | --- |
| Trusted main Quality Gate | \`[self-hosted, linux, rrent-ci]\` | Verified code on \`main\` only |
| Public PR quality / edge reviews | \`ubuntu-latest\` | Hosted isolation; no privileged secrets |
| Staging Worker validation | \`[self-hosted, linux, rrent-ci]\` | Manual dispatch, \`main\` only |
| Staging Worker deployment | \`[self-hosted, linux, rrent-deploy]\` | GitHub environment \`rrent-edge-staging\`, manual confirmation |

The phrase \`runs-on: self-hosted\` selects any matching runner and is therefore **not recommended** for privileged deployments without dedicated labels. Use the existing label arrays to maintain workload separation. A registered, ONLINE runner with those labels is required. Repository YAML alone does not install a runner.

## Infrastructure to provision
1. Linux host or ephemeral VM, Node.js 22, current GitHub Actions runner binary, service account with no sudo/root, sufficient CPU/disk capacity, outbound HTTPS and an isolated workspace.
2. Register trusted QA runner \`rrent-ci\` and independently secured release runner \`rrent-deploy\` under the appropriate repo or runner group using GitHub's authorized runner registration flow. Configure ephemeral/disposable runners where practical, especially for deployment.
3. Deny unreviewed PRs and fork PRs direct access to all self-hosted infrastructure. Use GitHub-hosted checks for PRs, then branch-protected merge.
4. Keep \`CLOUDFLARE_API_TOKEN\`, \`CLOUDFLARE_ACCOUNT_ID\`, \`RR_CF_ACCESS_AUD_STAGING\` and \`RR_CF_STAFF_ALLOWLIST_STAGING\` in GitHub **environment-level secrets**, never in repository, workflow scripts, logs, or runner home directory.
5. The staging environment must restrict deployment branch to \`main\` and use required reviewers when supported. Reviewers should be independent of the author for high-risk releases.
6. Production Cloudflare deployment remains disabled. Customer identity, payment, contract, fleet release and private records must not be exposed from a public Worker.
7. Validate worker syntax and test suite, inspect GitHub Actions workflow result, then run staging dry-run and approved staging deployment. Check Cloudflare Access identity, CORS, restricted URLs, and no production route changes.

## Self-hosted runner health checklist
- Runner appears **ONLINE / IDLE** in repository Settings → Actions → Runners with all required labels.
- \`node scripts/runner-preflight.mjs\` passes and identifies \`RUNNER_ENVIRONMENT=self-hosted\`, Node 22, Linux, expected R-Rent repository, and \`refs/heads/main\`.
- Run \`npm run check\`, \`npm test\`, \`npm run ci:security\`, and \`npm run workers:check\` on approved main.
- Scheduled system patching, runner version updates, isolated workspace, restrictive permissions, egress firewall, disk utilization/incident alarms, no shared personal use, safe cleanup after jobs.
- Audit runner service account access quarterly and whenever staff leaves; rotate CI permissions and secret store upon compromise.
- Inspect job queue. A job in \`queued\` for a prolonged period can indicate there is no compatible online runner, insufficient runner capacity, disabled runner group or an environment protection hold. **Queued ≠ tested.**

## Repository governance gap
GitHub's \`main\` branch was read as \`protected: false\` during this audit. CODEOWNERS, CI tests and pull request templates do **not** themselves enforce branch protection. A repository administrator should establish an applicable GitHub branch ruleset: required PR, no bypass where feasible, required status checks, current reviewers, CODEOWNERS, signed changes when desired and deployment protection. This must be configured with authorized repository administration access; no such write capability was available through the connected GitHub tools.

## Workflow approval boundaries
Engineering development, test and configuration updates may proceed under owner direction. High-impact actions—DNS cutover, production Worker route activation, payment settlement, privilege grants, contract signing, customer PII migration or irreversible deletion—must remain subject to independently verifiable prerequisites, GitHub environment approvals, and legal/insurer authorizations. Generic blanket approval is not a substitute for a verified signing transaction, live payment evidence or separately authorized credentials.

## Recovery and rollback
On suspicious runner activity: disable runner, revoke tokens/keys, quarantine worktree and artifacts, preserve independent logs, evaluate secrets exposure and rotate affected secrets; restore from clean pinned runner image. To pause releases, disable the staged workflow or environment, never silently change production DNS or existing service bindings. Investigate failed checks rather than deleting them.

## Current findings
- Workflow configurations inspected and confirmed self-hosted for trusted main/staging.
- GitHub Actions API runner listing not accessible through this connected toolset: online runner presence **unverified**.
- Latest observed main Quality Gate was **queued** at audit time; recent Dependabot PR checks showed failures but GitHub redirected job logs were unavailable. Root cause **not established**; do not claim checks pass.
- No evidence that new Cloudflare deployments or production routes were activated by updating these files.
