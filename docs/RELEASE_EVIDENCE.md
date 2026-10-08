# R-Rent Release Evidence Record — v0.2.1

## Evidence observed (October 2026)
- GitHub source repository: ceortpsc/R-rent-rental-car-company; main branch at c06d99393efc70559d00c3cce9a1edde03e63452 before this evidence update.
- Vercel project: r-rent-rental-cars under the connected account.
- First API deployment failed due to Vercel Hobby maximum 12 serverless functions; resolved by route consolidation to 11 functions.
- Corrected production deployment dpl_9ACZQnfEjvSU4QsfGEvhEiUQT3J5 returned **READY** in Vercel.
- Vercel aliases contain rtpscrentalcars.com, www.rtpscrentalcars.com, and r-rent-rental-cars.vercel.app.
- Source file spot checks confirmed README.md, app.js, api/v1/quote.js, contracts/RR-004_DAMAGE_WAIVER.md, SQL migration and Texas review documentation in GitHub.

## Limits to what this evidence establishes
- READY proves Vercel build and deployment acceptance, **not** that DNS, public external SSL, every browser route, webhook or application integration has passed a live runtime test.
- No authenticated Cloudflare DNS write access was available. The user's Cloudflare DNS records have not been programmatically modified.
- Connected Stripe context was a separate 254-Tax Consultants **test** account; it has not been used for R-Rent. PayPal merchant integration unconnected.
- The only visible Supabase project was INACTIVE and no dedicated database was selected; no SQL migration applied.
- No real identity verification, driver eligibility, insurance policy, company coverage, signature provider, payment capture, ledger or vehicle release has been performed.
- The test suite is committed; an independent successful GitHub Actions test result was **not** observed in the connected check status, which only showed successful Vercel deployment.

## Required verification gate
1. Execute \`npm run check\` and \`npm test\` in a trusted runner and preserve their output.
2. Check \`GET /api/v1/health\`, \`GET /api/v1/vehicles\`, \`GET /api/v1/readiness\`, and \`POST /api/v1/quote\` over verified HTTPS, against production domain and Vercel alias.
3. Check invalid methods/quotes return 405/422 and all gated transactional paths reject with 401/403/503.
4. Confirm Content-Security-Policy, HSTS, referrer controls, mobile navigation and read-only visibility.
5. Confirm DNS authoritative answers, Cloudflare certificate chain and strict TLS.
6. Keep financial, identity, insurer, signing and dispatch gates OFF until independent vendor agreements, secure credentials and service-level tests are approved.
