import test from "node:test";
import assert from "node:assert/strict";
import {parseDraft,fingerprint,DOCUMENTS} from "../lib/envelopes.js";
const sample=()=>({title:"Rental packet — internal draft",documents:["RR-001","RR-003","RR-006"],recipients:[
{name:"Rental reviewer",email:"review@example.org",role:"COMPANY_APPROVER",order:1},
{name:"Sample signer",email:"sample@example.org",role:"RENTER",order:2}
],expires_in_days:7});
test("registry includes separate waiver and E-SIGN disclosures",()=>{assert.ok(DOCUMENTS.some(x=>x.code==="RR-004"));assert.ok(DOCUMENTS.some(x=>x.code==="RR-009"));});
test("valid draft is never signed/issued",()=>{const r=parseDraft(sample());assert.equal(r.state,"DRAFT");assert.equal(r.recipients.length,2);assert.match(fingerprint(r),/^[a-f0-9]{64}$/);});
test("duplicate recipient cannot be included",()=>{const b=sample();b.recipients.push({...b.recipients[0]});assert.throws(()=>parseDraft(b),/duplicate_recipient/);});
test("unrecognized document refused",()=>{const b=sample();b.documents=["RR-999"];assert.throws(()=>parseDraft(b),/invalid_documents/);});
test("oversized expiry refused",()=>{const b=sample();b.expires_in_days=60;assert.throws(()=>parseDraft(b),/invalid_expiry/);});
test("unknown recipient role refused",()=>{const b=sample();b.recipients[0].role="UNRESTRICTED";assert.throws(()=>parseDraft(b),/invalid_recipient/);});
test("email addresses normalized",()=>{const b=sample();b.recipients[0].email="  REVIEW@EXAMPLE.ORG ";assert.equal(parseDraft(b).recipients[0].email,"review@example.org");});
