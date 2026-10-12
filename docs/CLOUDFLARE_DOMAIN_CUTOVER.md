# R-RENT Cloudflare → Vercel production domain checklist

**Verified on October 11, 2026 (US Central):**

- Vercel project ID: `prj_tQ4ZCfu1JUazUadRuMOwOXq5rlKi`
- Project: `r-rent-rental-cars`
- Existing domain assignments: `rtpscrentalcars.com`, `www.rtpscrentalcars.com` (both Vercel `verified: true`)
- Cloudflare nameservers: `kiki.ns.cloudflare.com`, `keaton.ns.cloudflare.com`
- Current Vercel domain check: **misconfigured** for apex and www.
- Apex DNS check saw current `A = 18.232.7.146`, which is not Vercel's recommended target.
- Vercel's recommended apex DNS record: `@ IN A 76.76.21.21`.
- Vercel's recommended www record: `www IN CNAME cname.vercel-dns.com.`.

## Authorized Cloudflare change procedure

1. Open the existing `rtpscrentalcars.com` zone in the **authorized Cloudflare account**.
2. Inventory current `@` and `www` A/AAAA/CNAME records, record IDs, proxy modes and TTLs; export the zone as a backup. Review whether the existing apex target serves another workload.
3. If the cutover is approved and no conflicting service remains, change **website routing records only**: set apex (`@`) to A `76.76.21.21`, and `www` to CNAME `cname.vercel-dns.com`. Use **DNS only** while Vercel validates TLS/routing.
4. Do **not** change nameservers, MX, SPF/DKIM/DMARC, TXT verification, mail host records, Workers routes, or existing Cloudflare Access policies.
5. Confirm both domains through Vercel Project → Domains and check valid HTTPS certificates. Visit `/`, `/fleet`, `/book`, `/app`, `/locations`, `/business`, `/deals`, and `/contact`.
6. Test real response codes for `/luxury-experience.js`, `/luxury-experience.css`, `/manifest.webmanifest`, `/sw.js`; JS and CSS must **not** receive HTML responses.
7. Configure a **single** apex/www canonical redirect only after both hosts work. If re-enabling Cloudflare orange-cloud proxy, evaluate Cloudflare SSL mode Full (strict), redirect loops, DNSSEC and certificate coverage.
8. Preserve protected/disabled transactional gates. Do not enable booking, payment or ID uploads as a side effect of DNS release.

**Status:** Source and Vercel deployment may be READY without a functioning custom hostname. No Cloudflare DNS mutation is claimed until executed and independently verified. This guide is not an authorization token and does not contain credentials.
