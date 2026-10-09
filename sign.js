(function(){
"use strict";
const catalog=[
["RR-001","Vehicle Rental Agreement"],["RR-002","Vehicle Condition and Return"],["RR-003","Insurance and Coverage Election"],
["RR-004","Optional Damage Waiver Election"],["RR-005","Additional Authorized Driver"],
["RR-006","Payment and Fee Disclosures"],["RR-007","Fuel, Tolls and Mileage"],["RR-008","Roadside and Incident Procedures"],
["RR-009","E-SIGN Electronic Consent"]];
const $=id=>document.getElementById(id);
const selects=$("documents");
for (const [code,title] of catalog){
  const row=document.createElement("div");row.className="doc-select";
  const input=document.createElement("input");input.type="checkbox";input.id="doc-"+code;input.value=code;input.checked=["RR-001","RR-003","RR-006","RR-009"].includes(code);
  const label=document.createElement("label");label.htmlFor=input.id;
  const heading=document.createElement("strong");heading.textContent=title;
  const small=document.createElement("small");small.textContent=code+" · unsigned draft";label.append(heading,small);row.append(input,label);selects.append(row);
}
let count=0,localDraft=null,signatureMode="draw";
const rec=$("recipient-fields");
function addRecipient(role="RENTER"){
 if(count>=12)return;
 count++;
 const box=document.createElement("div");box.className="recipient";
 const fields=[["name","Recipient name","text","Example signer"],["email","Recipient email","email","signer@example.com"]];
 for(const [key,label,type,place] of fields){
  const wrap=document.createElement("div");const lbl=document.createElement("label");lbl.textContent=label;
  const input=document.createElement("input");input.type=type;input.required=true;input.maxLength=key==="name"?120:254;input.placeholder=place;input.dataset.field=key;input.autocomplete="off";wrap.append(lbl,input);box.append(wrap);
 }
 const wrap=document.createElement("div");const lab=document.createElement("label");lab.textContent="Role";
 const select=document.createElement("select");select.dataset.field="role";
 [["RENTER","Renter"],["COMPANY_APPROVER","Company approver"],["ADDITIONAL_DRIVER","Additional driver"],["WITNESS","Witness"]].forEach(([v,l])=>{const o=document.createElement("option");o.value=v;o.textContent=l;select.append(o);});
 select.value=role;wrap.append(lab,select);box.append(wrap);
 const remove=document.createElement("button");remove.type="button";remove.className="remove";remove.textContent="Remove recipient";
 remove.addEventListener("click",()=>{box.remove();count--;});box.append(remove);rec.append(box);
}
addRecipient("COMPANY_APPROVER");addRecipient("RENTER");
$("add-recipient").addEventListener("click",()=>addRecipient());
$("clear-envelope").addEventListener("click",()=>{
 rec.replaceChildren();count=0;addRecipient("COMPANY_APPROVER");addRecipient("RENTER");localDraft=null;$("envelope-summary").textContent="No local envelope prepared.";$("digest").textContent="No local draft fingerprint generated yet.";$("composer-msg").textContent="";
});
function show(tab){
 document.querySelectorAll("[data-tab]").forEach(b=>{const active=b.dataset.tab===tab;b.classList.toggle("active",active);b.setAttribute("aria-selected",String(active));});
 document.querySelectorAll(".tab-pane").forEach(p=>p.classList.toggle("hidden",p.id!=="view-"+tab));
}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.tab)));
$("envelope-form").addEventListener("submit",ev=>{
 ev.preventDefault();const title=$("envtitle").value.trim();const chosen=[...selects.querySelectorAll("input:checked")].map(i=>i.value);
 const recipients=[...rec.children].map((row,index)=>({
 name:row.querySelector('[data-field="name"]').value.trim(),
 email:row.querySelector('[data-field="email"]').value.trim().toLowerCase(),
 role:row.querySelector('[data-field="role"]').value,
 order:index+1
 }));
 const msg=$("composer-msg");
 if(title.length<3||!chosen.length||recipients.some(r=>!r.name||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)))){msg.textContent="Provide a title, at least one document and valid sample recipient names/emails.";return;}
 if(new Set(recipients.map(r=>r.email+"|"+r.role)).size!==recipients.length){msg.textContent="Duplicate recipient-role combinations are not allowed.";return;}
 localDraft={title,documents:chosen,recipients,expires_in_days:Number($("expires").value),state:"DRAFT",delivered:false,signed:false};
 const sum=$("envelope-summary");sum.replaceChildren();
 const h=document.createElement("strong");h.textContent="Prepared: "+title;sum.append(h);
 const note=document.createElement("p");note.textContent=chosen.length+" document(s), "+recipients.length+" routing recipient(s), expiration "+localDraft.expires_in_days+" days. Preview only: not saved, sent, or issued.";sum.append(note);
 const ul=document.createElement("ul");for(const role of recipients){const li=document.createElement("li");li.textContent=role.order+". "+role.role+" — "+role.name;ul.append(li);}sum.append(ul);
 msg.textContent="Local preview prepared. No data has been submitted to the server or emailed.";
 $("digest").textContent="Local preview changed; fingerprint not yet generated.";show("sign");
});
function canvasPad(id){
 const node=$(id),ctx=node.getContext("2d");
 let moved=false,active=false,last=null;
 function clear(){ctx.clearRect(0,0,node.width,node.height);moved=false;}
 function point(ev){const r=node.getBoundingClientRect();return{x:(ev.clientX-r.left)*node.width/r.width,y:(ev.clientY-r.top)*node.height/r.height};}
 node.addEventListener("pointerdown",ev=>{ev.preventDefault();node.setPointerCapture(ev.pointerId);active=true;last=point(ev);
  ctx.fillStyle="#0c1d34";ctx.beginPath();ctx.arc(last.x,last.y,1.7,0,Math.PI*2);ctx.fill();moved=true;
 });
 node.addEventListener("pointermove",ev=>{if(!active)return;ev.preventDefault();const now=point(ev);ctx.beginPath();ctx.strokeStyle="#0c1d34";ctx.lineWidth=2.6;ctx.lineCap="round";ctx.lineJoin="round";ctx.moveTo(last.x,last.y);ctx.lineTo(now.x,now.y);ctx.stroke();last=now;moved=true;});
 for(const ev of ["pointerup","pointercancel","lostpointercapture"])node.addEventListener(ev,()=>{active=false;last=null;});
 return{clear,hasStroke:()=>moved};
}
const sig=canvasPad("signature-pad"),init=canvasPad("initials-pad");
$("clear-signature").addEventListener("click",sig.clear);$("clear-initials").addEventListener("click",init.clear);
$("clear-all-signatures").addEventListener("click",()=>{sig.clear();init.clear();$("typed-name").value="";$("typed-initials").value="";$("typed-preview").textContent="Your sample signature appears here";$("signature-preview").textContent="Samples cleared; nothing stored.";$("signature-msg").textContent="";});
document.querySelectorAll("[data-mode]").forEach(b=>b.addEventListener("click",()=>{
 signatureMode=b.dataset.mode;document.querySelectorAll("[data-mode]").forEach(x=>x.classList.toggle("active",x===b));
 $("draw-entry").classList.toggle("hidden",signatureMode!=="draw");$("typed-entry").classList.toggle("hidden",signatureMode!=="type");
}));
$("typed-name").addEventListener("input",()=>{$("typed-preview").textContent=$("typed-name").value||"Your sample signature appears here";});
$("review-signature").addEventListener("click",()=>{
 const preview=$("signature-preview");preview.replaceChildren();
 const title=document.createElement("strong");title.textContent="LOCAL-ONLY PRACTICE RESULT";preview.append(title);
 const detail=document.createElement("p");
 if(signatureMode==="draw"){
   detail.textContent=sig.hasStroke()&&init.hasStroke()?"Practice signature and initials recorded only in your current browser memory. No legal signature created.":"Draw both a practice signature and practice initials to review them.";
 }else{
   detail.textContent=$("typed-name").value.trim()&&$("typed-initials").value.trim()?
     "Typed sample "+$("typed-name").value.trim()+"; initials "+$("typed-initials").value.trim()+". Nothing has been signed or sent.":
     "Type both a sample name and initials to review them.";
 }
 preview.append(detail);$("signature-msg").textContent="No signature image was uploaded, stored, certified or executed.";
});
$("fingerprint").addEventListener("click",async ()=>{
 if(!localDraft){$("digest").textContent="Create a local draft in the envelope tab first.";return;}
 const data=new TextEncoder().encode(JSON.stringify(localDraft));
 if(!globalThis.crypto?.subtle){$("digest").textContent="Web Crypto unavailable; a digest cannot be calculated.";return;}
 const bytes=await crypto.subtle.digest("SHA-256",data);const hex=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
 $("digest").textContent="Local draft SHA-256 (not a certified signing record): "+hex+". No external delivery, file storage, or signer attestation occurred.";
});

