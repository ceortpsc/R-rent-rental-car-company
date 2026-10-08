# Integrations, Add-ons and Extensions Register

| Module | Implementation | Provider evidence required |
|---|---|---|
| Website, fleet catalog, quote | Implemented in repo | Publish and test on domain |
| Booking collision lock | Database SQL authored, not applied | Dedicated DB plus tests |
| Renter authentication | Supabase user-token validation code | Live dedicated project, RLS and consent |
| Secure driver/license uploads | Metadata endpoint only | Private bucket, scanner, permitted data vendor |
| Insurance card and declarations | Metadata endpoint only | Insurer verification and policy exclusions |
| Company insurance/protection | Not priced/connected | Carrier-issued product and filed disclosures |
| Stripe card checkout | API skeleton gated; no charge | Approved R-Rent account and final invoice ledger |
| PayPal checkout | API skeleton gated; no charge | Approved PayPal merchant and capture ledger |
| E-sign | Draft registry only | Signing vendor, counsel approved contract, consent |
| Fraud tools | Provider audit plan | 3DS/Radar or provider-authorized equivalent |
| AI Assist | Rule engine scaffold | Privacy controls and human reviewer |
| Notifications | Not connected | Verified transactional-mail identity |
| Admin/dispatch | Release hard-blocked | MFA/RBAC, documented human check |
| Marketplace for third-party hosts | Not implemented | Texas Ch.113 legal and insurance track |

Optional add-on candidates (not automatically activated or billed): additional approved driver, delivery, child seat, prepaid fuel, mileage extension, toll administration, roadside option, optional damage waiver, insurer-approved additional insurance coverage. Every item requires lawful availability, approved policy, tax treatment, separately disclosed price and customer opt-in if optional.

This is a readiness matrix, not a claim that a live connection exists.
