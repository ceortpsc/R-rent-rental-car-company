# Cloudflare → Vercel DNS runbook

Owned zone: \`rtpscrentalcars.com\`; production Vercel project: \`r-rent-rental-cars\`.

**Never delete existing MX, DKIM, SPF, DMARC, TXT verification, or other records.** Domain inclusion and verification in Vercel do not automatically prove that public DNS is correctly configured.

1. Open Cloudflare zone DNS records and **inspect existing records** for \`@\` and \`www\`; check for conflicting A/AAAA/CNAME entries.
2. Inspect each hostname in Vercel project → Settings → Domains to retrieve the **currently prescribed** DNS targets and any necessary TXT ownership proof. Never assume an IP address from memory.
3. Add only the necessary records to Cloudflare. Prefer DNS-only (gray-cloud) until Vercel and public resolvers confirm routing and certificate issuance.
4. If CAA records exist, confirm compatibility with the certificate issuer.
5. Verify Vercel project domain configuration, external DNS answers, HTTPS certificate and canonical redirect.
6. To proxy with Cloudflare later, choose SSL/TLS **Full (strict)** and retest origin HTTPS; avoid Flexible mode.
7. Optional: maintain \`www\` as a 308 redirect to the apex through the Vercel project once routing is verified.
8. Add \`book\`, \`portal\`, or \`admin\` subdomains **only when real separately protected services exist**.

DNS status must be reported as **pending** until actual public record lookups and HTTPS success can be demonstrated.
