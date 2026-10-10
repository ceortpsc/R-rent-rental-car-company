import {DOCUMENTS,blankReview,validateDocument,getProgress,validateLocalReview,SERVER_GATES} from "./signing-rules.js";
const $=id=>document.getElementById(id);
const safe=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
let review=blankReview(),active=0;
const notices={
review_required:"Check the document review acknowledgment to continue.",
initials_required:"Enter 1–8 letters for this document's sample initials.",
separate_waiver_election_required:"Select ACCEPT or DECLINE for the optional damage waiver. Neither choice is preselected.",
additional_driver_choice_required:"Choose whether there are no additional drivers or a separate verified driver review is needed.",
affirmative_esign_opt_in_required:"Affirmatively opt in to the displayed electronic-records preview disclosure or decline electronic signing.",
review_incomplete:"Review and acknowledge all ten sections before preparing a summary.",
esign_consent_missing:"Electronic-records preview consent is missing.",
sample_signer_required:"Provide a sample signer name of at least two characters.",
sample_signature_must_match:"Type the same sample name in the signature preview field.",
sample_date_required:"Select a sample review date.",
electronic_signing_declined:"Electronic signing was declined. A paper alternative requires contact with the rental team."
};
const REVIEW_TABS=Object.freeze(["documents","initials","consent","signature","verification","copies"]);
const REVIEW_PANELS=Object.freeze(["doc-stage","initials-stage","consent-stage","signature-stage","verification-stage","delivery-stage","receipt-stage"]);
function selectedTab(tab,options={}){
 if(!REVIEW_TABS.includes(tab))return false;
 const progress=getProgress(review);
 const alert=$("esign-tab-alert");
 if(tab==="signature"&&(progress.completed!==DOCUMENTS.length||review.declined||review.esignConsent!==true)){
  alert.textContent=review.declined?
    "Electronic signing was declined. No agreement has been executed; contact the rental office for an alternative.":
    "Before signer practice, review all 10 documents and make a separate electronic-consent choice in RR-009.";
  return false;
 }
 alert.textContent="";
 let panel=tab==="documents"?"doc-stage":tab==="initials"?"initials-stage":tab==="consent"?"consent-stage":tab==="signature"?"signature-stage":tab==="verification"?"verification-stage":review.prepared?"receipt-stage":"delivery-stage";
 for(const id of REVIEW_PANELS)$(id).hidden=id!==panel;
 document.querySelectorAll("[data-review-tab]").forEach(b=>{
  const isActive=b.dataset.reviewTab===tab;
  b.classList.toggle("is-active",isActive);
  b.setAttribute("aria-selected",String(isActive));
  b.tabIndex=isActive?0:-1;
 });
 if(tab==="initials")renderInitialsSummary();
 if(tab==="consent")$("consent-current-status").textContent=review.declined?
  "Electronic signing declined; no agreement signed. Request a paper alternative through R-Rent.":
  review.esignConsent?"Local preview opt-in acknowledged in RR-009; no provider-verified consent.":"Local preview opt-in not yet acknowledged. Open RR-009 to review and choose.";
 if(tab==="copies"&&!review.prepared)$("unsigned-copy-state").textContent="Not prepared · complete 10 document reviews and signer practice first";
 if(options.focus)document.querySelector('[aria-selected="true"][data-review-tab]')?.focus();
 return true;
}
function renderInitialsSummary(){
 const output=$("initials-review-list");
 output.replaceChildren();
 for(let i=0;i<DOCUMENTS.length;i++){
  const doc=DOCUMENTS[i],done=review.reviewed[doc.code]===true;
  const item=document.createElement("div");item.className="initials-summary-item";
  const info=document.createElement("div");const head=document.createElement("strong");head.textContent=doc.code+" · "+doc.title;
  const detail=document.createElement("p");let note=doc.initials?
   (review.initials[doc.code]?"Sample initials recorded (not certified)":"Initials still needed"):"Document acknowledgment (no initials required)";
  if(doc.election==="waiver")note+=" · Waiver: "+(review.elections.waiver||"no choice");
  if(doc.election==="drivers")note+=" · Drivers: "+(review.elections.drivers||"no choice");
  if(doc.election==="esign")note+=" · Electronic review consent: "+(review.esignConsent?"local opt-in":"not opted in");
  detail.textContent=note;info.append(head,detail);
  const button=document.createElement("button");button.type="button";button.className="secondary small-action";
  button.textContent=done?"Review / change":"Complete section";
  button.setAttribute("aria-label","Open "+doc.title);
  button.addEventListener("click",()=>{active=i;showDocument();});
  item.append(info,button);output.append(item);
 }
}
function openDocument(code){const index=DOCUMENTS.findIndex(d=>d.code===code);if(index<0)return;active=index;showDocument();}
function setTabHandlers(){
 document.querySelectorAll("[data-review-tab]").forEach(b=>{
  b.addEventListener("click",()=>{
   if(b.dataset.reviewTab==="signature"){if(selectedTab("signature"))showSigner();return;}
   selectedTab(b.dataset.reviewTab);
  });
  b.addEventListener("keydown",e=>{
   if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
   e.preventDefault();const i=REVIEW_TABS.indexOf(b.dataset.reviewTab);
   const newIndex=e.key==="Home"?0:e.key==="End"?REVIEW_TABS.length-1:e.key==="ArrowRight"?(i+1)%REVIEW_TABS.length:(i+REVIEW_TABS.length-1)%REVIEW_TABS.length;
   const next=document.querySelector('[data-review-tab="'+REVIEW_TABS[newIndex]+'"]');next?.focus();
  });
 });
 $("initials-return").addEventListener("click",()=>showDocument());
 $("initials-next").addEventListener("click",()=>selectedTab("consent"));
 $("consent-document").addEventListener("click",()=>openDocument("RR-009"));
 $("consent-next").addEventListener("click",()=>{if(selectedTab("signature"))showSigner();});
 $("reset-consent-preview").addEventListener("click",()=>{review=blankReview();active=0;$("printable-packet").innerHTML="";showDocument();});
 $("verification-next").addEventListener("click",()=>selectedTab("copies"));
 $("copies-review").addEventListener("click",()=>showDocument());
 $("copies-signer").addEventListener("click",()=>{if(selectedTab("signature"))showSigner();});
}
function current(){return DOCUMENTS[active];}
function docNumber(i){return String(i+1).padStart(2,"0");}
function electionHtml(doc){
 if(doc.election==="waiver")return '<h4>Separate optional damage waiver election — required</h4><p>Optional waiver acceptance is not an insurance purchase and does not activate protection.</p><label class="choice"><input type="radio" name="choice" value="accept"> Request an optional damage-waiver quote and human review</label><label class="choice"><input type="radio" name="choice" value="decline"> Decline the damage waiver</label>';
 if(doc.election==="drivers")return '<h4>Additional driver instruction</h4><label class="choice"><input type="radio" name="choice" value="none"> No additional drivers requested</label><label class="choice"><input type="radio" name="choice" value="request_review"> Request separate additional-driver eligibility review</label>';
 if(doc.election==="esign")return '<h4>Separate electronic records opt-in</h4><p>For a production signature, a complete E-SIGN disclosure must explain hardware/software requirements, withdrawal procedure, paper alternatives, and copies. This demo is not that production notice.</p><label class="choice"><input type="checkbox" id="esign-optin"> I affirmatively opt in to continue this local electronic review preview</label><button type="button" class="decline" id="decline-btn">Decline electronic signing and request an alternative</button>';
 return "";
}
function renderList(){
 $("documents-list").innerHTML=DOCUMENTS.map((d,i)=>'<li><button type="button" data-open="'+i+'" class="doc-nav '+(i===active?'selected':'')+'" aria-current="'+(i===active?'step':'false')+'"><span class="doc-index">'+docNumber(i)+'</span><span>'+safe(d.title)+'</span><b>'+(review.reviewed[d.code]?'✓':'○')+'</b></button></li>').join("");
 document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>{active=Number(b.dataset.open);showDocument();}));
}
function renderProgress(){
 const p=getProgress(review);
 $("progress-fill").style.width=p.percent+"%";
 $("progress").setAttribute("aria-valuenow",String(p.completed));
 $("progress-description").textContent=p.completed+" of "+p.total+" documents reviewed";
}
function showDocument(){
 selectedTab("documents");
 const d=current();
 $("doc-number").textContent=docNumber(active);
 $("doc-title").textContent=d.title;
 $("sheet-title").textContent=d.title;
 $("sheet-code").textContent=d.code;
 $("doc-text").innerHTML=d.sections.map((paragraph,i)=>'<p><b>'+(i+1)+'.</b> '+safe(paragraph)+'</p>').join("");
 $("doc-reviewed").checked=review.reviewed[d.code]===true;
 $("initials-row").hidden=!d.initials;
 $("doc-initials").value=review.initials[d.code]||"";
 $("doc-initials").required=d.initials;
 $("election-row").hidden=!d.election;
 $("election-row").innerHTML=electionHtml(d);
 if(d.election==="waiver"||d.election==="drivers"){
  const selected=review.elections[d.election];
  const control=[...document.querySelectorAll('#election-row input[name="choice"]')].find(x=>x.value===selected);
  if(control)control.checked=true;
 }
 if(d.election==="esign"){
  $("esign-optin").checked=review.esignConsent===true;
  $("decline-btn").addEventListener("click",()=>{
    review.declined=true;review.esignConsent=false;
    $("doc-error").textContent="Electronic signing declined. No rental or signature has been executed. Contact the rental team for an alternative.";
    $("esign-optin").checked=false;
  });
 }
 $("prev").disabled=active===0;
 $("next").textContent=active===DOCUMENTS.length-1?"Continue to signer review →":"Mark reviewed & continue →";
 $("doc-error").textContent="";
 renderProgress();renderList();window.scrollTo({top:Math.max(0,$("main").offsetTop+155),behavior:"auto"});
}
function acceptDocument(e){
 e.preventDefault();
 const d=current();
 const election=d.election==="waiver"||d.election==="drivers"?document.querySelector('#election-row input[name="choice"]:checked')?.value:undefined;
 const acknowledgment={reviewed:$("doc-reviewed").checked,initials:$("doc-initials").value.trim(),election,consent:d.election==="esign"?$("esign-optin")?.checked:undefined};
 const result=validateDocument(d.code,acknowledgment);
 if(!result.ok){$("doc-error").textContent=notices[result.error]||"Complete this section before continuing.";return;}
 review.reviewed[d.code]=true;
 if(d.initials)review.initials[d.code]=acknowledgment.initials.toUpperCase();
 if(d.election==="waiver"||d.election==="drivers")review.elections[d.election]=election;
 if(d.election==="esign")review.esignConsent=true;
 review.prepared=false;
 renderProgress();renderList();
 if(active<DOCUMENTS.length-1){active++;showDocument();return;}
 showSigner();
}
function showSigner(){
 if(!selectedTab("signature"))return;
 $("signer-name").value=review.sampleSigner;
 $("signer-signature").value=review.sampleSignature;
 $("signed-date").value=review.sampleDate;
 $("final-review").checked=false;$("signature-error").textContent="";
 window.scrollTo({top:$("main").offsetTop+150,behavior:"auto"});
}
function createPrintPacket(){
 const intro='<h1>R-Rent · Document Review Copy</h1><h2>NOT EXECUTED · NOT A SIGNED RENTAL AGREEMENT</h2><p>Preview reference: RRS-PREVIEW-10 · '+DOCUMENTS.length+' sections reviewed in browser memory only. No ID, insurer or payment verification.</p>';
 const docs=DOCUMENTS.map((d,i)=>'<section class="print-section"><h3>'+docNumber(i)+' · '+safe(d.title)+'</h3>'+d.sections.map(p=>'<p>'+safe(p)+'</p>').join("")+'<p class="print-notice">Review acknowledgment entered locally. Initials and legal signature are NOT certified.</p></section>').join("");
 $("printable-packet").innerHTML=intro+docs+'<p>Any legally executed customer or company copy must originate from a trusted signing provider with verified audit evidence.</p>';
}
function receiptItem(label,status,ok=false){
 return '<div class="receipt-item '+(ok?'ok':'wait')+'"><span aria-hidden="true">'+(ok?'✓':'○')+'</span><strong>'+safe(label)+'</strong><em>'+safe(status)+'</em></div>';
}
function showReceipt(){
 selectedTab("copies");
 $("receipt-items").innerHTML=receiptItem("All 10 document sections reviewed","Local acknowledgment only",true)+receiptItem("Separate waiver election recorded","Preview selection only",true)+receiptItem("Signer and E-SIGN choice prepared","Not provider attested",true)+receiptItem("Identity photo verification","Not performed")+receiptItem("GPS recording","Not requested")+receiptItem("Certified signature and initial fields","Awaiting authenticated provider")+receiptItem("Signed document PDF","Not generated")+receiptItem("Customer and company delivery","Not sent")+receiptItem("Operator notification","Not sent");
 createPrintPacket();
 window.scrollTo({top:$("main").offsetTop+140,behavior:"auto"});
}
function prepareReview(){
 review.sampleSigner=$("signer-name").value.trim();
 review.sampleSignature=$("signer-signature").value.trim();
 review.sampleDate=$("signed-date").value;
 if(!$("final-review").checked){$("signature-error").textContent="Acknowledge that this is a nonbinding local review before preparing the copy.";return;}
 const res=validateLocalReview(review);
 if(!res.ok){$("signature-error").textContent=notices[res.error]||"Complete all required review items.";return;}
 review.prepared=true;showReceipt();
}
$("doc-ack").addEventListener("submit",acceptDocument);
$("prev").addEventListener("click",()=>{if(active>0){active--;showDocument();}});
$("return-docs").addEventListener("click",()=>{active=DOCUMENTS.length-1;showDocument();});
$("prepare-packet").addEventListener("click",prepareReview);
$("print-review").addEventListener("click",()=>{if(!review.prepared)return;window.print();});
$("start-over").addEventListener("click",()=>{review=blankReview();active=0;$("printable-packet").innerHTML="";showDocument();});
setTabHandlers();
showDocument();
// Server execution is intentionally absent. Client-check boxes cannot satisfy SERVER_GATES.
console.info("R-Rent signing preview: production execution unavailable; "+SERVER_GATES.length+" server evidence gates pending.");