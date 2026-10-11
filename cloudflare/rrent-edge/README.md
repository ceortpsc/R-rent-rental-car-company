# R-Rent Cloudflare Workers / Wrangler / Zero Trust Access

**Document:** RR-CF-WORKER-001 · **Revision:** 1.0 · **Status:** Code prepared, cloud account binding and Access application **NOT verified or deployed**.

## 1. Why this Worker exists

The public R-Rent rental website remains hosted on Vercel. This Worker is an **independent, private edge authorization layer**. It is not the marketing website, is not an open CORS proxy, does not change `rtpscrentalcars.com` DNS and cannot be used to bypass e-sign/identity/insurance/payment/vehicle-release gates.

The screenshot shows a Cloudflare Zero Trust Access overview reporting three self-hosted applications and zero connected users; the screenshot does **not** disclose the application's AUD tag, team domain, exact policies, binding IDs, worker scripts or authenticated users. Do not infer that the apps are R-Rent or already protect this Worker.

## 2. Directory tree
```text
cloudflare/rrent-edge/
├── wrangler.jsonc       # staging and inactive production configuration
├── src/index.js         # Cloudflare Access identity gate + deny-by-default paths
├── package.json         # Wrangler scripts and test runner
├── .gitignore           # secrets and local state
└── README.md            # this operating manual

tests/cloudflare-access.test.js  # repo-wide Worker unit tests
```

## 3. Activate in dashboard (user-authorized Cloudflare account)

1. Open **Workers & Pages** and ensure the intended account and zone are selected.
2. Confirm `rrent-access-edge-staging` belongs in that account and that the **staging Worker** is not attached to the public rental apex.
3. Deploy staging only after authenticating Wrangler to that account:
   ```bash
   cd cloudflare/rrent-edge
   npm install
   npm run test
   npx wrangler whoami
   npx wrangler deploy --env staging
   ```
   Create and protect the Worker using **Workers & Pages → selected Worker → Access → Protect this Worker behind Access → All traffic**. This attaches Access to all Worker URLs; a hostname-only policy can miss other URLs.
4. Use a **DENY-by-default** Access policy. Include only **specifically approved staff identities or an approved staff group**, not Everyone. Require the approved corporate identity provider and MFA. Use short sessions and no broad Bypass policies. Do not add unverified recipients. For service-to-service jobs, configure dedicated service-token policies separately with expiry/rotation and explicit workload scopes.
5. Obtain the Cloudflare **Access Application Audience (AUD) Tag** for the application guarding the **Worker**. Set the per-environment secrets:
   ```bash
   npx wrangler secret put CF_ACCESS_AUD --env staging
   npx wrangler secret put RR_STAFF_ALLOWLIST --env staging
   ```
   `RR_STAFF_ALLOWLIST` must contain explicit approved corporate staff emails separated by commas, not wildcards. Do not paste access tokens or these secrets into chat, GitHub, screenshots or shell history. Use the prompt-based Wrangler commands.
6. Repeat only after staging access and deny tests pass for production; production config intentionally has **workers_dev=false**, **preview_urls=false** and **no route** so a production deployment does not take over any public hostname.
7. For a future protected management origin, use a **dedicated admin subdomain** after checking for existing DNS/CNAME conflicts, plus Worker-level Access and independently verified application RBAC. Do not replace apex A/CNAME or Vercel public routes.

## 4. Environment variables and safety defaults

| Key | Source | Usage |
|---|---|---|
| `RR_ENVIRONMENT` | version-controlled | `staging` or `production` only |
| `RR_PRIVATE_ACTIONS_ENABLED` | version-controlled | must be `false`; no proxy or privileged workflow |
| `CF_ACCESS_AUD` | per-environment secret | exact configured Worker Access AUD |
| `RR_STAFF_ALLOWLIST` | per-environment secret | comma-separated approved staff mailboxes |

`ctx.access` is populated only for requests authenticated by Cloudflare Access. This Worker compares the runtime's Access AUD to `CF_ACCESS_AUD` and requires a server-side allowlisted email. Requests supplying fake identity headers are not accepted. No JWT bearer header is treated as trustworthy without verification.

## 5. Routes and action gates

| Route | Access | Result |
|---|---|---|
| `GET/HEAD /v1/health` | Access + AUD + exact staff allowlist | public-safe operational status only |
| `GET/HEAD /v1/permissions` | same | confirms backend RBAC is independently required; no personal records |
| `/admin`, `/identity`, `/payments`, `/refunds`, `/agreements/issue`, `/signatures`, `/storage`, `/keys` | same | HTTP 503 fail-closed; no action performed |
| Any unknown path | same | 404 |
| Any other method | denied | 405 |

**Critical:** Even though Access confirms a person reached this Worker, the **Vercel/Supabase application** must independently authorize each person, tenant, assignment and action. Do not simply forward an Access email header to an exposed Vercel origin: users could bypass the Worker and call Vercel directly. A future authenticated origin-to-origin binding would need strong independent verification.

## 6. Test and rollback

Run from repository root: `npm test` (includes the Worker test suite). Run `npm --prefix cloudflare/rrent-edge test` for Worker-only checks. Deny cases include no Access, wrong AUD, empty/unknown allowlist, spoofed identity headers, unsupported methods, unknown endpoints and every privileged write.

For staging, check anonymous requests return 403; Cloudflare Access will typically show a login redirect at the edge. Confirm an authorized staff member with the correct AUD can read `/v1/health`. Confirm unauthorized users and unsupported operations are denied. Keep PII and secrets out of monitoring.

For rollback, remove any route added to the Worker, revoke Access application/service tokens as necessary, or disable/roll back the Worker deployment. Do not turn off Vercel's public R-Rent site. Record the deployment ID, policy change and approval.

## 7. Published Cloudflare references

- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Access for Workers](https://developers.cloudflare.com/workers/configuration/cloudflare-access/)
- [Worker-specific Access policies](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#protect-one-worker)

**This repository creates configuration and testable source only.** Deployment to the Cloudflare account, Access policy creation and DNS changes require a connected authenticated Cloudflare management capability and actual account/app identifiers.
