# R-Rent Production Runbook

1. Repository: ceortpsc/R-rent-rental-car-company. Project: Vercel r-rent-rental-cars. Run npm run check and npm test. Production branch main. Verify commit SHA and public release URL.
2. DNS: read exact Vercel target for rtpscrentalcars.com and www; preserve all existing Cloudflare mail/security records; use DNS-only while validating cert, then if proxy enabled Full (strict). Independently check HTTPS, response headers and public routes.
3. Database: create or select a **dedicated** R-Rent Supabase project. The historical connected project was inactive and is NOT presumed authorized. Review and apply the SQL migration with backup after consent; test tenant isolation, ID scoping, collision exclusion and deny-by-default roles. Establish private storage with malware scanner.
4. Credentials: use production secrets only in Vercel encrypted environment settings; .env.example is an empty manifest. RR_ENABLE_* flags default false. Rotate keys and review account permissions periodically.
5. Insurer: obtain written rental-use authorization, actual carrier, limits/exclusions, claims number and lawful insurance add-on pricing. Ensure vehicles' lien/lease terms allow commercial rentals.
6. Legal: counsel approve revisions to agreement/addenda, Chapter 91 statutory notices and damage waiver refund rules, e-sign disclosures and all fees.
7. Payments: provision the R-Rent merchant profile separately from unrelated tax-preparation accounts; test payment auth, webhook duplicate signatures, capture, settlement, refunds, hold release, card disputes and matching final invoice.
8. E-sign: vendor verify signer consent, identity and PDF hash, keep certificate and downloadable customer/company copies, handle declined/revoked consent.
9. Operational test: valid/expired license, lapsed coverage, oversize files, unauthorized users, duplicate holds, overlapping rentals, return earlier/later, webhook replay, charge failure, refund, insurance claim and fraud review.
10. Approval: only staffed fleet dispatch with MFA, evidence and two-person exceptions can authorize vehicle release.

On security incident: stop sensitive intake, restrict tokens, preserve logs, involve security/privacy lead and counsel. Never publish fake support phone numbers or false 24/7 coverage. Roll back website by known-good Vercel SHA; database rollback requires controlled backup.
