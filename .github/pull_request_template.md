## What changed?
Describe the purpose and affected UI/API/workflow.

## Category
- [ ] Public UI or content
- [ ] Cloudflare / Wrangler
- [ ] E-sign, authorization or sensitive data
- [ ] Rental billing, insurance, release or refunds
- [ ] Legal / company policy

## Required verification
- [ ] npm run check
- [ ] npm test
- [ ] npm run ci:security
- [ ] Worker dry-run if Cloudflare changed
- [ ] UI/mobile/accessibility review if relevant
- [ ] Failures and blockers disclosed (do not assume checks passed)

## Safety and rollback
- [ ] No secrets, payment credentials or customer identification in commits
- [ ] No live claims about signatures, payments, coverage or document delivery without proof
- [ ] No unapproved DNS, vehicle imagery or feature-flag changes
- [ ] Sensitive actions remain RBAC/MFA and server-evidence gated
- [ ] Correct independent reviewer and rollback plan identified

Change risk:

Rollback:

Approver:

## Merge gate
- [ ] CODEOWNER review completed where required
- [ ] Reported checks actually passed
- [ ] Manual business/security approvals obtained

DO NOT MERGE if reviews, security checks, account permissions or production gates are blocked.
