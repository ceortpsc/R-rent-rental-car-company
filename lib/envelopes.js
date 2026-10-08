import {createHash,randomUUID} from "node:crypto";

export const DOCUMENTS=Object.freeze([
  {code:"RR-001",title:"Vehicle Rental Agreement",requires_initials:true},
  {code:"RR-002",title:"Vehicle Condition and Return",requires_initials:true},
  {code:"RR-003",title:"Insurance and Coverage Election",requires_initials:true},
  {code:"RR-004",title:"Optional Damage Waiver Election",requires_initials:true},
  {code:"RR-005",title:"Additional Authorized Driver",requires_initials:true},
  {code:"RR-006",title:"Payment and Fee Disclosures",requires_initials:true},
  {code:"RR-007",title:"Fuel, Tolls and Mileage",requires_initials:true},
  {code:"RR-008",title:"Roadside and Incident Procedures",requires_initials:true},
  {code:"RR-009",title:"E-SIGN Electronic Consent",requires_initials:false}
]);
export const STATES=Object.freeze(["DRAFT","PENDING_INTERNAL_APPROVAL","READY_FOR_DELIVERY","ISSUED","VIEWED","PARTIALLY_SIGNED","COMPLETED","DECLINED","VOID","EXPIRED"]);
const allowedRoles=new Set(["RENTER","COMPANY_APPROVER","ADDITIONAL_DRIVER","WITNESS"]);
const docCodes=new Set(DOCUMENTS.map(d=>d.code));
export function parseDraft(body){
 if(!body || typeof body!=="object" || Array.isArray(body))throw new Error("invalid_request");
 const title=typeof body.title==="string"?body.title.trim():"";
 if(title.length<3||title.length>120)throw new Error("invalid_title");
 const docs=body.documents;
 if(!Array.isArray(docs)||docs.length<1||docs.length>15||docs.some(x=>!docCodes.has(x))||new Set(docs).size!==docs.length)throw new Error("invalid_documents");
 const recipients=body.recipients;
 if(!Array.isArray(recipients)||recipients.length<1||recipients.length>12)throw new Error("invalid_recipients");
 const clean=[];
 for(const item of recipients){
  const name=typeof item?.name==="string"?item.name.trim():"";
  const email=typeof item?.email==="string"?item.email.trim().toLowerCase():"";
  const role=typeof item?.role==="string"?item.role:"";
  const order=item?.order;
  if(!name||name.length>120||!email||email.length>254||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)||!allowedRoles.has(role)||!Number.isInteger(order)||order<1||order>12)throw new Error("invalid_recipient");
  clean.push({name,email,role,order});
 }
 if(new Set(clean.map(r=>r.email+"|"+r.role)).size!==clean.length)throw new Error("duplicate_recipient");
 const expiry=Number(body.expires_in_days??7);
 if(!Number.isInteger(expiry)||expiry<1||expiry>30)throw new Error("invalid_expiry");
 return {id:randomUUID(),title,documents:docs.slice(),recipients:clean.sort((a,b)=>a.order-b.order),expires_in_days:expiry,state:"DRAFT"};
}
export function fingerprint(draft){
 const canonical=JSON.stringify({title:draft.title,documents:draft.documents,recipients:draft.recipients,expires_in_days:draft.expires_in_days});
 return createHash("sha256").update(canonical).digest("hex");
}
