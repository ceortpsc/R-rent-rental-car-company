import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DOCUMENTS,blankReview,canEnterSignerReview,getProgress} from "../signing-rules.js";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("e-sign workspace displays six accessible navigation tabs and real panels",()=>{
 const html=read("signing.html");
 for(const [key,panel] of [["documents","doc-stage"],["initials","initials-stage"],["consent","consent-stage"],["signature","signature-stage"],["verification","verification-stage"],["copies","receipt-stage"]]){
  assert.ok(html.includes('data-review-tab="'+key+'"'),"Missing tab "+key);
  assert.ok(html.includes('id="'+panel+'"'),"Missing panel "+panel);
  assert.ok(html.includes('aria-controls="'+panel+'"')||key==="copies"&&html.includes('aria-controls="delivery-stage receipt-stage"'));
 }
 assert.equal((html.match(/data-review-tab=/g)||[]).length,6);
 assert.match(html,/role="tablist"/);
 assert.match(html,/aria-live="polite"/);
 assert.match(html,/id="delivery-stage"/);
});
test("E-SIGN tab sections preserve required acknowledgments and separate coverage election",()=>{
 const html=read("signing.html"),rules=read("signing-rules.js"),js=read("signing-workflow.js");
 assert.ok(html.includes("Initials &amp; optional elections"));
 assert.ok(html.includes("Electronic records &amp; consent"));
 assert.ok(html.includes("Signature &amp; date"));
 assert.ok(html.includes("Identity, insurance &amp; payment gates"));
 assert.ok(html.includes("Copies &amp; audit status"));
 assert.ok(html.includes("Reset local review"));
 assert.match(rules,/separate_waiver_election_required/);
 assert.match(rules,/affirmative_esign_opt_in_required/);
 assert.match(js,/renderInitialsSummary/);
 assert.match(js,/canEnterSignerReview\(review\)/);
 assert.match(js,/openDocument\("RR-009"\)/);
 assert.match(js,/review=blankReview\(\)/);
});
test("signer tab denies incomplete review, missing opt-in and declined consent",()=>{
 const review=blankReview();
 assert.equal(canEnterSignerReview(review),false);
 for(const doc of DOCUMENTS){review.reviewed[doc.code]=true;if(doc.initials)review.initials[doc.code]="TF";}
 review.elections.waiver="decline";review.elections.drivers="none";
 assert.equal(getProgress(review).completed,9);
 assert.equal(canEnterSignerReview(review),false);
 review.esignConsent=true;
 assert.equal(getProgress(review).completed,10);
 assert.equal(canEnterSignerReview(review),true);
 review.declined=true;
 assert.equal(canEnterSignerReview(review),false);
});
test("old envelope workspace links to guide but never claims e-sign delivery",()=>{
 const old=read("sign.html"),newMarkup=read("signing.html"),newJs=read("signing-workflow.js");
 assert.ok(old.includes('data-tab="guided"'));
 assert.ok(old.includes('id="view-guided"'));
 assert.ok(old.includes('href="/signing"'));
 assert.ok(newMarkup.includes("DOCUMENT REVIEW WORKSPACE — NOT EXECUTED"));
 assert.ok(newMarkup.includes("Not performed")||newMarkup.includes("Not verified"));
 assert.ok(newJs.includes("Not generated"));
 assert.ok(newJs.includes("Not sent"));
 assert.ok(newJs.includes("Print / Save")===false); // button copy belongs to HTML
});
