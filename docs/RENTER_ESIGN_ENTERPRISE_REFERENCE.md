# R-Rent signer interface and agreement review

Status: **DRAFT / PREVIEW — no legally executed agreement**. Updated 2026-10-09.

## Intent
Provide a real signer-facing design path for the renter designated **Trevon** without putting a real renter's identifying information in the public GitHub repository. Renter identity, invitation, credentials, exact PDF version, and legal signing event must be supplied at runtime through an authenticated signing provider.

## Signer responsibilities and order
1. Verify recipient identity with a trusted provider, exact tenant and agreement authorization.
2. Present complete immutable agreement packet including renter, company, vehicle, dates, pickup/return details, itemized fees/taxes/deposits and coverage provisions.
3. Show required sections with separate initials: rental/condition, charges/deposit, insurance/incident, fuel/mileage/return; actual provider must anchor fields to exact document pages and save who, when, where and revision.
4. Show an explicit separate acceptance or decline of each **optional** damage waiver or protection product, with prices, coverage conditions and legal disclosures. Never preselect.
5. Supply the full federal E-SIGN consumer disclosure, including access requirements, paper-copy rights and fees, withdrawal process, and an affirmative electronic-consent mechanism. Do not conflate this with acceptance of rental terms.
6. Capture attributed signature, signing date/time using provider server timestamp, required initials and completion certificate; do not trust browser-entered date alone.
7. Deliver accessible customer and company PDF copies with audit certificate and verified retention policy.
8. Any decline, missing required field, mismatched identity, changed document version or missing verified payment/insurance stops execution; staff handles alternatives.

## Comparison reference (structural only)
Enterprise's publicly available rental paperwork and FAQ distinguish renter/vehicle identity, authorized additional drivers, in/out condition and mileage, rental charges, and separate elections for optional coverage/waivers. R-Rent uses those concepts as a structural checklist, **not copied Enterprise contractual wording, logo, prices, signature blocks, or documents**. Sources: https://www.enterprise.com/en/car-rental-faqs/us-insurance-and-protections/car-rental-insurance.html and https://static.nhtsa.gov/complaints/10246253/10246253-AF0DEE51135E02CAE05375E8789808C8.pdf

## Implementation in this repository
- `sign.html`: fourth-stage tabs now contain a required opt-in, four initial fields, a separate coverage election, signature name, manual sample date and explicit decline action.
- `sign.js`: validates field completion and name match in browser memory. **Do not interpret local validation as consent or execution.**
- `sign.css`: accessible desktop/mobile form controls.
- Protected remote signing, invitation for Trevon, document attachment, provider verification, digital audit certificate and two-copy PDF export are **not implemented**. The send/invitation control remains disabled until verified backend and provider are connected.

## Required production gates
Legal/insurer document approval; renter consent disclosure; signing provider sandbox verification then production onboarding; authenticated invitation token; server-side access checks; idempotent envelope creation; immutable signed PDF and certificate; independent webhook verification; retention/access control; e-sign decline and paper workflow; receipt/customer copy; and release authorization checks.
