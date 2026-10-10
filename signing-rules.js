// R-Rent signing sequence v0.4.0. Pure rules shared by the browser preview and Node tests.
// An in-memory review is NEVER an executed electronic signature.
export const DOCUMENTS=Object.freeze([
 {code:"RR-001",title:"Motor Vehicle Rental Agreement",initials:true,required:true,sections:["Vehicle: model, assigned unit and current condition to be verified against the final rental record.","Renter: the verified contract signer and only approved additional drivers.","Pickup and return: the dates, times and locations stated in the final signed rental agreement.","Availability and transfer of possession require operator confirmation; website estimates are not reservations."]},
 {code:"RR-002",title:"Pickup, Condition & Return Checklist",initials:true,required:true,sections:["Record actual odometer, fuel level, interior and exterior condition on pickup and return.","Photograph existing damage through an approved authenticated service; compare return evidence with intake.","Document keys, accessories, vehicle condition, and any agreed exceptions before release.","Any disputed condition charge requires an itemized explanation and supporting evidence."]},
 {code:"RR-003",title:"Insurance & Coverage Verification",initials:true,required:true,sections:["Valid driving eligibility and acceptable coverage are required for every approved driver and rental period.","The proposed $9.00/day coverage quote is not insurance and does not bind any protection.","Renter's own insurance card and declarations are subject to actual insurer/coverage confirmation.","Approval may not proceed unless the applicable insurance provider, limits, exclusions and underwriting are confirmed."]},
 {code:"RR-004",title:"Optional Damage Waiver Election",initials:true,required:true,election:"waiver",sections:["A damage waiver is optional; it is not an insurance policy.","The final contract must disclose price, exclusions and any mandatory statutory notices.","An explicit ACCEPT or DECLINE selection is required; no option is preselected.","Qualifying unused damage-waiver charges must be refunded as required by Texas law."]},
 {code:"RR-005",title:"Authorized Driver Addendum",initials:true,required:true,election:"drivers",sections:["Only drivers individually approved by R-Rent may operate the vehicle.","Every additional driver needs separate license eligibility, age/coverage review and signed authorization.","No additional driver is approved by merely checking a box in the preview.","Actual names and identifiers must be captured only through secure access-controlled systems."]},
 {code:"RR-006",title:"Rental Charges, Tax & Payment Authorization",initials:true,required:true,sections:["2026 Chevrolet Trailblazer published starting reference: $59.00 per day.","2026 Ford Bronco Sport Big Bend published starting reference: $89.99 per day.","Optional proposed coverage estimate: $9.00 per day, only if separately chosen; not bound insurance.","Final charges, legally applicable taxes, deposit/hold, refundable amounts and fees must be shown before payment.","Payment settlement must be independently verified using provider-signed webhooks and reconciliation."]},
 {code:"RR-007",title:"Fuel, Mileage, Tolls & Return Addendum",initials:true,required:true,sections:["The final contract must state permitted rental mileage, fuel-return obligations and disclosed late fees.","Tolls, parking citations and additional charges require supporting evidence and itemized accounting.","Renter extensions require confirmed availability, approved price and verified coverage for the extension."]},
 {code:"RR-008",title:"Roadside, Accident & Damage Reporting",initials:true,required:true,sections:["For an emergency, contact local emergency services and follow applicable law.","Report vehicle incidents promptly using verified R-Rent and insurance-provider channels.","Preserve incident, vehicle-condition and payment records through restricted systems.","Disputed additional charges must be human-reviewed before concluding they are owed."]},
 {code:"RR-009",title:"Electronic Records & Signature Consent",initials:false,required:true,election:"esign",sections:["A consumer must be presented with complete electronic records disclosures before affirmative electronic consent.","The production notice will specify technical requirements, withdrawal procedure, paper alternatives and access/copy options.","A signer may decline electronic signing and request an appropriate non-electronic alternative.","This public demonstration cannot issue or accept legally binding signatures."]},
 {code:"RR-010",title:"Privacy, Final Packet & Copy Delivery",initials:false,required:true,sections:["Review the current R-Rent Privacy Policy, Terms of Service and lawfully disclosed cancellation/refund terms.","The final production system must make the exact immutable agreement version available for review.","When the provider verifies completion, customer and company copies must be generated and securely delivered.","This preview creates no audit certificate, server-backed agreement, signed PDF, recorded GPS, or delivered copy."]}
]);
export const CODES=Object.freeze(DOCUMENTS.map(d=>d.code));
const initialRegExp=/^[A-Za-z]{1,8}$/;
export function blankReview(){return {reviewed:Object.create(null),initials:Object.create(null),elections:Object.create(null),esignConsent:false,sampleSigner:"",sampleSignature:"",sampleDate:"",declined:false,prepared:false};}
export function validateDocument(code,ack={}) {
 const doc=DOCUMENTS.find(d=>d.code===code);
 if(!doc)return {ok:false,error:"unknown_document"};
 if(ack.reviewed!==true)return {ok:false,error:"review_required"};
 if(doc.initials&&!initialRegExp.test(ack.initials||""))return {ok:false,error:"initials_required"};
 if(doc.election==="waiver"&&!["accept","decline"].includes(ack.election))return {ok:false,error:"separate_waiver_election_required"};
 if(doc.election==="drivers"&&!["none","request_review"].includes(ack.election))return {ok:false,error:"additional_driver_choice_required"};
 if(doc.election==="esign"&&ack.consent!==true)return {ok:false,error:"affirmative_esign_opt_in_required"};
 return {ok:true,error:null};
}
export function getProgress(review){
 let completed=0;
 for(const d of DOCUMENTS)if(review?.reviewed?.[d.code]===true&&(!d.initials||initialRegExp.test(review.initials?.[d.code]||""))&&
 (!d.election||d.election==="esign"&&review.esignConsent===true||d.election!=="esign"&&
 (d.election==="waiver"?["accept","decline"].includes(review.elections?.waiver):["none","request_review"].includes(review.elections?.drivers))))completed++;
 return {completed,total:DOCUMENTS.length,percent:Math.round(completed*100/DOCUMENTS.length)};
}
export function validateLocalReview(review){
 if(!review||review.declined)return {ok:false,error:"electronic_signing_declined"};
 if(getProgress(review).completed!==DOCUMENTS.length)return {ok:false,error:"review_incomplete"};
 if(review.esignConsent!==true)return {ok:false,error:"esign_consent_missing"};
 if(typeof review.sampleSigner!=="string"||review.sampleSigner.trim().length<2||review.sampleSigner.length>120)return {ok:false,error:"sample_signer_required"};
 if(review.sampleSignature.trim().toLocaleLowerCase()!==review.sampleSigner.trim().toLocaleLowerCase())return {ok:false,error:"sample_signature_must_match"};
 if(!/^\d{4}-\d{2}-\d{2}$/.test(review.sampleDate)||!Number.isFinite(Date.parse(review.sampleDate+"T12:00:00Z")))return {ok:false,error:"sample_date_required"};
 return {ok:true,status:"LOCAL_REVIEW_ONLY",executed:false,certificate:false};
}
export const SERVER_GATES=Object.freeze(["approved_contract_revision","authorized_signer_identity","compliant_esign_consent_evidence","insurer_coverage_verified","exact_final_invoice_verified","confirmed_fraud_review","provider_signature_verified","verified_completion_webhook","immutable_signed_artifact","provider_audit_certificate","customer_delivery_receipt","company_delivery_receipt"]);
export function productionReadiness(evidence={},isTrustedServer=false){
 // Cannot be satisfied with browser-originated checkboxes or locally entered IDs.
 const missing=SERVER_GATES.filter(g=>!isTrustedServer||evidence?.[g]?.verified!==true||!evidence?.[g]?.evidence_id||!evidence?.[g]?.verified_at);
 return {ready:missing.length===0,missing,execution_enabled:false,source:isTrustedServer?"server_evidence_assessment":"untrusted_preview"};
}
