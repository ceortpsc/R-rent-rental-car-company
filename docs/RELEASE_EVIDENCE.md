# Verified Build and Remaining Acceptance Gates — R-Rent v0.2.1

## Confirmed on Vercel
- GitHub commit \`dd2e30565ce0fd648d6d699899204210834407c2\` was built as production deployment \`dpl_4mr7e8sZM9VxzkqJZnyAQjRRDCEQ\`.
- Vercel deployment state: **READY**, without deployment error.
- Vercel aliases assigned: \`rtpscrentalcars.com\`, \`www.rtpscrentalcars.com\`, \`r-rent-rental-cars.vercel.app\`.
- Build ran \`npm run check\`: **18 syntax checks passed; 0 failed**.
- Build ran \`npm test\`: **9 tests passed; 0 failed, 0 skipped**, covering fleet safety status, short/long rental durations, taxes, invalid dates, unpriced Bronco and Stripe HMAC verification.
- Previous function-count build failure was resolved by consolidating to 11 serverless functions within existing Vercel Hobby plan.

## Evidence NOT established
- Cloudflare authoritative DNS and public certificate chain/HTTPS were not independently confirmed; no authenticated Cloudflare DNS changes were performed.
- No end-to-end browser test against the live domain was obtained through available network tools.
- Connected historical Supabase project remained INACTIVE; no database migration executed.
- Existing visible Stripe credentials were a different company's sandbox; not authorized for R-Rent payments.
- PayPal production merchant, insurance carrier, driver's-license verification provider, secure document vault, e-sign signing service, refund/settlement ledger, and approved operational staff are not connected.
- No renter files or personal data were seeded in the public repository, and no customer was charged, signed or vehicle-released.
- The legal drafts require qualified Texas counsel and insurer sign-off before real-world use.

## Next release gates
1. Verify DNS A/CNAME in Cloudflare match Vercel's **project-specific** values, with TLS and routing checks.
2. Provision dedicated R-Rent database + backup, migrate with review, validate RLS, anti-overlap constraint and authorization tests.
3. Configure private storage and document malware scanning; verify insurance and driver-vendor contracts.
4. Approve exact statutory disclosures, all mandatory charges, local taxes, insurance costs, refund methods and customer support.
5. Provision merchant accounts; test provider-native tokenized card/PayPal flows, signed webhooks, immutable settlement and disputes.
6. Integrate counsel-reviewed signing package and verified consent; only then conduct supervised end-to-end rental rehearsal.

**State:** Public code and Vercel deployment ready. Full rental transactions, policy underwriting and settlement remain intentionally gated.
