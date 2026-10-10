# R-Rent Customer Care, Review Integrity, OAuth Gates and Refund Disclosures
**Release:** 2026-10-10. **Policy stage:** DRAFT for qualified Texas rental-law and insurance counsel review.

## Routes and CTAs
- \`/\` — premium rental hero; fleet, quote and support CTAs.
- \`/about\` — organization, division relationship and owner / brand ambassador; no fabricated founder photography.
- \`/contact\` — general email draft, billing assistance, complaints, feedback.
- \`/feedback\` — neutral feedback capture draft (not transmitted until sender acts).
- \`/reviews\` — accepts customer-written review draft; no fabricated or seeded ratings. Production public reviews need eligibility, moderation policy and faithful representativeness.
- \`/complaints\` — complaints compose-to-email experience; no false ticket numbers.
- \`/disputes\` — charge inquiry template with reference, amount, transaction date and explanation; never captures PAN/CVV/SSN.
- \`/refund-policy\` — no-refunds structure with mandatory legal exceptions and disclosures.
- \`/access\` — fail-closed OAuth access explainer.
- \`/security\`, \`/privacy\`, \`/terms\` — legacy compliance pages; update before handling production personal data.

## Payment/booking and no-refunds rule
Any lawfully nonrefundable rental charge must be clear **before** the customer accepts a price; specific earned charges and cancellation terms must be in the final document. Customer rights to correct mistakes, challenge charges, dispute with issuer, receive legitimate deposits/holds and receive statutorily required refunds are preserved. Texas Business & Commerce Code Chapter 91.055 imposes mandatory-fee disclosures and §91.057 requires qualifying unused damage-waiver refunds. Do not publish an absolute blanket “all sales final—no exceptions” statement. Do not preselect a damage waiver.

## Current delivery mechanics
The public customer-care form renders **locally**. Submit opens a compose-to-email draft using the existing CEO contact address; a user must review and send. No server receipt, case reference or email delivery is claimed. Do not solicit government IDs, credit card details, insurance declarations or other confidential records in public feedback channels. Mark executive inbox as not verified for staffed rental case support.

## Authenticated API contract (future activation)
- \`GET /api/v1/auth-status\` — public safe status flags only; does not authenticate.
- \`GET /api/v1/support-cases\` — bearer-authenticated current user's cases, filtered by tenant.
- \`POST /api/v1/support-cases\` — bearer-authenticated creation with validated category and message, refusal of obvious highly sensitive data, per-user cool-down and server-generated case ID.
- Both support routes fail closed until \`SUPABASE_URL\`, \`SUPABASE_ANON_KEY\`, \`SUPABASE_SERVICE_ROLE_KEY\` plus \`RR_ENABLE_OAUTH=true\` and \`RR_ENABLE_CASES=true\`, an approved migration, and secured identity-provider configuration.
- No public OAuth sign-in button is active: implement authorization code + PKCE with callback / state verification and same-site secure session handling, independently tested provider token validation, login/logout, staff MFA and protected portal pages before enabling the two feature flags.
- \`supabase/migrations/20261010_002_support_cases.sql\` is authored but **not applied**.
- Case status must not be shown as resolved without authorized staff review; chargebacks remain independent of internal cases.

## Operational acceptance tests
1. Anonymous or unsigned POST/GET to case API must not access data.
2. Expired, revoked or forged tokens get 401; cross-tenant users cannot view or update cases.
3. Each staff role requires independent verified MFA and least-privilege role mapping.
4. Provider webhook and payment investigation cannot accept unsigned or replayed events.
5. All cancellation/refund disclosures must appear before the payer's final acceptance.
6. Cover legitimate negative reviews, unbiased publication, and correction/appeal; no review coercion.
7. Test links, all nav destinations, screen readers, small viewports, and no client-side injection.
8. Separate **preview** from **live** sign-in, payment and secure submission throughout site.
9. Install real helpdesk/contact email ownership, escalation, complaint response timings and record retention before activating cases.

## Primary regulatory sources
- Texas Business & Commerce Code Chapter 91: https://statutes.capitol.texas.gov/Docs/BC/htm/BC.91.htm
- FTC consumer review rule: https://www.ftc.gov/business-guidance/resources/consumer-reviews-testimonials-rule-questions-answers
- CFPB credit card charge disputes: https://www.consumerfinance.gov/ask-cfpb/how-do-i-dispute-a-charge-on-my-credit-card-bill-en-61/