// Explicit renter acceptance step: browser-local validation only, never execution or storage.
const renterForm=$("renter-acknowledgment");
if(renterForm){
 renterForm.addEventListener("submit",event=>{
  event.preventDefault();
  const name=$("renter-display-name").value.trim();
  const signature=$("renter-signature").value.trim();
  const ref=$("agreement-reference").value.trim();
  const date=$("renter-date").value;
  const ids=["initial-rental","initial-fees","initial-coverage","initial-returns"];
  const initials=ids.map(id=>$(id).value.trim().toUpperCase());
  const selection=renterForm.querySelector('input[name="waiver-election"]:checked');
  const status=$("renter-ack-msg");
  const valid=Boolean(name&&signature&&ref&&date&&initials.every(x=>/^[A-Z]{1,8}$/.test(x))&&selection&&$("esign-consent").checked&&$("review-complete").checked);
  if(!valid){status.textContent="Incomplete sample: provide signer, reference, all four initials, optional-waiver choice, separate opt-in and acknowledgment, signature and chosen date.";return;}
  if(name.toLocaleLowerCase()!==signature.toLocaleLowerCase()){status.textContent="Sample signature must match the displayed signer name.";return;}
  if(date!==new Date().toLocaleDateString("en-CA")){status.textContent="For this preview, enter today's local date; real provider events must use trusted server timestamps.";return;}
  const sum=$("renter-ack-summary");sum.replaceChildren();
  const head=document.createElement("strong");head.textContent="LOCAL CHECKLIST VALIDATED — NOT SIGNED";sum.append(head);
  const p=document.createElement("p");p.textContent="Draft reference: "+ref+". Four acknowledgment fields completed. Optional waiver: "+(selection.value==="accept"?"selected for quotation/review":"declined")+". Electronic records: opted in for this preview. Date entered: "+date+". No binding document, signer identity verification or certificate created.";sum.append(p);
  status.textContent="Local checklist complete only. Real execution is still disabled and requires secure invitation, exact document version and provider-backed evidence.";
 });
 $("decline-esign").addEventListener("click",()=>{$("esign-consent").checked=false;$("renter-ack-summary").textContent="Electronic signing declined. No document was executed. An accessible alternative signing process must be provided by the rental team.";$("renter-ack-msg").textContent="Declined — no electronic signature request has been issued.";});
 renterForm.addEventListener("reset",()=>{$("renter-ack-summary").textContent="Signer sample cleared; not signed.";$("renter-ack-msg").textContent="";});
}

fetch("/api/v1/envelopes",{headers:{"Accept":"application/json"}}).then(r=>r.ok?r.json():Promise.reject(new Error("API unavailable"))).then(data=>{
 $("api-state").textContent=data.product+" template registry connected · issuing "+(data.external_delivery_enabled?"enabled":"locked");
}).catch(()=>{$("api-state").textContent="Registry unavailable · local preview only";});
})();
