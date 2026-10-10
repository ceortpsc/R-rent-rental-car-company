(function(){
"use strict";
const $=id=>document.getElementById(id);
const UI={
 executive:["Fleet and rental KPIs","Risk exceptions and approvals","Governance/audit overview"],
 operations:["Rental application queue","Vehicle status, handoff and returns","Pending human approvals"],
 applications:["Assigned applications only","Eligibility and approval status"],fleet:["Vehicle registry","Availability, maintenance and inspection"],verification:["Driver and insurance evidence status","Provider review queue"],
 agreements:["Contract versions","Signature and waiver evidence status"],billing:["Settlements and disputes","Deposits and reconciliation"],support:["Customer service cases","Complaint response queue"],
 audit:["Append-only audit trails","Export authorization review"],configuration:["Change proposals","Release checks and rollback records"],security:["Alerts and incident reviews","Least-privilege and encryption health"],retention:["Retention review and legal hold","Dual-approved disposal queue"],"own-rentals":["Personal rental status"],"own-documents":["Personal issued documents"],"own-support":["Personal service requests"],account:["Own profile controls"],"assigned-documents":["Additional-driver assigned consent"],"driver-review":["Identity eligibility assessment"],"coverage-review":["Carrier verification evidence"],"fleet-reports":["Authorized vehicle reports"],"vehicle-inspections":["Condition inspection and handoff evidence"],"dispatch-review":["Release readiness checklist"],"charge-disputes":["Itemized charge disputes"],"refund-review":["Reversal/return review"],compliance:["Rental statutes and privacy obligations"],reports:["Aggregated non-sensitive reports"],cases:["Assigned support cases"],incidents:["Incident response and evidence chain"],"access-review":["Privileged access recertification"],"reports.read_financial":["Restricted financial summary"]
};
const security=[
["AES-256-GCM","Sensitive field cipher module fails closed without a server-managed encryption key. Deployment key configuration not verified."],
["Authentication","Server checks validated identity tokens; no staff session is granted by role selection in this interface."],
["RBAC & MFA","13-role least-privilege permission matrix; privileged APIs require tenant membership and MFA before returning descriptors."],
["Audit & legal holds","Append-only event design, approved retention rules, incident evidence and dual-approval disposal workflows."],
["Provider verifications","Independent identity, insurance, payment and e-signing evidence required. Browser events alone cannot approve a rental."],
["Secure disposal","Legal-hold check, retention clock, backup propagation plan, approval ledger and verifiable disposition."]
];
const changes=[
["Feature flags","Default disabled for sensitive uploads, payment captures, sign execution, vehicle release and disposal workers."],
["Environment separation","Development/staging/production and independent keys; never reuse production secrets for previews."],
["Four-eyes review","Security/permissions/key changes require reviewer identity distinct from requestor."],
["Release pipeline","Signed commits, locked dependencies, tests, least-privilege CI and verified deployment checks."],
["Operational rollback","Reversible configuration versions, immutable logs and documented rollback runbook."],
["Secrets inventory","Key owner, scope, renewal, vault reference, rotation controls and breach-triggered revocation."]
];
const actionLabels=[
["Issue rental agreement","Requires counsel-approved document hash, authenticated signer and verified consent"],
["Capture rental payment","Requires final invoice, provider approval, fraud checks, signed webhook and reconciliation"],
["Release vehicle","Requires identity, coverage, signed agreement, payment and independent inspection"],
["Approve a refund","Requires itemized charge proof, authorized reviewer and verified payment reference"],
["Change staff privileges","Requires MFA, segregation of duties and second approver"],
["Dispose of records","Requires authorized retention deadline, cleared legal hold and disposal certificate"]
];
let catalog=[],selected=null;
function addCards(container,items,locked=false){
 container.replaceChildren();
 for(const [title,desc] of items){const card=document.createElement("article");card.className="tile";const h=document.createElement("h3");h.textContent=title;const p=document.createElement("p");p.textContent=desc;card.append(h,p);if(locked){const b=document.createElement("button");b.type="button";b.disabled=true;b.className="locked";b.textContent="Protected — authentication required";card.append(b);}container.append(card);}
}
function renderRole(role){
 const entry=catalog.find(x=>x.role===role);selected=entry||null;
 $("role-count").textContent=catalog.length+" published role policies; viewing does not authenticate";
 $("scope-box").textContent=entry?"Role: "+entry.label+" · Data scope: "+entry.scope+" · Policy-only view":"No role selected.";
 if(!entry){addCards($("view-cards"),[["Select a role","Use the role picker to inspect page access and permissions."]]);$("permission-list").replaceChildren();return;}
 addCards($("view-cards"),entry.screens.map(k=>[k.replaceAll("-"," ").replace(/\b\w/g,c=>c.toUpperCase()),(UI[k]||["Restricted role-specific view"]).join(" · ")]));
 $("permission-list").replaceChildren();
 for(const p of entry.permissions){const e=document.createElement("span");e.textContent=p; e.className="permission";$("permission-list").append(e);}
}
async function fetchJson(path){const r=await fetch(path,{headers:{Accept:"application/json"},cache:"no-store"});const body=await r.json();return {ok:r.ok,status:r.status,body};}
async function init(){
 addCards($("action-cards"),actionLabels,true);addCards($("security-cards"),security);addCards($("configuration-cards"),changes);
 try{
  const registry=await fetchJson("/api/v1/roles");
  if(!registry.ok||!Array.isArray(registry.body.roles))throw Error("Role catalog unavailable");
  catalog=registry.body.roles.filter(x=>typeof x.role==="string"&&Array.isArray(x.screens)&&Array.isArray(x.permissions));
  const picker=$("role-select");picker.replaceChildren();
  const first=document.createElement("option");first.value="";first.textContent="Select a role (permission preview only)";picker.append(first);
  for(const e of catalog){const o=document.createElement("option");o.value=e.role;o.textContent=e.label;picker.append(o);}
  picker.onchange=()=>renderRole(picker.value);
  renderRole("");
 }catch{ $("role-select").innerHTML='<option value="">Role registry unavailable</option>';$("role-count").textContent="Live role registry not reachable. Access remains blocked.";}
 try{
  const status=await fetchJson("/api/v1/readiness");
  $("service-state").textContent=status.ok?"Public service reachable; protected workflows gated":"Service readiness unavailable";
 }catch{ $("service-state").textContent="Server readiness unavailable — fail closed";}
}
document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
 const tab=b.dataset.tab;document.querySelectorAll("[data-tab]").forEach(x=>{x.classList.toggle("selected",x===b);x.setAttribute("aria-selected",String(x===b));});
 document.querySelectorAll(".tab-content").forEach(x=>x.hidden=x.id!=="section-"+tab);
}));
$("verify-access").addEventListener("click",async()=>{
 $("access-message").textContent="Checking the server-enforced operations gate…";
 try{const resp=await fetchJson("/api/v1/operations");$("access-message").textContent=resp.ok?"The API returned only an authenticated role descriptor; customer data requires additional scoped endpoints.":"Protected operations are locked ("+resp.status+"). Log in through the approved identity provider after production access is configured.";}
 catch{$("access-message").textContent="Access service unavailable; no role granted.";}
});
$("copy-checklist").addEventListener("click",()=>{
 const content=changes.map(([a,b])=>a+": "+b).join("\n");
 if(navigator.clipboard?.writeText)navigator.clipboard.writeText(content).then(()=>$("copy-status").textContent="Checklist copied.").catch(()=>$("copy-status").textContent="Copy unavailable in this browser.");
 else $("copy-status").textContent="Clipboard unavailable; consult enterprise blueprint.";
});
init();
})();