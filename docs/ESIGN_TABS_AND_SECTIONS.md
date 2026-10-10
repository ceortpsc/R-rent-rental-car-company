# R-Rent E-Sign Tabs & Sections | UX / Controls / Routing
Document ID: RR-ESIGN-UX-002
Revision: 1.0
Last updated: October 10, 2026
Owner: Ross Tax Pro Software Company — R-Rent Rental Car Division
Status: Implemented unsigned public preview; production signing not enabled.

## Public routes and audience
- `/sign` — internal envelope composer + signature/initials practice + renter opt-in sample + evidence; now includes **Guided e-sign sections** fifth tab.
- `/signing` — original branded guided review with six tabs. This is the primary review UX, and it never captures legally binding signatures in its present public mode.
- `/agreements` — rental contract and addenda descriptions, links to the guided review.
- `/api/v1/envelopes` — public template registry; privileged draft submission gated by staff MFA, encrypted database and valid config. Actions other than `draft` return explicit locked errors.
- Production e-sign service and signed-copy API endpoints do not yet exist.

## Six guided signing tabs

| # | Tab | Interface sections | Interaction and outcome | Guard |
| --- | --- | --- | --- | --- |
| 1 | Documents | 10 immutable-template preview sections, version disclosures, review checkbox | Mark reviewed and enter required initials; go next/back | Every section independently validated; browser memory only |
| 2 | Initials & elections | Per-document status, initials, waiver election, additional-driver election | Open an individual document for correction; status updates | Waiver separately accepts/declines; no preselection |
| 3 | E-SIGN consent | Documents/access requirements, technical prerequisites, paper alternatives, electronic choice | Open RR-009 to choose the **local preview** opt-in or decline and reset review | No consent auto-granted; not the legally operative E-SIGN disclosure |
| 4 | Signature & date | Typed sample display name, matched practice signature, user-chosen practice date | Prepare unsigned review summary | Disabled until all 10 reviewed and preview E-SIGN opt-in present; no provider timestamps |
| 5 | Verification gates | Driver and insurance, billing, e-sign identity, signed PDFs and delivery | Read-only diagnostics and disclosures | All third-party evidence remains not verified |
| 6 | Copies & audit | Unsigned review-copy status, signed-certificate and delivery status; print after review | Browser print-to-PDF **unsigned review copy** | No “successfully signed” state, certificate, email delivery, or provider record |

Additional static production status remains visible below the tabbed workspace.

## Navigation and state contracts
- The active tab has `role=tab`, `aria-selected=true`, `aria-controls` to its view and visible focus styling. Arrow/Home/End move keyboard focus across tabs.
- Browser interactions never alter server-side roles, provider status, contract state or payment records.
- `canEnterSignerReview(review)` requires all ten document sections acknowledged, valid sample initials where required, separate waiver and driver elections, preview E-SIGN consent, and no prior decline.
- The user can reset a declined/incomplete browser preview; no third-party signing instruction is issued.
- Navigating to the copies tab before local preparation shows unfulfilled delivery information instead of a fabricated receipt.
- Signer sample name/date are practice data; no permanent database, e-sign certificate or signed copy is generated.

## Production backend requirements for real signing
1. Legal counsel approves the complete final versioned rental agreement and every applicable addendum.
2. Authenticated signer invitation; verified identity and secure session, with separate company approver role.
3. Present the complete federally required electronic-records consent disclosures and prove affirmative acceptance.
4. Render the exact final PDF, anchor each required initial, optional election, signature and date to correct document coordinates.
5. Secure provider records signer attribution and UTC signing event; independent webhook signature verification validates completion.
6. Store the immutable signed artifact with SHA-256, provider audit certificate and least-privilege encrypted access.
7. Deliver renter and company copies via verified private channels, record delivery receipts and allow paper alternative.
8. Complete license/insurance, itemized price, payment settlement and human vehicle-release checks independently.

## Prohibitions
No fake signer URL, no user-private ID/GPS upload in the public preview, no claiming signed/verified/paid after tapping a button, no automatic AI approval, no storing raw signatures or personally identifying details in analytics or public source control.

## Acceptance
Run `npm run check && npm test`. A successful Vercel deployment validates code build, not authenticated e-signature production readiness. Real provider integration remains a separate project milestone.
