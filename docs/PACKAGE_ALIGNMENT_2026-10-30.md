# Uploaded enterprise outline: R-Rent implementation mapping

Source: parent-inspected `ROSS_TAX_PRO_MARKDOWN_PACKAGE.zip`, Library `libfile_b8e24aa2b51481918512b7a11144d197`. The archive contains eleven small Markdown documents, not runnable code. This mapping uses the inspected headings relayed by the parent; no archive scripts were executed and no stack migration is implied.

| Outline | Actual R-Rent implementation and gaps |
|---|---|
| Enterprise overview | R-Rent is the rental division described by this repository. Existing public branding remains Ross Tax Pro Software Company; this document makes no new legal entity claim or conflation with an Arkansas Co. entity. |
| Users → API Gateway → ANDREAA → Clearing House → Registries | Browser → same-origin Vercel API → explicit provider adapters/database. `api/v1/health.js` dispatches management to `lib/management-handler.js`; `lib/launch-registry.js` records source readiness. No ANDREAA, Clearing House or IRS integration is established by these names. |
| Sitemap | Public rental routes in `app.js`; policies in `legal-policies.js`; management, operations, signing and launch static routes in `vercel.json`; new staff notice `/staff-privacy`. Tax OS, Books, Payroll, CRM, Academy and Developer Portal are outside this repository. |
| Registration → Identity Verification → Dashboard → Workflows | No open renter registration. Approved staff invitation/verified identity → own MFA → server-bound membership → role-limited management. Independent approval required for privilege changes. Rental, insurance, signatures, payment and release remain separate evidence gates. |
| apps/, services/, infrastructure/ | Existing architecture uses root static files, `api/`, `lib/`, `supabase/migrations/`, `cloudflare/` and `workers/`; these are retained. |
| Next.js, NestJS, PostgreSQL, Redis, Python, AI | Actual static JavaScript/Node serverless code and source PostgreSQL migrations; no Next/Nest/Redis/Python migration required. Support knowledge logic does not constitute an autonomous transaction engine. |
| OAuth2, JWT, RBAC, OpenAPI, audit | `openapi.json`, `lib/rbac.js`, `lib/management-provider.js` and management SQL implement bounded interfaces. Public OAuth remains disabled; live provider identity, grants, SMTP and MFA are unverified. No persistent credential or admin changes were made. |
| E-file stages | Not a rental feature. No tax transmission or IRS acknowledgement implementation is claimed. |
| Google Cloud / Google Play / mobile | No verified targets here; mobile web layout has browser checks. No store publication or new cloud spend. |
| Build, test, security review, deploy, monitoring | 101 local Node22 tests, syntax and browser checks; existing Vercel project verified. Latest PR7 preview failed at 13 serverless functions on a 12-function plan. Management now reuses the existing dispatcher, preserving URL/security gates. Production review/provider evidence remain separate from source checks. |

Deployment boundary: do not activate management or any restricted feature simply because a source build succeeds. Preserve the current project audience, data and production rollback baseline. The uploaded outline supplies no logo, color or template replacement.
