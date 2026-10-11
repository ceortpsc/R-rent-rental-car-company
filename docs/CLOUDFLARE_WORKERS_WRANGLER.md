# Cloudflare Workers + Wrangler Runbook
**Project:** R-Rent / Ross Tax Pro Software Company  
**Document:** RR-OPS-WRANGLER-001 · **Status:** Configuration committed; Cloudflare authorization and deployment **not yet verified**  
**Last updated:** October 10, 2026

## Architecture and separation
The R-Rent website and privileged APIs remain in the existing Vercel project. The separately deployed Cloudflare Worker is a **public information edge service**, not a replacement for Vercel, and does not proxy authenticated renter, signing, identity, vehicle release, or payment APIs.

\`\`\`text
R-Rent static site / Vercel (existing)
  ├── Fleet, Quotes, Terms, E-Sign preview
  └── Protected APIs ──> production auth/DB (not enabled)
Cloudflare Worker / Wrangler
  ├── GET  /v1/health
  ├── GET  /v1/support/capabilities
  ├── POST /v1/support  (approved public policy FAQ only)
  ├── GET  /v1/guide/signing
  └── GET  /v1/guide/returning
\`\`\`

Source files: \`wrangler.jsonc\`, \`workers/edge.js\`, \`lib/support-policy.js\`, \`lib/rental-help.js\`; tests: \`tests/cloudflare-worker.test.js\`.

## Wrangler v4 setup
Required: **Node.js 22**, npm, verified Cloudflare account with Workers permissions. Wrangler is invoked through a specifically pinned version \`4.147.0\`. No API token or account ID is stored in the repository.

\`\`\`bash
npm run workers:check
npm run workers:dry-run  # compile/bundle without deploying
npm run workers:dev
# For deployment, provide credentials through a secure shell or approved CI secret store:
export CLOUDFLARE_ACCOUNT_ID="<VERIFIED_32_CHAR_ACCOUNT_ID>"
export CLOUDFLARE_API_TOKEN="<REDACTED_SCOPED_API_TOKEN>"
npm run workers:deploy:staging
# after staging security and route verification, and separate operational approval:
npm run workers:deploy:production
\`\`\`

These commands **cannot** succeed against a Cloudflare account without explicit authorization, a valid Cloudflare API token, and a verified account ID. Never commit a \`.dev.vars\` containing real credentials. For local debugging use \`npm run workers:dev\`.

\`wrangler.jsonc\` is the sole source of Worker deployment configuration. Staging and production each publish a separate Worker at the account's \`workers.dev\` hostname when deployed. The precise public hostname depends on the connected Cloudflare account and **is not known or promised** here. No production zone route is automatically changed. A staging Worker is not automatically a production Worker.

## Route activation checklist
**Hold at workers.dev until all are met.** For the eventual \`rtpscrentalcars.com/api/edge/*\` route:
1. Confirm the Cloudflare account owns the **actual** \`rtpscrentalcars.com\` zone; obtain its zone ID/verified account ID.
2. Fix existing incorrect apex/\`www\` DNS according to Vercel's current instructions; verify Vercel HTTPS, site pages and certificate before changes. Vercel previously reported an apex A record pointing at \`18.232.7.146\` while recommending \`76.76.21.21\`. Verify again; do not blindly overwrite a managed DNS record.
3. Ensure appropriate Cloudflare proxy/DNS settings are consistent with the chosen Worker route type.
4. On a reviewed change request, add ONLY the narrow route to \`env.production.routes\`:
   \`{"pattern":"rtpscrentalcars.com/api/edge/*","zone_name":"rtpscrentalcars.com"}\`.
5. Validate the route does not intercept other \`/api/v1/*\`, \`/sign\`, \`/signing\`, payment webhooks, private uploads or the entire website.
6. After deployment, smoke-test GET health, both guides, CORS preflight, good support POST, blocked sensitive POST, method/404; check Vercel website remains intact.
7. Connect the frontend to the Worker only after CORS, privacy review and rate-limit policies are configured.
8. On failure, remove/disable the narrow Worker route, preserve original Vercel DNS/site, and audit the rollback.

## Security / governance
- Worker runs public-only, has no credentials, DB bindings, raw customer records, private tokens, payment processor or signing permissions.
- CORS allows only published R-Rent origins. Cross-origin POST with an unknown origin is denied. Browsers do not send credentials to this public Worker.
- Public questions are limited to 600 characters; JSON request body to 2,048 UTF-8 bytes. Obvious personal identifiers and secrets are rejected. This is **not** comprehensive DLP.
- Replies are deterministic approved-policy guidance with human escalation links. No third-party LLM or customer-record retrieval occurs.
- Responses are \`no-store\`, with minimal headers. Do not enable request-body analytics, logs, model training, account data access or tracking without approved disclosures.
- Edge rate limiting/WAF policy, bot protections, API usage budgets, monitoring, GDPR/TDPSA review and security testing require account-level Cloudflare configuration and remain **unverified**.
- \`RR_ENABLE_GOVERNED_LLM\` remains false; this Worker is not an autonomous agent. No Worker will sign a contract, finalize a refund or approve a driver.
- Secrets for any future protected service require separate policy, environment-specific scoped credentials, rotation, incident response and human approval; do not attach them to this public Worker.

## Tests and release evidence
Run \`npm run check && npm test && npm run workers:check\` (local or CI). The Vercel deployment pipeline validates the repository changes but does **not** deploy Cloudflare Workers. Cloudflare deployment must be confirmed by Wrangler exit status, Cloudflare deployment/version metadata, observed endpoint tests and approved DNS route configuration.

## Cloudflare documentation
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://developers.cloudflare.com/workers/wrangler/environments/
- https://developers.cloudflare.com/workers/wrangler/install-and-update/
