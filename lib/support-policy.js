// Public R-Rent customer-service policy intelligence.
// This is an operational rules engine, not an authenticated AI account or LLM provider.
// Customer text is never echoed, stored, sent to a generative model, or trusted as a command.
export const AGENT_PROFILE=Object.freeze({
 id:'andrea-r-rent-support',displayName:'Andreaa | R-Rent Support',type:'automated-policy-assistant',
 owner:'Ross Tax Pro Software Company — R-Rent division',
 languages:['en'],version:'1.0.0',persona:'Professional, concise, accessible, policy-governed',
 public_access:true,records_access:false,can_issue_refund:false,can_sign:false,
 can_confirm_payment:false,can_verify_coverage:false,can_release_vehicle:false,
 external_model_connected:false,reply_mode:'curated-policy-guidance'
});
const ROUTES=Object.freeze(['/book','/fleet','/fees','/agreements','/signing','/requirements','/refund-policy','/privacy','/terms','/contact','/complaints','/disputes','/resources']);
const KB=Object.freeze([
 {id:'safety',patterns:[/\b(accident|collision|emergency|injur|unsafe|breakdown|stranded|theft)\b/i],priority:100,
 answer:'For an immediate emergency, contact local emergency services. Do not operate an unsafe vehicle. When safe, document the situation and contact the rental team using the authorized channel. I cannot open an insurance claim or dispatch roadside assistance.',
 links:['/contact','/requirements'],human:true},
 {id:'private-data',patterns:[/\b(password|ssn|social security|driver.s? license number|date of birth|credit card number|cvv|passport|bank account|account number)\b/i],priority:95,
 answer:'Please do not enter ID numbers, insurance documents, credit-card details, banking credentials or passwords in this public chat. R-Rent private document upload and account verification remain disabled pending secure infrastructure.',
 links:['/privacy','/contact'],human:true},
 {id:'return',patterns:[/\b(return|drop.off|dropoff|keys|fuel|mileage|late|inspection|hand.over)\b/i],priority:85,
 answer:'Prepare for return: confirm the scheduled time and agreed location; remove personal belongings; check fuel level and mileage against your agreement; photograph vehicle condition through an approved channel; gather keys and accessories; and request a documented check-in and itemized final statement. Do not assume an unattended drop-off is authorized, or leave keys unsecured. Contact staff if you will be late.',
 links:['/resources','/contact','/terms'],human:false},
 {id:'signing',patterns:[/\b(sign|initial|signature|agreement|e.?sign|contract|consent|document|pdf)\b/i],priority:80,
 answer:'Use the R-Rent guided review to read all 10 sections, enter section initials, make an independent optional-waiver choice and review the E-SIGN disclosure. The current public pad is a browser-local preview; no legally executed rental, signed PDF or delivery certificate is produced until verified in-house signing is activated.',
 links:['/signing','/agreements','/privacy'],human:false},
 {id:'charges',patterns:[/\b(dispute|overcharg|wrong charge|chargeback|duplicate|billing error|refund request)\b/i],priority:77,
 answer:'You may request an itemized billing explanation and dispute a charge directly with R-Rent. A cardholder can also contact their card issuer; this chat does not limit those rights. Do not enter transaction identifiers or full card details here. Support case preparation does not automatically file a claim.',
 links:['/disputes','/refund-policy','/contact'],human:true},
 {id:'refund',patterns:[/\b(refund|cancel|non.?refundable|deposit|hold)\b/i],priority:74,
 answer:'Cancellation and nonrefundable charges depend on the final disclosed rental agreement and applicable law. Genuine refundable deposits/holds, billing corrections and qualifying statutory damage-waiver refunds are not eliminated by a general no-refunds statement. The refund policy remains subject to final legal review; this chat cannot authorize a refund.',
 links:['/refund-policy','/disputes','/contact'],human:true},
 {id:'payment',patterns:[/\b(pay|paid|balance|receipt|invoice|cash|chime|stripe|paypal|transaction)\b/i],priority:72,
 answer:'R-Rent public chat cannot view individual balances, verify cash or Chime transactions, or issue official receipts. A payment is only confirmed after authorized ledger or provider reconciliation. Use a verified company billing channel for a documented statement and keep your existing receipts.',
 links:['/disputes','/contact','/fees'],human:true},
 {id:'insurance',patterns:[/\b(insurance|policy|coverage|waiver|premium|protect|damage waiver)\b/i],priority:70,
 answer:'The $9.00/day optional insurance-related line is only a proposed estimate; it does not activate or prove coverage. Any approved product must have actual insurer documentation, legally appropriate disclosures and an explicit separate choice. A damage waiver is not insurance. Staff must verify the vehicle and approved driver before release.',
 links:['/requirements','/fees','/agreements'],human:true},
 {id:'price',patterns:[/\b(price|cost|rate|quote|day|trailblazer|bronco|suv|vehicle|rent)\b/i],priority:60,
 answer:'Published reference rates: 2026 Chevrolet Trailblazer $59.00/day; 2026 Ford Bronco Sport Big Bend $89.99/day. A proposed optional insurance-related estimate is $9.00/day, not bound coverage. Taxes, deposits, availability and actual terms require a final itemized and approved quote; the calculator does not reserve a vehicle.',
 links:['/book','/fleet','/fees'],human:false},
 {id:'eligibility',patterns:[/\b(eligible|driver|license|age|id|identity|verify|pickup|authorized)\b/i],priority:56,
 answer:'Before any vehicle release, R-Rent must verify driving privileges, authorized drivers, eligibility requirements, actual insurance, the signed rental agreement, billing/payment and a pre-drive inspection. Public chat cannot perform identity verification or accept confidential files.',
 links:['/requirements','/signing','/contact'],human:true},
 {id:'complaint',patterns:[/\b(complaint|feedback|review|bad service|customer service|manager|supervisor|representative|human)\b/i],priority:55,
 answer:'You may send a service complaint, feedback or a request for human review using the R-Rent customer contact pages. The public complaint form prepares an email draft only; a ticket is not filed until there is verified receipt from an authorized channel. Negative reviews are not automatically suppressed.',
 links:['/complaints','/feedback','/contact'],human:true},
 {id:'privacy',patterns:[/\b(privacy|data|delete|retention|records|security|breach|personal information)\b/i],priority:50,
 answer:'R-Rent currently operates public informational pages and local review tools; protected customer accounts and uploads are gated. Please avoid entering sensitive documents in chat. The privacy policy explains current data handling and how to request applicable privacy rights.',
 links:['/privacy','/contact'],human:true}
]);
const cleanText=text=>typeof text==='string'?text.trim():'';
export function evaluatePublicSupport(message){
 const s=cleanText(message);
 if(s.length<2||s.length>600)return {ok:false,status:'invalid_input',answer:'Enter a short question (2–600 characters). Do not include confidential information.',links:['/contact']};
 // Prevent the chat assistant being used as a collection point for sensitive identifiers.
 const privacyTriggers=[
  /\b\d{3}-\d{2}-\d{4}\b/,
  /\b(?:\d[\s-]?){13,19}\b/,
  /\b[A-Za-z0-9_.%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
  /\b(?:sk-|eyJ[A-Za-z0-9_-]{20,})/,
  /\b(?:password|secret|pin|token)\s*[:=]\s*\S+/i
 ];
 if(privacyTriggers.some(r=>r.test(s)))return {ok:false,status:'sensitive_content_blocked',
  answer:'Please remove email addresses, payment or ID numbers, access tokens and other personal details. This chat cannot securely collect them.',
  links:['/privacy','/contact']};
 const matched=KB.filter(k=>k.patterns.some(p=>p.test(s))).sort((a,b)=>b.priority-a.priority);
 const k=matched[0];
 if(!k)return {ok:true,status:'guidance',intent:'general',
  answer:'I can help you find published R-Rent information about quotes, documents, signing, returns, insurance disclosures, payments and customer complaints. I cannot access your private rental record or make account decisions. For a specific concern, contact an authorized R-Rent representative.',
  links:['/resources','/contact','/terms'],handoff:true};
 return {ok:true,status:'guidance',intent:k.id,answer:k.answer,links:k.links.filter(x=>ROUTES.includes(x)),
  handoff:k.human,authoritative_personal_record:false};
}
export function publicCapabilities(){return {
 name:AGENT_PROFILE.displayName,identity:'AUTOMATED_ASSISTANT',model_connected:false,
 live_customer_records:false,actions_enabled:[],
 supported_topics:KB.map(x=>x.id),source_type:'approved_public_policy',
 notice:'Answers are curated policy guidance, not decisions on your private rental.'};
}
